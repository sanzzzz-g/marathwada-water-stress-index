import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Github,
  Globe,
  Info,
  Layers,
  Scale,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../services/githubFetcher';

export const AboutResearchPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Provenance & Documentation</span>
            <span aria-hidden="true">·</span>
            <span>Research Repository</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Open Science</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            MARATHWADA WSI INTELLIGENCE
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Hydroclimatic Water Stress Monitoring, Forecasting & Simulation Platform for Marathwada, Maharashtra, India.
          </p>
        </div>

        <a
          href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded border border-cyan-800 transition-colors shrink-0"
        >
          <Github className="w-4 h-4" />
          <span>github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}</span>
          <ExternalLink className="w-3 h-3 text-cyan-500" />
        </a>
      </div>

      {/* Feature Operational Status Audit (Master prompt Section 20) */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
            System Feature Capabilities & Readiness Audit
          </h2>
          <span className="text-xs font-mono text-teal-400">Production-Grade Compliance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Functional Column */}
          <div className="p-4 bg-slate-900/60 rounded border border-teal-900/60 space-y-2">
            <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs uppercase">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>Fully Functional (Live)</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 font-sans">
              <li>Full 2003–2024 monthly records (2,112 district-months) across all 8 districts</li>
              <li>W0 (Equal) and W1 (Domain-weighted) index calculations</li>
              <li>Interactive Leaflet choropleth map with verified district polygons</li>
              <li>Recharts time-series, actual vs predicted, and radar charts</li>
              <li>M0–M6 benchmark metrics and persistence-relative skill on test split</li>
              <li>Independent official tanker deployment contingency scoring</li>
              <li>CSV schema validator using Zod and duplicate detection</li>
              <li>FastAPI Python backend contracts and Pydantic schemas</li>
            </ul>
          </div>

          {/* Interactive Simulation Sandbox */}
          <div className="p-4 bg-slate-900/60 rounded border border-cyan-900/60 space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs uppercase">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Simulated Sandbox</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 font-sans">
              <li>Mode A: Direct multi-component index sensitivity slider response</li>
              <li>Mode B: Forecast scenario testing with M5 Residual Ridge response surface</li>
              <li>Scenario comparison, save, and threshold transition warnings</li>
              <li>All hypothetical scenarios explicitly labeled as simulated</li>
            </ul>
          </div>

          {/* External Integrations */}
          <div className="p-4 bg-slate-900/60 rounded border border-amber-900/60 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Data Connection Options</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 font-sans">
              <li>Direct raw GitHub CSV fetching via commit/branch selector</li>
              <li>Local CSV drop-in replacement with pre-upload schema validation</li>
              <li>Automated fallback to embedded verified dataset</li>
              <li>Server-side Python CLI retraining pipeline documented in backend/</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Primary Data Provenance */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-3">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono pb-2 border-b border-slate-800">
          Hydroclimatic Data Provenance & Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="font-bold text-slate-200">1. CHIRPS Precipitation (v3.0)</div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              Climate Hazards Center UC Santa Barbara / IMD gridded daily rainfall data aggregated to monthly district averages.
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="font-bold text-slate-200">2. ECMWF ERA5-Land Reanalysis</div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              Volumetric soil water in root-zone layers (0–7cm, 7–28cm, 28–100cm) at 0.1° spatial resolution.
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="font-bold text-slate-200">3. NASA LP DAAC MODIS Terra/Aqua</div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              MOD13Q1 250m Normalized Difference Vegetation Index (NDVI) & MOD11A2 1km Land Surface Temperature (LST).
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="font-bold text-slate-200">4. CGWB & GSDA Ground Water Archives</div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              Central Ground Water Board & Maharashtra Groundwater Surveys and Development Agency quarterly water level monitoring.
            </div>
          </div>
        </div>
      </div>

      {/* Citation and Licensing */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-400">
        <div>
          <div className="font-bold text-slate-200 font-sans">Suggested Academic Citation:</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Goyal, S. et al. (2024). <em>Marathwada WSI: Multicomponent Hydroclimatic Water Stress Index and Residual Machine Learning Forecasting for Semiarid Central India</em>. GitHub: sanzzzz-g/marathwada-drought-wsi.
          </div>
        </div>
        <div className="shrink-0 text-[11px] text-slate-400">
          License: CC-BY-4.0 / MIT
        </div>
      </div>
    </div>
  );
};
