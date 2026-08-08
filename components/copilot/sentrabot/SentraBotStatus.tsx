import React from 'react';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { AnimationState } from '@/src/platforms/experience/sentrabot/SentraBotState';

export default function SentraBotStatus() {
  const bot = useSentraBot();
  const { animationState } = bot.getSnapshot();

  let color = 'bg-slate-400';
  let text = 'Disconnected';

  if (animationState === AnimationState.IDLE || animationState === AnimationState.SUCCESS) {
    color = 'bg-emerald-500';
    text = 'Online';
  } else if (animationState === AnimationState.SEARCHING || animationState === AnimationState.PLANNING) {
    color = 'bg-indigo-500';
    text = 'Thinking';
  } else if (animationState === AnimationState.EXECUTING) {
    color = 'bg-blue-500';
    text = 'Busy';
  } else if (animationState === AnimationState.WARNING) {
    color = 'bg-amber-500';
    text = 'Warning';
  } else if (animationState === AnimationState.ERROR) {
    color = 'bg-rose-500';
    text = 'Error';
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className={`text-xs font-medium text-${color.replace('bg-', '')}`}>{text}</span>
    </div>
  );
}
