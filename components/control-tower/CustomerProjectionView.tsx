'use client';

import React from 'react';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  Ship, 
  Warehouse, 
  FileText 
} from 'lucide-react';
import type { CustomerWorkspaceProjection } from '@/lib/control-tower/types';

interface CustomerProjectionViewProps {
  projection: CustomerWorkspaceProjection;
  className?: string;
}

export function CustomerProjectionView({
  projection,
  className = '',
}: CustomerProjectionViewProps) {
  return (
    <div className={`space-y-6 max-w-4xl mx-auto ${className}`}>
      {/* Customer Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Customer Tracking Portal
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Order {projection.orderNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordered on {new Date(projection.orderDate).toLocaleDateString()}
              {projection.targetFulfillmentDate && (
                <span> · Target Delivery: {new Date(projection.targetFulfillmentDate).toLocaleDateString()}</span>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400">Overall Status</div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {projection.aggregateStatus}
            </span>
          </div>
        </div>

        {/* Delay notice if at risk or blocked */}
        {projection.customerNotice && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {projection.customerNotice}
            </p>
          </div>
        )}
      </div>

      {/* Milestone Journey */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">
          Delivery Journey Milestones
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {projection.milestones.map((m, idx) => {
            const isCompleted = m.status === 'COMPLETED';
            const isInProgress = m.status === 'IN_PROGRESS';
            const isDelayed = m.status === 'DELAYED';

            return (
              <div key={m.title} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">0{idx + 1}</span>
                  <div
                    className={`p-1.5 rounded-full text-xs ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-600'
                        : isInProgress
                        ? 'bg-blue-100 text-blue-600'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {m.title}
                </h4>
                <div className="text-[11px] font-medium text-slate-500">
                  {m.completedAt ? new Date(m.completedAt).toLocaleDateString() : m.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capability Deliveries */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Delivery Scope & Progress
          </h3>
          <span className="text-xs font-bold text-blue-600">
            {projection.overallProgressPercentage}% Complete
          </span>
        </div>

        <div className="space-y-3">
          {projection.deliveries.map((del, idx) => {
            const pct = del.totalQuantity > 0 ? Math.round((del.deliveredQuantity / del.totalQuantity) * 100) : 0;

            return (
              <div key={idx} className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {del.capability} Logistics Scope
                  </span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    {del.deliveredQuantity} / {del.totalQuantity} {del.unit} ({pct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
