import {
  DateRangeInfo,
  ForecastViewResponse,
  HealthResponse,
  HorizonPoint,
  MetricsSummaryResponse,
} from '../types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDates(): Promise<DateRangeInfo> {
  const res = await fetch(`${BASE_URL}/dates`);
  if (!res.ok) throw new Error(`Failed to fetch dates: ${res.statusText}`);
  return res.json();
}

export async function fetchForecast(
  startDate: string,
  endDate: string,
  cutoffTime: string,
  resolution: string
): Promise<ForecastViewResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    resolution,
  });
  const res = await fetch(`${BASE_URL}/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch forecast: ${res.statusText}`);
  return res.json();
}

export async function fetchMetrics(
  startDate: string,
  endDate: string,
  cutoffTime: string,
  resolution: string
): Promise<MetricsSummaryResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    resolution,
  });
  const res = await fetch(`${BASE_URL}/metrics?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  return res.json();
}

export async function fetchHorizons(
  targetDate: string,
  targetHour?: number
): Promise<HorizonPoint[]> {
  const params = new URLSearchParams({ target_date: targetDate });
  if (targetHour !== undefined && targetHour !== null) {
    params.append('target_hour', targetHour.toString());
  }
  const res = await fetch(`${BASE_URL}/horizons?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch horizons: ${res.statusText}`);
  return res.json();
}

export async function triggerRefresh(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error(`Refresh failed: ${res.statusText}`);
  return res.json();
}
