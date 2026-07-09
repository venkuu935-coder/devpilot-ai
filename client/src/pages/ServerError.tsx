import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';

interface ServerErrorProps {
  error?: Error;
  resetError?: () => void;
}

export const ServerError: React.FC<ServerErrorProps> = ({ error, resetError }) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 font-sans">
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Warning Badge symbol */}
        <div className="bg-rose-500/10 p-5 rounded-3xl w-max mx-auto ring-1 ring-white/10 text-rose-455">
          <AlertTriangle className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">500 - Server Exception</h1>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            An unexpected runtime error occurred inside the dashboard render engine.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl text-left max-h-40 overflow-y-auto custom-scrollbar font-mono text-[10px] text-rose-350 select-text leading-relaxed">
            <span className="font-bold block uppercase mb-1">Details:</span>
            {error.toString()}
            {error.stack && (
              <pre className="mt-2 text-slate-500 whitespace-pre-wrap">{error.stack}</pre>
            )}
          </div>
        )}

        {/* Control options */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          {resetError && (
            <Button
              onClick={resetError}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-350 font-semibold rounded-xl text-xs"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Retry Render</span>
            </Button>
          )}
          <Button
            onClick={() => { window.location.href = '/'; }}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Reload Overview</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
