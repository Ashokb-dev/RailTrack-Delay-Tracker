import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Navigation, MapPin, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export const ArrivalForecast = ({
  train,
  forecastData,
  className
}) => {
  const [isFactorsExpanded, setIsFactorsExpanded] = useState(false);

  const serviceStatus = train?.serviceStatus || {};
  const telemetryGuard = train?.telemetryGuard || {};
  const isForecastAvailable = train?.forecastAvailable !== false;

  // Next Stop Primary Forecast
  const nextStop = forecastData?.nextStopForecast || null;
  const nextCode = nextStop?.code || train?.nextStation?.code || "";
  const nextName = nextStop?.name || train?.nextStation?.name || "Next Stop";
  const nextExpected = nextStop?.expectedArrival || "--:--";
  const nextEarliest = nextStop?.arrivalEarliest;
  const nextLatest = nextStop?.arrivalLatest;
  const isNextRangeAvailable = nextStop?.isRangeAvailable === true && Boolean(nextEarliest) && Boolean(nextLatest);
  const nextScheduled = nextStop?.scheduledArrival || train?.nextStation?.scheduledArrival || "--:--";

  // Destination Secondary Forecast
  const dest = forecastData?.destinationForecast || null;
  const destCode = dest?.code || train?.destination?.code || "";
  const destName = dest?.name || train?.destination?.name || "Destination";
  const destExpected = dest?.expectedArrival || forecastData?.arrivalExpected || train?.predictedDestinationEta || "--:--";
  const destEarliest = dest?.arrivalEarliest || forecastData?.arrivalEarliest;
  const destLatest = dest?.arrivalLatest || forecastData?.arrivalLatest;
  const isDestRangeAvailable = (dest?.isRangeAvailable === true || forecastData?.isRangeAvailable === true) && Boolean(destEarliest) && Boolean(destLatest);
  const destScheduled = dest?.scheduledArrival || train?.scheduledDestinationEta || "--:--";

  const factors = forecastData?.forecastFactors || [
    {
      id: "current_delay",
      title: "Live Accumulated Delay",
      description: `Current train delay observed at ${train?.currentStation?.name || "current station"}.`,
      detail: `Base delay: +${train?.currentDelayMinutes ?? 0} min`,
      impactText: `+${train?.currentDelayMinutes ?? 0} min`,
      type: "current_delay"
    },
    {
      id: "xgb_model",
      title: "XGBoost Machine Learning Model",
      description: "Station sequence, dwell times, and inter-station schedule buffer analysis.",
      detail: "Point prediction output",
      impactText: `${train?.predictedFinalDelayMinutes >= 0 ? '+' : ''}${train?.predictedFinalDelayMinutes ?? 0} min expected`,
      type: "operational"
    }
  ];

  return (
    <section
      id="arrival-forecast-section"
      aria-label="Arrival Forecast"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6",
        className
      )}
    >
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Arrival Forecast
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            XGBoost ML prediction for upcoming stop & destination
          </p>
        </div>
      </div>

      {/* Telemetry Staleness / Non-Live Warning Banner */}
      {telemetryGuard.warningMessage && isForecastAvailable && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{telemetryGuard.warningMessage}</span>
        </div>
      )}

      {/* Extreme Delay Warning Banner */}
      {serviceStatus.extremeDelay && isForecastAvailable && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Train experiencing extreme delay (&gt;3 hrs). Forecast accuracy may be degraded.</span>
        </div>
      )}

      {/* Unavailable Service Status Box (Cancelled / Diverted / Missing Location) */}
      {!isForecastAvailable ? (
        <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold">Forecast Unavailable</h3>
            <p className="text-sm font-medium mt-0.5">
              {serviceStatus.message || "Arrival forecast unavailable."}
            </p>
          </div>
        </div>
      ) : (
      /* 2. Forecast Cards: Next Stop (Primary) & Destination (Secondary) */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PRIMARY CARD: NEXT STOP */}
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 border-2 border-blue-600 shadow-xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>Next Stop (Primary)</span>
            </div>
            {nextCode && (
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                {nextCode}
              </span>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {nextName}
            </h3>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-medium">Expected Arrival</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                {nextExpected}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-blue-200/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Likely arrival</span>
              <span className="font-semibold text-slate-900 bg-white/80 px-2.5 py-1 rounded-md border border-blue-200 whitespace-nowrap">
                {isNextRangeAvailable ? `${nextEarliest} – ${nextLatest}` : "Likely arrival range unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Scheduled</span>
              <span className="font-semibold text-slate-900 bg-white/80 px-2.5 py-1 rounded-md border border-blue-200 whitespace-nowrap">
                {nextScheduled}
              </span>
            </div>
          </div>
        </div>

        {/* SECONDARY CARD: DESTINATION */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Destination (Secondary)</span>
            </div>
            {destCode && (
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                {destCode}
              </span>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              {destName}
            </h3>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-medium">Expected Arrival</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900">
                {destExpected}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Likely arrival</span>
              <span className="font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap">
                {isDestRangeAvailable ? `${destEarliest} – ${destLatest}` : "Likely arrival range unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Scheduled</span>
              <span className="font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap">
                {destScheduled}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Deterministic Forecast Explanation Message */}
      {forecastData?.message && (
        <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs sm:text-sm font-medium text-slate-800 flex items-start gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
          <p className="leading-relaxed">{forecastData.message}</p>
        </div>
      )}

      {/* 3. Info Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Scheduled Destination ETA:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
            {train?.scheduledDestinationEta || "--:--"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Live Delay:</span>
          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
            {train?.currentDelayMinutes >= 0 ? `+${train?.currentDelayMinutes}` : train?.currentDelayMinutes} min
          </span>
        </div>
      </div>

      {/* 4. Forecast Factors */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsFactorsExpanded(!isFactorsExpanded)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Forecast Factors & Methodology</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span>{isFactorsExpanded ? "Hide details" : "View details"}</span>
            {isFactorsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isFactorsExpanded && (
          <div className="mt-3 space-y-2.5 pt-1">
            {factors.map((factor, idx) => (
              <div
                key={factor.id || idx}
                className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 text-sm">
                    {factor.title}
                  </span>
                  {factor.impactText && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {factor.impactText}
                    </span>
                  )}
                </div>
                <p className="text-slate-600">{factor.description}</p>
                {factor.detail && (
                  <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-100">
                    {factor.detail}
                  </div>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400 italic pt-1 text-center">
              * Note: Operational causal factors (weather, signaling) are unobserved by live telemetry. XGBoost uses historical timetable buffers and delay deltas.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
