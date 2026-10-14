import React, { useState } from 'react';
import {
  Compass,
  Layers,
  MapPin,
  RotateCcw,
  Sliders,
  TrendingUp,
  Info,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import {
  LATEST_REGIONAL_RECORDS,
  OPERATIONAL_FORECASTS,
} from '../data/historicalData';
import { DistrictId, WeightingScheme } from '../types/wsi';
import { getStressCategory, getStressColor } from '../utils/wsiCalculations';
import { MapMetricType, MarathwadaLeafletMap } from '../components/map/MarathwadaLeafletMap';

interface InteractiveMapPageProps {
  selectedDistrictId: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
  weightScheme: WeightingScheme;
  onNavigate: (route: string) => void;
}

export const InteractiveMapPage: React.FC<InteractiveMapPageProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  weightScheme,
  onNavigate,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MapMetricType>('current_wsi');

  const district = MARATHWADA_DISTRICTS[selectedDistrictId];
  const latestObs = LATEST_REGIONAL_RECORDS.find(r => r.districtId === selectedDistrictId);
  const districtForecasts = OPERATIONAL_FORECASTS.filter(f => f.districtId === selectedDistrictId);

  const currentWsi = latestObs
    ? (weightScheme === 'W0'
        ? (latestObs.wsi_w0 ?? latestObs.wsi)
        : (latestObs.wsi_w1 ?? latestObs.wsi_w1_experimental ?? latestObs.wsi))
    : 1.0;
  const currentCategory = getStressCategory(currentWsi);
  const currentColor = getStressColor(currentCategory);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Geospatial Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Choropleth GIS</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">EPSG:4326</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Marathwada Spatial Water Stress Choropleth
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            District boundaries mapped from Survey of India / GADM v4.1 administrative dataset under Open Government Data License.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-2 rounded-md border border-slate-800">
          <span>Active Layer:</span>
          <span className="text-cyan-400 font-semibold uppercase">{selectedMetric.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main Map Stage and Inspection Panel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 columns: Map Stage */}
        <div className="lg:col-span-3 space-y-4">
          <MarathwadaLeafletMap
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={onSelectDistrict}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
          />

          {/* Spatial Metadata & Source License Note */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-md text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Boundary Source: Survey of India Open Data / GADM v4.1 level-2 polygons.
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              License: Open Government Data (OGD) License - India
            </div>
          </div>
        </div>

        {/* Right 1 column: District Inspection Card */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Selected Polygon
                </div>
                <div className="text-lg font-bold text-white font-sans mt-0.5">
                  {district.name}
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentColor.hex }}
                title={currentCategory}
              />
            </div>

            <div className="space-y-3 mt-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Marathi Name:</span>
                <span className="text-slate-200">{district.marathiName}</span>
              </div>
              {district.formerName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Former Name:</span>
                  <span className="text-slate-200">{district.formerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">District HQ:</span>
                <span className="text-slate-200">{district.headquarters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Geographic Area:</span>
                <span className="text-slate-200">{district.areaSqKm.toLocaleString()} km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Population (2011):</span>
                <span className="text-slate-200">{district.population2011.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Baseline Aridity:</span>
                <span className="text-slate-200">{district.baselineAridityIndex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Key Reservoir:</span>
                <span className="text-slate-200 truncate max-w-[140px]" title={district.primaryReservoir}>
                  {district.primaryReservoir}
                </span>
              </div>
            </div>

            {/* Current & Forecast Values for Selected District */}
            <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300 font-sans">
                Stress Values & Outlook
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dec 2024 Observed:</span>
                  <strong className="text-white">{currentWsi.toFixed(3)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Jan 2025 (M+1):</span>
                  <strong>{districtForecasts[0]?.predictedWsi.toFixed(3)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">Feb 2025 (M+2):</span>
                  <strong>{districtForecasts[1]?.predictedWsi.toFixed(3)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-400">Mar 2025 (M+3):</span>
                  <strong>{districtForecasts[2]?.predictedWsi.toFixed(3)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => onNavigate('forecasts')}
              className="w-full py-2 px-3 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors"
            >
              Open Full Forecast Panel
            </button>
            <button
              onClick={() => onNavigate('simulator')}
              className="w-full py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              Simulate Stress in {district.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
