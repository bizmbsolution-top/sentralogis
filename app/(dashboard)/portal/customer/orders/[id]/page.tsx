'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, MapPin, Calendar, Tag } from 'lucide-react';

interface CustomerWorkspaceProjection {
  orderNumber: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
  aggregateStatus: string;
  overallProgressPercentage: number;
  deliveries: Array<{
    capability: string;
    deliveredQuantity: number;
    totalQuantity: number;
    unit: string;
    status: string;
  }>;
  milestones: Array<{
    title: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
    completedAt: string | null;
  }>;
  customerNotice: string | null;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-slate-100 text-slate-600',
  PLANNING: 'bg-amber-100 text-amber-700',
  HANDOFF_PENDING: 'bg-amber-100 text-amber-700',
  EXECUTING: 'bg-blue-100 text-blue-700',
  PARTIALLY_FULFILLED: 'bg-blue-100 text-blue-700',
  AT_RISK: 'bg-orange-100 text-orange-700',
  BLOCKED: 'bg-red-100 text-red-700',
  FULFILLED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
  COMPLETED: <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">✓</div>,
  IN_PROGRESS: <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">•</div>,
  PENDING: <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>,
  DELAYED: <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white">!</div>,
};

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<CustomerWorkspaceProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string>('');

  useEffect(() => {
    params.then(p => setResolvedId(p.id));
  }, [params]);

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/commercial/control-tower/${id}?view=customer`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch order`);
      }
      const json = await res.json();
      setOrder(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resolvedId) fetchOrder(resolvedId);
  }, [resolvedId, fetchOrder]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Order Details</h1>
        </div>
        <div className="px-4 py-8 text-center text-slate-400">
          <p className="text-sm">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Order Details</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-red-500 text-sm mb-3">{error || 'Order not found'}</p>
          <button
            onClick={() => resolvedId && fetchOrder(resolvedId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">{order.orderNumber}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.aggregateStatus] || 'bg-slate-100 text-slate-600'}`}>
            {order.aggregateStatus?.replace(/_/g, ' ') || 'Unknown'}
          </span>
        </div>
        <p className="text-indigo-200 text-xs mt-1">Order date: {formatDate(order.orderDate)}</p>
        {order.targetFulfillmentDate && (
          <p className="text-indigo-200 text-xs mt-0.5">Target: {formatDate(order.targetFulfillmentDate)}</p>
        )}
      </div>

      <div className="px-4 pt-4">
        {order.customerNotice && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-amber-800 text-xs">{order.customerNotice}</p>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</h3>
            <span className="text-xs font-bold text-slate-700">{order.overallProgressPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${order.overallProgressPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Delivery Progress</h3>
          {order.deliveries.length === 0 ? (
            <p className="text-slate-400 text-xs">No delivery items yet.</p>
          ) : (
            <div className="space-y-2">
              {order.deliveries.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{d.capability}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {d.deliveredQuantity}/{d.totalQuantity} {d.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Journey</h3>
          <div className="space-y-3">
            {order.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {MILESTONE_ICONS[m.status] || <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.status === 'COMPLETED' ? 'text-emerald-700' : m.status === 'IN_PROGRESS' ? 'text-blue-700' : m.status === 'DELAYED' ? 'text-orange-700' : 'text-slate-500'}`}>
                    {m.title}
                  </p>
                  {m.completedAt && (
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.completedAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
