import React from 'react';
import { Sparkles } from 'lucide-react';

interface QuickCommandPanelProps {
  onSelect: (cmd: string) => void;
}

const COMMANDS = [
  "Assign driver Budi to WO-1234",
  "Show delayed jobs",
  "Any missing PODs?",
  "Create draft for 2 containers to Surabaya",
  "Where is fleet B9123CD?"
];

export default function QuickCommandPanel({ onSelect }: QuickCommandPanelProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        SUGGESTED
      </div>
      <div className="flex flex-wrap gap-2">
        {COMMANDS.map((cmd, idx) => (
          <button 
            key={idx}
            onClick={() => onSelect(cmd)}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
