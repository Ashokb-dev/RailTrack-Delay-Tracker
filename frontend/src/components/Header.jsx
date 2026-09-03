import React from 'react';
import { Link } from 'react-router-dom';
import { Train, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

export const Header = ({ className }) => {
  return (
    <header
      className={cn(
        "w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                RailTrack <span className="text-blue-600">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Indian Railways Tracking & XGBoost Delay Prediction
            </p>
          </div>
        </Link>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>RailRadar LIVE API</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;