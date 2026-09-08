'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface SalesOrder {
  id: string;
  tenantId: string;
  engagementId: string;
  soNumber: string;
  status: string;
  orderDate: string;
  targetFulfillmentDate: string;
  currency: string;
  totalAgreedRevenue: number;
  customerName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_FULFILLMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PARTIALLY_FULFILLED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  FULFILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  IN_FULFILLMENT: 'In Fulfillment',
  PARTIALLY_FULFILLED: 'Partially Fulfilled',
  FULFILLED: 'Fulfilled',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export default function SalesOrderListPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSalesOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/commercial/sales-orders?limit=100');
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
    const matchesSearch =
      (so.soNumber || '').toLowerCase().includes(q) ||
      (so.engagementId || '').toLowerCase().includes(q) ||
      (so.customerName || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || so.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sales Orders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage customer orders and track fulfillment progress
          </p>
        </div>
        <Link
          href="/commercial/sales-orders/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Sales Order
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SO number, engagement, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_FULFILLMENT">In Fulfillment</option>
            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Loading sales orders...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            No sales orders found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first sales order to get started.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Link
              href="/commercial/sales-orders/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Sales Order
            </Link>
          )}
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">SO Number</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Order Date</div>
            <div className="col-span-2">Target Delivery</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredOrders.map((so) => (
              <Link
                key={so.id}
                href={`/commercial/sales-orders/${so.id}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="md:col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {so.soNumber}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden">
                      {so.customerName || so.engagementId}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[so.status] || STATUS_COLORS.DRAFT}`}>
                    {STATUS_LABELS[so.status] || so.status}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3 h-3 mr-1 text-slate-400 hidden md:block" />
                  {formatDate(so.orderDate)}
                </div>
                <div className="md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  {formatDate(so.targetFulfillmentDate)}
                </div>
                <div className="md:col-span-2 flex items-center text-sm font-medium text-slate-900 dark:text-white">
                  <DollarSign className="w-3 h-3 mr-1 text-slate-400 hidden md:block" />
                  {formatCurrency(so.totalAgreedRevenue, so.currency)}
                </div>
                <div className="md:col-span-1 flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Showing {filteredOrders.length} of {salesOrders.length} sales orders
        </div>
      )}
    </div>
  );
}
