'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Search, RefreshCw, Loader2, AlertCircle,
  Building2, MapPin, Calendar, DollarSign, Package,
  TrendingUp, Clock, ExternalLink, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface EntityInfo {
  id: string;
  name: string;
  legal_name: string | null;
  billing_city: string | null;
  vendor_type: string | null;
  is_customer: boolean | null;
  is_vendor: boolean | null;
  is_supplier: boolean | null;
}

interface WorkOrderView {
  id: string;
  woNumber: string;
  customerId: string;
  status: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
  currency: string;
  contractReference: string | null;
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

export default function Customer360Page() {
  const router = useRouter();
  const { profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderView[]>([]);
  const [entities, setEntities] = useState<Record<string, EntityInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_FULFILLMENT' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const fetchWorkOrders = useCallback(async () => {
    if (!profile?.tenant_id) return;
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

      // Batch-fetch entity details for all customer IDs
      const customerIds = Array.from(new Set(wos.map((wo) => wo.customerId)));
      if (customerIds.length > 0) {
        const { data: entData, error: entError } = await (await import('@/lib/supabase/client')).createClient()!
          .from('md_entities')
          .select('id, name, legal_name, billing_city, vendor_type, is_customer, is_vendor, is_supplier')
          .in('id', customerIds);

        if (!entError && entData) {
          const entityMap: Record<string, EntityInfo> = {};
          for (const e of entData) {
            entityMap[e.id] = e as unknown as EntityInfo;
          }
          setEntities(entityMap);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleRefresh = async () => {
    await fetchWorkOrders();
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return workOrders.filter((wo) => {
      const entity = entities[wo.customerId];
      const matchesSearch =
        wo.woNumber.toLowerCase().includes(q) ||
        (entity?.legal_name || '').toLowerCase().includes(q) ||
        (entity?.name || '').toLowerCase().includes(q) ||
        (entity?.billing_city || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'OPEN' && ['DRAFT', 'PLANNED', 'SUBMITTED', 'CONFIRMED'].includes(wo.status)) ||
        (statusFilter === 'IN_FULFILLMENT' && ['IN_EXECUTION', 'FULFILLED'].includes(wo.status)) ||
        (statusFilter === 'COMPLETED' && wo.status === 'COMPLETED') ||
        (statusFilter === 'CANCELLED' && wo.status === 'CANCELLED');

      return matchesSearch && matchesStatus;
    });
  }, [workOrders, entities, searchQuery, statusFilter]);

  const uniqueCustomers = useMemo(() => {
    const groups: Record<string, WorkOrderView[]> = {};
    for (const wo of filtered) {
      if (!groups[wo.customerId]) groups[wo.customerId] = [];
      groups[wo.customerId].push(wo);
    }
    return groups;
  }, [filtered]);

  const customerStats = useMemo(() => {
    const total = workOrders.length;
    const closed = workOrders.filter((wo) => ['COMPLETED', 'CLOSED', 'CANCELLED'].includes(wo.status)).length;
    const active = total - closed;
    return { totalCustomers: Object.keys(uniqueCustomers).length, totalEngagements: total, active, closed };
  }, [workOrders, uniqueCustomers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-4" />
          <div className="h-20 bg-white rounded-xl border border-slate-200 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Customer 360
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customer and engagement directory with execution status overview.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Customers</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{customerStats.totalCustomers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Engagements</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{customerStats.totalEngagements}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Active</p>
              <p className="text-2xl font-black text-amber-700">{customerStats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Closed</p>
              <p className="text-2xl font-black text-emerald-700">{customerStats.closed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, WO number, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_FULFILLMENT">In Fulfillment</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Customer Groupings */}
      {Object.keys(uniqueCustomers).length === 0 ? (
        <Card className="p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No customers or engagements found.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(uniqueCustomers).map(([customerId, wos]) => {
      const entity = entities[customerId];
      const displayName = entity?.legal_name || entity?.name || customerId.substring(0, 8);
      const customerCity = entity?.billing_city || '—';
      const customerType = entity?.vendor_type || (entity?.is_customer ? 'Customer' : 'Entity');
            const engagementCount = wos.length;
            const latestWo = wos[0]; // Already sorted by created_at desc

            return (
              <Card key={customerId} className="p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{displayName}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-full">
                          {customerType}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{customerCity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>{engagementCount} Engagement{engagementCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {latestWo && (
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Latest Engagement
                        </div>
                        <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                          {latestWo.woNumber}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Status: {latestWo.status}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/commercial/control-tower`)}
                        className="px-2 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                        title="View Engagement"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
