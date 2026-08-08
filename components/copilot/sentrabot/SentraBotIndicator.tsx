import React from 'react';
import SentraBotAvatar from './SentraBotAvatar';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { AnimationState } from '@/src/platforms/experience/sentrabot/SentraBotState';

export default function SentraBotIndicator() {
  const bot = useSentraBot();
  const { animationState } = bot.getSnapshot();
  
  let label = 'Active';
  if (animationState === AnimationState.SEARCHING || animationState === AnimationState.PLANNING) label = 'Thinking';
  if (animationState === AnimationState.WAITING_CONFIRMATION) label = 'Awaiting';
  if (animationState === AnimationState.EXECUTING) label = 'Executing';

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pr-3 pl-1 py-1 shadow-sm w-max">
      <SentraBotAvatar size="sm" />
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </div>
  );
}
