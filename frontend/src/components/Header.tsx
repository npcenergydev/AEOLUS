import React from 'react';
import { Wind, Clock, RefreshCw, Calendar, Layers } from 'lucide-react';

interface HeaderProps {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  resolution: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onCutoffTimeChange: (t: string) => void;
  onResolutionChange: (r: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalActuals: number;
  totalForecasts: number;
}

export const Header: React.FC<HeaderProps> = ({
  startDate,
  endDate,
  cutoffTime,
  resolution,
  onStartDateChange,
  onEndDateChange,
  onCutoffTimeChange,
  onResolutionChange,
  onRefresh,
  isRefreshing,
  totalActuals,
  totalForecasts,
}) => {
  const presets = [
    { label: 'Full Month (Jan 1-31)', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Week 3', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Week 4', start: '2026-01-22', end: '2026-01-31' },
  ];

  const quickCutoffs = ['09:00', '11:00', '12:00', '14:00', '17:00'];

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand & Market Context */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-sm">
            <Wind className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                AEOLUS
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
                  UK Day-Ahead Trading
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Elexon BMRS ({totalActuals.toLocaleString()} actuals • {totalForecasts.toLocaleString()} forecasts)</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                January 2026 (GMT)
              </span>
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Range Presets */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {presets.map((p) => {
              const active = startDate === p.start && endDate === p.end;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    onStartDateChange(p.start);
                    onEndDateChange(p.end);
                  }}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    active
                      ? 'bg-white text-sky-700 font-semibold shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {/* Cutoff Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-slate-600 font-medium">D-1 Cutoff:</span>
            <select
              value={cutoffTime}
              onChange={(e) => onCutoffTimeChange(e.target.value)}
              className="bg-white text-slate-800 px-2 py-0.5 rounded outline-none font-mono cursor-pointer border border-slate-300 shadow-sm"
            >
              {quickCutoffs.map((t) => (
                <option key={t} value={t}>
                  {t} GMT {t === '12:00' ? '(Default Auction)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => onResolutionChange('30min')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                resolution === '30min'
                  ? 'bg-white text-emerald-700 font-semibold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Half-hourly settlement periods 1-48 (step forward-fill for hourly forecast)"
            >
              <Layers className="h-3 w-3" /> 30-min
            </button>
            <button
              onClick={() => onResolutionChange('60min')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                resolution === '60min'
                  ? 'bg-white text-emerald-700 font-semibold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Hourly mean aggregated actuals"
            >
              1-Hour
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium shadow-sm transition disabled:opacity-50"
            title="Reload latest cache from Elexon"
          >
            <RefreshCw className="h-3.5 w-3.5 text-sky-600" />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
