import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import {
  HourlyMetric,
  HorizonMetric,
  WindBucketMetric,
  HistogramBin,
  OverallMetrics,
} from '../types';
import { Clock, BarChart3, Wind, Compass } from 'lucide-react';

interface AccuracyViewProps {
  hourly: HourlyMetric[];
  horizons: HorizonMetric[];
  windBuckets: WindBucketMetric[];
  histogram: HistogramBin[];
  overall: OverallMetrics;
}

export const AccuracyView: React.FC<AccuracyViewProps> = ({
  hourly,
  horizons,
  windBuckets,
  histogram,
  overall,
}) => {
  return (
    <div className="space-y-6">
      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Diurnal Profile (Error by Hour of Day) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" />
                Diurnal Error Profile (By Hour of Day)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                MAE and Systemic Bias across UK clock hours (00:00 to 23:00 GMT).
              </p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as HourlyMetric;
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded text-xs shadow-lg text-slate-800">
                        <div className="font-bold text-slate-900 mb-1">Hour {d.hour}:00 GMT</div>
                        <div className="text-sky-700">MAE: {d.mae.toLocaleString()} MW</div>
                        <div className="text-purple-700">RMSE: {d.rmse.toLocaleString()} MW</div>
                        <div className={d.bias >= 0 ? 'text-amber-700' : 'text-rose-700'}>
                          Bias: {d.bias >= 0 ? `+${d.bias}` : d.bias} MW
                        </div>
                        <div className="text-slate-500">Mean Actual: {d.mean_actual.toLocaleString()} MW</div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#CBD5E1" />
                <Bar name="MAE (MW)" dataKey="mae" fill="#0284C7" radius={[2, 2, 0, 0]} />
                <Line
                  name="Bias (MW)"
                  type="monotone"
                  dataKey="bias"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#D97706' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Error Distribution Histogram */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Error Distribution (Forecast − Actual)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Frequency distribution of volume errors. Centered around 0 MW.
              </p>
            </div>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
              P10: {overall.p10_error_residual} MW | P90: +{overall.p90_abs_error} MW
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="bin_center"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as HistogramBin;
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded text-xs shadow-lg text-slate-800">
                        <div className="font-bold text-slate-900 mb-1">
                          Range: {d.bin_start.toLocaleString()} to {d.bin_end.toLocaleString()} MW
                        </div>
                        <div className="text-emerald-700 font-medium">Frequency: {d.frequency_pct}%</div>
                        <div className="text-slate-500">Period count: {d.count}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={0} stroke="#DC2626" strokeDasharray="2 2" label="0 MW" />
                <Bar
                  name="Frequency (%)"
                  dataKey="frequency_pct"
                  fill="#059669"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 3: Error by Wind-Level Bucket */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wind className="h-4 w-4 text-sky-600" />
                Error by Wind Generation Level
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation across national wind generation tiers (Actual MW).
              </p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={windBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="bucket_label" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as WindBucketMetric;
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded text-xs shadow-lg text-slate-800">
                        <div className="font-bold text-slate-900 mb-1">{d.bucket_label}</div>
                        <div className="text-sky-700">MAE: {d.mae.toLocaleString()} MW</div>
                        <div className="text-purple-700">RMSE: {d.rmse.toLocaleString()} MW</div>
                        <div className={d.bias >= 0 ? 'text-amber-700' : 'text-rose-700'}>
                          Bias: {d.bias >= 0 ? `+${d.bias}` : d.bias} MW
                        </div>
                        <div className="text-slate-600">MAPE: {d.mape.toFixed(1)}%</div>
                        <div className="text-slate-400">Count: {d.count} periods</div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="MAE (MW)" dataKey="mae" fill="#0284C7" radius={[2, 2, 0, 0]} />
                <Bar name="RMSE (MW)" dataKey="rmse" fill="#7C3AED" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 4: Forecast Horizon Error Degradation */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-600" />
                Forecast Horizon Error Degradation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                How forecast accuracy degrades as lead time increases from 1h to 48h ahead.
              </p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horizons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="horizon_label" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as HorizonMetric;
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded text-xs shadow-lg text-slate-800">
                        <div className="font-bold text-slate-900 mb-1">{d.horizon_label}</div>
                        <div className="text-sky-700">MAE: {d.mae.toLocaleString()} MW</div>
                        <div className="text-purple-700">RMSE: {d.rmse.toLocaleString()} MW</div>
                        <div className="text-rose-700">P90 Tail: {d.p90.toLocaleString()} MW</div>
                        <div className="text-slate-500">Bias: {d.bias} MW</div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  name="MAE (MW)"
                  type="monotone"
                  dataKey="mae"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284C7' }}
                />
                <Line
                  name="P90 Error (MW)"
                  type="monotone"
                  dataKey="p90"
                  stroke="#DC2626"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: '#DC2626' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
