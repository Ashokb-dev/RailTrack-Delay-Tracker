import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export const ArrivalForecast = ({
  train,
  forecastData,
  className
}) => {
  const [isFactorsExpanded, setIsFactorsExpanded] = useState(false);

  const expectedDelay = forecastData?.delayExpected ?? train?.predictedFinalDelayMinutes ?? 0;
  const expectedArrival = forecastData?.arrivalExpected ?? train?.predictedDestinationEta ?? "--:--";

  const isRangeAvailable = forecastData?.isRangeAvailable === true && forecastData?.arrivalEarliest && forecastData?.arrivalLatest;

  const earliestDelay = isRangeAvailable ? forecastData.delayEarliest : null;
  const latestDelay = isRangeAvailable ? forecastData.delayLatest : null;

  const earliestArrival = isRangeAvailable ? forecastData.arrivalEarliest : "--:--";
  const latestArrival = isRangeAvailable ? forecastData.arrivalLatest : "--:--";

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
      impactText: `${expectedDelay >= 0 ? '+' : ''}${expectedDelay} min expected`,
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
            XGBoost machine learning prediction for remaining journey
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Destination:{" "}
          <span className="font-semibold text-slate-900">
            {train?.destination?.name || "Destination"} ({train?.destination?.code || ""})
          </span>
        </div>
      </div>

      {/* 2. Three Outcomes */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-stretch">
        {/* Outcome 1: Earliest */}
        <div className="p-2.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-center">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Earliest likely
          </div>
          <div className="my-0.5 sm:my-1">
            <span className="text-base sm:text-xl font-bold text-slate-700">
              {earliestArrival}
            </span>
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {earliestDelay !== null ? `+${earliestDelay} min` : "Uncalibrated"}
            </span>
          </div>
        </div>

        {/* Outcome 2: Expected (Primary Point Prediction) */}
        <div className="p-2.5 sm:p-4.5 rounded-xl bg-blue-50/80 border-2 border-blue-600 shadow-xs flex flex-col justify-between text-center relative">
          <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
            <span>Expected (XGBoost)</span>
          </div>
          <div className="my-0.5 sm:my-1">
            <span className="text-xl sm:text-3xl font-extrabold text-blue-900 tracking-tight">
              {expectedArrival}
            </span>
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600 text-white shadow-2xs">
              {expectedDelay >= 0 ? `+${expectedDelay}` : expectedDelay} min delay
            </span>
          </div>
        </div>

        {/* Outcome 3: Latest */}
        <div className="p-2.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-center">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Latest likely
          </div>
          <div className="my-0.5 sm:my-1">
            <span className="text-base sm:text-xl font-bold text-slate-700">
              {latestArrival}
            </span>
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {latestDelay !== null ? `+${latestDelay} min` : "Uncalibrated"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Info Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Scheduled Destination ETA:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
            {train?.scheduledDestinationEta || "--:--"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Expected Delay:</span>
          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
            {expectedDelay >= 0 ? `+${expectedDelay}` : expectedDelay} min
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
