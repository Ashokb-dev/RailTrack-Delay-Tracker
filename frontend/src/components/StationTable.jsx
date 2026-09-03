import React from 'react';
import { cn } from '../utils/cn';

export const StationTable = ({ stations = [], className }) => {
  if (!stations || stations.length === 0) return null;

  return (
    <div
      id="station-timeline-table"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden",
        className
      )}
    >
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Station Timeline & Prediction Schedule
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Detailed station-by-station scheduled, observed, and XGBoost predicted timings
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Seq</th>
              <th className="py-3 px-4">Station</th>
              <th className="py-3 px-4">Scheduled</th>
              <th className="py-3 px-4">Actual / Observed</th>
              <th className="py-3 px-4">Predicted (XGBoost)</th>
              <th className="py-3 px-4">Predicted Delay</th>
              <th className="py-3 px-4">Delta (Δ)</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {stations.map((st, idx) => {
              const isObserved = st.isObserved;
              const delay = st.predictedDelayMinutes ?? 0;
              const delta = st.delayChangeMinutes ?? 0;

              return (
                <tr
                  key={st.code || idx}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    isObserved ? "bg-emerald-50/20" : ""
                  )}
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-500">
                    {st.sequence || idx + 1}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {st.name} <span className="font-normal text-slate-500">({st.code})</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {st.scheduledArrival || "--:--"}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">
                    {isObserved ? (st.actualArrival || st.scheduledArrival) : "--:--"}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-700">
                    {st.predictedArrival || "--:--"}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px]",
                      delay > 0 ? "bg-red-50 text-red-700 border border-red-200" : delay < 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                    )}>
                      {delay > 0 ? `+${delay} min` : delay < 0 ? `${delay} min` : "On Time"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                    {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}m` : "0m"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      isObserved
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    )}>
                      {isObserved ? "Observed" : "Forecast"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
