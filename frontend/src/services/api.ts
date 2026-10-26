import {
  DateRangeInfo,
  ForecastViewResponse,
  HealthResponse,
  HorizonPoint,
  MetricsSummaryResponse,
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const text = await res.text();
      try {
        const errJson = JSON.parse(text);
        detail = errJson.detail || errJson.message || text;
      } catch {
        detail = text;
      }
    } catch {
      // ignore
    }
    const suffix = detail ? ` - ${detail}` : ` (${res.status} ${res.statusText})`;
    throw new Error(`${fallbackMsg}${suffix}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  return handleResponse<HealthResponse>(res, 'Health check failed');
}

export async function fetchDates(): Promise<DateRangeInfo> {
  const res = await fetch(`${BASE_URL}/dates`);
  return handleResponse<DateRangeInfo>(res, 'Failed to fetch dates');
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
  return handleResponse<ForecastViewResponse>(res, 'Failed to fetch forecast');
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
  return handleResponse<MetricsSummaryResponse>(res, 'Failed to fetch metrics');
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
  return handleResponse<HorizonPoint[]>(res, 'Failed to fetch horizons');
}

export async function triggerRefresh(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/refresh`, { method: 'POST' });
  return handleResponse<{ status: string; message: string }>(res, 'Refresh failed');
}
