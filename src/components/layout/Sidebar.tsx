import React from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Compass,
  Database,
  FileText,
  FlaskConical,
  HelpCircle,
  MapPin,
  Sliders,
  CheckCircle2,
  ShieldAlert,
  Waves,
  Clock,
  Bot,
} from 'lucide-react';
import { WeightingScheme } from '../../types/wsi';

export interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
  weightScheme: WeightingScheme;
  onToggleWeightScheme: (scheme: WeightingScheme) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Activity, description: 'Regional summary & indicators' },
  { id: 'war-room', label: 'Drought War Room', icon: ShieldAlert, description: 'Disaster & tanker protocol' },
  { id: 'forecasts', label: 'District Forecasts', icon: MapPin, description: '3-month forward outlook' },
  { id: 'reservoirs', label: 'Reservoir Twin', icon: Waves, description: 'Godavari basin & dams' },
  { id: 'map', label: 'Interactive Map', icon: Compass, description: 'Spatial choropleth GIS' },
  { id: 'time-machine', label: 'Crisis Time-Machine', icon: Clock, description: '2003–2024 drought replay' },
  { id: 'copilot', label: 'AI Executive SITREP', icon: Bot, description: 'Gemini disaster advisory' },
  { id: 'history', label: 'Historical Analysis', icon: Calendar, description: '2003–2024 climate records' },
  { id: 'models', label: 'Model Laboratory', icon: FlaskConical, description: 'M0–M6 benchmarking' },
  { id: 'simulator', label: 'Scenario Simulator', icon: Sliders, description: 'What-if sensitivity sandbox' },
  { id: 'data', label: 'Data Explorer', icon: Database, description: 'GitHub dataset & CSV audit' },
  { id: 'metrics', label: 'Validation & Metrics', icon: BarChart3, description: 'Test split & tanker records' },
  { id: 'methodology', label: 'Methodology', icon: FileText, description: 'Mathematical formulations' },
  { id: 'about', label: 'About & Research', icon: HelpCircle, description: 'Provenance & citations' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpen,
  onCloseMobile,
  weightScheme,
  onToggleWeightScheme,
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-[#070b16] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-5 pb-3 border-b border-slate-800/60">
            <div className="text-xs font-semibold text-slate-300 tracking-wider uppercase font-mono">
              Hydroclimatic Platform
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              8 Marathwada Districts · 2003–2024
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md text-left transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-800/90 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Index Weighting Selector */}
          <div className="mt-6 pt-4 border-t border-slate-800/60">
            <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
              Active Index Scheme
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 rounded border border-slate-800">
              <button
                onClick={() => onToggleWeightScheme('W0')}
                className={`py-1 text-[11px] font-mono rounded transition-colors ${
                  weightScheme === 'W0'
                    ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                W0 (Equal 1/6)
              </button>
              <button
                onClick={() => onToggleWeightScheme('W1')}
                className={`py-1 text-[11px] font-mono rounded transition-colors ${
                  weightScheme === 'W1'
                    ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                W1 (Domain 25%)
              </button>
            </div>
          </div>
        </div>

        {/* System & Metadata Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-[#060912]">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Model: M5 Residual Ridge</span>
            <span className="text-teal-400">H1-H3</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Dataset 2003–2024 Verified</span>
          </div>
        </div>
      </aside>
    </>
  );
};
