import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Database,
  Divide,
  FileText,
  Info,
  Layers,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { W0_WEIGHTS, W1_WEIGHTS, THRESHOLD_MODERATE, THRESHOLD_SEVERE } from '../utils/wsiCalculations';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Theoretical Framework</span>
            <span aria-hidden="true">·</span>
            <span>Hydroclimatic Index Design</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">V1/V2 Scientific Formulation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Mathematical Methodology & Index Construction
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal definitions of the six environmental components, weighting regimes, residual ML target formulation, and temporal split protocols.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-2 rounded-md border border-slate-800">
          <span>Primary Reference:</span>
          <span className="text-cyan-400 font-semibold ml-1">W0 Equal Indicator</span>
        </div>
      </div>

      {/* Six Components Formulation */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              The Six Hydroclimatic Stress Components
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Sign Convention: Higher Score = Higher Stress [0.0 to 3.0]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          {/* C1 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">1. Rainfall Stress (P)</span>
              <span className="text-[10px] text-slate-500">CHIRPS / IMD</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Precipitation deficit standardized against 30-year climatological baseline. Inverted so that deficient rainfall yields elevated stress.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_rain = max(0, (Normal_P - Observed_P) / σ_P)</code>
            </div>
          </div>

          {/* C2 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">2. Soil Moisture Stress (SM)</span>
              <span className="text-[10px] text-slate-500">ERA5-Land 0–100cm</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Root-zone volumetric soil water deficit relative to field capacity and wilting point, capturing agricultural desiccation.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_sm = max(0, (SM_field - SM_actual) / (SM_field - SM_wilt))</code>
            </div>
          </div>

          {/* C3 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">3. NDVI Vegetation Stress (V)</span>
              <span className="text-[10px] text-slate-500">MODIS Terra/Aqua 250m</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Inverted Vegetation Condition Index (VCI). Canopy stress and chlorosis translate into positive stress increments.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_ndvi = (1.0 - VCI) · scaling_factor</code>
            </div>
          </div>

          {/* C4 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">4. LST Thermal Stress (T)</span>
              <span className="text-[10px] text-slate-500">MODIS LST 1km</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Daytime Land Surface Temperature positive anomaly, reflecting evaporative heat loading during pre-monsoon heatwaves.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_lst = max(0, (LST_obs - LST_mean) / σ_LST)</code>
            </div>
          </div>

          {/* C5 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">5. Groundwater Stress (GW)</span>
              <span className="text-[10px] text-slate-500">GSDA / CGWB Wells</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Depth to water table anomaly from observation borewells across Marathwada basalt aquifers. Deeper water level = higher stress.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_gw = max(0, (DTW_actual - DTW_normal) / σ_DTW)</code>
            </div>
          </div>

          {/* C6 */}
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">6. Surface Water Stress (SW)</span>
              <span className="text-[10px] text-slate-500">CWC / WRD Dams</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Live reservoir storage deficit across major irrigation and municipal dams (e.g. Jayakwadi, Majalgaon, Yeldari, Manjara).
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <code>S_sw = (1.0 - (Storage_live / Capacity_gross)) · scaling</code>
            </div>
          </div>
        </div>
      </div>

      {/* Weighting Regimes: W0 vs W1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-sm font-semibold text-white font-mono uppercase">
              W0 — Equal Indicator Weights (Primary)
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">1/6 Each</span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            The core baseline formulation treats every physical indicator equally with weight <code className="text-cyan-300">1/6 ≈ 0.166667</code>. This avoids subjective domain weighting while preserving sensitivity across atmospheric, surface, and subterranean reservoirs.
          </p>
          <div className="p-3 bg-slate-900 rounded font-mono text-xs text-slate-300">
            WSI_W0 = (1/6)·Rainfall + (1/6)·Soil + (1/6)·NDVI + (1/6)·LST + (1/6)·Groundwater + (1/6)·SurfaceWater
          </div>
        </div>

        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-sm font-semibold text-white font-mono uppercase">
              W1 — Equal Domain Weights (Sensitivity)
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold">25% per Domain</span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            In W1, the environmental spectrum is partitioned into four equal physical domains (Climate 25%, Terrestrial Agriculture 25%, Groundwater 25%, Surface Storage 25%). The 3 agro-indicators (Soil, NDVI, LST) divide the 25% terrestrial budget equally into <code className="text-purple-300">8.333% (1/12)</code> each.
          </p>
          <div className="p-3 bg-slate-900 rounded font-mono text-xs text-slate-300">
            WSI_W1 = 0.25·Rainfall + (1/12)·Soil + (1/12)·NDVI + (1/12)·LST + 0.25·Groundwater + 0.25·SurfaceWater
          </div>
        </div>
      </div>

      {/* Threshold Classifications & Residual ML */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Severity Thresholds & Classification
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-teal-950/30 border border-teal-800 text-teal-300 flex justify-between items-center">
              <div>
                <strong>Low / Normal Stress:</strong> WSI &lt; 0.50
              </div>
              <span>Typical Monsoon / Adequate Soil Reserve</span>
            </div>
            <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800 text-amber-300 flex justify-between items-center">
              <div>
                <strong>Moderate Stress:</strong> 0.50 ≤ WSI &lt; 1.50
              </div>
              <span>Elevated Deficit / Rabi Irrigation Strain</span>
            </div>
            <div className="p-2.5 rounded bg-rose-950/30 border border-rose-800 text-rose-300 flex justify-between items-center">
              <div>
                <strong>Severe Stress:</strong> WSI ≥ 1.50
              </div>
              <span>Critical Drought / Emergency Tankers</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Residual Forecasting Rationale
            </h3>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Rather than predicting raw non-stationary WSI levels directly, M5 and M6 predict the <em>residual change delta</em>:
          </p>
          <div className="p-2.5 bg-slate-900 rounded font-mono text-xs text-slate-200">
            residual(h) = WSI(t+h) - WSI(t)<br />
            forecast(h) = WSI(t) + predicted_residual(h)
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            This residual formulation anchors predictions to the latest ground observation, eliminating systemic baseline drift during rapid seasonal transitions.
          </p>
        </div>
      </div>
    </div>
  );
};
