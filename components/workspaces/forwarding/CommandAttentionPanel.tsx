import React from 'react';
import { AlertCircle, AlertTriangle, Info, ArrowRight, ShieldAlert } from 'lucide-react';

interface AttentionItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  action_label?: string;
  action_target?: string;
}

interface CommandAttentionPanelProps {
  items: AttentionItem[];
  onActionClick?: (target?: string) => void;
}

export const CommandAttentionPanel: React.FC<CommandAttentionPanelProps> = ({
  items,
  onActionClick
}) => {
  if (items.length === 0) {
    return null;
  }

  // Sort: CRITICAL -> WARNING -> INFO
  const sortedItems = [...items].sort((a, b) => {
    const priority = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return priority[a.severity] - priority[b.severity];
  });

  return (
    <div className="space-y-2">
      {sortedItems.map(item => {
        const isCritical = item.severity === 'CRITICAL';
        const isWarning = item.severity === 'WARNING';

        return (
          <div
            key={item.id}
            className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all ${
              isCritical
                ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                : isWarning
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-blue-50/90 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCritical ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">{item.title}</h4>
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>

            {item.action_label && (
              <button
                type="button"
                onClick={() => onActionClick && onActionClick(item.action_target)}
                className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm shrink-0 self-start sm:self-center transition-all ${
                  isCritical
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                    : isWarning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                }`}
              >
                <span>{item.action_label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
