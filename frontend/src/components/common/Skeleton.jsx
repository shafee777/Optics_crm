import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    />
  );
}

export function SkeletonCard({ height = 'h-32', className = '' }) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBlock className={`w-3/4 ${height}`} />
      <div className="flex gap-2 pt-2">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <SkeletonBlock
                key={cIdx}
                className={`h-4 ${cIdx === 0 ? 'w-1/3' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} height="h-8" />
      ))}
    </div>
  );
}
