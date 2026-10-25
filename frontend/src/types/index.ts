export interface ActualPoint {
  startTime: string;
  settlementDate: string;
  settlementPeriod?: number | null;
  generation: number;
  fuelType: string;
}

export interface ForecastAlignedPoint {
  startTime: string;
  settlementDate: string;
  settlementPeriod?: number | null;
  actual_mw?: number | null;
  forecast_mw?: number | null;
  publishTime?: string | null;
  cutoffUsed: string;
  leadTimeHours?: number | null;
  error_mw?: number | null;
  abs_error_mw?: number | null;
  p10_uncertainty_mw?: number | null;
  p90_uncertainty_mw?: number | null;
}

export interface ForecastViewResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  resolution: string;
  total_points: number;
  matched_points: number;
  points: ForecastAlignedPoint[];
}

export interface HorizonPoint {
  startTime: string;
  publishTime: string;
  leadTimeHours: number;
  forecast_mw: number;
  actual_mw?: number | null;
  error_mw?: number | null;
}

export interface HourlyMetric {
  hour: number;
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  mape: number;
  mean_actual: number;
  mean_forecast: number;
}

export interface HorizonMetric {
  lead_time_hours: number;
  horizon_label: string;
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  p90: number;
}

export interface WindBucketMetric {
  bucket_label: string;
  min_mw: number;
  max_mw: number;
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  mape: number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  bin_center: number;
  count: number;
  frequency_pct: number;
}

export interface OverallMetrics {
  count: number;
  mae: number;
  rmse: number;
  mape: number;
  wape: number;
  bias: number;
  p90_abs_error: number;
  p99_abs_error: number;
  mean_actual_mw: number;
  mean_forecast_mw: number;
  max_actual_mw: number;
  max_forecast_mw: number;
  min_actual_mw: number;
  min_forecast_mw: number;
  p10_error_residual: number;
  p90_error_residual: number;
}

export interface MetricsSummaryResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  resolution: string;
  overall: OverallMetrics;
  hourly_breakdown: HourlyMetric[];
  horizon_breakdown: HorizonMetric[];
  wind_bucket_breakdown: WindBucketMetric[];
  error_histogram: HistogramBin[];
}

export interface HealthResponse {
  status: string;
  project: string;
  version: string;
  actuals_count: number;
  forecasts_count: number;
  cached: boolean;
  data_range: {
    min_startTime?: string | null;
    max_startTime?: string | null;
  };
}

export interface DateRangeInfo {
  min_date: string;
  max_date: string;
  default_start: string;
  default_end: string;
  default_cutoff_time: string;
  settlement_periods_per_day: number;
}
