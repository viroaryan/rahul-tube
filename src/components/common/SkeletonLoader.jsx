import React from 'react';

export default function SkeletonLoader({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 animate-pulse">
          <div className="aspect-video bg-zinc-800/70 rounded-xl" />
          <div className="flex gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-800 rounded w-3/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
