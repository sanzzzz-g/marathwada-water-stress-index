import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { THRESHOLD_MODERATE, THRESHOLD_SEVERE } from '../../utils/wsiCalculations';

interface DistrictsBarChartProps {
  data: {
    districtName: string;
    observedWsi: number;
    forecastH1?: number;
    forecastH2?: number;
    forecastH3?: number;
  }[];
  height?: number;
}

export const DistrictsBarChart: React.FC<DistrictsBarChartProps> = ({
  data,
  height = 300,
}) => {
  return (
    <div style={{ width: '100%', height }} className="font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="districtName"
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            domain={['auto', 'auto']}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#0f172a] border border-slate-700/80 p-2.5 rounded shadow-xl text-slate-200">
                    <div className="text-cyan-400 font-sans font-bold text-xs mb-1.5">
                      {label}
                    </div>
                    {payload.map((entry, idx) => (
                      <div key={idx} className="flex justify-between gap-4 font-mono text-xs mb-0.5">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <strong className="text-slate-100">{Number(entry.value).toFixed(3)}</strong>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }}
          />

          <ReferenceLine
            y={THRESHOLD_SEVERE}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            label={{ value: 'Severe (1.50)', fill: '#f43f5e', fontSize: 9, position: 'insideTopRight' }}
          />
          <ReferenceLine
            y={THRESHOLD_MODERATE}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Moderate (0.50)', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
          />
          <ReferenceLine
            y={0}
            stroke="#475569"
            strokeDasharray="2 2"
          />

          <Bar dataKey="observedWsi" name="Observed WSI (Dec 2024)" fill="#06b6d4" radius={[2, 2, 0, 0]} />
          <Bar dataKey="forecastH1" name="Persistence H1 (Jan 2025)" fill="#14b8a6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="forecastH2" name="Persistence H2 (Feb 2025)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          <Bar dataKey="forecastH3" name="Persistence H3 (Mar 2025)" fill="#f43f5e" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
