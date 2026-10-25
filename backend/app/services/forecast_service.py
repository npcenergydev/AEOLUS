import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
from backend.app.services.elexon_client import elexon_client
from backend.app.models.schemas import ForecastAlignedPoint, ForecastViewResponse, HorizonPoint

logger = logging.getLogger(__name__)

class ForecastService:
    """
    Domain service implementing the UK Day-Ahead power trading cutoff logic,
    alignment between 30-min actuals and hourly forecasts, and horizon tracking.
    """

    @staticmethod
    def parse_cutoff_time(cutoff_str: str) -> time:
        """Parses 'HH:MM' string into a time object (default 12:00)."""
        try:
            parts = cutoff_str.strip().split(":")
            return time(hour=int(parts[0]), minute=int(parts[1]))
        except Exception:
            return time(hour=12, minute=0)

    @classmethod
    def get_aligned_forecasts(
        cls,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-07",
        cutoff_time_str: str = "12:00",
        resolution: str = "30min",
    ) -> ForecastViewResponse:
        """
        Retrieves actuals and selects the latest day-ahead forecast published BEFORE
        the cutoff on D-1 for each delivery interval.
        """
        df_act = elexon_client.get_actuals()
        df_fc = elexon_client.get_forecasts()

        if df_act.empty or df_fc.empty:
            return ForecastViewResponse(
                start_date=start_date,
                end_date=end_date,
                cutoff_time=cutoff_time_str,
                resolution=resolution,
                total_points=0,
                matched_points=0,
                points=[]
            )

        cutoff_t = cls.parse_cutoff_time(cutoff_time_str)

        # Parse delivery date bounds (UTC / GMT)
        start_dt = pd.to_datetime(f"{start_date}T00:00:00Z", utc=True)
        end_dt = pd.to_datetime(f"{end_date}T23:59:59Z", utc=True)

        # Filter actuals to date range
        mask_act = (df_act["startTime"] >= start_dt) & (df_act["startTime"] <= end_dt)
        df_act_range = df_act[mask_act].copy()

        if df_act_range.empty:
            return ForecastViewResponse(
                start_date=start_date,
                end_date=end_date,
                cutoff_time=cutoff_time_str,
                resolution=resolution,
                total_points=0,
                matched_points=0,
                points=[]
            )

        # Pre-filter forecasts that could target this range
        # Start looking from start_dt - 7 days for publishTime
        fc_mask = (df_fc["startTime"] >= start_dt - pd.Timedelta(hours=2)) & \
                  (df_fc["startTime"] <= end_dt + pd.Timedelta(hours=2))
        df_fc_range = df_fc[fc_mask].copy()

        # Step 1: For each unique target delivery hour, find the day-ahead forecast
        # Delivery Day D is based on target startTime date
        # Cutoff timestamp = (D - 1 day) at cutoff_t
        unique_fc_hours = df_fc_range["startTime"].unique()
        
        selected_forecasts = []
        for target_h in unique_fc_hours:
            target_ts = pd.Timestamp(target_h)
            target_date = target_ts.date()
            # D-1 Cutoff
            cutoff_day = target_date - timedelta(days=1)
            cutoff_ts = pd.Timestamp(
                year=cutoff_day.year,
                month=cutoff_day.month,
                day=cutoff_day.day,
                hour=cutoff_t.hour,
                minute=cutoff_t.minute,
                tz="UTC"
            )

            # Eligible forecasts for this target hour published BEFORE or AT cutoff
            eligible = df_fc_range[
                (df_fc_range["startTime"] == target_ts) &
                (df_fc_range["publishTime"] <= cutoff_ts)
            ]

            if not eligible.empty:
                # Latest publishTime
                latest = eligible.sort_values("publishTime").iloc[-1]
                selected_forecasts.append({
                    "hourStartTime": target_ts,
                    "forecast_mw": float(latest["generation"]),
                    "forecastPublishTime": latest["publishTime"],
                    "cutoffUsed": cutoff_ts.isoformat(),
                    "leadTimeHours": round((target_ts - latest["publishTime"]).total_seconds() / 3600.0, 1)
                })

        df_selected_fc = pd.DataFrame(selected_forecasts)

        # Step 2: Align with actuals based on resolution
        points: List[ForecastAlignedPoint] = []
        
        if resolution == "60min":
            # Hourly aggregated: group actuals by hour
            df_act_range["hourStartTime"] = df_act_range["startTime"].dt.floor("h")
            hourly_act = df_act_range.groupby("hourStartTime").agg(
                actual_mw=("generation", "mean"),
                settlementDate=("settlementDate", "first")
            ).reset_index()

            merged = pd.merge(hourly_act, df_selected_fc, on="hourStartTime", how="left")
            merged = merged.sort_values("hourStartTime").reset_index(drop=True)

            for _, row in merged.iterrows():
                act_val = round(float(row["actual_mw"]), 1) if pd.notna(row["actual_mw"]) else None
                fc_val = round(float(row["forecast_mw"]), 1) if pd.notna(row.get("forecast_mw")) else None
                err = round(fc_val - act_val, 1) if (fc_val is not None and act_val is not None) else None
                abs_err = abs(err) if err is not None else None

                points.append(ForecastAlignedPoint(
                    startTime=row["hourStartTime"].isoformat(),
                    settlementDate=str(row["settlementDate"]),
                    settlementPeriod=None,
                    actual_mw=act_val,
                    forecast_mw=fc_val,
                    publishTime=row["forecastPublishTime"].isoformat() if pd.notna(row.get("forecastPublishTime")) else None,
                    cutoffUsed=str(row.get("cutoffUsed", "")),
                    leadTimeHours=float(row["leadTimeHours"]) if pd.notna(row.get("leadTimeHours")) else None,
                    error_mw=err,
                    abs_error_mw=abs_err
                ))
        else:
            # 30min resolution (default): map each 30-min actual to its floor hour forecast (step forward-fill)
            df_act_range["hourStartTime"] = df_act_range["startTime"].dt.floor("h")
            merged = pd.merge(df_act_range, df_selected_fc, on="hourStartTime", how="left")
            merged = merged.sort_values("startTime").reset_index(drop=True)

            for _, row in merged.iterrows():
                act_val = round(float(row["generation"]), 1) if pd.notna(row["generation"]) else None
                fc_val = round(float(row.get("forecast_mw")), 1) if pd.notna(row.get("forecast_mw")) else None
                err = round(fc_val - act_val, 1) if (fc_val is not None and act_val is not None) else None
                abs_err = abs(err) if err is not None else None

                points.append(ForecastAlignedPoint(
                    startTime=row["startTime"].isoformat(),
                    settlementDate=str(row.get("settlementDate", "")),
                    settlementPeriod=int(row["settlementPeriod"]) if pd.notna(row.get("settlementPeriod")) else None,
                    actual_mw=act_val,
                    forecast_mw=fc_val,
                    publishTime=row["forecastPublishTime"].isoformat() if pd.notna(row.get("forecastPublishTime")) else None,
                    cutoffUsed=str(row.get("cutoffUsed", "")),
                    leadTimeHours=float(row["leadTimeHours"]) if pd.notna(row.get("leadTimeHours")) else None,
                    error_mw=err,
                    abs_error_mw=abs_err
                ))

        # Step 3: Compute empirical uncertainty band quantiles (P10 - P90)
        # Residual error = actual - forecast (or forecast - actual)
        # Traders need to see: Forecast + Q10(actual - forecast) to Forecast + Q90(actual - forecast)
        valid_errors = [p.actual_mw - p.forecast_mw for p in points if p.actual_mw is not None and p.forecast_mw is not None]
        if valid_errors:
            q10 = float(np.percentile(valid_errors, 10))
            q90 = float(np.percentile(valid_errors, 90))
            for p in points:
                if p.forecast_mw is not None:
                    # Lower bound (P10 actual realization relative to forecast)
                    p.p10_uncertainty_mw = round(max(0.0, p.forecast_mw + q10), 1)
                    # Upper bound (P90 actual realization relative to forecast)
                    p.p90_uncertainty_mw = round(p.forecast_mw + q90, 1)

        matched = sum(1 for p in points if p.forecast_mw is not None and p.actual_mw is not None)

        return ForecastViewResponse(
            start_date=start_date,
            end_date=end_date,
            cutoff_time=cutoff_time_str,
            resolution=resolution,
            total_points=len(points),
            matched_points=matched,
            points=points
        )

    @classmethod
    def get_forecast_horizons_for_target(
        cls,
        target_date: str = "2026-01-01",
        target_hour: Optional[int] = None
    ) -> List[HorizonPoint]:
        """
        Retrieves how the forecast for specific delivery hours evolved over lead time
        from 48h+ ahead down to 1h ahead.
        """
        df_fc = elexon_client.get_forecasts()
        df_act = elexon_client.get_actuals()

        target_start = pd.to_datetime(f"{target_date}T00:00:00Z", utc=True)
        target_end = pd.to_datetime(f"{target_date}T23:59:59Z", utc=True)

        if target_hour is not None:
            target_start = target_start + pd.Timedelta(hours=target_hour)
            target_end = target_start + pd.Timedelta(hours=1)

        mask = (df_fc["startTime"] >= target_start) & (df_fc["startTime"] <= target_end)
        fc_target = df_fc[mask].copy()

        if fc_target.empty:
            return []

        # Calculate lead time in hours
        fc_target["leadTimeHours"] = (fc_target["startTime"] - fc_target["publishTime"]).dt.total_seconds() / 3600.0
        # Filter realistic positive horizons (e.g. 1h to 72h)
        fc_target = fc_target[(fc_target["leadTimeHours"] >= 0) & (fc_target["leadTimeHours"] <= 72)]
        fc_target = fc_target.sort_values(["startTime", "leadTimeHours"], ascending=[True, False])

        # Match actuals (hourly average)
        df_act["hourStartTime"] = df_act["startTime"].dt.floor("h")
        act_map = df_act.groupby("hourStartTime")["generation"].mean().to_dict()

        horizon_points: List[HorizonPoint] = []
        for _, row in fc_target.iterrows():
            act = act_map.get(row["startTime"])
            fc_val = float(row["generation"])
            err = round(fc_val - act, 1) if act is not None else None
            horizon_points.append(HorizonPoint(
                startTime=row["startTime"].isoformat(),
                publishTime=row["publishTime"].isoformat(),
                leadTimeHours=round(float(row["leadTimeHours"]), 1),
                forecast_mw=fc_val,
                actual_mw=round(float(act), 1) if act is not None else None,
                error_mw=err
            ))

        return horizon_points

forecast_service = ForecastService()
