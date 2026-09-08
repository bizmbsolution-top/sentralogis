import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface NextActionProps {
  action?: {
    title: string;
    target_sbu: string;
    status: string;
    action_label: string;
    action_type: string;
  } | null;
  onExecuteAction?: (actionType: string) => void;
}

export const NextActionCard: React.FC<NextActionProps> = ({
  action,
  onExecuteAction
}) => {
  if (!action) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          NEXT OPERATIONAL ACTION
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>All current milestone actions up to date</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>NEXT REQUIRED ACTION</span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-800/80 text-blue-200 border border-blue-700">
          SBU: {action.target_sbu}
        </span>
      </div>

      <div>
        <h4 className="text-sm font-bold tracking-tight text-white">{action.title}</h4>
        <div className="text-xs text-blue-200/80 mt-0.5">Status: <span className="font-mono">{action.status}</span></div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => onExecuteAction && onExecuteAction(action.action_type)}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition-all"
        >
          <span>{action.action_label}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
