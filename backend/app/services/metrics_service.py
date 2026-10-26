import logging
import math
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
try:
    from app.services.forecast_service import forecast_service
    from app.services.elexon_client import elexon_client
    from app.models.schemas import (
        MetricsSummaryResponse,
        OverallMetrics,
        HourlyMetric,
        HorizonMetric,
        WindBucketMetric,
        HistogramBin,
    )
except ImportError:
    from backend.app.services.forecast_service import forecast_service
    from backend.app.services.elexon_client import elexon_client
    from backend.app.models.schemas import (
        MetricsSummaryResponse,
        OverallMetrics,
        HourlyMetric,
        HorizonMetric,
        WindBucketMetric,
        HistogramBin,
    )

logger = logging.getLogger(__name__)

class MetricsService:
    """
    Computes rigorous quantitative accuracy and risk metrics for UK wind forecasts.
    """

    @classmethod
    def compute_metrics(
        cls,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-07",
        cutoff_time_str: str = "12:00",
        resolution: str = "30min",
    ) -> MetricsSummaryResponse:
        fc_resp = forecast_service.get_aligned_forecasts(
            start_date=start_date,
            end_date=end_date,
            cutoff_time_str=cutoff_time_str,
            resolution=resolution
        )

        # Filter valid matched points (both actual and forecast present)
        valid_points = [
            p for p in fc_resp.points
            if p.actual_mw is not None and p.forecast_mw is not None
        ]

        if not valid_points:
            empty_overall = OverallMetrics(
                count=0,
                mae=0.0,
                rmse=0.0,
                mape=0.0,
                wape=0.0,
                bias=0.0,
                p90_abs_error=0.0,
                p99_abs_error=0.0,
                mean_actual_mw=0.0,
                mean_forecast_mw=0.0,
                max_actual_mw=0.0,
                max_forecast_mw=0.0,
                min_actual_mw=0.0,
                min_forecast_mw=0.0,
                p10_error_residual=0.0,
                p90_error_residual=0.0
            )
            return MetricsSummaryResponse(
                start_date=start_date,
                end_date=end_date,
                cutoff_time=cutoff_time_str,
                resolution=resolution,
                overall=empty_overall,
                hourly_breakdown=[],
                horizon_breakdown=[],
                wind_bucket_breakdown=[],
                error_histogram=[]
            )

        actuals = np.array([p.actual_mw for p in valid_points], dtype=float)
        forecasts = np.array([p.forecast_mw for p in valid_points], dtype=float)
        errors = forecasts - actuals  # Forecast - Actual (positive = overforecast)
        abs_errors = np.abs(errors)
        n = len(actuals)

        # 1. Overall Metrics
        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))
        
        # MAPE with epsilon guard against divide-by-zero
        epsilon = 1.0  # 1 MW minimum denominator
        safe_actuals = np.maximum(actuals, epsilon)
        mape = float(np.mean(abs_errors / safe_actuals) * 100.0)
        
        # WAPE (Weighted Absolute Percentage Error)
        sum_act = float(np.sum(actuals))
        wape = float((np.sum(abs_errors) / sum_act * 100.0)) if sum_act > 0 else 0.0

        p90_abs = float(np.percentile(abs_errors, 90))
        p99_abs = float(np.percentile(abs_errors, 99))

        # Quantiles of (Actual - Forecast) residual
        residuals = actuals - forecasts
        p10_res = float(np.percentile(residuals, 10))
        p90_res = float(np.percentile(residuals, 90))

        overall = OverallMetrics(
            count=n,
            mae=round(mae, 1),
            rmse=round(rmse, 1),
            mape=round(mape, 2),
            wape=round(wape, 2),
            bias=round(bias, 1),
            p90_abs_error=round(p90_abs, 1),
            p99_abs_error=round(p99_abs, 1),
            mean_actual_mw=round(float(np.mean(actuals)), 1),
            mean_forecast_mw=round(float(np.mean(forecasts)), 1),
            max_actual_mw=round(float(np.max(actuals)), 1),
            max_forecast_mw=round(float(np.max(forecasts)), 1),
            min_actual_mw=round(float(np.min(actuals)), 1),
            min_forecast_mw=round(float(np.min(forecasts)), 1),
            p10_error_residual=round(p10_res, 1),
            p90_error_residual=round(p90_res, 1)
        )

        # 2. Hourly Breakdown (Hour 0 to 23)
        hourly_records = []
        for p in valid_points:
            dt = pd.to_datetime(p.startTime)
            h = dt.hour
            hourly_records.append({
                "hour": h,
                "actual": p.actual_mw,
                "forecast": p.forecast_mw,
                "error": p.forecast_mw - p.actual_mw,
                "abs_error": abs(p.forecast_mw - p.actual_mw)
            })

        df_hourly = pd.DataFrame(hourly_records)
        hourly_breakdown: List[HourlyMetric] = []
        for h in range(24):
            grp = df_hourly[df_hourly["hour"] == h]
            if not grp.empty:
                g_acts = grp["actual"].values
                g_fcs = grp["forecast"].values
                g_errs = grp["error"].values
                g_abs = grp["abs_error"].values
                g_mape = np.mean(g_abs / np.maximum(g_acts, epsilon)) * 100.0
                hourly_breakdown.append(HourlyMetric(
                    hour=h,
                    count=len(grp),
                    mae=round(float(np.mean(g_abs)), 1),
                    rmse=round(float(np.sqrt(np.mean(g_errs ** 2))), 1),
                    bias=round(float(np.mean(g_errs)), 1),
                    mape=round(float(g_mape), 2),
                    mean_actual=round(float(np.mean(g_acts)), 1),
                    mean_forecast=round(float(np.mean(g_fcs)), 1)
                ))

        # 3. Horizon Breakdown across lead times (using full WINDFOR stream in the period)
        horizon_breakdown = cls._compute_horizon_metrics(start_date, end_date)

        # 4. Wind-Level Bucket Breakdown
        # Buckets: 0-5k, 5k-10k, 10k-15k, 15k-20k, >20k MW
        bucket_defs = [
            ("0 - 5,000 MW", 0.0, 5000.0),
            ("5,000 - 10,000 MW", 5000.0, 10000.0),
            ("10,000 - 15,000 MW", 10000.0, 15000.0),
            ("15,000 - 20,000 MW", 15000.0, 20000.0),
            ("> 20,000 MW", 20000.0, 100000.0),
        ]
        wind_bucket_breakdown: List[WindBucketMetric] = []
        for label, min_val, max_val in bucket_defs:
            mask = (actuals >= min_val) & (actuals < max_val)
            if np.any(mask):
                b_acts = actuals[mask]
                b_fcs = forecasts[mask]
                b_errs = errors[mask]
                b_abs = abs_errors[mask]
                b_mape = np.mean(b_abs / np.maximum(b_acts, epsilon)) * 100.0
                wind_bucket_breakdown.append(WindBucketMetric(
                    bucket_label=label,
                    min_mw=min_val,
                    max_mw=max_val,
                    count=int(np.sum(mask)),
                    mae=round(float(np.mean(b_abs)), 1),
                    rmse=round(float(np.sqrt(np.mean(b_errs ** 2))), 1),
                    bias=round(float(np.mean(b_errs)), 1),
                    mape=round(float(b_mape), 2)
                ))

        # 5. Error Distribution Histogram (e.g. 15 bins)
        error_histogram = cls._compute_histogram(errors, n_bins=15)

        return MetricsSummaryResponse(
            start_date=start_date,
            end_date=end_date,
            cutoff_time=cutoff_time_str,
            resolution=resolution,
            overall=overall,
            hourly_breakdown=hourly_breakdown,
            horizon_breakdown=horizon_breakdown,
            wind_bucket_breakdown=wind_bucket_breakdown,
            error_histogram=error_histogram
        )

    @classmethod
    def _compute_histogram(cls, errors: np.ndarray, n_bins: int = 15) -> List[HistogramBin]:
        if len(errors) == 0:
            return []
        counts, bin_edges = np.histogram(errors, bins=n_bins)
        total = float(len(errors))
        histogram_bins: List[HistogramBin] = []
        for i in range(len(counts)):
            b_start = round(float(bin_edges[i]), 1)
            b_end = round(float(bin_edges[i + 1]), 1)
            b_center = round((b_start + b_end) / 2.0, 1)
            c = int(counts[i])
            pct = round((c / total) * 100.0, 2)
            histogram_bins.append(HistogramBin(
                bin_start=b_start,
                bin_end=b_end,
                bin_center=b_center,
                count=c,
                frequency_pct=pct
            ))
        return histogram_bins

    @classmethod
    def _compute_horizon_metrics(cls, start_date: str, end_date: str) -> List[HorizonMetric]:
        """
        Calculates forecast error degradation as a function of lead time horizon (1h to 48h).
        """
        df_fc = elexon_client.get_forecasts()
        df_act = elexon_client.get_actuals()

        start_dt = pd.to_datetime(f"{start_date}T00:00:00Z", utc=True)
        end_dt = pd.to_datetime(f"{end_date}T23:59:59Z", utc=True)

        mask = (df_fc["startTime"] >= start_dt) & (df_fc["startTime"] <= end_dt)
        df_sub = df_fc[mask].copy()

        if df_sub.empty or df_act.empty:
            return []

        df_sub["leadTimeHours"] = (df_sub["startTime"] - df_sub["publishTime"]).dt.total_seconds() / 3600.0
        # Match hourly actuals
        df_act["hourStartTime"] = df_act["startTime"].dt.floor("h")
        act_map = df_act.groupby("hourStartTime")["generation"].mean().to_dict()

        df_sub["actual"] = df_sub["startTime"].map(act_map)
        df_sub = df_sub.dropna(subset=["actual", "generation", "leadTimeHours"])

        df_sub["error"] = df_sub["generation"] - df_sub["actual"]
        df_sub["abs_error"] = df_sub["error"].abs()

        # Define horizon bins
        bins = [
            (1.0, 4.0, "1 - 4h (Intraday)"),
            (4.0, 8.0, "4 - 8h (Short-term)"),
            (8.0, 12.0, "8 - 12h (Near Day-ahead)"),
            (12.0, 18.0, "12 - 18h (Day-ahead Morning)"),
            (18.0, 24.0, "18 - 24h (Day-ahead Standard)"),
            (24.0, 36.0, "24 - 36h (Extended Day-ahead)"),
            (36.0, 48.0, "36 - 48h (Two-day Ahead)"),
        ]

        metrics: List[HorizonMetric] = []
        for min_h, max_h, label in bins:
            sub = df_sub[(df_sub["leadTimeHours"] >= min_h) & (df_sub["leadTimeHours"] < max_h)]
            if not sub.empty:
                errs = sub["error"].values
                abs_errs = sub["abs_error"].values
                metrics.append(HorizonMetric(
                    lead_time_hours=(min_h + max_h) / 2.0,
                    horizon_label=label,
                    count=len(sub),
                    mae=round(float(np.mean(abs_errs)), 1),
                    rmse=round(float(np.sqrt(np.mean(errs ** 2))), 1),
                    bias=round(float(np.mean(errs)), 1),
                    p90=round(float(np.percentile(abs_errs, 90)), 1)
                ))

        return metrics

metrics_service = MetricsService()
