import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Droplets,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import {
  HISTORICAL_WSI_RECORDS,
  LATEST_DATASET_DATE,
  LATEST_REGIONAL_RECORDS,
  OPERATIONAL_FORECASTS,
} from '../data/historicalData';
import { MODEL_EVALUATION_SUMMARIES, ROLLING_BACKTEST_METRICS } from '../data/modelMetrics';
import { DistrictId, WeightingScheme } from '../types/wsi';
import { getStressCategory, getStressColor, THRESHOLD_SEVERE } from '../utils/wsiCalculations';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { DistrictsBarChart } from '../components/charts/DistrictsBarChart';
import { ComponentRadarChart } from '../components/charts/ComponentRadarChart';

interface OverviewPageProps {
  weightScheme: WeightingScheme;
  onNavigate: (route: string) => void;
  onSelectDistrict: (districtId: DistrictId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  weightScheme,
  onNavigate,
  onSelectDistrict,
}) => {
  // Compute regional aggregates for the latest observed date (2024-12)
  const stats = useMemo(() => {
    const records = LATEST_REGIONAL_RECORDS;
    const n = records.length;
    const sumWsi = records.reduce((acc, r) => acc + (weightScheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi)), 0);
    const meanWsi = n > 0 ? Math.round((sumWsi / n) * 1000) / 1000 : 0;

    const severeDistricts = records.filter(r => (weightScheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi)) >= THRESHOLD_SEVERE);
    const moderateDistricts = records.filter(r => {
      const val = weightScheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi);
      return val >= 0.5 && val < THRESHOLD_SEVERE;
    });
    const normalDistricts = records.filter(r => {
      const val = weightScheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi);
      return val >= -0.5 && val < 0.5;
    });
    const wetDistricts = records.filter(r => (weightScheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi)) < -0.5);

    // Component regional means
    const compMean = {
      spiStressZ: records.reduce((a, b) => a + b.components.spiStressZ, 0) / n,
      soilStressZ: records.reduce((a, b) => a + b.components.soilStressZ, 0) / n,
      ndviStressZ: records.reduce((a, b) => a + b.components.ndviStressZ, 0) / n,
      lstStressZ: records.reduce((a, b) => a + b.components.lstStressZ, 0) / n,
      groundwaterStressZ: records.reduce((a, b) => a + b.components.groundwaterStressZ, 0) / n,
      surfaceWaterStressZ: records.reduce((a, b) => a + b.components.surfaceWaterStressZ, 0) / n,
    };

    return {
      meanWsi,
      severeCount: severeDistricts.length,
      moderateCount: moderateDistricts.length,
      normalCount: normalDistricts.length,
      wetCount: wetDistricts.length,
      compMean,
    };
  }, [weightScheme]);

  // Aggregate monthly regional time-series 2003–2024 from real records
  const regionalTimeSeries = useMemo(() => {
    const dates = Array.from(new Set(HISTORICAL_WSI_RECORDS.map(r => r.date))).sort();
    return dates.map(date => {
      const monthRecs = HISTORICAL_WSI_RECORDS.filter(r => r.date === date);
      const sumW0 = monthRecs.reduce((a, b) => a + b.wsi, 0);
      const sumW1 = monthRecs.reduce((a, b) => a + (b.wsi_w1_experimental ?? b.wsi), 0);
      const meanW0 = Math.round((sumW0 / monthRecs.length) * 1000) / 1000;
      return {
        date,
        wsi: meanW0,
        wsi_w1: Math.round((sumW1 / monthRecs.length) * 1000) / 1000,
        category: getStressCategory(meanW0),
      };
    });
  }, []);

  // Districts comparative bar data from real records
  const districtsBarData = useMemo(() => {
    return DISTRICT_LIST.map(d => {
      const obs = LATEST_REGIONAL_RECORDS.find(r => r.districtId === d.id);
      const h1 = OPERATIONAL_FORECASTS.find(f => f.districtId === d.id && f.horizon === 1);
      const h2 = OPERATIONAL_FORECASTS.find(f => f.districtId === d.id && f.horizon === 2);
      const h3 = OPERATIONAL_FORECASTS.find(f => f.districtId === d.id && f.horizon === 3);

      return {
        districtId: d.id,
        districtName: d.name,
        observedWsi: obs ? (weightScheme === 'W0' ? obs.wsi : (obs.wsi_w1_experimental ?? obs.wsi)) : 0.0,
        forecastH1: h1?.predictedWsi,
        forecastH2: h2?.predictedWsi,
        forecastH3: h3?.predictedWsi,
      };
    });
  }, [weightScheme]);

  const pModel = MODEL_EVALUATION_SUMMARIES['Persistence'];
  const backtestWinner = ROLLING_BACKTEST_METRICS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Marathwada Division</span>
            <span aria-hidden="true">·</span>
            <span>Maharashtra State</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">8 Revenue Districts (2,112 Verified Observations)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Regional Hydroclimatic Water Stress Overview
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Six-component standardized environmental index with multi-step sequence benchmarking across 2003–2024.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-2 rounded-md border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Latest Record: {LATEST_DATASET_DATE}</span>
          <span className="text-slate-600">|</span>
          <span className="text-teal-400">Authoritative Dataset Synced</span>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Regional Mean WSI</span>
            <span className="text-[10px] text-slate-400">{LATEST_DATASET_DATE}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {stats.meanWsi > 0 ? `+${stats.meanWsi.toFixed(3)}` : stats.meanWsi.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-teal-400 font-medium">
              {getStressCategory(stats.meanWsi)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Unweighted arithmetic mean of 8 districts ({weightScheme === 'W0' ? 'Equal 1/6' : 'Experimental Domain'})
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Current Distribution</span>
            <span className="text-[10px] text-slate-400">8 Districts</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300 tracking-tight">
              {stats.normalCount + stats.wetCount} Normal/Wet
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {stats.moderateCount} moderate · {stats.severeCount} severe
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Test Period Champion</span>
            <span className="text-[10px] text-teal-400">Test 2021–2024</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {pModel.overallMae.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-teal-400">MAE (Persistence)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Beats complex models during wet La Niña test period
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>20-Year Backtest Winner</span>
            <span className="text-[10px] text-teal-400">2,880 Windows</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-teal-400 tracking-tight">
              {backtestWinner.overallMae.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-slate-400">MAE (WSI-AR)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {backtestWinner.skillVsPersistence} skill over persistence across 2004–2024
          </div>
        </div>
      </div>

      {/* Main Grid: Historical Trend + 8-District Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2-column: Historical WSI Trend */}
        <div className="lg:col-span-2 p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Authoritative Regional WSI Historical Trajectory (2003–2024)
              </h2>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                Monthly 8-district regional average from outputs/Marathwada_MODEL_DATASET_2003_2024.csv.
              </div>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
            >
              <span>Explore History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <TimeSeriesChart
            data={regionalTimeSeries}
            height={280}
            showW1Comparison={weightScheme === 'W1_experimental'}
          />

          <div className="flex flex-wrap items-center gap-6 mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              <span>Observed WSI (W0)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span>Severe Stress (&ge; 1.50)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-amber-500 inline-block" />
              <span>Moderate Stress (0.50 to 1.50)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-500 inline-block" />
              <span>Very Wet (&lt; -1.50)</span>
            </div>
          </div>
        </div>

        {/* 1-column: Six Component Radar Breakdown */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Regional Component Profile
              </h2>
              <span className="text-[11px] font-mono text-slate-400">{LATEST_DATASET_DATE}</span>
            </div>
            <div className="text-xs text-slate-400 mb-3">
              Standardized z-scores across the six hydroclimatic indicator streams.
            </div>
          </div>

          <ComponentRadarChart components={stats.compMean} height={240} />

          <div className="space-y-1.5 mt-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Precipitation Deficit (SPI-3):</span>
              <span className={stats.compMean.spiStressZ > 0 ? 'text-rose-400' : 'text-teal-400'}>
                {stats.compMean.spiStressZ > 0 ? `+${stats.compMean.spiStressZ.toFixed(2)}σ` : `${stats.compMean.spiStressZ.toFixed(2)}σ`}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Soil Moisture Deficit:</span>
              <span className={stats.compMean.soilStressZ > 0 ? 'text-rose-400' : 'text-teal-400'}>
                {stats.compMean.soilStressZ > 0 ? `+${stats.compMean.soilStressZ.toFixed(2)}σ` : `${stats.compMean.soilStressZ.toFixed(2)}σ`}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Groundwater Depth Drop:</span>
              <span className={stats.compMean.groundwaterStressZ > 0 ? 'text-rose-400' : 'text-teal-400'}>
                {stats.compMean.groundwaterStressZ > 0 ? `+${stats.compMean.groundwaterStressZ.toFixed(2)}σ` : `${stats.compMean.groundwaterStressZ.toFixed(2)}σ`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Eight Districts Comparative Section */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Eight Districts: Current Observed ({LATEST_DATASET_DATE}) vs. Test Forecasts
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Authoritative values from the verified Marathwada model dataset panel.
            </div>
          </div>
          <button
            onClick={() => onNavigate('forecasts')}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
          >
            <span>View Full District Forecast Table</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <DistrictsBarChart data={districtsBarData} height={280} />

        {/* District Quick Select Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 pt-4 border-t border-slate-800">
          {DISTRICT_LIST.map(d => {
            const obs = LATEST_REGIONAL_RECORDS.find(r => r.districtId === d.id);
            const val = obs ? (weightScheme === 'W0' ? obs.wsi : (obs.wsi_w1_experimental ?? obs.wsi)) : 0.0;
            const cat = getStressCategory(val);
            const color = getStressColor(cat);

            return (
              <button
                key={d.id}
                onClick={() => {
                  onSelectDistrict(d.id);
                  onNavigate('forecasts');
                }}
                className={`p-2.5 rounded border text-left transition-all hover:border-cyan-500/60 bg-slate-900/60 ${color.border}`}
              >
                <div className="text-xs font-semibold text-slate-200 truncate font-sans">
                  {d.name}
                </div>
                <div className="text-base font-bold font-mono mt-1" style={{ color: color.hex }}>
                  {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  {cat}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
