import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface GuardrailPanelProps {
  warnings: string[];
}

export default function GuardrailPanel({ warnings }: GuardrailPanelProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2 text-sm w-full max-w-md">
      <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
        <AlertTriangle className="w-4 h-4" />
        Operational Advisory
      </div>
      <ul className="list-disc pl-5 space-y-1 text-amber-700">
        {warnings.map((w, idx) => (
          <li key={idx}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
