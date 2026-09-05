import React, { useState } from 'react';
import { Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';

export const ModelInputs = ({ modelEngine, confidence, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id="model-features-panel"
      className={cn(
        "w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-left">
            <h4 className="text-sm font-bold text-slate-900">
              AI Prediction Model & Pipeline Specifications
            </h4>
            <p className="text-xs text-slate-500">
              {modelEngine || "XGBoost Regressor (models/best_model_v1.pkl)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2.5">
          <p className="leading-relaxed">
            <strong>Feature Engineering:</strong> Predictions are computed sequentially station-by-station using previous station arrival delay, scheduled inter-station travel duration, scheduled dwell time, sequence index, day of week, and assigned platform number.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Algorithm</span>
              <span className="font-bold text-slate-800">XGBoost Regressor</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Training Set</span>
              <span className="font-bold text-slate-800">~22,000 Rows</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Validation MAE</span>
              <span className="font-bold text-slate-800">5.34 Minutes</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Validation R²</span>
              <span className="font-bold text-slate-800">0.7617</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            * Source metric: Calculated heuristic delta consistency score based on XGBoost model evaluation against 22,000 historical train runs.
          </p>
        </div>
      )}
    </div>
  );
};
