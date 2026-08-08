import React from 'react';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { AnimationState } from '@/src/platforms/experience/sentrabot/SentraBotState';

export default function SentraBotThinking() {
  const bot = useSentraBot();
  const snapshot = bot.getSnapshot();

  if (snapshot.animationState !== AnimationState.SEARCHING && snapshot.animationState !== AnimationState.PLANNING) {
    return null;
  }

  return (
    <div className="flex flex-col items-start px-2 py-1">
      <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
        <span>SentraBot</span>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded truncate max-w-[120px]" title={snapshot.whyCurrentState}>
          {snapshot.animationState}
        </span>
      </div>
      <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center gap-1.5 h-11">
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
