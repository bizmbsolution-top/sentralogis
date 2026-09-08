'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  Calendar,
  DollarSign,
  ShoppingCart,
  Plus,
  Edit2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface EngagementDetail {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  title?: string;
  description?: string;
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

export default function EngagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [engagement, setEngagement] = useState<EngagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchEngagement() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/commercial/work-orders/${id}`);
        if (!res.ok) throw new Error('Failed to fetch engagement');
        const json = await res.json();
        setEngagement(json.data);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchEngagement();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading engagement...</span>
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

  if (!engagement) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Engagement not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back */}
      <Link href="/commercial/engagements" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Engagements
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {engagement.customer_name || engagement.customer_id}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {engagement.title || engagement.id}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[engagement.status] || STATUS_COLORS.DRAFT}`}>
                  {STATUS_LABELS[engagement.status] || engagement.status}
                </span>
                <span className="text-xs text-slate-400">v1</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/commercial/engagements/${id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Created</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {new Date(engagement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Updated</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {new Date(engagement.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link href={`/commercial/quotations/create?engagementId=${id}`} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300">New Quote</span>
          </Link>
          <Link href={`/commercial/sales-orders/create?engagementId=${id}`} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ShoppingCart className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Direct Order</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
