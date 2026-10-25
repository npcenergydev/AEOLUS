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
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">MAE (MW)</span>
          <Target className="h-3.5 w-3.5 text-sky-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white">
          {metrics.mae.toLocaleString()} <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">Mean Absolute Error</div>
      </div>

      {/* 2. RMSE */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">RMSE (MW)</span>
          <Activity className="h-3.5 w-3.5 text-purple-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white">
          {metrics.rmse.toLocaleString()} <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Ratio to MAE: {(metrics.rmse / (metrics.mae || 1)).toFixed(2)}x
        </div>
      </div>

      {/* 3. MAPE / WAPE */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">MAPE / WAPE</span>
          <Zap className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white">
          {metrics.mape.toFixed(1)}%
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          WAPE: <span className="text-amber-300 font-semibold">{metrics.wape.toFixed(1)}%</span>
        </div>
      </div>

      {/* 4. Bias */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">Systemic Bias</span>
          {isOverforecast ? (
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
          )}
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            metrics.bias > 0 ? 'text-amber-400' : metrics.bias < 0 ? 'text-rose-400' : 'text-gray-200'
          }`}
        >
          {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
          <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] mt-0.5 font-medium">
          {isOverforecast ? (
            <span className="text-amber-400/90">Over-forecast (Surplus risk)</span>
          ) : (
            <span className="text-rose-400/90">Under-forecast (Shortfall risk)</span>
          )}
        </div>
      </div>

      {/* 5. P90 Absolute Error */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">P90 Tail Error</span>
          <Shield className="h-3.5 w-3.5 text-sky-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white">
          {metrics.p90_abs_error.toLocaleString()} <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">90% of periods within this error</div>
      </div>

      {/* 6. P99 Peak Tail Error */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">P99 Peak Risk</span>
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-rose-300">
          {metrics.p99_abs_error.toLocaleString()} <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">1% extreme volume deviation</div>
      </div>

      {/* 7. Mean Actual Generation */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3.5 shadow-sm hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="font-medium">Mean Actual</span>
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-bold tracking-tight text-emerald-400">
          {metrics.mean_actual_mw.toLocaleString()} <span className="text-xs font-normal text-gray-400">MW</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Peak: {metrics.max_actual_mw.toLocaleString()} MW
        </div>
      </div>
    </div>
  );
};
