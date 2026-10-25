from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str
    project: str
    version: str
    actuals_count: int
    forecasts_count: int
    cached: bool
    data_range: Dict[str, Optional[str]]

class DateRangeInfo(BaseModel):
    min_date: str = "2026-01-01"
    max_date: str = "2026-01-31"
    default_start: str = "2026-01-01"
    default_end: str = "2026-01-07"
    default_cutoff_time: str = "12:00"
    settlement_periods_per_day: int = 48

class ActualPoint(BaseModel):
    startTime: str
    settlementDate: str
    settlementPeriod: Optional[int] = None
    generation: float
    fuelType: str = "WIND"

class ForecastAlignedPoint(BaseModel):
    startTime: str
    settlementDate: str
    settlementPeriod: Optional[int] = None
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    publishTime: Optional[str] = None
    cutoffUsed: str
    leadTimeHours: Optional[float] = None
    error_mw: Optional[float] = None  # forecast - actual
    abs_error_mw: Optional[float] = None
    # Uncertainty corridor
    p10_uncertainty_mw: Optional[float] = None
    p90_uncertainty_mw: Optional[float] = None

class ForecastViewResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_time: str
    resolution: str  # "30min" or "60min"
    total_points: int
    matched_points: int
    points: List[ForecastAlignedPoint]

class HorizonPoint(BaseModel):
    startTime: str
    publishTime: str
    leadTimeHours: float
    forecast_mw: float
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None

class HourlyMetric(BaseModel):
    hour: int
    count: int
    mae: float
    rmse: float
    bias: float
    mape: float
    mean_actual: float
    mean_forecast: float

class HorizonMetric(BaseModel):
    lead_time_hours: float
    horizon_label: str
    count: int
    mae: float
    rmse: float
    bias: float
    p90: float

class WindBucketMetric(BaseModel):
    bucket_label: str
    min_mw: float
    max_mw: float
    count: int
    mae: float
    rmse: float
    bias: float
    mape: float

class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    bin_center: float
    count: int
    frequency_pct: float

class OverallMetrics(BaseModel):
    count: int
    mae: float
    rmse: float
    mape: float
    wape: float
    bias: float
    p90_abs_error: float
    p99_abs_error: float
    mean_actual_mw: float
    mean_forecast_mw: float
    max_actual_mw: float
    max_forecast_mw: float
    min_actual_mw: float
    min_forecast_mw: float
    p10_error_residual: float
    p90_error_residual: float

class MetricsSummaryResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_time: str
    resolution: str
    overall: OverallMetrics
    hourly_breakdown: List[HourlyMetric]
    horizon_breakdown: List[HorizonMetric]
    wind_bucket_breakdown: List[WindBucketMetric]
    error_histogram: List[HistogramBin]
