import React from 'react';
import { MapPin, Clock, ArrowRight, Flag } from 'lucide-react';
import { cn } from '../utils/cn';

export const CurrentStateCard = ({
  currentLocationCode,
  currentLocationName,
  currentDelayMinutes,
  nextStationCode,
  nextStationName,
  predictedDestinationEta,
  scheduledDestinationEta,
  destinationCode,
  destinationName,
  className
}) => {
  const isDelayed = currentDelayMinutes > 0;
  const isEarly = currentDelayMinutes < 0;

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
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {currentLocationCode || "---"}
          </div>
          <div className="text-sm font-medium text-slate-600 truncate mt-0.5">
            {currentLocationName || "Observed Station"}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Last observed telemetry
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
          <div className="text-sm font-medium text-slate-600 mt-0.5">
            {isDelayed ? "Running Behind Schedule" : isEarly ? "Running Ahead" : "On Schedule"}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          At current position
        </div>
      </div>

      {/* 3. NEXT STATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Next Station</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {nextStationCode || "---"}
          </div>
          <div className="text-sm font-medium text-slate-600 truncate mt-0.5">
            {nextStationName || "Next Stop"}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Next unreached forecast target
        </div>
      </div>

      {/* 4. DESTINATION ETA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Destination ETA</span>
          <Flag className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-900 tracking-tight">
            {predictedDestinationEta || "--:--"}
          </div>
          <div className="text-sm font-medium text-slate-600 truncate mt-0.5">
            {destinationName || "Destination"} ({destinationCode})
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
          Sch: <span className="font-semibold text-slate-600">{scheduledDestinationEta || "--:--"}</span>
        </div>
      </div>
    </div>
  );
};
