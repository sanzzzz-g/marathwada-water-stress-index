import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';

interface ActualVsPredictedChartProps {
  data: {
    actual: number;
    predicted: number;
    residual: number;
    district: string;
    date: string;
  }[];
  height?: number;
}

export const ActualVsPredictedChart: React.FC<ActualVsPredictedChartProps> = ({
  data,
  height = 300,
}) => {
  // Generate diagonal line endpoints
  const diagonalPoints = [
    { x: 0, y: 0 },
    { x: 2.5, y: 2.5 },
  ];

  return (
    <div style={{ width: '100%', height }} className="font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual Observed WSI"
            domain={[0, 2.5]}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            label={{ value: 'Observed Ground-Truth WSI', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Predicted WSI"
            domain={[0, 2.5]}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            label={{ value: 'Predicted WSI', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 10 }}
          />
          <ZAxis range={[25, 25]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#0f172a] border border-slate-700 p-2.5 rounded shadow-lg text-slate-200">
                    <div className="text-cyan-400 font-sans font-bold text-xs mb-1">
                      {item.district} ({item.date})
                    </div>
                    <div className="flex justify-between gap-4 font-mono text-xs">
                      <span className="text-slate-400">Actual WSI:</span>
                      <strong className="text-white">{item.actual.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between gap-4 font-mono text-xs">
                      <span className="text-amber-400">Predicted WSI:</span>
                      <strong className="text-amber-300">{item.predicted.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between gap-4 font-mono text-xs border-t border-slate-800 pt-1 mt-1">
                      <span className="text-slate-400">Residual (Err):</span>
                      <strong className={item.residual > 0 ? 'text-rose-400' : 'text-teal-400'}>
                        {item.residual > 0 ? `+${item.residual.toFixed(3)}` : item.residual.toFixed(3)}
                      </strong>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter
            name="Predictions (Test 2021-2024)"
            data={data}
            fill="#06b6d4"
            opacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
