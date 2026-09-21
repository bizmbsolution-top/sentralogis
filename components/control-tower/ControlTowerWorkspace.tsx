'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  Layers, 
  Eye, 
  ShieldAlert, 
  RefreshCw, 
  AlertCircle, 
  Loader2,
  FileCheck,
  FileText,
  ExternalLink
} from 'lucide-react';
import { ExecutionHealthBar } from './ExecutionHealthBar';
import { FulfillmentPlanCard } from './FulfillmentPlanCard';
import { ExceptionsPanel } from './ExceptionsPanel';
import { OperationalTimeline } from './OperationalTimeline';
import { CommandActionDrawer } from './CommandActionDrawer';
import { CustomerProjectionView } from './CustomerProjectionView';
import type { 
  InternalOperatorWorkspace, 
  CustomerWorkspaceProjection 
} from '@/lib/control-tower/types';

interface ControlTowerWorkspaceProps {
  salesOrderId: string;
  initialViewMode?: 'operator' | 'customer';
  className?: string;
}

export function ControlTowerWorkspace({
  salesOrderId,
  initialViewMode = 'operator',
  className = '',
}: ControlTowerWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'operator' | 'customer'>(initialViewMode);
  const [operatorData, setOperatorData] = useState<InternalOperatorWorkspace | null>(null);
  const [customerData, setCustomerData] = useState<CustomerWorkspaceProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (viewMode === 'customer') {
        const res = await fetch(`/api/v1/commercial/control-tower/${salesOrderId}?view=customer`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw { status: res.status, message: errBody.message || 'Failed to load customer workspace' };
        }
        const json = await res.json();
        setCustomerData(json.data);
      } else {
        const res = await fetch(`/api/v1/commercial/control-tower/${salesOrderId}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw { status: res.status, message: errBody.message || 'Failed to load execution workspace' };
        }
        const json = await res.json();
        setOperatorData(json.data);
      }
    } catch (err: any) {
      setError({
        status: err.status || 500,
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }, [salesOrderId, viewMode]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className={`p-6 space-y-6 max-w-7xl mx-auto animate-pulse ${className}`}>
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error / 404 / 403 state
  if (error) {
    const isForbidden = error.status === 403;
    const isNotFound = error.status === 404;

    return (
      <div className={`p-8 max-w-xl mx-auto text-center space-y-4 ${className}`}>
        <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 w-12 h-12 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {isForbidden
            ? 'Access Forbidden'
            : isNotFound
            ? 'Sales Order Not Found'
            : 'Failed to Load Workspace'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {isForbidden
            ? 'You do not have the required commercial:read permission to view this execution workspace.'
            : error.message}
        </p>
        <button
          onClick={() => fetchWorkspace()}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Query
        </button>
      </div>
    );
  }

  // Customer projection view rendering
  if (viewMode === 'customer' && customerData) {
    return (
      <div className={`p-4 md:p-8 space-y-6 ${className}`}>
        <div className="flex justify-end max-w-4xl mx-auto">
          <button
            onClick={() => setViewMode('operator')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Switch to Internal Operator Workspace →
          </button>
        </div>
        <CustomerProjectionView projection={customerData} />
      </div>
    );
  }

  if (!operatorData) {
    return null;
  }

  const so = operatorData.salesOrder;

  return (
    <div className={`p-4 md:p-8 space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* Workspace Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {so.soNumber}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {so.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Engagement: {so.engagementId}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Date: {new Date(so.orderDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <DollarSign className="w-3.5 h-3.5" />
                Agreed: {so.currency} {so.totalAgreedRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* View Switcher & Refresh */}
          <div className="flex items-center gap-2">
            <Link
              href={`/commercial/sales-orders/${so.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              View Sales Order
            </Link>
            <button
              onClick={() => setViewMode('customer')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Customer View
            </button>
            <button
              onClick={() => fetchWorkspace()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Execution Health Summary Bar */}
      <ExecutionHealthBar
        status={operatorData.aggregateStatus}
        progress={operatorData.progress}
      />

      {/* Available Command Surface */}
      <CommandActionDrawer
        salesOrderId={so.id}
        fulfillmentId={operatorData.activeFulfillment?.fulfillment.id}
        availableCommands={operatorData.availableCommands}
        onCommandExecuted={() => fetchWorkspace()}
      />

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Fulfillment & Capability Allocations */}
        <div className="lg:col-span-2 space-y-6">
          <FulfillmentPlanCard
            activeFulfillment={operatorData.activeFulfillment}
            revisions={operatorData.revisions}
            allocations={operatorData.allocations}
          />
        </div>

        {/* Right Column: Exceptions & Timeline */}
        <div className="space-y-6">
          <ExceptionsPanel exceptions={operatorData.exceptions} />
          <OperationalTimeline workspace={operatorData} />
        </div>
      </div>
    </div>
  );
}
