import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  THRESHOLD_MODERATE,
  THRESHOLD_SEVERE,
  THRESHOLD_WET,
  THRESHOLD_VERY_WET,
} from '../../utils/wsiCalculations';

interface TimeSeriesChartProps {
  data: {
    date: string;
    wsi?: number;
    wsi_w1?: number;
    forecast?: number;
    forecastLower?: number;
    forecastUpper?: number;
    category?: string;
  }[];
  height?: number;
  showForecastBands?: boolean;
  showW1Comparison?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  height = 320,
  showForecastBands = false,
  showW1Comparison = false,
}) => {
  return (
    <div style={{ width: '100%', height }} className="font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="wsiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="forecastBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

          <XAxis
            dataKey="date"
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={{ stroke: '#334155' }}
            minTickGap={25}
          />
          <YAxis
            domain={['auto', 'auto']}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={{ stroke: '#334155' }}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#0f172a] border border-slate-700/80 p-2.5 rounded shadow-xl text-slate-200">
                    <div className="text-slate-400 font-sans text-xs font-semibold mb-1">
                      {label}
                    </div>
                    {item.wsi !== undefined && (
                      <div className="flex justify-between gap-4 font-mono text-xs">
                        <span className="text-cyan-400">Authoritative WSI (W0):</span>
                        <span className="font-bold">{item.wsi.toFixed(3)}</span>
                      </div>
                    )}
                    {item.wsi_w1 !== undefined && showW1Comparison && (
                      <div className="flex justify-between gap-4 font-mono text-xs">
                        <span className="text-purple-400">Experimental (W1):</span>
                        <span className="font-bold">{item.wsi_w1.toFixed(3)}</span>
                      </div>
                    )}
                    {item.category && (
                      <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                        Category: <strong className="text-white">{item.category}</strong>
                      </div>
                    )}
                    {item.forecast !== undefined && (
                      <div className="flex justify-between gap-4 font-mono text-xs mt-1 pt-1 border-t border-slate-800">
                        <span className="text-amber-400">Model Forecast:</span>
                        <span className="font-bold">{item.forecast.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Reference thresholds */}
          <ReferenceLine
            y={THRESHOLD_SEVERE}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            label={{
              value: 'Severe (1.50)',
              fill: '#f43f5e',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <ReferenceLine
            y={THRESHOLD_MODERATE}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{
              value: 'Moderate (0.50)',
              fill: '#f59e0b',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <ReferenceLine
            y={0}
            stroke="#475569"
            strokeDasharray="2 2"
          />
          <ReferenceLine
            y={THRESHOLD_WET}
            stroke="#06b6d4"
            strokeDasharray="3 3"
            label={{
              value: 'Wet (-0.50)',
              fill: '#06b6d4',
              fontSize: 10,
              position: 'insideBottomRight',
            }}
          />
          <ReferenceLine
            y={THRESHOLD_VERY_WET}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            label={{
              value: 'Very Wet (-1.50)',
              fill: '#3b82f6',
              fontSize: 10,
              position: 'insideBottomRight',
            }}
          />

          {/* Historical W0 series */}
          <Area
            type="monotone"
            dataKey="wsi"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#wsiGradient)"
            name="WSI (W0)"
            dot={false}
          />

          {/* W1 comparison if toggled */}
          {showW1Comparison && (
            <Area
              type="monotone"
              dataKey="wsi_w1"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="none"
              name="WSI (W1 Experimental)"
              dot={false}
            />
          )}

          {/* Forecast Area */}
          {showForecastBands && (
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="url(#forecastBandGradient)"
              name="Predicted WSI"
              dot={{ r: 4, fill: '#f59e0b' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
