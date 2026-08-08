import React from 'react';
import { Info } from 'lucide-react';

interface ExplainabilityPanelProps {
  whyProposed: string;
  resolvedEntities: string[];
  validationsSucceeded: string[];
  whyConfirmationRequired: string;
}

export default function ExplainabilityPanel({ whyProposed, resolvedEntities, validationsSucceeded, whyConfirmationRequired }: ExplainabilityPanelProps) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 my-2 text-sm">
      <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
        <Info className="w-4 h-4" />
        Execution Context
      </div>
      
      <div className="space-y-3 text-blue-900">
        <div>
          <span className="font-medium">Why: </span>
          {whyProposed}
        </div>
        
        {resolvedEntities.length > 0 && (
          <div>
            <span className="font-medium">Resolved: </span>
            <span className="text-blue-700">{resolvedEntities.join(', ')}</span>
          </div>
        )}

        {validationsSucceeded.length > 0 && (
          <div>
            <span className="font-medium">Passed: </span>
            <span className="text-emerald-700">{validationsSucceeded.join(', ')}</span>
          </div>
        )}

        <div>
          <span className="font-medium">Confirmation: </span>
          {whyConfirmationRequired}
        </div>
      </div>
    </div>
  );
}
