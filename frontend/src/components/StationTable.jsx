import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

export const StationTable = ({ stations = [], className }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStations = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return stations;
    }
    const query = searchQuery.trim().toLowerCase();
    return stations.filter((st) => {
      const nameMatch = st.name ? st.name.toLowerCase().includes(query) : false;
      const codeMatch = st.code ? st.code.toLowerCase().includes(query) : false;
      return nameMatch || codeMatch;
    });
  }, [stations, searchQuery]);

  if (!stations || stations.length === 0) return null;

  return (
    <div
      id="station-timeline-table"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden",
        className
      )}
    >
      <div className="p-5 border-b border-slate-200 space-y-3">
        {/* Search Control directly ABOVE heading */}
        <div className="relative max-w-xs">
          <label htmlFor="station-search-input" className="sr-only">
            Search station by name or code
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            id="station-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station..."
            aria-label="Search station by name or code"
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear station search"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Station Timeline & Prediction Schedule
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed station-by-station scheduled, observed, and XGBoost predicted timings
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredStations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-700">No station found</p>
            <p className="text-xs text-slate-500 mt-1">
              No station matches "<span className="font-medium text-slate-800">{searchQuery}</span>"
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Seq</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Scheduled</th>
                <th className="py-3 px-4">Actual / Observed</th>
                <th className="py-3 px-4">Predicted (XGBoost)</th>
                <th className="py-3 px-4 whitespace-nowrap">Predicted Delay</th>
                <th className="py-3 px-4">Delta (Δ)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStations.map((st, idx) => {
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
                    <td className="py-3 px-4 font-bold whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[11px] inline-block whitespace-nowrap",
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
        )}
      </div>
    </div>
  );
};
