import React from 'react';

export default function ThinkingIndicator() {
  return (
    <div className="flex w-full mb-6 justify-start">
      <div className="flex gap-3 flex-row">
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold shadow-sm border bg-slate-900 text-white border-black">
          🤖
        </div>
        <div className="flex flex-col items-start">
          <div className="text-xs text-slate-400 mb-1 font-medium px-1">
            Sentralogis Copilot
          </div>
          <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center gap-1.5 h-11">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
