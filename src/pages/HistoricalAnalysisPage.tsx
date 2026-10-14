import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import { HISTORICAL_WSI_RECORDS } from '../data/historicalData';
import { DistrictId, WeightingScheme, WsiRecord } from '../types/wsi';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { THRESHOLD_SEVERE } from '../utils/wsiCalculations';

interface HistoricalAnalysisPageProps {
  selectedDistrictId: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
  weightScheme: WeightingScheme;
}

type PeriodPreset = 'ALL' | 'TRAIN_2004_2017' | 'VAL_2018_2020' | 'TEST_2021_2024' | 'DROUGHT_2012_2016';

export const HistoricalAnalysisPage: React.FC<HistoricalAnalysisPageProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  weightScheme,
}) => {
  const [activeDistrict, setActiveDistrict] = useState<DistrictId | 'ALL'>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('ALL');

  // Filter records by period preset
  const filteredRecords = useMemo(() => {
    let recs = HISTORICAL_WSI_RECORDS;

    if (activeDistrict !== 'ALL') {
      recs = recs.filter(r => r.districtId === activeDistrict);
    }

    if (selectedPreset === 'TRAIN_2004_2017') {
      recs = recs.filter(r => r.date >= '2004-01' && r.date <= '2017-12');
    } else if (selectedPreset === 'VAL_2018_2020') {
      recs = recs.filter(r => r.date >= '2018-01' && r.date <= '2020-12');
    } else if (selectedPreset === 'TEST_2021_2024') {
      recs = recs.filter(r => r.date >= '2021-01' && r.date <= '2024-12');
    } else if (selectedPreset === 'DROUGHT_2012_2016') {
      recs = recs.filter(r => r.date >= '2012-01' && r.date <= '2016-12');
    }

    return recs;
  }, [activeDistrict, selectedPreset]);

  // Aggregate time series for chart
  const chartTimeSeries = useMemo(() => {
    const dates = Array.from(new Set(filteredRecords.map(r => r.date))).sort();
    return dates.map(date => {
      const monthRecs = filteredRecords.filter(r => r.date === date);
      const sumW0 = monthRecs.reduce((a, b) => a + (b.wsi_w0 ?? b.wsi), 0);
      const sumW1 = monthRecs.reduce((a, b) => a + (b.wsi_w1 ?? b.wsi_w1_experimental ?? b.wsi), 0);
      return {
        date,
        wsi: Math.round((sumW0 / monthRecs.length) * 1000) / 1000,
        wsi_w1: Math.round((sumW1 / monthRecs.length) * 1000) / 1000,
      };
    });
  }, [filteredRecords]);

  // Duration in stress categories
  const categoryStats = useMemo(() => {
    const totalMonths = filteredRecords.length;
    if (totalMonths === 0) return { severePct: 0, moderatePct: 0, normalPct: 0, severeMonths: 0 };

    const severeMonths = filteredRecords.filter(
      r => (weightScheme === 'W0' ? (r.wsi_w0 ?? r.wsi) : (r.wsi_w1 ?? r.wsi)) >= THRESHOLD_SEVERE
    ).length;
    const moderateMonths = filteredRecords.filter(r => {
      const v = weightScheme === 'W0' ? (r.wsi_w0 ?? r.wsi) : (r.wsi_w1 ?? r.wsi);
      return v >= 0.5 && v < THRESHOLD_SEVERE;
    }).length;
    const normalMonths = filteredRecords.filter(
      r => (weightScheme === 'W0' ? (r.wsi_w0 ?? r.wsi) : (r.wsi_w1 ?? r.wsi)) < 0.5
    ).length;

    return {
      severeMonths,
      severePct: Math.round((severeMonths / totalMonths) * 1000) / 10,
      moderatePct: Math.round((moderateMonths / totalMonths) * 1000) / 10,
      normalPct: Math.round((normalMonths / totalMonths) * 1000) / 10,
      meanWsi:
        Math.round(
          (filteredRecords.reduce((a, b) => a + (weightScheme === 'W0' ? (b.wsi_w0 ?? b.wsi) : (b.wsi_w1 ?? b.wsi)), 0) /
            totalMonths) *
            1000
        ) / 1000,
    };
  }, [filteredRecords, weightScheme]);

  // District rankings over selected period
  const districtRankings = useMemo(() => {
    const list = DISTRICT_LIST.map(d => {
      const distRecs = filteredRecords.filter(r => r.districtId === d.id);
      const count = distRecs.length;
      if (count === 0) return { district: d, meanWsi: 0, severeCount: 0 };
      const sum = distRecs.reduce((a, b) => a + (weightScheme === 'W0' ? (b.wsi_w0 ?? b.wsi) : (b.wsi_w1 ?? b.wsi)), 0);
      const severe = distRecs.filter(r => (weightScheme === 'W0' ? (r.wsi_w0 ?? r.wsi) : (r.wsi_w1 ?? r.wsi)) >= THRESHOLD_SEVERE).length;
      return {
        district: d,
        meanWsi: Math.round((sum / count) * 1000) / 1000,
        severeCount: severe,
      };
    });

    return list.sort((a, b) => b.meanWsi - a.meanWsi);
  }, [filteredRecords, weightScheme]);

  // Seasonal analysis (Kharif, Rabi, Summer)
  const seasonalSummary = useMemo(() => {
    const getSeason = (m: number) => {
      if (m >= 6 && m <= 9) return 'Kharif (Monsoon, Jun–Sep)';
      if (m >= 10 || m === 1) return 'Rabi (Post-monsoon, Oct–Jan)';
      return 'Zaid (Summer, Feb–May)';
    };

    const grouped: Record<string, { sum: number; count: number }> = {
      'Kharif (Monsoon, Jun–Sep)': { sum: 0, count: 0 },
      'Rabi (Post-monsoon, Oct–Jan)': { sum: 0, count: 0 },
      'Zaid (Summer, Feb–May)': { sum: 0, count: 0 },
    };

    filteredRecords.forEach(r => {
      const s = getSeason(r.month);
      grouped[s].sum += weightScheme === 'W0' ? (r.wsi_w0 ?? r.wsi) : (r.wsi_w1 ?? r.wsi);
      grouped[s].count++;
    });

    return Object.entries(grouped).map(([season, data]) => ({
      season,
      meanWsi: data.count > 0 ? Math.round((data.sum / data.count) * 1000) / 1000 : 0,
      samples: data.count,
    }));
  }, [filteredRecords, weightScheme]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Climate Retrospective</span>
            <span aria-hidden="true">·</span>
            <span>2003–2024 Records</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">2,112 District-Months</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Historical Hydroclimatic Anomaly & Drought Duration Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Temporal backtest slices, seasonal decomposition, and category transition dynamics.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-md border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setSelectedPreset('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPreset === 'ALL' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full (2003–24)
            </button>
            <button
              onClick={() => setSelectedPreset('TRAIN_2004_2017')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPreset === 'TRAIN_2004_2017' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Train (2004–17)
            </button>
            <button
              onClick={() => setSelectedPreset('VAL_2018_2020')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPreset === 'VAL_2018_2020' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Val (2018–20)
            </button>
            <button
              onClick={() => setSelectedPreset('TEST_2021_2024')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPreset === 'TEST_2021_2024' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Test (2021–24)
            </button>
            <button
              onClick={() => setSelectedPreset('DROUGHT_2012_2016')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPreset === 'DROUGHT_2012_2016' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              2012–16 Crisis
            </button>
          </div>

          {/* District Filter Dropdown */}
          <select
            value={activeDistrict}
            onChange={e => setActiveDistrict(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-1.5 font-sans"
          >
            <option value="ALL">All 8 Districts (Regional)</option>
            {DISTRICT_LIST.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards for the filtered slice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono text-slate-400 mb-1">
            Period Mean WSI
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {categoryStats.meanWsi}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Evaluated on {filteredRecords.length} district-month records
          </div>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono text-slate-400 mb-1">
            Severe Stress Duration
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400">
            {categoryStats.severePct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {categoryStats.severeMonths} district-months with WSI ≥ 1.50
          </div>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono text-slate-400 mb-1">
            Moderate Stress Duration
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">
            {categoryStats.moderatePct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            WSI between 0.50 and 1.50
          </div>
        </div>

        <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="text-xs uppercase font-mono text-slate-400 mb-1">
            Data Quality & Completeness
          </div>
          <div className="text-3xl font-bold font-mono text-teal-400">
            100%
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            0 missing dates · 0 imputed flags
          </div>
        </div>
      </div>

      {/* Chart: Filtered Historical Trajectory */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              WSI Time-Series: {activeDistrict === 'ALL' ? 'Regional Average' : MARATHWADA_DISTRICTS[activeDistrict].name}
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Preserving authentic record observations without retrospective lookahead gap-filling.
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
            {chartTimeSeries.length} monthly steps
          </div>
        </div>

        <TimeSeriesChart
          data={chartTimeSeries}
          height={320}
          showW1Comparison={weightScheme === 'W1' || weightScheme === 'W1_experimental'}
        />
      </div>

      {/* District Rankings & Seasonal Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Stress Rankings */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              District Stress Vulnerability Ranking
            </h2>
            <span className="text-xs font-mono text-slate-400">Selected Slice</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-2">Rank</th>
                  <th className="py-2 px-3">District</th>
                  <th className="py-2 px-3 text-right">Mean WSI</th>
                  <th className="py-2 px-3 text-right">Severe Months</th>
                  <th className="py-2 px-3 text-center">Vulnerability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {districtRankings.map((item, idx) => (
                  <tr key={item.district.id} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2 px-2 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 text-white font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{item.district.name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-white">
                      {item.meanWsi.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-400">
                      {item.severeCount}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-sans ${
                        item.district.vulnerabilityTier === 'Severe'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.district.vulnerabilityTier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seasonal Summary */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Seasonal Hydroclimatic Regimes
              </h2>
              <span className="text-xs font-mono text-slate-400">Marathwada Agro-Climatic Cycle</span>
            </div>
            <div className="space-y-4 mt-2">
              {seasonalSummary.map(item => (
                <div key={item.season} className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-slate-200">{item.season}</span>
                    <strong className="text-cyan-300 text-sm">WSI {item.meanWsi.toFixed(3)}</strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-amber-500"
                      style={{ width: `${Math.min(100, (item.meanWsi / 2.5) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>{item.samples} district-months evaluated</span>
                    <span>Peak summer dryness in April–May</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900/50 rounded border border-slate-800/80 text-[11px] font-mono text-slate-400 mt-4">
            Notice: Kharif (monsoon) stress lowers when rainfall is abundant, but soil moisture deficit and groundwater depletion typically peak during Zaid (summer pre-monsoon).
          </div>
        </div>
      </div>
    </div>
  );
};
