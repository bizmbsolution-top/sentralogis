import React from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface ActionProposalCardProps {
  intent: string;
  entities: Record<string, string>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  requiredPermission: string;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export default function ActionProposalCard({
  intent, entities, riskLevel, confidence, requiredPermission, onConfirm, onEdit, onCancel
}: ActionProposalCardProps) {
  
  const riskColor = {
    'LOW': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'MEDIUM': 'text-amber-600 bg-amber-50 border-amber-200',
    'HIGH': 'text-rose-600 bg-rose-50 border-rose-200',
    'CRITICAL': 'text-red-700 bg-red-100 border-red-300 font-bold'
  }[riskLevel];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-md my-4 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Action: {intent.replace('_', ' ')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Req. Permission: {requiredPermission}</p>
        </div>
        <ConfidenceBadge score={confidence} />
      </div>
      
      <div className="p-4 bg-slate-50 space-y-2">
        {Object.entries(entities).map(([key, val]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium capitalize">{key.replace('_', ' ')}</span>
            <span className="text-slate-900">{val}</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
        <div className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 ${riskColor}`}>
          {riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? <AlertTriangle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
          {riskLevel} RISK
        </div>
        
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
            Edit
          </button>
          <button onClick={onConfirm} className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
