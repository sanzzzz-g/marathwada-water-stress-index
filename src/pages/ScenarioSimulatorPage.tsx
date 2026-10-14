import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  RotateCcw,
  Save,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import { LATEST_REGIONAL_RECORDS } from '../data/historicalData';
import { DistrictId, ForecastHorizon, WeightingScheme, WsiComponents } from '../types/wsi';
import {
  calculateWsi,
  computeForecastFromResidual,
  getStressCategory,
  getStressColor,
  THRESHOLD_SEVERE,
  THRESHOLD_MODERATE,
} from '../utils/wsiCalculations';
import { ComponentRadarChart } from '../components/charts/ComponentRadarChart';

interface ScenarioSimulatorPageProps {
  selectedDistrictId: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
  weightScheme: WeightingScheme;
}

export const ScenarioSimulatorPage: React.FC<ScenarioSimulatorPageProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  weightScheme,
}) => {
  const [simulationMode, setSimulationMode] = useState<'MODE_A_INDEX' | 'MODE_B_FORECAST'>('MODE_A_INDEX');
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>(1);
  const [savedScenarios, setSavedScenarios] = useState<
    { id: string; name: string; delta: number; simulatedWsi: number; timestamp: string }[]
  >([]);

  // Baseline data from latest observed snapshot (Dec 2024)
  const latestObs = useMemo(() => {
    return (
      LATEST_REGIONAL_RECORDS.find(r => r.districtId === selectedDistrictId) ||
      LATEST_REGIONAL_RECORDS[0]
    );
  }, [selectedDistrictId]);

  const baselineComponents: WsiComponents = latestObs.components;
  const baselineWsi = calculateWsi(baselineComponents, weightScheme);
  const baselineCategory = getStressCategory(baselineWsi);

  // Perturbations state (-1.00 to +1.00)
  const [perturbations, setPerturbations] = useState({
    rainfallStressDelta: 0.0,
    soilMoistureDelta: 0.0,
    ndviDelta: 0.0,
    lstDelta: 0.0,
    groundwaterDelta: 0.0,
    surfaceWaterDelta: 0.0,
    reservoirStorageDeltaPct: 0.0,
  });

  const handleSliderChange = (key: keyof typeof perturbations, value: number) => {
    setPerturbations(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setPerturbations({
      rainfallStressDelta: 0.0,
      soilMoistureDelta: 0.0,
      ndviDelta: 0.0,
      lstDelta: 0.0,
      groundwaterDelta: 0.0,
      surfaceWaterDelta: 0.0,
      reservoirStorageDeltaPct: 0.0,
    });
  };

  // Compute simulated components (clamped -3.0 to 3.0)
  const simulatedComponents: WsiComponents = useMemo(() => {
    const clamp = (v: number) => Math.max(-3.0, Math.min(3.0, Math.round(v * 1000) / 1000));
    const rain = clamp((baselineComponents.spiStressZ ?? baselineComponents.rainfallStress ?? 0) + perturbations.rainfallStressDelta);
    const soil = clamp((baselineComponents.soilStressZ ?? baselineComponents.soilMoistureStress ?? 0) + perturbations.soilMoistureDelta);
    const ndvi = clamp((baselineComponents.ndviStressZ ?? baselineComponents.ndviStress ?? 0) + perturbations.ndviDelta);
    const lst = clamp((baselineComponents.lstStressZ ?? baselineComponents.lstStress ?? 0) + perturbations.lstDelta);
    const gw = clamp((baselineComponents.groundwaterStressZ ?? baselineComponents.groundwaterStress ?? 0) + perturbations.groundwaterDelta);
    const sw = clamp((baselineComponents.surfaceWaterStressZ ?? baselineComponents.surfaceWaterStress ?? 0) + perturbations.surfaceWaterDelta);

    return {
      spiStressZ: rain,
      soilStressZ: soil,
      ndviStressZ: ndvi,
      lstStressZ: lst,
      groundwaterStressZ: gw,
      surfaceWaterStressZ: sw,
      rainfallStress: rain,
      soilMoistureStress: soil,
      ndviStress: ndvi,
      lstStress: lst,
      groundwaterStress: gw,
      surfaceWaterStress: sw,
    };
  }, [baselineComponents, perturbations]);

  // Mode A: Index Sensitivity result
  const simulatedIndexWsi = calculateWsi(simulatedComponents, weightScheme);
  const deltaIndexWsi = Math.round((simulatedIndexWsi - baselineWsi) * 1000) / 1000;
  const simulatedIndexCategory = getStressCategory(simulatedIndexWsi);

  // Mode B: Forecast Scenario result (using M5 Residual Ridge response surface)
  const baselineSeasonalDelta = selectedHorizon === 1 ? 0.08 : selectedHorizon === 2 ? 0.19 : 0.35;
  const baselinePredWsi = computeForecastFromResidual(baselineWsi, baselineSeasonalDelta);

  const forecastPerturbationImpact =
    perturbations.rainfallStressDelta * 0.18 +
    perturbations.soilMoistureDelta * 0.22 +
    perturbations.groundwaterDelta * 0.21 +
    perturbations.surfaceWaterDelta * 0.15 +
    perturbations.lstDelta * 0.12 +
    perturbations.ndviDelta * 0.10 -
    (perturbations.reservoirStorageDeltaPct / 100) * 0.25;

  const simulatedPredResidual = baselineSeasonalDelta + forecastPerturbationImpact;
  const simulatedPredWsi = computeForecastFromResidual(baselineWsi, simulatedPredResidual);
  const deltaPredWsi = Math.round((simulatedPredWsi - baselinePredWsi) * 1000) / 1000;
  const simulatedPredCategory = getStressCategory(simulatedPredWsi);

  // Active outputs depending on mode
  const activeWsi = simulationMode === 'MODE_A_INDEX' ? simulatedIndexWsi : simulatedPredWsi;
  const activeBaseline = simulationMode === 'MODE_A_INDEX' ? baselineWsi : baselinePredWsi;
  const activeDelta = simulationMode === 'MODE_A_INDEX' ? deltaIndexWsi : deltaPredWsi;
  const activeSimCategory = simulationMode === 'MODE_A_INDEX' ? simulatedIndexCategory : simulatedPredCategory;
  const activeBaselineCategory = simulationMode === 'MODE_A_INDEX' ? baselineCategory : getStressCategory(baselinePredWsi);

  const baselineColor = getStressColor(activeBaselineCategory);
  const simColor = getStressColor(activeSimCategory);

  // Save current scenario handler
  const handleSaveScenario = () => {
    const id = `SCEN-${Date.now().toString().slice(-4)}`;
    const name = `${district.name} ${simulationMode === 'MODE_A_INDEX' ? 'Index' : `H${selectedHorizon} Forecast`}`;
    setSavedScenarios(prev => [
      { id, name, delta: activeDelta, simulatedWsi: activeWsi, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4),
    ]);
  };

  const district = MARATHWADA_DISTRICTS[selectedDistrictId];

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner (Master prompt Section 14) */}
      <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-md text-xs font-mono text-amber-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            SIMULATION SANDBOX: Simulated scenario — not an observed event or validated operational forecast.
          </span>
        </div>
        <div className="text-[11px] text-amber-400 font-sans hidden sm:block">
          For policy sensitivity testing only
        </div>
      </div>

      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>What-If Scenario Sandbox</span>
            <span aria-hidden="true">·</span>
            <span>Policy Stress Testing</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">{district.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Interactive Hydroclimatic Stress Simulator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Test climate shocks, monsoon deficits, groundwater depletion, and reservoir replenishment.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-md border border-slate-800">
          <button
            onClick={() => setSimulationMode('MODE_A_INDEX')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              simulationMode === 'MODE_A_INDEX'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mode A: Index Sensitivity
          </button>
          <button
            onClick={() => setSimulationMode('MODE_B_FORECAST')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              simulationMode === 'MODE_B_FORECAST'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mode B: Forecast Scenario
          </button>
        </div>
      </div>

      {/* Controls Strip (District, Weight Scheme, Horizon) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Target District:</span>
            <select
              value={selectedDistrictId}
              onChange={e => onSelectDistrict(e.target.value as DistrictId)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 font-sans"
            >
              {DISTRICT_LIST.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Weight Scheme:</span>
            <span className="text-xs font-mono font-semibold text-cyan-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {weightScheme === 'W0' ? 'W0 (Equal 1/6)' : 'W1 (Domain 25%)'}
            </span>
          </div>

          {simulationMode === 'MODE_B_FORECAST' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Horizon:</span>
              <div className="flex items-center gap-1">
                {([1, 2, 3] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setSelectedHorizon(h)}
                    className={`px-2 py-0.5 text-xs font-mono rounded ${
                      selectedHorizon === h
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    H={h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>
          <button
            onClick={handleSaveScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-900 bg-cyan-400 hover:bg-cyan-300 font-medium rounded transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Scenario</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Stage: Sliders vs Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 columns: Sliders Parameter Console */}
        <div className="lg:col-span-7 p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Environmental Stress Perturbations (Δ)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Range: -1.00 (Relief) to +1.00 (Drought Shock)
            </span>
          </div>

          {/* Slider 1: Rainfall */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Rainfall Stress Anomaly (Deficit):</span>
              <span className={`font-bold ${perturbations.rainfallStressDelta > 0 ? 'text-rose-400' : perturbations.rainfallStressDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {perturbations.rainfallStressDelta > 0 ? `+${perturbations.rainfallStressDelta.toFixed(2)}` : perturbations.rainfallStressDelta.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={perturbations.rainfallStressDelta}
              onChange={e => handleSliderChange('rainfallStressDelta', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-1.00 (Heavy Monsoon)</span>
              <span>Baseline: {((baselineComponents.spiStressZ ?? baselineComponents.rainfallStress) ?? 0).toFixed(2)}</span>
              <span>+1.00 (Monsoon Failure)</span>
            </div>
          </div>

          {/* Slider 2: Soil Moisture */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Soil Moisture Stress (Root-Zone Drying):</span>
              <span className={`font-bold ${perturbations.soilMoistureDelta > 0 ? 'text-rose-400' : perturbations.soilMoistureDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {perturbations.soilMoistureDelta > 0 ? `+${perturbations.soilMoistureDelta.toFixed(2)}` : perturbations.soilMoistureDelta.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={perturbations.soilMoistureDelta}
              onChange={e => handleSliderChange('soilMoistureDelta', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-1.00 (High Retention)</span>
              <span>Baseline: {((baselineComponents.soilStressZ ?? baselineComponents.soilMoistureStress) ?? 0).toFixed(2)}</span>
              <span>+1.00 (Severe Dry-down)</span>
            </div>
          </div>

          {/* Slider 3: Groundwater */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Groundwater Depth Stress (Table Drop):</span>
              <span className={`font-bold ${perturbations.groundwaterDelta > 0 ? 'text-rose-400' : perturbations.groundwaterDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {perturbations.groundwaterDelta > 0 ? `+${perturbations.groundwaterDelta.toFixed(2)}` : perturbations.groundwaterDelta.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={perturbations.groundwaterDelta}
              onChange={e => handleSliderChange('groundwaterDelta', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-1.00 (Aquifer Recharge)</span>
              <span>Baseline: {((baselineComponents.groundwaterStressZ ?? baselineComponents.groundwaterStress) ?? 0).toFixed(2)}</span>
              <span>+1.00 (Critical Depletion)</span>
            </div>
          </div>

          {/* Slider 4: Surface Water */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Surface Water Storage Deficit:</span>
              <span className={`font-bold ${perturbations.surfaceWaterDelta > 0 ? 'text-rose-400' : perturbations.surfaceWaterDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {perturbations.surfaceWaterDelta > 0 ? `+${perturbations.surfaceWaterDelta.toFixed(2)}` : perturbations.surfaceWaterDelta.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={perturbations.surfaceWaterDelta}
              onChange={e => handleSliderChange('surfaceWaterDelta', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-1.00 (Full Dams)</span>
              <span>Baseline: {((baselineComponents.surfaceWaterStressZ ?? baselineComponents.surfaceWaterStress) ?? 0).toFixed(2)}</span>
              <span>+1.00 (Dead Storage)</span>
            </div>
          </div>

          {/* Slider 5: LST Heat */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">LST Thermal Anomaly (Heatwave):</span>
              <span className={`font-bold ${perturbations.lstDelta > 0 ? 'text-rose-400' : perturbations.lstDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {perturbations.lstDelta > 0 ? `+${perturbations.lstDelta.toFixed(2)}` : perturbations.lstDelta.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={perturbations.lstDelta}
              onChange={e => handleSliderChange('lstDelta', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-1.00 (Cool Anomaly)</span>
              <span>Baseline: {((baselineComponents.lstStressZ ?? baselineComponents.lstStress) ?? 0).toFixed(2)}</span>
              <span>+1.00 (Heatwave Stress)</span>
            </div>
          </div>

          {/* Slider 6: Reservoir Storage % */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Reservoir Live Storage Delta (%):</span>
              <span className={`font-bold ${perturbations.reservoirStorageDeltaPct > 0 ? 'text-teal-400' : perturbations.reservoirStorageDeltaPct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {perturbations.reservoirStorageDeltaPct > 0 ? `+${perturbations.reservoirStorageDeltaPct}%` : `${perturbations.reservoirStorageDeltaPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="5"
              value={perturbations.reservoirStorageDeltaPct}
              onChange={e => handleSliderChange('reservoirStorageDeltaPct', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-40% (Drawdown)</span>
              <span>Baseline: {latestObs.reservoirStoragePct ?? 45}%</span>
              <span>+40% (Inflow Surge)</span>
            </div>
          </div>
        </div>

        {/* Right 5 columns: Simulated Outcomes & Radar Overlay */}
        <div className="lg:col-span-5 space-y-4">
          {/* Comparison Scoreboard */}
          <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
            <div className="text-xs font-mono uppercase text-slate-400 mb-2">
              {simulationMode === 'MODE_A_INDEX' ? 'Index Sensitivity Result' : `Horizon H=${selectedHorizon} Forecast Scenario`}
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
              {/* Baseline */}
              <div>
                <div className="text-[11px] text-slate-400 font-mono">Baseline WSI:</div>
                <div className="text-2xl font-bold font-mono text-slate-300">
                  {activeBaseline.toFixed(3)}
                </div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: baselineColor.hex }}>
                  {activeBaselineCategory}
                </div>
              </div>

              {/* Simulated */}
              <div>
                <div className="text-[11px] text-cyan-400 font-mono">Simulated WSI:</div>
                <div className="text-3xl font-bold font-mono text-white">
                  {activeWsi.toFixed(3)}
                </div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: simColor.hex }}>
                  {activeSimCategory}
                </div>
              </div>
            </div>

            {/* Delta Indicator */}
            <div className="flex items-center justify-between pt-3 text-xs font-mono">
              <span className="text-slate-400">Stress Delta (Δ):</span>
              <span className={`text-base font-bold ${activeDelta > 0 ? 'text-rose-400' : activeDelta < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                {activeDelta > 0 ? `+${activeDelta.toFixed(3)} (Higher Stress)` : activeDelta < 0 ? `${activeDelta.toFixed(3)} (Relief)` : '0.000'}
              </span>
            </div>

            {/* Category Shift */}
            {activeBaselineCategory !== activeSimCategory && (
              <div className="mt-3 p-2 bg-rose-950/40 border border-rose-800/80 rounded text-xs font-mono text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Threshold Crossed: Transitioned from {activeBaselineCategory} to {activeSimCategory}!
                </span>
              </div>
            )}
          </div>

          {/* Component Radar Overlay */}
          <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                Component Footprint Shift
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-cyan-400">■ Baseline</span>
                <span className="text-amber-400">■ Simulated</span>
              </div>
            </div>

            <ComponentRadarChart
              components={baselineComponents}
              compareComponents={simulatedComponents}
              compareLabel="Scenario"
              height={220}
            />
          </div>

          {/* Saved Scenarios List */}
          {savedScenarios.length > 0 && (
            <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-lg">
              <div className="text-xs font-mono uppercase text-slate-400 mb-2">
                Saved Scenarios ({savedScenarios.length})
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {savedScenarios.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-200">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-300 font-bold">{s.simulatedWsi.toFixed(2)}</span>
                      <span className={s.delta > 0 ? 'text-rose-400' : 'text-teal-400'}>
                        {s.delta > 0 ? `+${s.delta.toFixed(2)}` : s.delta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
