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
  Layers
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

interface Fulfillment {
  id: string;
  fulfillmentNumber: string;
  revisionNo: number;
  status: string;
  targetFulfillmentDate: string;
  allocations: Allocation[];
}

interface Allocation {
  id: string;
  capabilityType: string;
  allocatedQuantity: number;
  deliveredQuantity: number;
  status: string;
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
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
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
          setFulfillments(flJson.data || []);
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
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
