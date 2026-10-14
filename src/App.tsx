import React, { useState } from 'react';
import { DistrictId, WeightingScheme } from './types/wsi';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { DistrictForecastPage } from './pages/DistrictForecastPage';
import { InteractiveMapPage } from './pages/InteractiveMapPage';
import { HistoricalAnalysisPage } from './pages/HistoricalAnalysisPage';
import { ModelLaboratoryPage } from './pages/ModelLaboratoryPage';
import { ScenarioSimulatorPage } from './pages/ScenarioSimulatorPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { ValidationMetricsPage } from './pages/ValidationMetricsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { AboutResearchPage } from './pages/AboutResearchPage';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from './services/githubFetcher';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('overview');
  const [selectedDistrictId, setSelectedDistrictId] = useState<DistrictId>('beed');
  const [weightScheme, setWeightScheme] = useState<WeightingScheme>('W0');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100">
      {/* Top Bar (3-Zone Contract) */}
      <TopBar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onQuickSimulate={() => handleNavigate('simulator')}
      />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          weightScheme={weightScheme}
          onToggleWeightScheme={setWeightScheme}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
          {currentRoute === 'overview' && (
            <OverviewPage
              weightScheme={weightScheme}
              onNavigate={handleNavigate}
              onSelectDistrict={setSelectedDistrictId}
            />
          )}

          {currentRoute === 'forecasts' && (
            <DistrictForecastPage
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              weightScheme={weightScheme}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'map' && (
            <InteractiveMapPage
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              weightScheme={weightScheme}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'history' && (
            <HistoricalAnalysisPage
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              weightScheme={weightScheme}
            />
          )}

          {currentRoute === 'models' && <ModelLaboratoryPage />}

          {currentRoute === 'simulator' && (
            <ScenarioSimulatorPage
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              weightScheme={weightScheme}
            />
          )}

          {currentRoute === 'data' && <DataExplorerPage />}

          {currentRoute === 'metrics' && <ValidationMetricsPage />}

          {currentRoute === 'methodology' && <MethodologyPage />}

          {currentRoute === 'about' && <AboutResearchPage />}

          {/* Scientific Platform Footer */}
          <footer className="mt-12 pt-6 pb-4 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">MARATHWADA WSI INTELLIGENCE</span>
              <span>·</span>
              <span>8 Districts (2003–2024)</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <a
                href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-200 transition-colors"
              >
                GitHub Repository
              </a>
              <span>·</span>
              <button
                onClick={() => handleNavigate('methodology')}
                className="hover:text-slate-200 transition-colors"
              >
                Methodology
              </button>
              <span>·</span>
              <span>Survey of India / GADM v4.1 OGD</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
