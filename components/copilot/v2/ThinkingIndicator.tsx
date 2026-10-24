'use client';

import React from 'react';
import { Bot } from 'lucide-react';

interface ThinkingIndicatorProps {
  stage?: 1 | 2 | 3;
}

const STAGES = [
  'Understanding context',
  'Reviewing relevant activity',
  'Preparing result',
];

export function ThinkingIndicator({ stage = 1 }: ThinkingIndicatorProps) {
  const text = STAGES[stage - 1] || STAGES[0];

  return (
    <div className="flex items-start gap-3 py-3 animate-fadeIn">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-sm text-slate-500">{text}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
              style={{
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
