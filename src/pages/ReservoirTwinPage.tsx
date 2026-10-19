import React, { useState, useMemo } from 'react';
import {
  Waves,
  Droplets,
  ArrowDown,
  Layers,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  MARATHWADA_RESERVOIRS,
  ReservoirData,
  simulateDamRelease,
} from '../data/reservoirs';
import { MARATHWADA_DISTRICTS } from '../data/districts';
import { DistrictId } from '../types/wsi';
import { WaterRippleImage } from '../components/ui/WaterRippleImage';

interface ReservoirTwinPageProps {
  onSelectDistrict?: (districtId: DistrictId) => void;
  onNavigate?: (route: string) => void;
}

export const ReservoirTwinPage: React.FC<ReservoirTwinPageProps> = ({
  onSelectDistrict,
  onNavigate,
}) => {
  const [selectedDamId, setSelectedDamId] = useState<string>('jayakwadi');
  const [releaseSimTmc, setReleaseSimTmc] = useState<number>(3.0);

  const selectedDam = useMemo(() => {
    return MARATHWADA_RESERVOIRS.find((d) => d.id === selectedDamId) || MARATHWADA_RESERVOIRS[0];
  }, [selectedDamId]);

  // Dam release simulation result
  const simResult = useMemo(() => {
    return simulateDamRelease(selectedDamId, releaseSimTmc);
  }, [selectedDamId, releaseSimTmc]);

  // Total regional storage aggregates
  const regionalStorage = useMemo(() => {
    const totalGross = MARATHWADA_RESERVOIRS.reduce((acc, d) => acc + d.grossCapacityTmc, 0);
    const totalLive = MARATHWADA_RESERVOIRS.reduce((acc, d) => acc + d.liveCapacityTmc, 0);
    const currentLive = MARATHWADA_RESERVOIRS.reduce((acc, d) => acc + d.currentLiveStorageTmc, 0);
    const avgPercent = (currentLive / totalLive) * 100;

    return {
      totalGross: parseFloat(totalGross.toFixed(1)),
      totalLive: parseFloat(totalLive.toFixed(1)),
      currentLive: parseFloat(currentLive.toFixed(1)),
      avgPercent: parseFloat(avgPercent.toFixed(1)),
    };
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Waves className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Godavari Basin & Reservoir Digital Twin
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Hydrological network twin tracking 8 major irrigation reservoirs across the Godavari and
            Krishna sub-basins. Simulates downstream water discharge cascades, live storage vs. dead
            storage thresholds, and inter-district supply corridors.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg self-start md:self-auto">
          <span>Source: Central Water Commission (CWC) & Maharashtra WRD</span>
        </div>
      </div>

      {/* Regional Live Storage Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            Total Basin Gross Storage
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {regionalStorage.totalGross} TMC
          </div>
          <span className="text-[11px] text-slate-500">Across 8 major reservoirs</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Design Live Capacity
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-300">
            {regionalStorage.totalLive} TMC
          </div>
          <span className="text-[11px] text-slate-500">Excluding permanent dead buffer</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Current Live Storage
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {regionalStorage.currentLive} TMC
          </div>
          <span className="text-[11px] text-slate-500">
            {regionalStorage.avgPercent}% of regional live capacity
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Primary Anchor Reservoir
          </span>
          <div className="mt-2 text-xl font-bold text-slate-100 truncate">Jayakwadi (Paithan)</div>
          <span className="text-[11px] text-cyan-400">76.67 TMC Live Design (56% of basin)</span>
        </div>
      </div>

      {/* Reservoir Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {MARATHWADA_RESERVOIRS.map((dam) => {
          const isSelected = dam.id === selectedDamId;
          return (
            <button
              key={dam.id}
              onClick={() => {
                setSelectedDamId(dam.id);
                setReleaseSimTmc(Math.min(3.0, parseFloat((dam.currentLiveStorageTmc * 0.25).toFixed(1))));
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/20'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {dam.name.split(' ')[0]} ({dam.river})
            </button>
          );
        })}
      </div>

      {/* Selected Dam In-Depth Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dam Technical Specifications Card */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 lg:col-span-1">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              {selectedDam.basin}
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-1">{selectedDam.name}</h2>
            <p className="text-xs text-slate-400">{selectedDam.marathiName}</p>
          </div>

          {/* Live Hydro-Surface Acoustic Ripple (WebGL Simulation) */}
          <div className="relative h-28 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-inner group">
            <WaterRippleImage
              blueish={0.55}
              scale={6.5}
              illumination={0.2}
              surfaceDistortion={0.035}
              waterDistortion={0.02}
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-cyan-200 pointer-events-none">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Reservoir Hydro-Acoustic Surface
              </span>
              <span className="text-slate-300 font-semibold">{selectedDam.currentLevelM} m FRL</span>
            </div>
          </div>

          {/* Visual Storage Meter */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Live Storage Fill Level:</span>
              <span className="font-mono font-bold text-cyan-300">
                {selectedDam.currentStoragePercent}% ({selectedDam.currentLiveStorageTmc} TMC)
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, selectedDam.currentStoragePercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0 TMC (Dead Buffer: {selectedDam.deadStorageTmc} TMC)</span>
              <span>FRL: {selectedDam.liveCapacityTmc} TMC</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs border-t border-slate-800/80 pt-4 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">River:</span>
              <span className="font-medium text-slate-100">{selectedDam.river}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Primary District:</span>
              <span className="font-medium text-slate-100">
                {MARATHWADA_DISTRICTS[selectedDam.primaryDistrict].name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Full Reservoir Level (FRL):</span>
              <span className="font-mono text-slate-100">{selectedDam.fullReservoirLevelM} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Water Level:</span>
              <span className="font-mono text-cyan-300">{selectedDam.currentLevelM} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Irrigation Potential:</span>
              <span className="font-mono text-slate-100">
                {selectedDam.irrigationPotentialHa.toLocaleString()} Ha
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Historical Crisis Reference ({selectedDam.historicalLowYear.year})
            </span>
            <p className="text-slate-300">
              Low: <span className="font-mono text-rose-400">{selectedDam.historicalLowYear.lowestPercent}%</span>.{' '}
              {selectedDam.historicalLowYear.description}
            </p>
          </div>
        </div>

        {/* Upstream Dam Water Release Simulator */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Downstream Water Release & Canal Discharge Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Simulates releasing storage from {selectedDam.name} down the canal/river network,
                accounting for transit losses (~15%) and computing stress relief.
              </p>
            </div>
          </div>

          {/* Release Slider */}
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Discharge Volume to Release:</span>
              <span className="font-mono font-bold text-cyan-300 text-sm">
                {releaseSimTmc.toFixed(1)} TMC ({(releaseSimTmc * 28.3168).toFixed(1)} MCM)
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max={Math.max(1, selectedDam.currentLiveStorageTmc - 0.5)}
              step="0.5"
              value={releaseSimTmc}
              onChange={(e) => setReleaseSimTmc(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Min: 0.5 TMC</span>
              <span>
                Simulated Remaining in Dam: {simResult.upstreamRemainingTmc} TMC (
                {simResult.upstreamNewPercent}%)
              </span>
            </div>
          </div>

          {/* Downstream Beneficiary Impact Cards */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Projected Downstream Relief Across Beneficiary Districts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {simResult.downstreamBeneficiaries.map((b, idx) => {
                const benDistrict = MARATHWADA_DISTRICTS[b.districtId];
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        {benDistrict.name}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Water Received: ~{b.estimatedWaterAddedMcm} MCM
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        -{b.stressReliefWsi.toFixed(2)} WSI
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Surface Relief
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hydrological River Cascade Map Schematic */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Godavari Mainstem Cascade Sequence
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-2 text-slate-300 font-mono">
              <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 shrink-0">
                Jayakwadi (Paithan)
              </span>
              <ArrowDown className="w-4 h-4 text-slate-500 -rotate-90 shrink-0" />
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                Lower Dudhna & Majalgaon Inflows
              </span>
              <ArrowDown className="w-4 h-4 text-slate-500 -rotate-90 shrink-0" />
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                Purna River Confluence (Yeldari/Siddheshwar)
              </span>
              <ArrowDown className="w-4 h-4 text-slate-500 -rotate-90 shrink-0" />
              <span className="px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 shrink-0">
                Vishnupuri Barrage (Nanded)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
