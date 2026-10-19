import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Truck,
  Wheat,
  Clock,
  Droplets,
  Calendar,
  Building2,
  CheckCircle2,
  Radio,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import { LATEST_REGIONAL_RECORDS, OPERATIONAL_FORECASTS } from '../data/historicalData';
import { DistrictId, WeightingScheme } from '../types/wsi';
import { getStressCategory, getStressColor } from '../utils/wsiCalculations';
import {
  DROUGHT_ACTION_MILESTONES,
  MARATHWADA_CROPS,
  calculateTankerRequirement,
} from '../data/policyProtocols';
import {
  fetchLiveDistrictTelemetry,
  LiveDistrictTelemetry,
} from '../services/realtimeWeatherService';

interface DroughtWarRoomPageProps {
  selectedDistrictId: DistrictId;
  onSelectDistrict: (districtId: DistrictId) => void;
  weightScheme: WeightingScheme;
  onNavigate: (route: string) => void;
}

export const DroughtWarRoomPage: React.FC<DroughtWarRoomPageProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  weightScheme,
  onNavigate,
}) => {
  const [liveTelemetry, setLiveTelemetry] = useState<LiveDistrictTelemetry | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [customWsiOffset, setCustomWsiOffset] = useState<number>(0);

  const district = MARATHWADA_DISTRICTS[selectedDistrictId];

  // Latest verified historical record
  const currentRecord = useMemo(() => {
    return (
      LATEST_REGIONAL_RECORDS.find((r) => r.districtId === selectedDistrictId) ||
      LATEST_REGIONAL_RECORDS[0]
    );
  }, [selectedDistrictId]);

  const baseWsi =
    weightScheme === 'W0'
      ? currentRecord.wsi
      : (currentRecord.wsi_w1_experimental ?? currentRecord.wsi);

  const activeWsi = Math.max(-2, Math.min(3.5, baseWsi + customWsiOffset));

  const h1Forecast = OPERATIONAL_FORECASTS.find(f => f.districtId === selectedDistrictId && f.horizon === 1);
  const forecastH1 = h1Forecast ? h1Forecast.predictedWsi : activeWsi;

  // Real-time weather fetch
  useEffect(() => {
    let isMounted = true;
    setIsLoadingLive(true);
    fetchLiveDistrictTelemetry(selectedDistrictId)
      .then((telemetry) => {
        if (isMounted) {
          setLiveTelemetry(telemetry);
          setIsLoadingLive(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching live telemetry:', err);
        if (isMounted) setIsLoadingLive(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDistrictId]);

  // Tanker calculations
  const tankerData = useMemo(() => {
    return calculateTankerRequirement(selectedDistrictId, activeWsi);
  }, [selectedDistrictId, activeWsi]);

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Drought War Room & Policy Action Matrix
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Operational disaster contingency interface calibrated to the Maharashtra State Disaster
            Management Authority (SDMA) and GoI Drought Management Manual. Translates hydroclimatic
            stress forecasts into immediate statutory orders, tanker fleet deployments, and crop
            advisories.
          </p>
        </div>

        {/* Live Weather Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                liveTelemetry?.isLiveApiData ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
              }`}
            />
            <span className="text-slate-300 font-mono">
              {isLoadingLive
                ? 'Connecting to Open-Meteo...'
                : liveTelemetry?.isLiveApiData
                ? 'Open-Meteo Live API Active'
                : 'Climatological Normal'}
            </span>
          </div>
        </div>
      </div>

      {/* District Selector & Real-Time Telemetry Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* District Selector */}
        <div className="lg:col-span-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selected District
          </label>
          <select
            value={selectedDistrictId}
            onChange={(e) => {
              onSelectDistrict(e.target.value as DistrictId);
              setCustomWsiOffset(0);
            }}
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            {DISTRICT_LIST.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.marathiName})
              </option>
            ))}
          </select>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>District Headquarter:</span>
              <span className="text-slate-200 font-medium">{district.headquarters}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Population (2011):</span>
              <span className="text-slate-200 font-medium">
                {district.population2011.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Primary Reservoir:</span>
              <span className="text-slate-200 font-medium truncate max-w-[150px]">
                {district.primaryReservoir}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Atmospheric Telemetry Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              Air Temperature
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
              {liveTelemetry ? `${liveTelemetry.currentTempCelsius}°C` : '--'}
            </div>
            <span className="text-[11px] text-slate-500">
              Apparent: {liveTelemetry ? `${liveTelemetry.apparentTempCelsius}°C` : '--'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              7-Day Precip Forecast
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">
              {liveTelemetry ? `${liveTelemetry.precipitationForecast7dMm} mm` : '--'}
            </div>
            <span className="text-[11px] text-slate-500">
              Past 24h: {liveTelemetry ? `${liveTelemetry.precipitationPast24hMm} mm` : '--'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Wheat className="w-3.5 h-3.5 text-emerald-400" />
              Root-Zone Moisture
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">
              {liveTelemetry ? `${(liveTelemetry.soilMoistureRootZone * 100).toFixed(1)}%` : '--'}
            </div>
            <span className="text-[11px] text-slate-500">Depth: 28–100 cm</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Operational WSI
            </span>
            <div
              className="mt-2 text-2xl font-bold font-mono"
              style={{ color: getStressColor(getStressCategory(activeWsi)).hex }}
            >
              {activeWsi.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400">{getStressCategory(activeWsi)}</span>
          </div>
        </div>
      </div>

      {/* Stress Interactive Simulation Slider */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-semibold text-slate-200">Stress Severity Sensitivity Slider: </span>
          <span className="text-slate-400 text-xs">
            Adjust WSI index to test policy triggers & tanker demand response curves.
          </span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-80">
          <input
            type="range"
            min="-1.0"
            max="1.5"
            step="0.1"
            value={customWsiOffset}
            onChange={(e) => setCustomWsiOffset(parseFloat(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <button
            onClick={() => setCustomWsiOffset(0)}
            className="p-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset to baseline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tanker Fleet Operational Demand Calculator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Official Tanker Fleet Demand Calculator
              </h2>
              <p className="text-xs text-slate-400">
                Based on Maharashtra Water Supply & Sanitation Department scarcity norm (20
                L/capita/day, 10 kL tankers, 3 trips/day).
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 self-start sm:self-auto"
            style={{
              borderColor:
                tankerData.severityGrade === 'Critical'
                  ? '#ef4444'
                  : tankerData.severityGrade === 'Moderate'
                  ? '#f59e0b'
                  : '#10b981',
              color:
                tankerData.severityGrade === 'Critical'
                  ? '#f87171'
                  : tankerData.severityGrade === 'Moderate'
                  ? '#fbbf24'
                  : '#34d399',
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor:
                  tankerData.severityGrade === 'Critical'
                    ? '#ef4444'
                    : tankerData.severityGrade === 'Moderate'
                    ? '#f59e0b'
                    : '#10b981',
              }}
            />
            Status: {tankerData.severityGrade} Demand
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-xs text-slate-400">Estimated Affected Rural Pop</span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
              {tankerData.affectedPopulationEstimate.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">
              of {tankerData.ruralPopulation.toLocaleString()} rural citizens
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-xs text-slate-400">Daily Water Requisitioned</span>
            <div className="mt-1 text-2xl font-bold font-mono text-cyan-300">
              {(tankerData.dailyWaterSuppliedLiters / 1000).toLocaleString()} kL
            </div>
            <span className="text-[11px] text-slate-500">Norm: 20 L / person / day</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-xs text-slate-400">Tanker Fleet Required</span>
            <div className="mt-1 text-3xl font-extrabold font-mono text-rose-400">
              {tankerData.tankersRequiredPerDay}
            </div>
            <span className="text-[11px] text-slate-500">Active commercial tankers</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-xs text-slate-400">Required Daily Trips</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-300">
              {tankerData.estimatedTripsPerDay}
            </div>
            <span className="text-[11px] text-slate-500">Assuming 3 rounds / vehicle</span>
          </div>
        </div>
      </div>

      {/* T-Minus Administrative Contingency Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              T-Minus Administrative Early Action Protocol
            </h2>
            <p className="text-xs text-slate-400">
              Statutory timeline triggering administrative orders as forecasted stress breaches
              actionable thresholds.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {DROUGHT_ACTION_MILESTONES.map((milestone, idx) => {
            const isTriggered = activeWsi >= milestone.wsiTriggerThreshold;

            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border transition-all ${
                  isTriggered
                    ? 'bg-slate-900/90 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isTriggered
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {milestone.leadTime}
                    </span>
                    <h3 className="font-semibold text-slate-100">{milestone.title}</h3>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Trigger Threshold: <span className="text-amber-400">WSI ≥ {milestone.wsiTriggerThreshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-1 text-xs text-indigo-400 font-mono">
                  Statutory Basis: {milestone.statutoryReference}
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Immediate Administrative Directives
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {milestone.administrativeOrders.map((ord, oIdx) => (
                        <li key={oIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{ord}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      Public & Agrarian Advisory
                    </span>
                    <p>{milestone.publicAdvisory}</p>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Coordinating Agencies: {milestone.targetAgencies.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crop Vulnerability & Drought-Resilience Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Crop Vulnerability & Substitution Advisory
            </h2>
            <p className="text-xs text-slate-400">
              Factual crop water requirements from Vasantrao Naik Marathwada Krishi Vidyapeeth (VNMKV, Parbhani).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Crop Name</th>
                <th className="py-2.5 px-3">Season</th>
                <th className="py-2.5 px-3">Water Req. (mm)</th>
                <th className="py-2.5 px-3">Drought Risk</th>
                <th className="py-2.5 px-3">Drought Yield Loss</th>
                <th className="py-2.5 px-3">Recommended Resilient Switch</th>
                <th className="py-2.5 px-3">Water Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {MARATHWADA_CROPS.map((crop, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-200">
                    {crop.cropName}
                    <span className="block text-[11px] text-slate-500">{crop.marathiName}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{crop.season}</td>
                  <td className="py-3 px-3 font-mono text-cyan-300">{crop.waterRequirementMm} mm</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        crop.droughtVulnerability === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : crop.droughtVulnerability === 'High'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {crop.droughtVulnerability}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-rose-400">
                    -{crop.historicalLossRateInDroughtPercent}%
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">
                    {crop.recommendedAlternative}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-300">
                    +{crop.estimatedWaterSavingPercent}%
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
