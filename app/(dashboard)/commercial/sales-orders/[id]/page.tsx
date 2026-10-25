'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Layers,
  ExternalLink,
  Edit3,
  ArrowRight,
  GitBranch,
  Plus,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SalesOrderDetail {
  id: string;
  tenantId: string;
  engagementId: string;
  engagementNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerCode?: string | null;
  quoteId: string | null;
  soNumber: string;
  status: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  incoterm: string | null;
  commercialNotes: string | null;
  versionNo: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerMasterItem {
  id: string;
  name: string;
  legalName?: string | null;
  code: string | null;
}

interface LineageJobOrder {
  id: string;
  joNumber: string;
  woItemId: string;
  status: string;
  sbuType: string | null;
  origin: string | null;
  destination: string | null;
  driverId: string | null;
  fleetId: string | null;
  createdAt: string;
}

interface LineageWorkOrderItem {
  id: string;
  itemCode: string | null;
  sbuType: string;
  status: string;
  totalRevenue: number;
  origin: string | null;
  destination: string | null;
}

interface LineageWorkOrder {
  id: string;
  woNumber: string;
  customerId: string;
  status: string;
  orderDate: string | null;
  targetFulfillmentDate: string | null;
  notes: string | null;
  createdAt: string;
  linkType: 'DIRECT' | 'CUSTOMER';
  items: LineageWorkOrderItem[];
  jobOrders: LineageJobOrder[];
}

interface Allocation {
  id: string;
  fulfillmentId: string;
  capabilityType: string;
  allocatedQuantity: number;
  deliveredQuantity: number;
  status: string;
  shipmentId: string | null;
}

interface Fulfillment {
  id: string;
  fulfillmentNumber: string;
  revisionNo: number;
  status: string;
  targetFulfillmentDate: string;
  allocations: Allocation[];
}

interface OperationalHandoff {
  id: string;
  handoffNumber: string;
  targetDomain: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  attemptCount: number;
  issuedAt: string;
  acknowledgedAt: string | null;
  acceptedAt: string | null;
  executingAt: string | null;
  fulfilledAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
}

interface FulfillmentWithHandoffs extends Fulfillment {
  handoffs: OperationalHandoff[];
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
  ISSUED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACCEPTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  EXECUTING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HANDOFF_PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  AT_RISK: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  BLOCKED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
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
  ISSUED: 'Issued',
  ACKNOWLEDGED: 'Acknowledged',
  ACCEPTED: 'Accepted',
  EXECUTING: 'Executing',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  HANDOFF_PENDING: 'Handoff Pending',
  AT_RISK: 'At Risk',
  BLOCKED: 'Blocked',
};

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  FORWARDING: <Ship className="w-4 h-4" />,
  CUSTOMS: <FileText className="w-4 h-4" />,
  TRUCKING: <Truck className="w-4 h-4" />,
  WAREHOUSE: <Building2 className="w-4 h-4" />,
};

const ELIGIBLE_WO_STATUSES = new Set(['CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED']);
const ACTIVE_CANCELLABLE_STATUSES = new Set(['DRAFT', 'CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED']);

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [salesOrder, setSalesOrder] = useState<SalesOrderDetail | null>(null);
  const [workOrders, setWorkOrders] = useState<LineageWorkOrder[]>([]);
  const [fulfillments, setFulfillments] = useState<FulfillmentWithHandoffs[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Edit draft state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerId: '',
    targetFulfillmentDate: '',
    currency: 'IDR',
    totalAgreedRevenue: 0,
    paymentTermsDays: 30,
    incoterm: '',
    commercialNotes: '',
  });

  // Customer Autocomplete state
  const [customerOptions, setCustomerOptions] = useState<CustomerMasterItem[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMasterItem | null>(null);

  // Cancel modal state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [soRes, lineageRes] = await Promise.all([
        fetch(`/api/v1/commercial/sales-orders/${id}`),
        fetch(`/api/v1/commercial/sales-orders/${id}/lineage`),
      ]);

      if (!soRes.ok) {
        const errJson = await soRes.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Gagal memuat detail Sales Order');
      }

      const soJson = await soRes.json();
      const soData: SalesOrderDetail = soJson.data;
      setSalesOrder(soData);
      setEditForm({
        customerId: soData.customerId || '',
        targetFulfillmentDate: soData.targetFulfillmentDate || '',
        currency: soData.currency || 'IDR',
        totalAgreedRevenue: Number(soData.totalAgreedRevenue) || 0,
        paymentTermsDays: Number(soData.paymentTermsDays) || 30,
        incoterm: soData.incoterm || '',
        commercialNotes: soData.commercialNotes || '',
      });
      if (soData.customerId) {
        setSelectedCustomer({
          id: soData.customerId,
          name: soData.customerName || 'Customer',
          code: soData.customerCode || null,
        });
      }

      if (lineageRes.ok) {
        const linJson = await lineageRes.json().catch(() => ({}));
        setWorkOrders(linJson.data?.workOrders || []);
      }

      try {
        const flRes = await fetch(`/api/v1/commercial/fulfillments?salesOrderId=${id}`);
        if (flRes.ok) {
          const flJson = await flRes.json();
          const flData = flJson.data || [];
          const fulfillmentsWithHandoffs = await Promise.all(
            flData.map(async (fulfillment: Fulfillment) => {
              const handoffsRes = await fetch(`/api/v1/commercial/operational-handoffs?fulfillmentId=${fulfillment.id}`);
              const handoffsData = handoffsRes.ok ? (await handoffsRes.json()).data || [] : [];
              return { ...fulfillment, handoffs: handoffsData };
            }),
          );
          setFulfillments(fulfillmentsWithHandoffs);
        }
      } catch {
        setFulfillments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat Sales Order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchCustomerMaster = useCallback(async () => {
    if (customerOptions.length > 0) return;
    setCustomerLoading(true);
    try {
      const res = await fetch('/api/v1/commercial/sales-orders?meta=customers');
      if (res.ok) {
        const json = await res.json();
        const list: CustomerMasterItem[] = json.data?.customers || [];
        setCustomerOptions(list);
      }
    } catch (e) {
      console.error('Failed to load customer master:', e);
    } finally {
      setCustomerLoading(false);
    }
  }, [customerOptions.length]);

  useEffect(() => {
    if (isEditing) {
      fetchCustomerMaster();
    }
  }, [isEditing, fetchCustomerMaster]);

  const filteredCustomers = customerOptions.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
    const nameLower = (c.name || '').toLowerCase();
    const legalLower = (c.legalName || '').toLowerCase();
    const codeLower = (c.code || '').toLowerCase();
    const cleanName = nameLower.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
    const cleanLegal = legalLower.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();

    return (
      nameLower.includes(q) ||
      cleanName.includes(cleanQ) ||
      legalLower.includes(q) ||
      cleanLegal.includes(cleanQ) ||
      codeLower.includes(q)
    );
  });

  const handleConfirm = async () => {
    if (!salesOrder) return;
    setActionLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/commercial/sales-orders/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Gagal mengonfirmasi Sales Order.');
      }
      setSalesOrder(json.data);
      setActionMessage(`Sales Order ${json.data.soNumber} berhasil dikonfirmasi (CONFIRMED). Anda sekarang dapat melanjutkan ke pembuatan Work Order (WO).`);
    } catch (err: any) {
      setError(err.message || 'Gagal mengonfirmasi Sales Order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/commercial/sales-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: editForm.customerId || null,
          targetFulfillmentDate: editForm.targetFulfillmentDate || null,
          currency: editForm.currency,
          totalAgreedRevenue: Number(editForm.totalAgreedRevenue) || 0,
          paymentTermsDays: Number(editForm.paymentTermsDays) || 30,
          incoterm: editForm.incoterm || null,
          commercialNotes: editForm.commercialNotes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Gagal memperbarui Draft Sales Order.');
      }
      setSalesOrder(json.data);
      if (json.data?.customerId) {
        setSelectedCustomer({
          id: json.data.customerId,
          name: json.data.customerName || 'Customer',
          code: json.data.customerCode || null,
        });
      }
      setIsEditing(false);
      setActionMessage('Perubahan Draft Sales Order berhasil disimpan.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui Draft Sales Order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/commercial/sales-orders/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: cancelReason || 'Dibatalkan oleh pengguna' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Gagal membatalkan Sales Order.');
      }
      setSalesOrder(json.data);
      setIsCancelling(false);
      setActionMessage(`Sales Order ${json.data.soNumber} telah dibatalkan.`);
    } catch (err: any) {
      setError(err.message || 'Gagal membatalkan Sales Order.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
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
        <span className="ml-2 text-sm text-slate-500">Memuat detail Sales Order...</span>
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
        <Link
          href="/commercial/sales-orders"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Sales Order
        </Link>
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error || 'Sales Order tidak ditemukan.'}</span>
        </div>
      </div>
    );
  }

  const createWoHref = `/hq/work-orders?action=create&salesOrderId=${encodeURIComponent(salesOrder.id)}&soNumber=${encodeURIComponent(salesOrder.soNumber)}${salesOrder.customerId ? `&customerId=${encodeURIComponent(salesOrder.customerId)}` : ''}`;
  const isEligibleForWo = ELIGIBLE_WO_STATUSES.has(salesOrder.status);
  const totalJobOrders = workOrders.reduce((sum, wo) => sum + (wo.jobOrders?.length || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/commercial/sales-orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Sales Order
      </Link>

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {actionMessage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-800 dark:text-emerald-200">{actionMessage}</span>
          </div>
          {isEligibleForWo && (
            <Link
              href={createWoHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold whitespace-nowrap"
            >
              Lanjutkan ke Work Order (Buat WO)
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {salesOrder.soNumber}
                </h1>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[salesOrder.status] || STATUS_COLORS.DRAFT}`}>
                  {STATUS_LABELS[salesOrder.status] || salesOrder.status}
                </span>
                <span className="text-xs text-slate-400">
                  v{salesOrder.versionNo}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">
                    Customer: {salesOrder.customerName || 'Customer Tenant'}
                    {salesOrder.customerCode ? ` (${salesOrder.customerCode})` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Engagement: {salesOrder.engagementNumber || salesOrder.engagementId}
                </p>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {salesOrder.status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Konfirmasi Sales Order (Confirm SO)
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Draft
                </button>
              </>
            )}

            {isEligibleForWo && (
              <Link
                href={createWoHref}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Lanjutkan ke Work Order (Buat WO)
              </Link>
            )}

            {ACTIVE_CANCELLABLE_STATUSES.has(salesOrder.status) && (
              <button
                type="button"
                onClick={() => setIsCancelling((v) => !v)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Batalkan SO
              </button>
            )}
          </div>
        </div>

        {/* Inline Edit Draft Form */}
        {isEditing && salesOrder.status === 'DRAFT' && (
          <form onSubmit={handleSaveEdit} className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Edit Draft Sales Order
            </h3>

            {/* Customer Autocomplete Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Customer / Pelanggan <span className="text-red-500">*</span>
              </label>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedCustomer.name}</span>
                        {selectedCustomer.code && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            {selectedCustomer.code}
                          </span>
                        )}
                      </div>
                      {selectedCustomer.legalName && selectedCustomer.legalName !== selectedCustomer.name && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedCustomer.legalName}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerDropdownOpen(true);
                      setCustomerSearchQuery('');
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  >
                    Ganti Customer
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setCustomerDropdownOpen(true)}
                      placeholder="Cari nama, nama legal, atau kode (cth: TPS, Trading Perdana, CUS/001)..."
                      className="w-full pl-9 pr-9 py-2 border border-blue-400 dark:border-blue-500 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {customerDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 space-y-1">
                      {customerLoading ? (
                        <div className="flex items-center justify-center p-4 text-xs text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Memuat data master pelanggan...
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="p-3 text-xs text-center text-slate-500 dark:text-slate-400">
                          Tidak ada pelanggan yang cocok dengan &ldquo;{customerSearchQuery}&rdquo;.
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setEditForm((p) => ({ ...p, customerId: cust.id }));
                              setCustomerDropdownOpen(false);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {cust.name}
                              </div>
                              {cust.legalName && cust.legalName !== cust.name && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {cust.legalName}
                                </div>
                              )}
                            </div>
                            {cust.code && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {cust.code}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Target Penyelesaian
                </label>
                <input
                  type="date"
                  value={editForm.targetFulfillmentDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, targetFulfillmentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nilai Kesepakatan ({editForm.currency})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editForm.totalAgreedRevenue ? Number(editForm.totalAgreedRevenue).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setEditForm((p) => ({ ...p, totalAgreedRevenue: clean ? parseInt(clean, 10) : 0 }));
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Termin Pembayaran (Hari)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.paymentTermsDays}
                  onChange={(e) => setEditForm((p) => ({ ...p, paymentTermsDays: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Catatan Komersial
              </label>
              <textarea
                rows={2}
                value={editForm.commercialNotes}
                onChange={(e) => setEditForm((p) => ({ ...p, commercialNotes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setCustomerDropdownOpen(false);
                  setCustomerSearchQuery('');
                  if (salesOrder?.customerId) {
                    setSelectedCustomer({
                      id: salesOrder.customerId,
                      name: salesOrder.customerName || 'Customer',
                      code: salesOrder.customerCode || null,
                    });
                    setEditForm((p) => ({ ...p, customerId: salesOrder.customerId || '' }));
                  }
                }}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Simpan Perubahan Draft
              </button>
            </div>
          </form>
        )}

        {/* Inline Cancel Form */}
        {isCancelling && (
          <form onSubmit={handleCancelOrder} className="mt-6 pt-6 border-t border-red-200 dark:border-red-900/40 space-y-3">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Konfirmasi Pembatalan Sales Order
            </h3>
            <input
              type="text"
              required
              placeholder="Masukkan alasan pembatalan SO..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelling(false)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Batalkan Sales Order Sekarang
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Tanggal Order</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(salesOrder.orderDate)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Target Penyelesaian</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(salesOrder.targetFulfillmentDate)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Nilai Kesepakatan</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatCurrency(salesOrder.totalAgreedRevenue, salesOrder.currency)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Termin Pembayaran</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {salesOrder.paymentTermsDays} hari
          </p>
        </div>
      </div>

      {/* Document Lineage: SO -> WO -> JO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Rantai Dokumen Operasional (Lineage: SO → WO → JO)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hubungan komitmen komersial ({salesOrder.soNumber}) dengan Work Order (WO) dan Job Order (JO) eksekusi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
              {workOrders.length} Work Order
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
              {totalJobOrders} Job Order
            </span>
          </div>
        </div>

        {workOrders.length === 0 ? (
          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center space-y-3">
            <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Belum ada Work Order (WO) untuk Sales Order ini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
                Sesuai pemisahan tanggung jawab komersial &amp; operasional, konfirmasi Sales Order tidak otomatis membuat Work Order atau meng-assign driver.
              </p>
            </div>
            {salesOrder.status === 'DRAFT' ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                Konfirmasi SO Terlebih Dahulu
              </button>
            ) : isEligibleForWo ? (
              <Link
                href={createWoHref}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Buat Work Order (WO) dari SO Ini
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {workOrders.map((wo) => (
              <div
                key={wo.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      WO
                    </span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {wo.woNumber}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase">
                      {wo.status}
                    </span>
                    {wo.orderDate && (
                      <span className="text-xs text-slate-500">
                        • {formatDate(wo.orderDate)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/hq/work-orders?q=${encodeURIComponent(wo.woNumber)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Buka di HQ Work Orders
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Child Job Orders */}
                {wo.jobOrders && wo.jobOrders.length > 0 ? (
                  <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Job Orders ({wo.jobOrders.length}):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {wo.jobOrders.map((jo) => (
                        <Link
                          key={jo.id}
                          href={`/job-orders/${jo.id}`}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                JO
                              </span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {jo.joNumber}
                              </span>
                            </div>
                            {(jo.origin || jo.destination) && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {jo.origin || '-'} → {jo.destination || '-'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {jo.status}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                    Work Order ini memiliki {wo.items?.length || 0} item layanan dan belum memiliki Job Order.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Info */}
      {(salesOrder.incoterm || salesOrder.commercialNotes) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Informasi Komersial Tambahan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salesOrder.incoterm && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Incoterm / Ketentuan
                </span>
                <p className="text-sm text-slate-900 dark:text-white mt-1">
                  {salesOrder.incoterm}
                </p>
              </div>
            )}
            {salesOrder.commercialNotes && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Catatan Komersial
                </span>
                <p className="text-sm text-slate-900 dark:text-white mt-1">
                  {salesOrder.commercialNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Riwayat Status Sales Order
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Dibuat pada {formatDateTime(salesOrder.createdAt)}
            </span>
          </div>
          {salesOrder.confirmedAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Dikonfirmasi pada {formatDateTime(salesOrder.confirmedAt)}
              </span>
            </div>
          )}
          {salesOrder.cancelledAt && (
            <div className="flex items-center gap-3">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Dibatalkan pada {formatDateTime(salesOrder.cancelledAt)}
                {salesOrder.cancelledReason && ` — Alasan: ${salesOrder.cancelledReason}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Terakhir diperbarui {formatDateTime(salesOrder.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
