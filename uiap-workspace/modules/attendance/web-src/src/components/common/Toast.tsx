import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl transition-all animate-in slide-in-from-right-8 duration-200 ${
              isSuccess
                ? 'bg-slate-900 text-white border-emerald-500/50'
                : isError
                ? 'bg-rose-900 text-white border-rose-500/50'
                : isWarning
                ? 'bg-amber-950 text-amber-100 border-amber-500/50'
                : 'bg-slate-900 text-slate-100 border-indigo-500/50'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {isError && <XCircle className="w-5 h-5 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-indigo-400" />}
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
