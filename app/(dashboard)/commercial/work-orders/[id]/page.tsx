'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface WorkOrderHeader {
  id: string;
  woNumber: string;
  status: string;
  customerName: string;
  orderDate: string;
  executionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobOrderView {
  id: string;
  joNumber: string;
  status: string;
  transporterName: string | null;
  fleetPlateNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  containerNumber: string | null;
  basePrice: number | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface WorkOrderItemView {
  id: string;
  itemCode: string | null;
  sbuType: string;
  status: string;
  jobOrders: JobOrderView[];
}

interface WorkOrderExecutionView {
  workOrder: WorkOrderHeader;
  items: WorkOrderItemView[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  incident: 'bg-rose-100 text-rose-700',
  waiting_armada: 'bg-orange-100 text-orange-700',
  pending_jo: 'bg-slate-100 text-slate-700',
  accepted: 'bg-indigo-100 text-indigo-700',
  picking_up: 'bg-amber-100 text-amber-700',
  delivering: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  incident: 'Incident',
  waiting_armada: 'Waiting Armada',
  pending_jo: 'Pending',
  accepted: 'Accepted',
  picking_up: 'Picking Up',
  delivering: 'Delivering',
  delivered: 'Delivered',
};

const SBU_ICONS: Record<string, React.ReactNode> = {
  FORWARDING: <Package className="w-3 h-3" />,
  CUSTOMS: <FileText className="w-3 h-3" />,
  TRUCKING: <Truck className="w-3 h-3" />,
  WAREHOUSE: <Layers className="w-3 h-3" />,
};

export default function WorkOrderExecutionPage() {
  const params = useParams();
  const id = params?.id as string;

  const [wo, setWo] = useState<WorkOrderHeader | null>(null);
  const [items, setItems] = useState<WorkOrderItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/operational/work-orders/${id}`);
        if (!res.ok) {
          if (res.status === 401) throw new Error('Authentication required');
          if (res.status === 403) throw new Error('Access denied');
          if (res.status === 404) throw new Error('Work Order not found');
          throw new Error(`Failed to fetch work order (${res.status})`);
        }
        const json = await res.json();
        setWo(json.data.workOrder);
        setItems(json.data.items || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const totalJobs = items.reduce((sum, item) => sum + item.jobOrders.length, 0);
  const totalJobsCompleted = items.reduce(
    (sum, item) => sum + item.jobOrders.filter((j) => j.status === 'delivered' || j.status === 'completed').length,
    0,
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getJobStatus = (jo: JobOrderView): { color: string; label: string } => {
    const colors = STATUS_COLORS;
    const labels = STATUS_LABELS;
    const status = jo.status;
    return {
      color: colors[status] || colors.pending,
      label: labels[status] || status.replace('_', ' '),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading execution workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700">Work Order not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/commercial/control-tower"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Control Tower
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
                {wo.woNumber}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status] || STATUS_COLORS.draft}`}>
                  {STATUS_LABELS[wo.status] || wo.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">
                  {totalJobs} job order{totalJobs !== 1 ? 's' : ''} · {totalJobsCompleted} completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Customer</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {wo.customerName || '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Order Date</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(wo.orderDate)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Execution Date</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(wo.executionDate)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Last Updated</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDateTime(wo.updatedAt)}
          </p>
        </div>
      </div>

      {/* Work Order Items */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Work Order Items
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No work order items found for this work order.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {SBU_ICONS[item.sbuType] || <Package className="w-3 h-3" />}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {item.itemCode || `Item ${item.id.slice(0, 8)}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.sbuType}
                    </span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[item.status] || STATUS_COLORS.pending
                    }`}
                  >
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>

                {item.jobOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No job orders for this item.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            JO Number
                          </th>
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Driver
                          </th>
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Fleet
                          </th>
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Transporter
                          </th>
                          <th className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Assigned
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {item.jobOrders.map((jo) => {
                          const statusInfo = getJobStatus(jo);
                          return (
                            <tr
                              key={jo.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-2 py-1.5 font-mono text-slate-900 dark:text-white">
                                {jo.joNumber}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                                >
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">
                                {jo.driverName || '-'}
                              </td>
                              <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">
                                {jo.fleetPlateNumber || '-'}
                              </td>
                              <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">
                                {jo.transporterName || '-'}
                              </td>
                              <td className="px-2 py-1.5 text-slate-500">
                                {formatDate(jo.assignedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
              Created {formatDateTime(wo.createdAt)}
            </span>
          </div>
          {wo.executionDate && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Execution scheduled {formatDate(wo.executionDate)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">
              Last updated {formatDateTime(wo.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Read-Only Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Read-Only Workspace
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              This is the canonical WO/JO execution workspace (Phase 3, Unit 1).
              Operational mutations (assignment, status changes) are performed via the
              legacy workspace. This surface provides canonical read-only visibility
              only.
            </p>
          </div>
        </div>
      </div>

      {/* Legacy Link (for transitional access) */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/sbu/trucking/work-orders/${id}`}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-600 transition-colors"
        >
          Switch to legacy WO workspace <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
