'use client';

import React from 'react';
import { 
  Layers, 
  Ship, 
  FileText, 
  Truck, 
  Warehouse, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import type { 
  WorkspaceAllocationNode, 
  WorkspaceHandoffSummary 
} from '@/lib/control-tower/types';
import type { Fulfillment, FulfillmentComposition } from '@/lib/fulfillment/types';

interface FulfillmentPlanCardProps {
  activeFulfillment: FulfillmentComposition | null;
  revisions: Fulfillment[];
  allocations: WorkspaceAllocationNode[];
  onSelectRevision?: (revisionNo: number) => void;
  className?: string;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  FORWARDING: <Ship className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
  CUSTOMS: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  TRUCKING: <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
  WAREHOUSE: <Warehouse className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
};

const DOMAIN_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  FORWARDING: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200' },
  CUSTOMS: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200' },
  TRUCKING: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200' },
  WAREHOUSE: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200' },
};

function HandoffRow({ handoff }: { handoff: WorkspaceHandoffSummary }) {
  const getStatusColor = (st: string) => {
    switch (st) {
      case 'FULFILLED':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';
      case 'EXECUTING':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200';
      case 'ACCEPTED':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200';
      case 'FAILED':
      case 'REJECTED':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {handoff.handoffNumber}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(
            handoff.status,
          )}`}
        >
          {handoff.status}
        </span>
      </div>

      {/* Domain reference if assigned */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {handoff.assignedDomainReference ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400">
            {handoff.assignedDomainReference.referenceType}: {handoff.assignedDomainReference.referenceNumber || handoff.assignedDomainReference.referenceId}
          </span>
        ) : (
          <span className="text-[11px] italic text-slate-400">Pending domain reference</span>
        )}
      </div>
    </div>
  );
}

export function FulfillmentPlanCard({
  activeFulfillment,
  revisions,
  allocations,
  onSelectRevision,
  className = '',
}: FulfillmentPlanCardProps) {
  if (!activeFulfillment) {
    return (
      <div className={`p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm text-center ${className}`}>
        <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No Fulfillment Plan Created
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          This Sales Order is currently awaiting fulfillment composition and capability allocation.
        </p>
      </div>
    );
  }

  const currentRev = activeFulfillment.fulfillment;

  return (
    <div className={`p-4 md:p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {/* Header & Revision Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {currentRev.fulfillmentNumber}
              </h3>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                Rev {currentRev.revisionNo} · {currentRev.status}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Created on {new Date(currentRev.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Revision Selector (Historical Lineage) */}
        {revisions.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-slate-400 mr-1">Revisions:</span>
            {revisions.map((rev) => {
              const isCurrent = rev.id === currentRev.id;
              return (
                <button
                  key={rev.id}
                  onClick={() => onSelectRevision && onSelectRevision(rev.revisionNo)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Rev {rev.revisionNo} {rev.status === 'CANCELLED' && '(Cancelled)'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Allocation List */}
      <div className="mt-4 space-y-4">
        {allocations.map((alloc) => {
          const badge = DOMAIN_BADGE[alloc.capabilityType] || {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
          };
          const icon = DOMAIN_ICONS[alloc.capabilityType];
          const pct =
            alloc.allocatedQuantity > 0
              ? Math.min(100, Math.round((alloc.deliveredQuantity / alloc.allocatedQuantity) * 100))
              : 0;

          return (
            <div
              key={alloc.allocationId}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3"
            >
              {/* Allocation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {icon}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {alloc.capabilityType}
                    </span>
                    {alloc.shipmentId && (
                      <span className="ml-2 text-xs font-mono text-slate-500">
                        Shipment: {alloc.shipmentId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Numbers */}
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {alloc.deliveredQuantity}
                  </span>{' '}
                  / {alloc.allocatedQuantity} units delivered ({pct}%)
                </div>
              </div>

              {/* Allocation Mini Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Associated Operational Handoffs */}
              {alloc.handoffs.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Operational Handoffs:
                  </span>
                  {alloc.handoffs.map((h) => (
                    <HandoffRow key={h.handoffId} handoff={h} />
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic pt-1">
                  No operational handoffs dispatched for this allocation yet.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
