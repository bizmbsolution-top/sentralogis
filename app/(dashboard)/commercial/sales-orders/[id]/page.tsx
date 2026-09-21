'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Ship,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SalesOrderDetail {
  id: string;
  tenantId: string;
  engagementId: string;
  quoteId: string | null;
  soNumber: string;
  status: string;
  orderDate: string;
  targetFulfillmentDate: string;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  incoterm: string;
  commercialNotes: string;
  versionNo: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Allocation {
  id: string;
  fulfillmentId: string;
  capabilityType: string;
  allocatedQuantity: number;
  deliveredQuantity: number;
  status: string;
  shipmentId: string | null;
}

interface Fulfillment {
  id: string;
  fulfillmentNumber: string;
  revisionNo: number;
  status: string;
  targetFulfillmentDate: string;
  allocations: Allocation[];
}

interface OperationalHandoff {
  id: string;
  handoffNumber: string;
  targetDomain: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  attemptCount: number;
  issuedAt: string;
  acknowledgedAt: string | null;
  acceptedAt: string | null;
  executingAt: string | null;
  fulfilledAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
}

interface FulfillmentWithHandoffs extends Fulfillment {
  handoffs: OperationalHandoff[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_FULFILLMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PARTIALLY_FULFILLED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  FULFILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PLANNED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ISSUED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACCEPTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  EXECUTING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HANDOFF_PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  AT_RISK: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  BLOCKED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  IN_FULFILLMENT: 'In Fulfillment',
  PARTIALLY_FULFILLED: 'Partially Fulfilled',
  FULFILLED: 'Fulfilled',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  PLANNED: 'Planned',
  ACTIVE: 'Active',
   PARTIALLY_DELIVERED: 'Partially Delivered',
  DELIVERED: 'Delivered',
  ISSUED: 'Issued',
  ACKNOWLEDGED: 'Acknowledged',
  ACCEPTED: 'Accepted',
  EXECUTING: 'Executing',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  HANDOFF_PENDING: 'Handoff Pending',
  AT_RISK: 'At Risk',
  BLOCKED: 'Blocked',
};

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  FORWARDING: <Ship className="w-4 h-4" />,
  CUSTOMS: <FileText className="w-4 h-4" />,
  TRUCKING: <Truck className="w-4 h-4" />,
  WAREHOUSE: <Building2 className="w-4 h-4" />,
};

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [salesOrder, setSalesOrder] = useState<SalesOrderDetail | null>(null);
  const [fulfillments, setFulfillments] = useState<FulfillmentWithHandoffs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [soRes, flRes] = await Promise.all([
          fetch(`/api/v1/commercial/sales-orders/${id}`),
          fetch(`/api/v1/commercial/fulfillments?salesOrderId=${id}`),
        ]);

        if (!soRes.ok) {
          throw new Error('Failed to fetch sales order');
        }

        const soJson = await soRes.json();
        setSalesOrder(soJson.data);

        if (flRes.ok) {
          const flJson = await flRes.json();
          const flData = flJson.data || [];
          const fulfillmentsWithHandoffs = await Promise.all(
            flData.map(async (fulfillment: Fulfillment) => {
              const handoffsRes = await fetch(`/api/v1/commercial/operational-handoffs?fulfillmentId=${fulfillment.id}`);
              const handoffsData = handoffsRes.ok ? (await handoffsRes.json()).data || [] : [];
              return { ...fulfillment, handoffs: handoffsData };
            })
          );
          setFulfillments(fulfillmentsWithHandoffs);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const formatCurrency = (amount: number, currency: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading sales order...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Sales order not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/commercial/sales-orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sales Orders
      </Link>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {salesOrder.soNumber}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Engagement: {salesOrder.engagementId}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[salesOrder.status] || STATUS_COLORS.DRAFT}`}>
                  {STATUS_LABELS[salesOrder.status] || salesOrder.status}
                </span>
                <span className="text-xs text-slate-400">
                  v{salesOrder.versionNo}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {salesOrder.status === 'CONFIRMED' && (
              <Link
                href={`/commercial/sales-orders/${id}/fulfillment`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Layers className="w-4 h-4" />
                Create Fulfillment
              </Link>
            )}
            <Link
              href={`/commercial/sales-orders/${id}/fulfillment`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <Package className="w-4 h-4" />
              Fulfillment
            </Link>
            <Link
              href={`/commercial/control-tower/${id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <Layers className="w-4 h-4" />
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Order Date</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(salesOrder.orderDate)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Target Delivery</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(salesOrder.targetFulfillmentDate)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Value</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatCurrency(salesOrder.totalAgreedRevenue, salesOrder.currency)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Payment Terms</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {salesOrder.paymentTermsDays} days
          </p>
        </div>
      </div>

      {/* Additional Info */}
      {(salesOrder.incoterm || salesOrder.commercialNotes) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Additional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salesOrder.incoterm && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Incoterm
                </span>
                <p className="text-sm text-slate-900 dark:text-white mt-1">
                  {salesOrder.incoterm}
                </p>
              </div>
            )}
            {salesOrder.commercialNotes && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Notes
                </span>
                <p className="text-sm text-slate-900 dark:text-white mt-1">
                  {salesOrder.commercialNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fulfillments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Fulfillments
          </h2>
          <span className="text-sm text-slate-500">
            {fulfillments.length} revision(s)
          </span>
        </div>

        {fulfillments.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No fulfillments yet. Create a fulfillment to start composing services.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fulfillments.map((fl) => (
              <div
                key={fl.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {fl.fulfillmentNumber}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[fl.status] || STATUS_COLORS.PLANNED}`}>
                      {STATUS_LABELS[fl.status] || fl.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      Rev {fl.revisionNo}
                    </span>
                  </div>
                  <Link
                    href={`/commercial/control-tower/${id}`}
                    className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    View in Control Tower
                  </Link>
                </div>
                {fl.allocations.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {fl.allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                      >
                        <div className="text-slate-500 dark:text-slate-400">
                          {CAPABILITY_ICONS[alloc.capabilityType] || <Package className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-900 dark:text-white">
                            {alloc.capabilityType}
                          </div>
                          <div className="text-xs text-slate-500">
                            {alloc.deliveredQuantity}/{alloc.allocatedQuantity} units
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {fl.handoffs && fl.handoffs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Operational Handoffs
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {fl.handoffs.map((h) => (
                        <span
                          key={h.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${STATUS_COLORS[h.status] || STATUS_COLORS.PLANNED}`}
                          title={`${h.handoffNumber} — ${h.targetDomain} — ${h.status}`}
                        >
                          <span className="font-mono">{h.handoffNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span>{STATUS_LABELS[h.status] || h.status}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
         )}
      </div>

      {/* Execution / Operational Progress */}
      {fulfillments.length > 0 && fulfillments.some(fl => fl.handoffs.length > 0) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Execution Progress
            </h2>
            <Link
              href={`/commercial/control-tower/${id}`}
              className="text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              Control Tower <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {fulfillments.map((fl) => {
              const allHandoffs = fl.handoffs;
              const totalAllocated = fl.allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
              const totalDelivered = fl.allocations.reduce((sum, a) => sum + a.deliveredQuantity, 0);
              const hasActiveHandoffs = allHandoffs.some(
                (h: OperationalHandoff) => h.status === 'EXECUTING' || h.status === 'ACCEPTED' || h.status === 'ACKNOWLEDGED' || h.status === 'ISSUED'
              );
              const hasFailed = allHandoffs.some((h: OperationalHandoff) => h.status === 'FAILED' || h.status === 'REJECTED');

              const overallStatus = allHandoffs.every((h: OperationalHandoff) => h.status === 'FULFILLED') && totalDelivered >= totalAllocated
                ? 'FULFILLED'
                : hasFailed
                ? 'FAILED'
                : hasActiveHandoffs
                ? 'EXECUTING'
                : allHandoffs.length > 0
                ? 'HANDOFF_PENDING'
                : fl.status;

              return (
                <div key={fl.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {fl.fulfillmentNumber}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[overallStatus] || STATUS_COLORS.PLANNED}`}>
                        {STATUS_LABELS[overallStatus] || overallStatus}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {totalDelivered}/{totalAllocated} units delivered
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${totalAllocated > 0 ? Math.round((totalDelivered / totalAllocated) * 100) : 0}%` }}
                    />
                  </div>
                  {hasFailed && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      One or more handoffs failed — view details in Control Tower
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Created {formatDateTime(salesOrder.createdAt)}
            </span>
          </div>
          {salesOrder.confirmedAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Confirmed {formatDateTime(salesOrder.confirmedAt)}
              </span>
            </div>
          )}
          {salesOrder.cancelledAt && (
            <div className="flex items-center gap-3">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Cancelled {formatDateTime(salesOrder.cancelledAt)}
                {salesOrder.cancelledReason && ` — ${salesOrder.cancelledReason}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Last updated {formatDateTime(salesOrder.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
