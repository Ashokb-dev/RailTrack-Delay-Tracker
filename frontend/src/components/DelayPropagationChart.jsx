import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '../utils/cn';

export const DelayPropagationChart = ({ stations = [], className }) => {
  if (!stations || stations.length === 0) return null;

  const data = stations.map(st => ({
    name: st.code,
    fullName: st.name,
    actualDelay: st.isObserved ? st.actualDelayMinutes ?? 0 : null,
    predictedDelay: st.predictedDelayMinutes ?? 0,
    scheduledDelay: 0
  }));

  return (
    <div
      id="delay-trend-chart-card"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4",
        className
      )}
    >
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Delay Trend & Propagation Chart
        </h3>
        <p className="text-xs text-slate-500">
          Visual representation of observed delay vs XGBoost predicted delay along the route
        </p>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} unit=" m" tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              formatter={(value, name, item) => [
                `${value} min`,
                item?.dataKey === "actualDelay"
                  ? "Observed Delay"
                  : item?.dataKey === "predictedDelay"
                  ? "XGBoost Predicted Delay"
                  : "Scheduled Baseline"
              ]}
              labelFormatter={(label) => `Station: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            <Line
              type="monotone"
              dataKey="scheduledDelay"
              name="Scheduled Baseline (0 min)"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualDelay"
              name="Observed Delay (min)"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5, fill: "#10b981" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predictedDelay"
              name="XGBoost Predicted Delay (min)"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
