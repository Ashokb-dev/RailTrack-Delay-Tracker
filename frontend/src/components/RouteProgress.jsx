import React from 'react';
import { CheckCircle2, MapPin, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

export const RouteProgress = ({
  stations = [],
  currentStationCode,
  selectedStationCode,
  onSelectStation,
  className
}) => {
  if (!stations || stations.length === 0) return null;

  // Identify current station index strictly from live currentStationCode
  let currentIdx = -1;
  if (currentStationCode) {
    currentIdx = stations.findIndex(st => st.code === currentStationCode);
  }
  if (currentIdx === -1) {
    currentIdx = 0;
  }

  return (
    <div
      id="route-progress-section"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Route Progress
          </h3>
          <p className="text-xs text-slate-500">
            Complete route telemetry line — observed stops, current location & upcoming stops
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Passed
          </span>
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 animate-pulse" /> Current Position
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Upcoming
          </span>
        </div>
      </div>

      {/* Route Timeline Track */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="min-w-[650px] flex items-center justify-between relative px-6">
          {/* Background Connecting Line */}
          <div className="absolute left-8 right-8 top-5 h-1 bg-slate-200 -z-0" />

          {stations.map((st, index) => {
            const isCurrent = index === currentIdx;
            const isPassed = index < currentIdx;
            const isUpcoming = index > currentIdx;
            const isSelected = selectedStationCode === st.code;

            return (
              <button
                key={`${st.code}-${st.sequence || index}`}
                type="button"
                onClick={() => onSelectStation && onSelectStation(st)}
                className={cn(
                  "relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none transition-transform",
                  isSelected ? "scale-110" : ""
                )}
              >
                {/* Node Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all shadow-xs",
                  isCurrent
                    ? "bg-blue-600 border-blue-700 text-white ring-4 ring-blue-100 scale-110"
                    : isPassed
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                )}>
                  {isCurrent ? (
                    <MapPin className="w-4 h-4 text-white animate-bounce" />
                  ) : isPassed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Station Info Below Node */}
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {st.code}
                    </span>
                    {isCurrent && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-600 text-white">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 truncate max-w-[90px]">
                    {st.name}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {isPassed ? (st.actualArrival || st.scheduledArrival) : isCurrent ? (st.actualArrival || st.scheduledArrival) : st.predictedArrival}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
