import React from 'react';
import { OverallMetrics } from '../types';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Zap, Shield } from 'lucide-react';

interface KPIBandProps {
  metrics: OverallMetrics;
  cutoffTime?: string;
}

export const KPIBand: React.FC<KPIBandProps> = ({ metrics }) => {
  const isOverforecast = metrics.bias > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {/* 1. MAE */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">MAE</span>
          <Target className="h-3.5 w-3.5 text-sky-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-slate-900">
          {metrics.mae.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Mean Absolute Error</div>
      </div>

      {/* 2. RMSE */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">RMSE</span>
          <Activity className="h-3.5 w-3.5 text-purple-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-slate-900">
          {metrics.rmse.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Ratio to MAE: {(metrics.rmse / (metrics.mae || 1)).toFixed(2)}x
        </div>
      </div>

      {/* 3. MAPE / WAPE */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">MAPE / WAPE</span>
          <Zap className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-slate-900">
          {metrics.mape.toFixed(1)}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          WAPE: <span className="text-amber-700 font-semibold">{metrics.wape.toFixed(1)}%</span>
        </div>
      </div>

      {/* 4. Bias */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">Systemic Bias</span>
          {isOverforecast ? (
            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          )}
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            metrics.bias > 0 ? 'text-amber-700' : metrics.bias < 0 ? 'text-rose-700' : 'text-slate-800'
          }`}
        >
          {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] mt-0.5 font-medium">
          {isOverforecast ? (
            <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
              Over-forecast (Surplus risk)
            </span>
          ) : (
            <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
              Under-forecast (Shortfall risk)
            </span>
          )}
        </div>
      </div>

      {/* 5. P90 Absolute Error */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">P90 Tail Error</span>
          <Shield className="h-3.5 w-3.5 text-sky-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-slate-900">
          {metrics.p90_abs_error.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">90% of periods within this error</div>
      </div>

      {/* 6. P99 Peak Tail Error */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">P99 Peak Risk</span>
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-rose-700">
          {metrics.p99_abs_error.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">1% extreme volume deviation</div>
      </div>

      {/* 7. Mean Actual Generation */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold">Mean Actual</span>
          <Activity className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div className="text-xl font-bold tracking-tight text-emerald-700">
          {metrics.mean_actual_mw.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Peak: {metrics.max_actual_mw.toLocaleString()} MW
        </div>
      </div>
    </div>
  );
};
