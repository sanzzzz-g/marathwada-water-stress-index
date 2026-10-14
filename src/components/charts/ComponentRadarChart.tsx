import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { WsiComponents } from '../../types/wsi';

interface ComponentRadarChartProps {
  components: WsiComponents;
  height?: number;
  compareComponents?: WsiComponents;
  compareLabel?: string;
}

export const ComponentRadarChart: React.FC<ComponentRadarChartProps> = ({
  components,
  height = 280,
  compareComponents,
  compareLabel = 'Scenario',
}) => {
  // Normalize standardized anomalies (-2.5 to +2.5) to positive radar radii (0 to 5, centered at 2.5)
  // so that polar axes render clearly without negative radial clipping.
  const toRadar = (z: number) => Math.max(0, Math.min(5, z + 2.5));

  const data = [
    {
      subject: 'Precipitation Deficit (SPI-3)',
      raw: components.spiStressZ,
      value: toRadar(components.spiStressZ),
      compareRaw: compareComponents?.spiStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.spiStressZ) : undefined,
    },
    {
      subject: 'Soil Moisture Deficit',
      raw: components.soilStressZ,
      value: toRadar(components.soilStressZ),
      compareRaw: compareComponents?.soilStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.soilStressZ) : undefined,
    },
    {
      subject: 'Vegetation Deficit (NDVI)',
      raw: components.ndviStressZ,
      value: toRadar(components.ndviStressZ),
      compareRaw: compareComponents?.ndviStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.ndviStressZ) : undefined,
    },
    {
      subject: 'Thermal Heat Stress (LST)',
      raw: components.lstStressZ,
      value: toRadar(components.lstStressZ),
      compareRaw: compareComponents?.lstStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.lstStressZ) : undefined,
    },
    {
      subject: 'Groundwater Depth Drop',
      raw: components.groundwaterStressZ,
      value: toRadar(components.groundwaterStressZ),
      compareRaw: compareComponents?.groundwaterStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.groundwaterStressZ) : undefined,
    },
    {
      subject: 'Surface Water Deficit (GWP)',
      raw: components.surfaceWaterStressZ,
      value: toRadar(components.surfaceWaterStressZ),
      compareRaw: compareComponents?.surfaceWaterStressZ,
      compareValue: compareComponents ? toRadar(compareComponents.surfaceWaterStressZ) : undefined,
    },
  ];

  return (
    <div style={{ width: '100%', height }} className="font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <PolarRadiusAxis
            domain={[0, 5]}
            stroke="#475569"
            tick={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#0f172a] border border-slate-700 p-2.5 rounded shadow-lg text-slate-200">
                    <div className="font-bold text-xs font-sans text-cyan-400 mb-1">
                      {item.subject}
                    </div>
                    <div className="flex justify-between gap-4 font-mono text-xs">
                      <span>Observed z-score:</span>
                      <strong className={item.raw > 0 ? 'text-rose-400' : 'text-teal-400'}>
                        {item.raw > 0 ? `+${item.raw.toFixed(2)}σ` : `${item.raw.toFixed(2)}σ`}
                      </strong>
                    </div>
                    {item.compareRaw !== undefined && (
                      <div className="flex justify-between gap-4 font-mono text-xs mt-1 pt-1 border-t border-slate-800">
                        <span>{compareLabel} z-score:</span>
                        <strong className={item.compareRaw > 0 ? 'text-amber-400' : 'text-cyan-400'}>
                          {item.compareRaw > 0 ? `+${item.compareRaw.toFixed(2)}σ` : `${item.compareRaw.toFixed(2)}σ`}
                        </strong>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Baseline"
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.35}
          />
          {compareComponents && (
            <Radar
              name={compareLabel}
              dataKey="compareValue"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.35}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
