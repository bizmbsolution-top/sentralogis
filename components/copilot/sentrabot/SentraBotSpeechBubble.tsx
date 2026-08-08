import React from 'react';
import SentraBotAvatar from './SentraBotAvatar';

interface SentraBotSpeechBubbleProps {
  children: React.ReactNode;
}

export default function SentraBotSpeechBubble({ children }: SentraBotSpeechBubbleProps) {
  return (
    <div className="flex w-full mb-6 justify-start">
      <div className="flex gap-3 max-w-[85%] flex-row">
        
        {/* Animated AI Avatar */}
        <div className="shrink-0 pt-2">
          <SentraBotAvatar size="sm" />
        </div>

        {/* Content */}
        <div className="flex flex-col items-start min-w-0">
          <div className="text-xs text-slate-400 mb-1 font-medium px-1 flex items-center gap-1.5">
            <span>SentraBot</span>
          </div>
          
          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm bg-white border border-slate-200 text-slate-700 rounded-tl-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
