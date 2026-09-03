import React from 'react';
import { CheckCircle2, Radio, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

export const RouteProgress = ({
  stations = [],
  selectedStationCode,
  onSelectStation,
  className
}) => {
  if (!stations || stations.length === 0) return null;

  return (
    <div
      id="route-progress-section"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Route Progress
          </h3>
          <p className="text-xs text-slate-500">
            Station-by-station observed status & future XGBoost forecast targets
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Passed / Observed
          </span>
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" /> Current
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Forecast
          </span>
        </div>
      </div>

      {/* Route Timeline Track */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="min-w-[600px] flex items-center justify-between relative px-4">
          {/* Background Connecting Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0" />

          {stations.map((st, index) => {
            const isPassed = st.isObserved;
            const isSelected = selectedStationCode === st.code;
            const isNext = !st.isObserved && (index === 0 || stations[index - 1]?.isObserved);

            return (
              <button
                key={st.code || index}
                type="button"
                onClick={() => onSelectStation && onSelectStation(st)}
                className={cn(
                  "relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none",
                  isSelected ? "scale-105" : ""
                )}
              >
                {/* Node Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-xs",
                  isPassed
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : isNext
                    ? "bg-blue-600 border-blue-700 text-white ring-4 ring-blue-100"
                    : "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                )}>
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isNext ? (
                    <Radio className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Station Info Below Node */}
                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {st.code}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 truncate max-w-[80px]">
                    {st.name}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                    {st.isObserved ? st.actualArrival || st.scheduledArrival : st.predictedArrival}
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
