'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Layers, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  FileCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CommandCenterAttentionPanel } from '@/components/control-tower/CommandCenterAttentionPanel';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

export default function CommercialControlTowerIndexPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSalesOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/commercial/sales-orders?limit=50');
        if (!res.ok) {
          throw new Error('Failed to fetch sales orders');
        }
        const json = await res.json();
        setSalesOrders(json.data || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchSalesOrders();
  }, []);

  const filteredOrders = salesOrders.filter((so) => {
    const q = searchQuery.toLowerCase();
    return (
      (so.soNumber || '').toLowerCase().includes(q) ||
      (so.engagementId || '').toLowerCase().includes(q) ||
      (so.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Command Center
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-end commercial execution, multi-SBU fulfillment composition, and operational progress oversight.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SO-..., Customer ID, or Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Attention Panel */}
      {!loading && !error && filteredOrders.length > 0 && (
        <CommandCenterAttentionPanel salesOrders={filteredOrders} />
      )}

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Loading commercial orders...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-white dark:bg-slate-900">
          <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Sales Orders Found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Create or confirm a Sales Order from the Commercial Pipeline to begin fulfillment execution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((so) => (
            <Link
              key={so.id}
              href={`/commercial/control-tower/${so.id}`}
              className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {so.soNumber}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {so.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">Engagement: {so.engagementId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date: {new Date(so.orderDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Agreed: {so.currency} {so.totalAgreedRevenue?.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Open Control Tower</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
