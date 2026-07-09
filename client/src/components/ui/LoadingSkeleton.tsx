import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'line' | 'table';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'line', count = 3 }) => {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {items.map((_, idx) => (
          <div
            key={idx}
            className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse space-y-4"
          >
            <div className="h-4 bg-slate-800 rounded-lg w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/80 rounded-lg w-full"></div>
              <div className="h-3 bg-slate-800/80 rounded-lg w-5/6"></div>
            </div>
            <div className="h-2 bg-slate-800/40 rounded-full w-full mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-5 bg-slate-800 rounded-lg w-full"></div>
        <div className="space-y-3">
          {items.map((_, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
              <div className="h-3 bg-slate-800/80 rounded-lg w-1/4"></div>
              <div className="h-3 bg-slate-800/80 rounded-lg w-1/3"></div>
              <div className="h-3 bg-slate-800/80 rounded-lg w-12 text-right"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 animate-pulse">
      {items.map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-4 bg-slate-800 rounded-lg w-1/4"></div>
          <div className="h-3 bg-slate-800/80 rounded-lg w-full"></div>
          <div className="h-3 bg-slate-800/60 rounded-lg w-5/6"></div>
        </div>
      ))}
    </div>
  );
};
