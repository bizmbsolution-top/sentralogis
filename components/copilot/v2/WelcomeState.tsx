'use client';

import React from 'react';
import { Bot } from 'lucide-react';

export function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 select-none">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
        <Bot className="w-7 h-7 text-white" />
      </div>

      {/* Greeting */}
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Copilot Sentralogis</h1>
      <p className="text-sm text-slate-500 text-center max-w-sm">
        Apa yang ingin Anda lakukan?
      </p>
    </div>
  );
}
