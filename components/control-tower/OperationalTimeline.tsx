'use client';

import React from 'react';
import { 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  ArrowDown, 
  FileCheck, 
  Layers, 
  Truck 
} from 'lucide-react';
import type { InternalOperatorWorkspace } from '@/lib/control-tower/types';

interface OperationalTimelineProps {
  workspace: InternalOperatorWorkspace;
  className?: string;
}

export function OperationalTimeline({ workspace, className = '' }: OperationalTimelineProps) {
  const so = workspace.salesOrder;
  const fl = workspace.activeFulfillment?.fulfillment;
  const allocations = workspace.allocations;

  // Build events chronologically
  const timelineEvents = [
    {
      id: 'evt-so-created',
      title: 'Sales Order Created',
      timestamp: so.createdAt,
      description: `Sales order ${so.soNumber} initiated under Engagement ${so.engagementId}`,
      icon: <FileCheck className="w-4 h-4 text-blue-600" />,
      completed: true,
    },
    {
      id: 'evt-so-confirmed',
      title: 'Commercial Commitment Locked',
      timestamp: so.confirmedAt,
      description: so.confirmedAt
        ? `Total agreed revenue locked: ${so.currency} ${so.totalAgreedRevenue.toLocaleString()}`
        : 'Awaiting commercial confirmation',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      completed: Boolean(so.confirmedAt),
    },
    {
      id: 'evt-fl-planned',
      title: 'Fulfillment Plan Composed',
      timestamp: fl?.createdAt || null,
      description: fl
        ? `Fulfillment plan ${fl.fulfillmentNumber} (Revision ${fl.revisionNo}) composed with ${allocations.length} allocations.`
        : 'Awaiting fulfillment composition',
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      completed: Boolean(fl),
    },
    {
      id: 'evt-fl-active',
      title: 'Operational Handoffs Dispatched',
      timestamp: fl?.status === 'ACTIVE' || fl?.status === 'PARTIALLY_FULFILLED' || fl?.status === 'FULFILLED' ? fl.updatedAt : null,
      description:
        fl?.status === 'ACTIVE' || fl?.status === 'PARTIALLY_FULFILLED' || fl?.status === 'FULFILLED'
          ? `Operational handoffs issued to sovereign domains.`
          : 'Pending fulfillment activation',
      icon: <Truck className="w-4 h-4 text-amber-600" />,
      completed: fl?.status === 'ACTIVE' || fl?.status === 'PARTIALLY_FULFILLED' || fl?.status === 'FULFILLED',
    },
  ];

  return (
    <div className={`p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <GitCommit className="w-5 h-5 text-indigo-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Operational Lineage Timeline
        </h3>
      </div>

      <div className="mt-4 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {timelineEvents.map((evt) => (
          <div key={evt.id} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border ${
                evt.completed
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-slate-300 dark:border-slate-700 text-slate-400'
              }`}
            >
              {evt.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
            </div>

            {/* Event Content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-xs font-bold ${
                    evt.completed ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}
                >
                  {evt.title}
                </h4>
                {evt.timestamp && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {evt.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
