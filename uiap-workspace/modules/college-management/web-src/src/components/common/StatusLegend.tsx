import React from 'react';
import { CheckCircle2, XCircle, Clock, CalendarOff, Info } from 'lucide-react';

export const StatusLegend: React.FC = () => {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-sm flex items-center space-x-6 text-[10px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">
      <div className="flex items-center">
        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full mr-2 animate-pulse" />
        <span>Present</span>
      </div>
      <div className="flex items-center">
        <span className="w-2.5 h-2.5 bg-rose-400 rounded-full mr-2 animate-pulse" />
        <span>Absent</span>
      </div>
      <div className="flex items-center">
        <span className="w-2.5 h-2.5 bg-amber-400 rounded-full mr-2 animate-pulse" />
        <span>Late</span>
      </div>
      <div className="flex items-center">
        <span className="w-2.5 h-2.5 bg-blue-400 rounded-full mr-2 animate-pulse" />
        <span>Leave</span>
      </div>
    </div>
  );
};
