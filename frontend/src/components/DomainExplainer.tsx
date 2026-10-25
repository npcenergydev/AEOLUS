import React from 'react';
import { BookOpen, ShieldCheck, Scale, Cpu, Clock } from 'lucide-react';

export const DomainExplainer: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 text-sm text-slate-700">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-sky-600" />
          UK Day-Ahead Power Trading & Wind Risk Primer
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Technical reference on market gate closures, Elexon BMRS streams, and forecast error mitigation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Day-Ahead Timeline & Cutoff */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-sky-700">
            <Clock className="h-4 w-4" />
            1. Day-Ahead Gate Closure & Cutoff (D-1)
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            In Great Britain, power trading teams procure wholesale electricity on exchanges (EPEX SPOT and Nord Pool GB).
            The Day-Ahead hourly auction order book closes at <strong>11:00 GMT</strong>, with clearing results announced around <strong>12:00 GMT</strong> on day D-1 for delivery across all 48 settlement periods of day D.
          </p>
          <div className="bg-sky-50 border border-sky-200 p-2.5 rounded text-xs text-sky-900">
            <strong>Domain Rule:</strong> For any delivery hour on day D, traders cannot use forecasts published after the day-ahead auction cutoff. The system filters for the <code>max(publishTime) &le; Cutoff(D-1)</code>, with 12:00 GMT as the configurable default.
          </div>
        </div>

        {/* Section 2: Imbalance Settlement Risk */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700">
            <Scale className="h-4 w-4" />
            2. Imbalance Cashout Risk (BSC Section T)
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Under Elexon Balancing and Settlement Code (BSC), differences between contracted positions and metered generation are settled at the <strong>System Price (cashout price)</strong>:
          </p>
          <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-700">
            <li>
              <strong className="text-amber-700">Over-forecasting (Positive Bias):</strong> Trader expects high wind generation, buys less wholesale power, and ends up short. The utility must buy shortfall at potentially spiking System Buy Prices.
            </li>
            <li>
              <strong className="text-rose-700">Under-forecasting (Negative Bias):</strong> Trader buys excess thermal/market power. Surplus wind is spilled or sold into the balancing mechanism at depressed System Sell Prices.
            </li>
          </ul>
        </div>
      </div>

      {/* Section 3: Mathematical Metric Definitions */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-700">
          <Cpu className="h-4 w-4" />
          3. Mathematical Metric Definitions & Epsilon Guards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="text-slate-700 font-sans font-bold">Mean Absolute Error</div>
            <div className="text-sky-700 mt-1">MAE = (1/N) &sum; |F - A|</div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">Linear volume error magnitude</div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="text-slate-700 font-sans font-bold">Root Mean Squared Error</div>
            <div className="text-purple-700 mt-1">RMSE = &radic;((1/N) &sum; (F - A)&sup2;)</div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">Penalizes large tail errors</div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="text-slate-700 font-sans font-bold">Zero-Guarded MAPE & WAPE</div>
            <div className="text-amber-700 mt-1">MAPE = (1/N) &sum; |e| / max(A, 1)</div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">WAPE = &sum;|e| / &sum;A (safe)</div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="text-slate-700 font-sans font-bold">Systemic Bias (Mean Error)</div>
            <div className="text-emerald-700 mt-1">Bias = (1/N) &sum; (F - A)</div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">+ = Overforecast | - = Under</div>
          </div>
        </div>
      </div>

      {/* Section 4: Uncertainty Corridor */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-purple-700">
          <ShieldCheck className="h-4 w-4" />
          4. Historical Uncertainty Corridor (P10 - P90)
        </h3>
        <p className="text-xs leading-relaxed text-slate-600">
          Traders cannot rely on a single point forecast. AEOLUS computes empirical error quantiles:
          <code className="mx-1 px-1.5 py-0.5 rounded bg-white text-sky-800 font-mono border border-slate-200">
            Corridor = [Forecast + Q10(Residuals), Forecast + Q90(Residuals)]
          </code>
          where residuals represent realized historical error deviations. This creates an 80% empirical prediction envelope around the forecast, allowing trading desks to stress-test their thermal plant dispatch and storage reserves.
        </p>
      </div>
    </div>
  );
};
