import React, { useState, useEffect } from 'react';
import { HorizonPoint } from '../types';
import { fetchHorizons } from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Clock, Calendar } from 'lucide-react';

interface HorizonViewProps {
  currentDate: string;
}

export const HorizonView: React.FC<HorizonViewProps> = ({ currentDate }) => {
  const [selectedDate, setSelectedDate] = useState(currentDate || '2026-01-05');
  const [selectedHour, setSelectedHour] = useState<number>(14); // 14:00 peak
  const [data, setData] = useState<HorizonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchHorizons(selectedDate, selectedHour);
        if (mounted) setData(res);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load horizon data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedDate, selectedHour]);

  // Actual generation value
  const actualVal = data.length > 0 && data[0].actual_mw !== null ? data[0].actual_mw : null;

  // Chart data sorted by lead time descending (from 48h down to 1h)
  const chartData = [...data]
    .sort((a, b) => b.leadTimeHours - a.leadTimeHours)
    .map((d) => ({
      leadTime: d.leadTimeHours,
      forecast: d.forecast_mw,
      actual: d.actual_mw,
      publishTime: d.publishTime.slice(5, 16).replace('T', ' '),
      error: d.error_mw,
    }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-600" />
            Forecast Horizon Evolution (Lead-Time Analysis)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace how the forecast for a specific delivery hour evolved from 48+ hours ahead down to gate closure.
          </p>
        </div>

        {/* Date and Hour pickers */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-600">Target Delivery Hour:</span>
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="bg-white text-slate-800 px-2 py-0.5 rounded outline-none font-mono cursor-pointer border border-slate-300 shadow-sm"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00 GMT
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-slate-500 text-sm">
          Loading forecast horizon evolution...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-sm">
          No forecast history found for {selectedDate} at {selectedHour}:00 GMT.
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">Target Delivery Time:</span>{' '}
              <span className="text-slate-900 font-bold">{selectedDate} {String(selectedHour).padStart(2, '0')}:00 GMT</span>
            </div>
            <div>
              <span className="text-slate-500">Realized Generation:</span>{' '}
              <span className="text-emerald-700 font-bold font-mono">
                {actualVal != null ? `${actualVal.toLocaleString()} MW` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Forecast Publication Runs:</span>{' '}
              <span className="text-sky-700 font-bold font-mono">{data.length} updates</span>
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="leadTime"
                  stroke="#94A3B8"
                  fontSize={11}
                  reversed
                  label={{
                    value: '← Approaching Gate Closure (Lead Time in Hours Ahead)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#64748B',
                    fontSize: 11,
                  }}
                  tickFormatter={(v) => `${v}h`}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}GW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-3 rounded text-xs space-y-1 shadow-lg text-slate-800">
                        <div className="font-bold text-slate-900">Lead Time: {d.leadTime}h Ahead</div>
                        <div className="text-slate-400 text-[10px]">Published: {d.publishTime} GMT</div>
                        <div className="text-sky-700 font-mono font-bold">
                          Forecast: {d.forecast.toLocaleString()} MW
                        </div>
                        {d.actual != null && (
                          <div className="text-emerald-700 font-mono">
                            Actual: {d.actual.toLocaleString()} MW
                          </div>
                        )}
                        {d.error != null && (
                          <div
                            className={`font-mono font-bold ${
                              d.error >= 0 ? 'text-amber-700' : 'text-rose-700'
                            }`}
                          >
                            Error: {d.error >= 0 ? `+${d.error}` : d.error} MW
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {actualVal != null && (
                  <ReferenceLine
                    y={actualVal}
                    stroke="#059669"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: `Actual Realization (${actualVal.toLocaleString()} MW)`,
                      fill: '#059669',
                      fontSize: 11,
                      position: 'insideTopLeft',
                    }}
                  />
                )}

                <Line
                  name="Forecast Evolution (MW)"
                  type="monotone"
                  dataKey="forecast"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284C7' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Publish Time (GMT)</th>
                  <th className="px-4 py-2.5">Lead Time</th>
                  <th className="px-4 py-2.5">Forecast (MW)</th>
                  <th className="px-4 py-2.5">Realized Actual (MW)</th>
                  <th className="px-4 py-2.5">Error (Forecast − Actual)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono bg-white">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 text-slate-700">
                      {row.publishTime.replace('T', ' ').slice(0, 16)} GMT
                    </td>
                    <td className="px-4 py-2 text-sky-700 font-semibold">{row.leadTimeHours}h</td>
                    <td className="px-4 py-2 text-slate-900 font-bold">{row.forecast_mw.toLocaleString()}</td>
                    <td className="px-4 py-2 text-emerald-700">
                      {row.actual_mw != null ? row.actual_mw.toLocaleString() : 'N/A'}
                    </td>
                    <td
                      className={`px-4 py-2 font-bold ${
                        row.error_mw != null && row.error_mw > 0
                          ? 'text-amber-700'
                          : row.error_mw != null && row.error_mw < 0
                          ? 'text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {row.error_mw != null
                        ? row.error_mw > 0
                          ? `+${row.error_mw}`
                          : row.error_mw
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
