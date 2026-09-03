import React from 'react';
import { ArrowRight, Clock, Train } from 'lucide-react';
import { cn } from '../utils/cn';

export default function TrainCard({ train, from, to, trackTrain, className }) {
  const number = train?.trainNumber || "---";
  const name = train?.trainName || "Express Train";
  const type = train?.serviceType || "Express";
  const depTime = train?.departureTime;
  const arrTime = train?.arrivalTime;
  const originName = train?.fromName || train?.from || from;
  const destName = train?.toName || train?.to || to;

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {number}
          </span>
          <span className="text-slate-300 font-light">•</span>
          <span className="text-lg font-bold text-slate-800">
            {name}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            {type}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-900">{originName}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900">{destName}</span>
          {depTime && arrTime && (
            <span className="ml-2 text-slate-400 font-medium">
              ({depTime} ➔ {arrTime})
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => trackTrain(train)}
        className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer text-sm"
      >
        <Train className="w-4 h-4 text-blue-400" />
        <span>Track & Predict</span>
      </button>
    </div>
  );
}