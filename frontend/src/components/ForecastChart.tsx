import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from 'recharts';
import { ForecastAlignedPoint } from '../types';
import { Eye, EyeOff, BarChart2 } from 'lucide-react';

interface ForecastChartProps {
  points: ForecastAlignedPoint[];
  cutoffTime: string;
  resolution: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  points,
  cutoffTime,
  resolution,
}) => {
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showErrorChart, setShowErrorChart] = useState(true);

  if (!points || points.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
        No forecast or actual data points available for the selected range.
      </div>
    );
  }

  // Format data for chart
  const chartData = points.map((p) => {
    const dt = new Date(p.startTime);
    const dateStr = dt.toISOString().slice(5, 10); // MM-DD
    const timeStr = dt.toISOString().slice(11, 16); // HH:MM
    const label = `${dateStr} ${timeStr}`;

    const p10 = p.p10_uncertainty_mw ?? 0;
    const p90 = p.p90_uncertainty_mw ?? 0;
    const uncertaintySpan = Math.max(0, p90 - p10);

    return {
      raw: p,
      label,
      timeStr,
      dateStr,
      actual: p.actual_mw,
      forecast: p.forecast_mw,
      error: p.error_mw,
      p10_base: p10,
      uncertainty_span: uncertaintySpan,
      p10,
      p90,
      period: p.settlementPeriod,
      leadTime: p.leadTimeHours,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const p: ForecastAlignedPoint = item.raw;

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xl text-xs max-w-xs text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="font-bold text-slate-900">{item.label} GMT</span>
          {p.settlementPeriod && (
            <span className="bg-slate-100 text-sky-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200">
              SP {p.settlementPeriod}
            </span>
          )}
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-emerald-700 flex items-center gap-1.5 font-sans font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Actual Wind:
            </span>
            <span className="font-bold text-slate-900">
              {p.actual_mw !== null && p.actual_mw !== undefined
                ? `${p.actual_mw.toLocaleString()} MW`
                : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sky-700 flex items-center gap-1.5 font-sans font-medium">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span> Day-Ahead Forecast:
            </span>
            <span className="font-bold text-slate-900">
              {p.forecast_mw !== null && p.forecast_mw !== undefined
                ? `${p.forecast_mw.toLocaleString()} MW`
                : 'N/A'}
            </span>
          </div>

          {p.error_mw !== null && p.error_mw !== undefined && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-600 font-sans font-medium">Forecast Error (F - A):</span>
              <span
                className={`font-bold ${
                  p.error_mw > 0
                    ? 'text-amber-700'
                    : p.error_mw < 0
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {p.error_mw > 0 ? `+${p.error_mw}` : p.error_mw} MW
              </span>
            </div>
          )}

          {showUncertainty && p.p10_uncertainty_mw !== undefined && (
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Risk Corridor (P10-P90):</span>
              <span className="text-sky-700 font-semibold">
                {p.p10_uncertainty_mw?.toLocaleString()} - {p.p90_uncertainty_mw?.toLocaleString()} MW
              </span>
            </div>
          )}

          {p.leadTimeHours !== null && p.leadTimeHours !== undefined && (
            <div className="text-[10px] text-slate-400 pt-1">
              Lead time: {p.leadTimeHours}h ahead • Cutoff: {cutoffTime} GMT D-1
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Day-Ahead Decision Forecast vs. Realized Generation</span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Cutoff: {cutoffTime} GMT on D-1
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compares the latest wind forecast available at trading gate closure against actual Elexon FUELHH generation.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowUncertainty(!showUncertainty)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
              showUncertainty
                ? 'bg-sky-50 text-sky-700 border-sky-300 font-medium'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            {showUncertainty ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Uncertainty Band (P10–P90)</span>
          </button>

          <button
            onClick={() => setShowErrorChart(!showErrorChart)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
              showErrorChart
                ? 'bg-slate-800 text-white border-slate-800 font-medium'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Error Subplot</span>
          </button>
        </div>
      </div>

      {/* Main Time Series Chart */}
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}GW`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
              formatter={(val) => <span className="text-slate-700 font-medium">{val}</span>}
            />

            {/* Uncertainty Corridor Area */}
            {showUncertainty && (
              <>
                <Area
                  type="monotone"
                  dataKey="p10_base"
                  stackId="uncertainty"
                  stroke="transparent"
                  fill="transparent"
                  legendType="none"
                />
                <Area
                  name="Uncertainty Corridor (P10 - P90)"
                  type="monotone"
                  dataKey="uncertainty_span"
                  stackId="uncertainty"
                  stroke="#38BDF8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="#E0F2FE"
                  fillOpacity={0.65}
                />
              </>
            )}

            {/* Realized Actuals */}
            <Line
              name="Actual Generation (FUELHH)"
              type="monotone"
              dataKey="actual"
              stroke="#059669"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
            />

            {/* Decision-Time Forecast */}
            <Line
              name="Decision Forecast (WINDFOR @ Cutoff)"
              type={resolution === '30min' ? 'stepAfter' : 'monotone'}
              dataKey="forecast"
              stroke="#0284C7"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 5, fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sub-chart: Imbalance / Forecast Error (Forecast - Actual) */}
      {showErrorChart && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Forecast Error (MW): Forecast − Actual</span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Amber = Overforecast / Surplus Risk | Red = Underforecast / Shortfall Deficit)
              </span>
            </span>
          </div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" hide />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  name="Error (MW)"
                  dataKey="error"
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    const fill = value >= 0 ? '#D97706' : '#DC2626';
                    return <rect x={x} y={y} width={width} height={height} fill={fill} rx={1} />;
                  }}
                />
                <Brush
                  dataKey="label"
                  height={20}
                  stroke="#CBD5E1"
                  fill="#F8FAFC"
                  tickFormatter={() => ''}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
