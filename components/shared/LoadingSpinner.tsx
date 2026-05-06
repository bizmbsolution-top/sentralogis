import React from 'react';

export function LoadingSpinner({ message = "Loading System Data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic animate-pulse">
        {message}
      </p>
    </div>
  );
}
