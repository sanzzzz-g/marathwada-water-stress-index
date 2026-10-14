import React from 'react';
import { Download, Sliders, Menu } from 'lucide-react';
import { LATEST_DATASET_DATE } from '../../data/historicalData';

interface TopBarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onToggleSidebar?: () => void;
  onQuickSimulate?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRoute,
  onNavigate,
  onToggleSidebar,
  onQuickSimulate,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0a0f1d] border-b border-slate-800/80 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => onNavigate('overview')}
          className="text-left group cursor-pointer focus-visible:outline-none"
        >
          <span className="text-base font-bold tracking-tight text-slate-100 group-hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
            MARATHWADA WSI INTELLIGENCE
          </span>
        </button>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('overview')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 ${
            currentRoute === 'overview' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onNavigate('forecasts')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 ${
            currentRoute === 'forecasts' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Forecasts
        </button>
        <button
          onClick={() => onNavigate('map')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 ${
            currentRoute === 'map' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Map
        </button>
        <button
          onClick={() => onNavigate('simulator')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 ${
            currentRoute === 'simulator' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Simulator
        </button>
        <button
          onClick={() => onNavigate('metrics')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 ${
            currentRoute === 'metrics' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Validation
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden xl:flex items-center text-xs font-mono text-slate-400 mr-2">
          <span>Target: {LATEST_DATASET_DATE}</span>
          <span className="mx-2 text-slate-600">·</span>
          <span className="text-teal-400">Model M5 Ridge</span>
        </div>
        <button
          onClick={onQuickSimulate || (() => onNavigate('simulator'))}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Launch Simulator</span>
        </button>
      </div>
    </header>
  );
};
