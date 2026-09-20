'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Loader2, Package, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface WorkOrderView {
  id: string;
  woNumber: string;
  customerId: string;
  status: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
  currency: string;
  totalAgreedRevenue: number;
  createdAt: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: currency || 'IDR', maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    SUBMITTED: 'Submitted',
    CONFIRMED: 'Confirmed',
    IN_EXECUTION: 'In Execution',
    FULFILLED: 'Fulfilled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
  };
  return map[status] || status;
}

function statusColor(status: string): string {
  if (['COMPLETED', 'FULFILLED'].includes(status)) return 'bg-emerald-100 text-emerald-700';
  if (['CANCELLED', 'REJECTED'].includes(status)) return 'bg-red-100 text-red-700';
  if (['CONFIRMED', 'IN_EXECUTION'].includes(status)) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/commercial/work-orders?limit=100', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch work orders`);
      }
      const json = await res.json();
      const wos: WorkOrderView[] = json.data || [];
      setWorkOrders(wos);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const filtered = searchQuery
    ? workOrders.filter((wo) =>
        wo.woNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wo.customerId || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : workOrders;

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
        <h1 className="text-xl font-bold mb-1">My Orders</h1>
        <p className="text-indigo-200 text-sm">Track your shipments and orders</p>
      </div>

      <div className="px-4 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button
              onClick={() => fetchWorkOrders()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No orders found yet</p>
            <p className="text-slate-400 text-xs mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Your orders will appear here once created'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((wo) => (
              <button
                key={wo.id}
                onClick={() => router.push(`/portal/customer/orders/${wo.id}`)}
                className="w-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {wo.woNumber}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(wo.status)}`}>
                      {statusLabel(wo.status)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatCurrency(wo.totalAgreedRevenue || 0, wo.currency || 'IDR')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(wo.orderDate)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
