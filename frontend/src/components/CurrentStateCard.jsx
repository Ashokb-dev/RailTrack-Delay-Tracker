import React from 'react';
import { MapPin, Clock, ArrowRight, Flag } from 'lucide-react';
import { cn } from '../utils/cn';

export const CurrentStateCard = ({
  currentLocationCode,
  currentLocationName,
  currentDelayMinutes,
  nextStationCode,
  nextStationName,
  nextStationDelayMinutes,
  className
}) => {
  const isDelayed = currentDelayMinutes > 0;
  const isEarly = currentDelayMinutes < 0;

  const isNextDelayed = typeof nextStationDelayMinutes === "number" && nextStationDelayMinutes > 0;
  const isNextEarly = typeof nextStationDelayMinutes === "number" && nextStationDelayMinutes < 0;
  const hasNextDelay = typeof nextStationDelayMinutes === "number";

  return (
    <div
      id="current-state-summary-row"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full",
        className
      )}
    >
      {/* 1. CURRENT LOCATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Current Location</span>
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {currentLocationName || currentLocationCode || "---"}
            </span>
            {currentLocationCode && currentLocationCode !== currentLocationName && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {currentLocationCode}
              </span>
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            Real live train location
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Observed telemetry position
        </div>
      </div>

      {/* 2. CURRENT DELAY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Current Delay</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <div className={cn(
            "text-2xl font-extrabold tracking-tight",
            isDelayed ? "text-red-600" : isEarly ? "text-emerald-600" : "text-blue-600"
          )}>
            {isDelayed ? `+${currentDelayMinutes} min` : isEarly ? `${currentDelayMinutes} min` : "On Time"}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            {isDelayed ? "Running Behind Schedule" : isEarly ? "Running Ahead" : "On Schedule"}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Live delay at current position
        </div>
      </div>

      {/* 3. NEXT STATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Next Station</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {nextStationName || nextStationCode || "---"}
            </span>
            {nextStationCode && nextStationCode !== nextStationName && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {nextStationCode}
              </span>
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            Next unreached forecast target
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Upcoming stop on route
        </div>
      </div>

      {/* 4. NEXT STATION DELAY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Next Station Delay</span>
          <Clock className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <div className={cn(
            "text-2xl font-extrabold tracking-tight whitespace-nowrap",
            isNextDelayed ? "text-red-600" : isNextEarly ? "text-emerald-600" : "text-blue-600"
          )}>
            {hasNextDelay
              ? (isNextDelayed ? `+${nextStationDelayMinutes} min` : isNextEarly ? `${nextStationDelayMinutes} min` : "On Time")
              : "--:--"}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            {isNextDelayed ? "Predicted Delay Increase" : isNextEarly ? "Predicted Time Recovery" : "Predicted On Schedule"}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          XGBoost predicted delay for {nextStationCode || nextStationName || "next stop"}
        </div>
      </div>
    </div>
  );
};
