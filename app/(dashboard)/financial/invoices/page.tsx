'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Calendar, Search, RefreshCw,
  Loader2, AlertCircle, FileText, Building2, BarChart3,
  PieChart, Clock, CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

interface FinancialSummary {
  totalRevenue: number;
  currency: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  pendingOrders: number;
}

interface OrderFinancialRow {
  salesOrderId: string;
  soNumber: string;
  engagementId: string;
  woNumber: string;
  status: string;
  controlTowerStatus: string;
  committedRevenue: number;
  currency: string;
  completionPercentage: number;
  customerName: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
}

function formatCurrency(amount: number, currency: string) {
  if (!amount || isNaN(amount)) amount = 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: currency || 'IDR', maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_LABELS: Record<string, string> = {
  COMMERCIAL: 'Commercial', PLANNING: 'Planning', HANDOFF_PENDING: 'Handoff Pending',
  EXECUTING: 'Executing', PARTIALLY_FULFILLED: 'Partially Fulfilled',
  AT_RISK: 'At Risk', BLOCKED: 'Blocked', FULFILLED: 'Fulfilled', CLOSED: 'Closed',
};

export default function FinancialWorkspacePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderFinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all work orders (engagements) — the commercial root
      const woRes = await fetch('/api/v1/commercial/work-orders?limit=100', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!woRes.ok) throw new Error('Failed to fetch work orders');
      const woJson = await woRes.json();
      const workOrders = woJson.data || [];

      // For each WO, fetch sales orders
      const allRows: OrderFinancialRow[] = [];
      for (const wo of workOrders) {
        try {
          const soRes = await fetch(`/api/v1/commercial/sales-orders?engagementId=${wo.id}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (!soRes.ok) continue;

          const soJson = await soRes.json();
          const salesOrders = soJson.data || [];

          for (const so of salesOrders) {
            try {
              const ctRes = await fetch(`/api/v1/commercial/control-tower/${so.id}`, {
                headers: { 'Content-Type': 'application/json' },
              });
              if (!ctRes.ok) continue;

              const ctJson = await ctRes.json();
              const progress = ctJson.data.progress || {};

              // Resolve customer name
              const customerName = so.soNumber ? `Engagement ${wo.woNumber}` : '—';

              allRows.push({
                salesOrderId: so.id,
                soNumber: so.soNumber,
                engagementId: so.engagementId,
                woNumber: wo.woNumber,
                status: so.status,
                controlTowerStatus: ctJson.data.aggregateStatus,
                committedRevenue: progress.committedRevenue ?? so.totalAgreedRevenue ?? 0,
                currency: progress.currency ?? so.currency ?? 'IDR',
                completionPercentage: progress.completionPercentage ?? 0,
                customerName,
                orderDate: so.orderDate,
                targetFulfillmentDate: so.targetFulfillmentDate,
              });
            } catch {}
          }
        } catch {}
      }

      setOrders(allRows);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const summary = useMemo((): FinancialSummary => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.committedRevenue, 0);
    const currency = orders[0]?.currency ?? 'IDR';
    const invoiced = orders.filter((o) => o.completionPercentage >= 50).length;
    const paid = orders.filter((o) => o.controlTowerStatus === 'FULFILLED' || o.controlTowerStatus === 'CLOSED').length;
    const outstanding = orders.length - paid;
    const pendingOrders = orders.filter(
      (o) => !['FULFILLED', 'CLOSED', 'CANCELLED'].includes(o.status)
    ).length;

    return { totalRevenue, currency, invoiced, paid, outstanding, pendingOrders };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const bySearch = orders.filter((o) =>
      o.soNumber.toLowerCase().includes(q) ||
      o.woNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
    if (statusFilter === 'ALL') return bySearch;
    return bySearch.filter((o) => o.controlTowerStatus === statusFilter || o.status === statusFilter);
  }, [orders, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
          <div className="h-48 bg-white rounded-xl border border-slate-200" />
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
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Financial Workspace
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Read-only financial overview across all sales orders and engagements.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Total Revenue</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(summary.totalRevenue, summary.currency)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">In Progress (50%+)</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{summary.invoiced}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Completed</p>
              <p className="text-xl font-black text-emerald-700">{summary.paid}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Outstanding</p>
              <p className="text-xl font-black text-rose-700">{summary.outstanding}</p>
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
              placeholder="Search by SO number, WO number, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="EXECUTING">Executing</option>
            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="AT_RISK">At Risk</option>
            <option value="BLOCKED">Blocked</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Financial Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <PieChart className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No matching orders found. Try adjusting your filters.'
                : 'No financial data available yet.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sales Order / Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((row) => (
                  <tr key={row.salesOrderId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {row.soNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.customerName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {row.woNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(row.orderDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(row.committedRevenue, row.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {row.completionPercentage}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {STATUS_LABELS[row.controlTowerStatus] || row.controlTowerStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/commercial/control-tower/${row.salesOrderId}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
