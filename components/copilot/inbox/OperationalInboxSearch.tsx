'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface OperationalInboxSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function OperationalInboxSearch({ value, onChange, placeholder = 'Search inbox...' }: OperationalInboxSearchProps) {
  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3 text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-slate-50 border-none pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200 shadow-sm outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
