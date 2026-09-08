'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter,
  Edit2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Engagement {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export default function EngagementListPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEngagements() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/commercial/work-orders?status=ACTIVE&limit=50');
        if (!res.ok) throw new Error('Failed to fetch engagements');
        const json = await res.json();
        setEngagements(json.data || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchEngagements();
  }, []);

  const filteredEngagements = engagements.filter((eng) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (eng.customer_name || '').toLowerCase().includes(q) ||
      (eng.title || '').toLowerCase().includes(q) ||
      (eng.id || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || eng.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Engagements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage customer relationships and commercial contexts
          </p>
        </div>
        <button
          onClick={() => router.push('/commercial/engagements/create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Engagement
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, title, or ID..."
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
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Loading engagements...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredEngagements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No engagements found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first engagement to get started.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <button
              onClick={() => router.push('/commercial/engagements/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Engagement
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredEngagements.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Customer</div>
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredEngagements.map((eng) => (
              <Link
                key={eng.id}
                href={`/commercial/engagements/${eng.id}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="md:col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {eng.customer_name || eng.customer_id}
                    </div>
                    <div className="text-xs text-slate-500 md:hidden">{eng.title || eng.id}</div>
                  </div>
                </div>
                <div className="md:col-span-3 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  {eng.title || eng.id}
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[eng.status] || STATUS_COLORS.DRAFT}`}>
                    {STATUS_LABELS[eng.status] || eng.status}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  {new Date(eng.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="md:col-span-1 flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
