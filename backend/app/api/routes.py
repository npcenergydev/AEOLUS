import logging
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from backend.app.models.schemas import (
    HealthResponse,
    DateRangeInfo,
    ActualPoint,
    ForecastViewResponse,
    MetricsSummaryResponse,
    HorizonPoint,
)
from backend.app.services.elexon_client import elexon_client
from backend.app.services.forecast_service import forecast_service
from backend.app.services.metrics_service import metrics_service
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint with data store metrics."""
    df_act = elexon_client.get_actuals()
    df_fc = elexon_client.get_forecasts()
    
    act_range = {
        "min_startTime": df_act["startTime"].min().isoformat() if not df_act.empty else None,
        "max_startTime": df_act["startTime"].max().isoformat() if not df_act.empty else None,
    }

    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        actuals_count=len(df_act),
        forecasts_count=len(df_fc),
        cached=settings.CACHE_FILE.exists(),
        data_range=act_range
    )

@router.get("/dates", response_model=DateRangeInfo)
def get_date_range():
    """Returns supported date ranges and defaults for UK Day-Ahead Wind Trading."""
    return DateRangeInfo(
        min_date="2026-01-01",
        max_date="2026-01-31",
        default_start="2026-01-01",
        default_end="2026-01-07",
        default_cutoff_time=settings.DEFAULT_CUTOFF_TIME,
        settlement_periods_per_day=48
    )

@router.get("/actuals", response_model=List[ActualPoint])
def get_actuals(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    resolution: str = Query("30min", pattern="^(30min|60min)$", description="Temporal resolution")
):
    """Retrieve actual wind generation from FUELHH."""
    df_act = elexon_client.get_actuals()
    if df_act.empty:
        return []

    start_dt = f"{start_date}T00:00:00Z"
    end_dt = f"{end_date}T23:59:59Z"
    mask = (df_act["startTime"] >= start_dt) & (df_act["startTime"] <= end_dt)
    df_sub = df_act[mask].copy()

    if resolution == "60min":
        df_sub["hourStartTime"] = df_sub["startTime"].dt.floor("h")
        grouped = df_sub.groupby("hourStartTime").agg(
            generation=("generation", "mean"),
            settlementDate=("settlementDate", "first")
        ).reset_index()
        return [
            ActualPoint(
                startTime=row["hourStartTime"].isoformat(),
                settlementDate=str(row["settlementDate"]),
                settlementPeriod=None,
                generation=round(float(row["generation"]), 1)
            )
            for _, row in grouped.iterrows()
        ]

    return [
        ActualPoint(
            startTime=row["startTime"].isoformat(),
            settlementDate=str(row.get("settlementDate", "")),
            settlementPeriod=int(row["settlementPeriod"]) if "settlementPeriod" in row else None,
            generation=round(float(row["generation"]), 1)
        )
        for _, row in df_sub.iterrows()
    ]

@router.get("/forecast", response_model=ForecastViewResponse)
def get_forecast(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("12:00", description="Day-ahead cutoff on D-1 (HH:MM)"),
    resolution: str = Query("30min", pattern="^(30min|60min)$", description="30min step or 60min mean")
):
    """
    Core trading endpoint: Returns actuals aligned with the forecast available
    at decision time (most recent publishTime <= cutoff on D-1).
    Also includes P10-P90 historical uncertainty envelope.
    """
    return forecast_service.get_aligned_forecasts(
        start_date=start_date,
        end_date=end_date,
        cutoff_time_str=cutoff_time,
        resolution=resolution
    )

@router.get("/metrics", response_model=MetricsSummaryResponse)
def get_metrics(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("12:00", description="Day-ahead cutoff on D-1 (HH:MM)"),
    resolution: str = Query("30min", pattern="^(30min|60min)$", description="30min step or 60min mean")
):
    """
    Computes MAE, RMSE, MAPE (zero-guarded), WAPE, Bias, P90, P99,
    hourly diurnal profile, horizon degradation, and wind generation buckets.
    """
    return metrics_service.compute_metrics(
        start_date=start_date,
        end_date=end_date,
        cutoff_time_str=cutoff_time,
        resolution=resolution
    )

@router.get("/horizons", response_model=List[HorizonPoint])
def get_horizons(
    target_date: str = Query("2026-01-01", description="Target delivery date (YYYY-MM-DD)"),
    target_hour: Optional[int] = Query(None, ge=0, le=23, description="Specific delivery hour (0-23)")
):
    """
    Returns the multi-lead-time forecast evolution (1h to 48h ahead) for a given delivery date.
    """
    return forecast_service.get_forecast_horizons_for_target(
        target_date=target_date,
        target_hour=target_hour
    )

@router.post("/refresh")
def refresh_cache():
    """Forces re-fetch from Elexon BMRS API and updates local cache."""
    try:
        elexon_client.initialize(force_refresh=True)
        return {"status": "success", "message": "Cache refreshed successfully from Elexon BMRS."}
    except Exception as e:
        logger.error(f"Failed to refresh cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))
