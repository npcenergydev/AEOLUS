import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KPIBand } from './components/KPIBand';
import { ForecastChart } from './components/ForecastChart';
import { AccuracyView } from './components/AccuracyView';
import { HorizonView } from './components/HorizonView';
import { DomainExplainer } from './components/DomainExplainer';
import {
  fetchForecast,
  fetchMetrics,
  fetchHealth,
  triggerRefresh,
} from './services/api';
import {
  ForecastViewResponse,
  MetricsSummaryResponse,
  HealthResponse,
} from './types';
import {
  LineChart as LineChartIcon,
  BarChart2,
  Clock,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'forecast' | 'accuracy' | 'horizon' | 'guide'>('forecast');

  // Controls
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-07');
  const [cutoffTime, setCutoffTime] = useState('12:00');
  const [resolution, setResolution] = useState('30min');

  // Data states
  const [forecastData, setForecastData] = useState<ForecastViewResponse | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsSummaryResponse | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  // Status states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, met, hl] = await Promise.all([
        fetchForecast(startDate, endDate, cutoffTime, resolution),
        fetchMetrics(startDate, endDate, cutoffTime, resolution),
        fetchHealth(),
      ]);
      setForecastData(fc);
      setMetricsData(met);
      setHealthData(hl);
    } catch (err: any) {
      setError(err.message || 'Failed to load trading data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, cutoffTime, resolution]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerRefresh();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data from Elexon BMRS.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Trading Header */}
      <Header
        startDate={startDate}
        endDate={endDate}
        cutoffTime={cutoffTime}
        resolution={resolution}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onCutoffTimeChange={setCutoffTime}
        onResolutionChange={setResolution}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
        totalActuals={healthData?.actuals_count ?? 1490}
        totalForecasts={healthData?.forecasts_count ?? 20440}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 rounded border border-rose-300 shadow-sm transition flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* Top KPI Band (Visible when metrics available) */}
        {metricsData && <KPIBand metrics={metricsData.overall} cutoffTime={cutoffTime} />}

        {/* View Tabs */}
        <div className="flex items-center border-b border-slate-200 space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'forecast'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <LineChartIcon className="h-4 w-4" />
            <span>Forecast & Risk Corridor</span>
          </button>

          <button
            onClick={() => setActiveTab('accuracy')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'accuracy'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Quantitative Accuracy Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('horizon')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'horizon'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Forecast Horizon Evolution</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Trading Guide & Methodology</span>
          </button>
        </div>

        {/* Content Panels */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-4 shadow-sm">
            <RefreshCw className="h-8 w-8 text-sky-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              Querying Elexon BMRS Wind Feeds...
            </div>
            <p className="text-xs text-slate-500">
              Aligning FUELHH 30-min actuals with WINDFOR forecasts at D-1 {cutoffTime} GMT cutoff.
            </p>
          </div>
        ) : (
          <div>
            {activeTab === 'forecast' && forecastData && (
              <ForecastChart
                points={forecastData.points}
                cutoffTime={cutoffTime}
                resolution={resolution}
              />
            )}

            {activeTab === 'accuracy' && metricsData && (
              <AccuracyView
                hourly={metricsData.hourly_breakdown}
                horizons={metricsData.horizon_breakdown}
                windBuckets={metricsData.wind_bucket_breakdown}
                histogram={metricsData.error_histogram}
                overall={metricsData.overall}
              />
            )}

            {activeTab === 'horizon' && <HorizonView currentDate={startDate} />}

            {activeTab === 'guide' && <DomainExplainer />}
          </div>
        )}
      </main>

      {/* Trading Desk Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">AEOLUS Trading Analytics</span>
          <span>•</span>
          <span>Elexon BMRS Stream API (FUELHH & WINDFOR)</span>
          <span>•</span>
          <span>Data scope: January 2026 (GMT)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <span>Settlement Periods: 48 / day</span>
          <span>•</span>
          <span>Decision Gate: D-1 Cutoff {cutoffTime} GMT</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
