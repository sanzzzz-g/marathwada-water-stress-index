import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  ShieldAlert,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import {
  DISTRICT_EVALUATION_METRICS_M5,
  MODEL_EVALUATION_SUMMARIES,
  MODEL_VALIDATION_SUMMARIES,
  MODEL_LIST,
} from '../data/modelMetrics';
import { getScarcityValidationSummary } from '../data/scarcityEvents';
import { ForecastHorizon, ModelId } from '../types/wsi';

export const ValidationMetricsPage: React.FC = () => {
  const [activeHorizon, setActiveHorizon] = useState<ForecastHorizon>(1);
  const [selectedSplit, setSelectedSplit] = useState<'test' | 'validation'>('test');

  // Leaderboard table sorted by MAE on active horizon and selected split
  const leaderboard = useMemo(() => {
    const summarySource = selectedSplit === 'test' ? MODEL_EVALUATION_SUMMARIES : MODEL_VALIDATION_SUMMARIES;
    const list = MODEL_LIST.map(m => {
      const summary = summarySource[m.id];
      const metrics = summary.horizons[activeHorizon];
      return {
        model: m,
        summary,
        metrics,
      };
    });
    // If a model has no metrics for the selected split, sort it to the bottom
    return list.sort((a, b) => {
      const aAvail = a.metrics.mae !== null && (selectedSplit === 'validation' || a.summary.isTestAvailable !== false);
      const bAvail = b.metrics.mae !== null && (selectedSplit === 'validation' || b.summary.isTestAvailable !== false);
      if (!aAvail && bAvail) return 1;
      if (aAvail && !bAvail) return -1;
      if (!aAvail && !bAvail) return 0;
      return (a.metrics.mae ?? 999) - (b.metrics.mae ?? 999);
    });
  }, [activeHorizon, selectedSplit]);

  // Scarcity validation summary
  const scarcity = useMemo(() => {
    return getScarcityValidationSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Rigorous Model Evaluation</span>
            <span aria-hidden="true">·</span>
            <span>{selectedSplit === 'test' ? 'Test Split 2021–2024' : 'Validation Split 2018–2020'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Persistence-Relative Skill</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Forecast Performance & Independent Scarcity Grounding
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical regression benchmarks evaluated separately on Validation (2018–2020) and Test (2021–2024).
          </p>
        </div>

        {/* Split Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-md border border-slate-800 text-xs font-mono">
          <span className="text-slate-400 px-2">Split:</span>
          <button
            onClick={() => setSelectedSplit('test')}
            className={`px-3 py-1 rounded transition-colors ${
              selectedSplit === 'test'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Test (2021–2024)
          </button>
          <button
            onClick={() => setSelectedSplit('validation')}
            className={`px-3 py-1 rounded transition-colors ${
              selectedSplit === 'validation'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Validation (2018–2020)
          </button>
        </div>
      </div>

      {/* Model Leaderboard Section */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Horizon-by-Horizon Model Benchmark Leaderboard ({selectedSplit === 'test' ? 'Out-of-Sample Test' : 'Validation Split'})
            </h2>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              {selectedSplit === 'test'
                ? 'All evaluated models scored on held-out 2021–2024 test split (368 windows / 1,104 prediction points across 8 districts).'
                : 'Scored on 2018–2020 validation split (272 windows / 816 prediction points). WSI-AR and Residual LSTM outperform Persistence.'}
            </div>
          </div>

          {/* Horizon Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs font-mono">
            {([1, 2, 3] as const).map(h => (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`px-3 py-1 rounded transition-colors ${
                  activeHorizon === h
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Horizon +{h} (M+{h})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Model Candidate</th>
                <th className="py-2.5 px-3">Family</th>
                <th className="py-2.5 px-3 text-right">MAE</th>
                <th className="py-2.5 px-3 text-right">RMSE</th>
                <th className="py-2.5 px-3 text-right">Bias</th>
                <th className="py-2.5 px-3 text-right">R²</th>
                <th className="py-2.5 px-3 text-right">Skill_MAE vs Persistence</th>
                <th className="py-2.5 px-3 text-right">Status / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboard.map((item, idx) => {
                const isUnavailable = item.metrics.mae === null || (selectedSplit === 'test' && item.summary.isTestAvailable === false);
                const isBest = idx === 0 && !isUnavailable;
                const isPersistence = item.model.id === 'Persistence';
                const skill = item.metrics.skillMaeVsPersistence;

                return (
                  <tr
                    key={item.model.id}
                    className={`transition-colors ${
                      isUnavailable
                        ? 'bg-slate-900/40 text-slate-400 opacity-75'
                        : isBest
                        ? 'bg-cyan-950/30 text-white font-semibold'
                        : isPersistence
                        ? 'bg-slate-900/60 text-slate-300'
                        : 'hover:bg-slate-800/30 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-400">
                      {isUnavailable ? (
                        <span className="text-amber-400/80">N/A</span>
                      ) : isBest ? (
                        <span className="text-cyan-400">#1 Top</span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-semibold text-slate-200">
                        {item.model.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.model.targetFormulation}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{item.model.family}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {isUnavailable || item.metrics.mae === null ? (
                        <span className="text-amber-400/80 font-mono italic">Unavailable</span>
                      ) : (
                        item.metrics.mae.toFixed(3)
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isUnavailable || item.metrics.rmse === null ? '—' : item.metrics.rmse.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {isUnavailable || item.metrics.bias === null ? '—' : item.metrics.bias > 0 ? `+${item.metrics.bias.toFixed(3)}` : item.metrics.bias.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-cyan-300">
                      {isUnavailable || item.metrics.r2 === null ? '—' : item.metrics.r2.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {isUnavailable || skill === null ? (
                        <span className="text-slate-500 font-normal">—</span>
                      ) : (
                        <span className={skill > 0 ? 'text-teal-400' : skill < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {skill > 0 ? `+${(skill * 100).toFixed(1)}%` : `${(skill * 100).toFixed(1)}%`}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs">
                      {isUnavailable ? (
                        <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 text-[10px]" title={item.summary.statusNote}>
                          {item.summary.statusNote || 'Unavailable (v1 only)'}
                        </span>
                      ) : isBest ? (
                        <span className="text-teal-400 font-mono text-[10px]">Lowest MAE</span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Evaluated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Skill Definition:</strong> Skill_MAE = 1 - MAE_model / MAE_persistence. Positive indicates lower error than persistence.
          </div>
          <div>{selectedSplit === 'test' ? 'Scored sample size: 368 windows per horizon (1,104 predictions, 2021–2024)' : 'Validation sample size: 272 windows per horizon (816 predictions, 2018–2020)'}</div>
        </div>
      </div>

      {/* District-by-District Metrics for Persistence Baseline */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              District-Wise Disaggregated Metrics (Persistence Baseline Benchmark)
            </h2>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Evaluating spatial robustness across all 8 districts on the 2021–2024 test split (Persistence Forecaster).
            </div>
          </div>
          <span className="text-xs font-mono text-teal-400">N=46 windows (138 forecasts) per district</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="py-2 px-3">District</th>
                <th className="py-2 px-3 text-right">MAE (H+1)</th>
                <th className="py-2 px-3 text-right">MAE (H+2)</th>
                <th className="py-2 px-3 text-right">MAE (H+3)</th>
                <th className="py-2 px-3 text-right">R² (H+1)</th>
                <th className="py-2 px-3 text-right">R² (H+3)</th>
                <th className="py-2 px-3 text-right">Skill (H+1)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {DISTRICT_LIST.map(d => {
                const m = DISTRICT_EVALUATION_METRICS_M5[d.id];
                if (!m) return null;
                return (
                  <tr key={d.id} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2 px-3 font-semibold text-white">{d.name}</td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-bold">{m.maeH1.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right text-amber-300">{m.maeH2.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right text-rose-300">{m.maeH3.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right">{m.r2H1.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right">{m.r2H3.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-bold text-teal-400">
                      +{(m.skillH1 * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Independent Official Scarcity Validation Section (Master prompt Section 15) */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Independent Official Scarcity & Tanker Deployment Validation
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
            External Government Ground-Truth
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed">
          <strong>Methodological Safeguard:</strong> Official tanker records and drought declarations from the Government of Maharashtra (Water Supply & Sanitation Dept) are completely independent of WSI input features. WSI does NOT derive its labels from tanker data, nor is tanker absence taken as proof of zero stress.
        </div>

        {/* Contingency Scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-900/80 rounded border border-slate-800 font-mono text-xs">
            <div className="text-slate-400 text-[10px] uppercase">Probability of Detection (POD)</div>
            <div className="text-2xl font-bold text-teal-400 mt-0.5">
              {(scarcity.metrics.probabilityOfDetection * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Hits: {scarcity.metrics.hits} / {scarcity.metrics.totalEvents} scarcity events</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded border border-slate-800 font-mono text-xs">
            <div className="text-slate-400 text-[10px] uppercase">Critical Success Index (CSI)</div>
            <div className="text-2xl font-bold text-cyan-300 mt-0.5">
              {(scarcity.metrics.criticalSuccessIndex * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Threat Score: Hits / (Hits + Misses + FA)</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded border border-slate-800 font-mono text-xs">
            <div className="text-slate-400 text-[10px] uppercase">False Alarm Ratio (FAR)</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">
              {(scarcity.metrics.falseAlarmRatio * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">False Alarms: {scarcity.metrics.falseAlarms}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded border border-slate-800 font-mono text-xs">
            <div className="text-slate-400 text-[10px] uppercase">Average Warning Lead Time</div>
            <div className="text-2xl font-bold text-white mt-0.5">
              {scarcity.averageWarningLeadMonths} Months
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Precedes official GR gazette notification</div>
          </div>
        </div>

        {/* Scarcity Events Sample Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">District</th>
                <th className="py-2 px-3 text-right">Tankers Deployed</th>
                <th className="py-2 px-3 text-right">Scarcity Villages</th>
                <th className="py-2 px-3">Official Resolution (GR)</th>
                <th className="py-2 px-3 text-right">Observed WSI</th>
                <th className="py-2 px-3 text-center">WSI Flagged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {scarcity.records.slice(0, 8).map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/30 text-slate-300">
                  <td className="py-2 px-3 font-bold text-white">{r.date}</td>
                  <td className="py-2 px-3">{r.districtName}</td>
                  <td className="py-2 px-3 text-right text-amber-400 font-semibold">{r.tankersDeployed}</td>
                  <td className="py-2 px-3 text-right">{r.scarcityVillagesReported}</td>
                  <td className="py-2 px-3 text-slate-400 truncate max-w-[220px]" title={r.declarationDetails}>
                    {r.declarationDetails || (r.officialDeclaration ? 'Official Drought Order' : 'Monitoring')}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-400 font-bold">{r.actualWsi.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    {r.detectedByWsi ? (
                      <span className="text-teal-400 font-bold">✔ Detected</span>
                    ) : (
                      <span className="text-slate-500">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
