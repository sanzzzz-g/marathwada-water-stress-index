import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MARATHWADA_GEOJSON } from '../../data/geojson';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../../data/districts';
import { LATEST_REGIONAL_RECORDS, OPERATIONAL_FORECASTS } from '../../data/historicalData';
import { DistrictId, StressCategory } from '../../types/wsi';
import { getStressCategory, getWsiContinuousColor } from '../../utils/wsiCalculations';
import { RotateCcw } from 'lucide-react';

export type MapMetricType = 'current_wsi' | 'forecast_h1' | 'forecast_h2' | 'forecast_h3';

interface MarathwadaLeafletMapProps {
  selectedDistrictId?: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
  selectedMetric?: MapMetricType;
  onMetricChange?: (metric: MapMetricType) => void;
}

export const MarathwadaLeafletMap: React.FC<MarathwadaLeafletMapProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  selectedMetric = 'current_wsi',
  onMetricChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [activeMetric, setActiveMetric] = useState<MapMetricType>(selectedMetric);

  // Sync external metric prop
  useEffect(() => {
    if (selectedMetric !== activeMetric) {
      setActiveMetric(selectedMetric);
    }
  }, [selectedMetric]);

  const handleMetricSelect = (metric: MapMetricType) => {
    setActiveMetric(metric);
    if (onMetricChange) onMetricChange(metric);
  };

  // Helper to extract metric value for each district
  const getDistrictMetricData = (districtId: DistrictId) => {
    const latestObs = LATEST_REGIONAL_RECORDS.find(r => r.districtId === districtId);
    const h1 = OPERATIONAL_FORECASTS.find(f => f.districtId === districtId && f.horizon === 1);
    const h2 = OPERATIONAL_FORECASTS.find(f => f.districtId === districtId && f.horizon === 2);
    const h3 = OPERATIONAL_FORECASTS.find(f => f.districtId === districtId && f.horizon === 3);

    let val = latestObs ? latestObs.wsi : 0.0;
    let label = 'Current WSI (Dec 2024)';

    if (activeMetric === 'forecast_h1' && h1) {
      val = h1.predictedWsi;
      label = 'Persistence M+1 (Jan 2025)';
    } else if (activeMetric === 'forecast_h2' && h2) {
      val = h2.predictedWsi;
      label = 'Persistence M+2 (Feb 2025)';
    } else if (activeMetric === 'forecast_h3' && h3) {
      val = h3.predictedWsi;
      label = 'Persistence M+3 (Mar 2025)';
    }

    return {
      value: val,
      label,
      category: getStressCategory(val),
      latestWsi: latestObs?.wsi ?? 0.0,
      h1Wsi: h1?.predictedWsi ?? 0.0,
      h2Wsi: h2?.predictedWsi ?? 0.0,
      h3Wsi: h3?.predictedWsi ?? 0.0,
      components: latestObs?.components,
    };
  };

  // Center coordinates for Marathwada region
  const MARATHWADA_CENTER: [number, number] = [19.2, 76.4];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: MARATHWADA_CENTER,
        zoom: 7.5,
        minZoom: 6,
        maxZoom: 11,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Remove previous GeoJSON layer if exists
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    // Create GeoJSON Layer with choropleth styling
    const geoLayer = L.geoJSON(MARATHWADA_GEOJSON, {
      style: feature => {
        const distId = feature?.properties.districtId as DistrictId;
        const isSelected = distId === selectedDistrictId;
        const metricData = getDistrictMetricData(distId);
        const fillColor = getWsiContinuousColor(metricData.value);

        return {
          fillColor,
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          color: isSelected ? '#38bdf8' : '#334155',
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      },
      onEachFeature: (feature, layer) => {
        const distId = feature.properties.districtId as DistrictId;
        const distInfo = MARATHWADA_DISTRICTS[distId];
        const metricData = getDistrictMetricData(distId);

        // Tooltip formatting
        const tooltipContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px;">
            <div style="font-weight: 700; color: #f1f5f9; margin-bottom: 2px;">
              ${distInfo.name} ${distInfo.formerName ? `(${distInfo.formerName})` : ''}
            </div>
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">
              ${distInfo.marathiName} · HQ: ${distInfo.headquarters}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-family: monospace;">
              <span style="color: #94a3b8;">${metricData.label}:</span>
              <strong style="color: ${getWsiContinuousColor(metricData.value)};">${metricData.value > 0 ? `+${metricData.value.toFixed(3)}` : metricData.value.toFixed(3)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-family: monospace;">
              <span style="color: #94a3b8;">Classification:</span>
              <span style="color: #e2e8f0; font-weight: 500;">${metricData.category}</span>
            </div>
            <div style="color: #64748b; font-size: 10px; border-top: 1px solid #334155; padding-top: 4px; margin-top: 4px;">
              Primary Reservoir: ${distInfo.primaryReservoir}
            </div>
          </div>
        `;

        layer.bindTooltip(tooltipContent, {
          sticky: true,
          direction: 'auto',
          className: 'custom-leaflet-tooltip',
        });

        layer.on({
          mouseover: e => {
            const target = e.target;
            target.setStyle({
              weight: 3,
              color: '#38bdf8',
              fillOpacity: 0.85,
            });
            target.bringToFront();
          },
          mouseout: e => {
            const target = e.target;
            const isSel = distId === selectedDistrictId;
            target.setStyle({
              weight: isSel ? 3 : 1.5,
              color: isSel ? '#38bdf8' : '#334155',
              fillOpacity: isSel ? 0.85 : 0.65,
            });
          },
          click: () => {
            onSelectDistrict(distId);
          },
        });
      },
    }).addTo(map);

    geojsonLayerRef.current = geoLayer;
  }, [activeMetric, selectedDistrictId]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(MARATHWADA_CENTER, 7.5);
    }
  };

  return (
    <div className="relative w-full h-[540px] rounded-lg overflow-hidden border border-slate-800 bg-[#080d1a] shadow-inner">
      {/* Top Map Metric Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-md border border-slate-700/80 shadow-lg">
          <button
            onClick={() => handleMetricSelect('current_wsi')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeMetric === 'current_wsi'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Observed WSI (Dec 2024)
          </button>
          <button
            onClick={() => handleMetricSelect('forecast_h1')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeMetric === 'forecast_h1'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Persistence M+1 (Jan 2025)
          </button>
          <button
            onClick={() => handleMetricSelect('forecast_h2')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeMetric === 'forecast_h2'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Persistence M+2 (Feb 2025)
          </button>
          <button
            onClick={() => handleMetricSelect('forecast_h3')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeMetric === 'forecast_h3'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Persistence M+3 (Mar 2025)
          </button>
        </div>

        <button
          onClick={handleResetView}
          className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-md border border-slate-700/80 shadow-lg transition-colors whitespace-nowrap"
          title="Reset map view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Bounds</span>
        </button>
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Map Legend: Authoritative 5 Categories */}
      <div className="absolute bottom-3 left-3 z-[1000] p-2.5 bg-slate-900/95 backdrop-blur-md rounded-md border border-slate-700/80 text-xs font-mono shadow-lg">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 font-sans font-semibold">
          Authoritative Drought Severity Scale (repo/src/wsi.py)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <span className="w-8 h-2.5 bg-[#3b82f6] rounded-xs" />
            <span className="text-[10px] text-slate-300 mt-0.5">&lt; -1.50</span>
            <span className="text-[9px] text-slate-400 font-sans">Very Wet</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-8 h-2.5 bg-[#06b6d4] rounded-xs" />
            <span className="text-[10px] text-slate-300 mt-0.5">-1.5 to -0.5</span>
            <span className="text-[9px] text-slate-400 font-sans">Wet</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-8 h-2.5 bg-[#14b8a6] rounded-xs" />
            <span className="text-[10px] text-slate-300 mt-0.5">-0.5 to 0.5</span>
            <span className="text-[9px] text-slate-400 font-sans">Normal</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-8 h-2.5 bg-[#f59e0b] rounded-xs" />
            <span className="text-[10px] text-slate-300 mt-0.5">0.5 to 1.5</span>
            <span className="text-[9px] text-slate-400 font-sans">Moderate</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-8 h-2.5 bg-[#e11d48] rounded-xs" />
            <span className="text-[10px] text-slate-300 mt-0.5">&ge; 1.50</span>
            <span className="text-[9px] text-slate-400 font-sans">Severe</span>
          </div>
        </div>
      </div>

      {/* Spatial Attribution */}
      <div className="absolute bottom-2 right-2 z-[1000] text-[10px] text-slate-400 font-mono bg-slate-950/80 px-2 py-0.5 rounded">
        Survey of India / GADM v4.1 · EPSG:4326
      </div>
    </div>
  );
};
