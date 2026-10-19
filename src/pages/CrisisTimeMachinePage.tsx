import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { HISTORICAL_WSI_RECORDS } from '../data/historicalData';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import { DistrictId } from '../types/wsi';
import { getStressCategory, getStressColor } from '../utils/wsiCalculations';

interface LandmarkEvent {
  id: string;
  year: number;
  month: string; // YYYY-MM
  title: string;
  description: string;
  districtsMostHit: DistrictId[];
}

const LANDMARK_EVENTS: LandmarkEvent[] = [
  {
    id: '2012_mega',
    year: 2012,
    month: '2012-10',
    title: '2012–2013 Ground-Water Collapse',
    description:
      'Catastrophic post-monsoon drought where 3-month accumulated rainfall failed by >45%. Groundwater levels in Beed and Dharashiv dropped by over 3.5 meters.',
    districtsMostHit: ['beed', 'dharashiv', 'jalna'],
  },
  {
    id: '2015_jaldoot',
    year: 2015,
    month: '2015-11',
    title: '2015–2016 Latur "Jaldoot" Water Express Crisis',
    description:
      'Severe consecutive monsoon failures exhausted Manjara Dam. By April 2016, Indian Railways mobilized 50-wagon special trains from Miraj carrying 2.5 million liters daily.',
    districtsMostHit: ['latur', 'beed', 'dharashiv', 'parbhani'],
  },
  {
    id: '2018_failure',
    year: 2018,
    month: '2018-10',
    title: '2018–2019 Regional Monsoon Deficit',
    description:
      'Widespread drought across all 8 districts with over 3,000 emergency water tankers mobilized across rural Marathwada.',
    districtsMostHit: ['csn', 'jalna', 'beed', 'hingoli'],
  },
  {
    id: '2023_el_nino',
    year: 2023,
    month: '2023-09',
    title: '2023–2024 Strong El Niño Drought',
    description:
      'August 2023 was the driest August in over a century across Central India, suppressing soil moisture during critical Kharif flowering.',
    districtsMostHit: ['jalna', 'beed', 'dharashiv'],
  },
];

export const CrisisTimeMachinePage: React.FC = () => {
  // Extract all distinct dates in chronological order
  const allDates = useMemo(() => {
    const set = new Set<string>();
    HISTORICAL_WSI_RECORDS.forEach((r) => set.add(r.date));
    return Array.from(set).sort();
  }, []);

  const [dateIndex, setDateIndex] = useState<number>(allDates.length - 1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dual compare state
  const [compareDateA, setCompareDateA] = useState<string>('2015-11');
  const [compareDateB, setCompareDateB] = useState<string>('2023-09');

  const currentDate = allDates[dateIndex] || allDates[0];

  // Records for current timeline scrubber
  const currentMonthRecords = useMemo(() => {
    return HISTORICAL_WSI_RECORDS.filter((r) => r.date === currentDate);
  }, [currentDate]);

  // Records for Year A & Year B compare
  const recordsA = useMemo(() => {
    return HISTORICAL_WSI_RECORDS.filter((r) => r.date === compareDateA);
  }, [compareDateA]);

  const recordsB = useMemo(() => {
    return HISTORICAL_WSI_RECORDS.filter((r) => r.date === compareDateB);
  }, [compareDateB]);

  // Animation playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(750 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setDateIndex((prev) => {
          if (prev >= allDates.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, allDates.length]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Historical Crisis Time-Machine & Dual-Year Compare
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Chronological spatiotemporal playback spanning 22 verified years (2003–2024). Compare
            landmark drought years side-by-side to analyze how soil moisture, groundwater depletion,
            and tanker mobilization interacted.
          </p>
        </div>
      </div>

      {/* Interactive Time Scrubber & Player Controls */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Spatiotemporal Time-Scrubber
            </span>
            <div className="text-3xl font-extrabold font-mono text-slate-100 mt-0.5">
              {currentDate}
            </div>
            <span className="text-xs text-slate-400">
              Month {dateIndex + 1} of {allDates.length} (2003–2024 Rectangular Panel)
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause Playback' : 'Play Timeline'}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setDateIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Reset to 2003"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1));
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              title="Change Speed"
            >
              {playbackSpeed}x Speed
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={allDates.length - 1}
            value={dateIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setDateIndex(parseInt(e.target.value));
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Jan 2003 (Origin)</span>
            <span>2012 Drought</span>
            <span>2015 "Jaldoot" Crisis</span>
            <span>2018 Drought</span>
            <span>Dec 2024 (Latest)</span>
          </div>
        </div>

        {/* 8-District Grid Snapshot for Current Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {currentMonthRecords.map((r) => {
            const dInfo = MARATHWADA_DISTRICTS[r.districtId];
            return (
              <div
                key={r.districtId}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200 truncate">{dInfo.name}</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: getStressColor(r.wsi) }}
                  >
                    {r.wsi.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Soil: {(r.components.soilStressZ ?? 0).toFixed(1)}z</span>
                  <span>Rain: {(r.components.spiStressZ ?? 0).toFixed(1)}z</span>
                  <span>GW: {(r.components.groundwaterStressZ ?? 0).toFixed(1)}z</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Landmark Historical Drought Presets */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Historic Crisis Landmark Presets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LANDMARK_EVENTS.map((event) => {
            return (
              <div
                key={event.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {event.year} Event
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">{event.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const idx = allDates.indexOf(event.month);
                        if (idx >= 0) {
                          setDateIndex(idx);
                          setIsPlaying(false);
                        }
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 font-mono transition-colors"
                    >
                      Jump to {event.month}
                    </button>
                    <button
                      onClick={() => setCompareDateA(event.month)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-indigo-300 font-mono transition-colors"
                    >
                      Set Left
                    </button>
                    <button
                      onClick={() => setCompareDateB(event.month)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-rose-300 font-mono transition-colors"
                    >
                      Set Right
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                <div className="text-[11px] text-slate-500">
                  Severely Impacted:{' '}
                  {event.districtsMostHit.map((d) => MARATHWADA_DISTRICTS[d].name).join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split-Screen Dual-Year Comparative Analysis */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Split-Screen Dual-Year Crisis Comparison
            </h2>
            <p className="text-xs text-slate-400">
              Side-by-side district stress comparison between two historical observation dates.
            </p>
          </div>
        </div>

        {/* Date Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Year A Selector */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-2">
            <label className="text-xs font-semibold text-indigo-300 block">
              Event A (Left Timeline):
            </label>
            <select
              value={compareDateA}
              onChange={(e) => setCompareDateA(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              {allDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Year B Selector */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/30 space-y-2">
            <label className="text-xs font-semibold text-rose-300 block">
              Event B (Right Timeline):
            </label>
            <select
              value={compareDateB}
              onChange={(e) => setCompareDateB(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              {allDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side Table Comparison */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3 text-indigo-300">{compareDateA} WSI</th>
                <th className="py-2.5 px-3 text-rose-300">{compareDateB} WSI</th>
                <th className="py-2.5 px-3">Delta (B - A)</th>
                <th className="py-2.5 px-3">Primary Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {DISTRICT_LIST.map((dist) => {
                const recA = recordsA.find((r) => r.districtId === dist.id);
                const recB = recordsB.find((r) => r.districtId === dist.id);
                const valA = recA ? recA.wsi : 0;
                const valB = recB ? recB.wsi : 0;
                const delta = valB - valA;

                return (
                  <tr key={dist.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-200">{dist.name}</td>
                    <td className="py-3 px-3 font-mono" style={{ color: getStressColor(valA) }}>
                      {valA.toFixed(2)} ({getStressCategory(valA)})
                    </td>
                    <td className="py-3 px-3 font-mono" style={{ color: getStressColor(valB) }}>
                      {valB.toFixed(2)} ({getStressCategory(valB)})
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span
                        className={
                          delta > 0
                            ? 'text-rose-400 flex items-center gap-1'
                            : 'text-emerald-400 flex items-center gap-1'
                        }
                      >
                        {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {Math.abs(delta) < 0.2
                        ? 'Comparable regional stress'
                        : delta > 0
                        ? `Event B experienced higher soil/thermal stress`
                        : `Event A was more severe`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
