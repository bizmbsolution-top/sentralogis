'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  Sparkles,
  X,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MasterCustomerModal from '@/components/master/MasterCustomerModal';

interface CustomerOption {
  id: string;
  name: string;
  code: string | null;
}

interface EngagementOption {
  id: string;
  workOrderNumber: string;
  customerId: string;
  customerName: string | null;
  status: string;
}

interface CreateFormState {
  customerId: string;
  engagementId: string;
  orderDate: string;
  targetFulfillmentDate: string;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  incoterm: string;
  commercialNotes: string;
}

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [engagements, setEngagements] = useState<EngagementOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'confirm'>('draft');
  const [lookupLoading, setLookupLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateFormState>({
    customerId: '',
    engagementId: '',
    orderDate: new Date().toISOString().split('T')[0],
    targetFulfillmentDate: '',
    currency: 'IDR',
    totalAgreedRevenue: 0,
    paymentTermsDays: 30,
    incoterm: '',
    commercialNotes: '',
  });

  const [copilotDraft, setCopilotDraft] = useState<any | null>(null);
  const [copilotDraftDismissed, setCopilotDraftDismissed] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    let qCustomerId = '';
    let qCustomerName = '';
    let qCustomerCode = '';
    let qRevenue = '';
    let qNotes = '';
    let isFromCopilot = false;

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      qCustomerId = searchParams.get('customerId') || '';
      qCustomerName = searchParams.get('customer') || searchParams.get('customerName') || '';
      qCustomerCode = searchParams.get('customerCode') || searchParams.get('code') || '';
      qRevenue = searchParams.get('revenue') || '';
      qNotes = searchParams.get('notes') || '';
      isFromCopilot = searchParams.get('fromCopilot') === '1';

      let draftData: any = null;
      try {
        const raw = sessionStorage.getItem('sentralogis_copilot_so_draft');
        if (raw) {
          draftData = JSON.parse(raw);
        }
      } catch (e) {
        console.error('Failed to parse copilot draft from sessionStorage:', e);
      }

      if (draftData) {
        setCopilotDraft(draftData);
        if (!qCustomerId && draftData.customerId) {
          qCustomerId = draftData.customerId;
        }
        if (!qCustomerName && draftData.customerName) {
          qCustomerName = draftData.customerName;
        }
        if (!qCustomerCode && draftData.customerCode) {
          qCustomerCode = draftData.customerCode;
        }
        if (!qRevenue && draftData.estimatedRevenue) {
          qRevenue = String(draftData.estimatedRevenue);
        }

        // Build comprehensive commercial notes from draft payload if not explicitly overridden
        if (!qNotes) {
          const parts: string[] = [];
          if (draftData.serviceType) parts.push(`SBU: ${draftData.serviceType}`);
          if (draftData.originName || draftData.destinationName) {
            parts.push(`Rute: ${draftData.originName || '-'} -> ${draftData.destinationName || '-'}`);
          }
          if (draftData.cargoDescription) {
            const qtyStr = draftData.quantity ? ` (Jumlah: ${draftData.quantity} ${draftData.unit || 'unit'})` : '';
            parts.push(`Muatan: ${draftData.cargoDescription}${qtyStr}`);
          }
          if (draftData.specialInstructions) {
            parts.push(`Catatan: ${draftData.specialInstructions}`);
          }
          qNotes = parts.join(' | ');
        }
      }

      if (qCustomerId || qRevenue || qNotes) {
        setFormData((prev) => ({
          ...prev,
          customerId: (qCustomerId && qCustomerId !== 'TEMP_UNCOMMITTED_CUSTOMER') ? qCustomerId : prev.customerId,
          totalAgreedRevenue: qRevenue ? Number(qRevenue) || prev.totalAgreedRevenue : prev.totalAgreedRevenue,
          commercialNotes: qNotes || prev.commercialNotes,
        }));
      }
    }

    async function fetchLookup() {
      setLookupLoading(true);
      try {
        const res = await fetch('/api/v1/commercial/sales-orders?meta=customers');
        if (res.ok) {
          const json = await res.json();
          const custs: CustomerOption[] = json.data?.customers || [];
          const engs: EngagementOption[] = json.data?.engagements || [];
          setCustomers(custs);
          setEngagements(engs);

          const getAcronym = (text: string) => {
            const clean = text.replace(/^(PT|CV|UD)\.?\s+/i, '').trim();
            const words = clean.split(/\s+/).filter(Boolean);
            return words.map((w) => w[0]).join('').toLowerCase();
          };

          const hasSpecifiedCustomer = Boolean(qCustomerId || qCustomerName || qCustomerCode);

          let matchedCustomer: CustomerOption | undefined;

          // 1. Exact canonical ID match (excluding temp uncommitted customer flag)
          if (qCustomerId && qCustomerId !== 'TEMP_UNCOMMITTED_CUSTOMER') {
            matchedCustomer = custs.find((c) => c.id === qCustomerId);
          }

          // 2. Match by customerCode
          if (!matchedCustomer && qCustomerCode) {
            const qCodeLower = qCustomerCode.toLowerCase().trim();
            matchedCustomer = custs.find((c) =>
              c.code?.toLowerCase() === qCodeLower ||
              c.name.toLowerCase() === qCodeLower ||
              getAcronym(c.name) === qCodeLower
            );
          }

          // 3. Match by customerName
          if (!matchedCustomer && qCustomerName) {
            const qRawLower = qCustomerName.toLowerCase().trim();
            const qCleanLower = qRawLower.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
            matchedCustomer = custs.find((c) => {
              const cNameLower = c.name.toLowerCase().trim();
              const cCleanLower = cNameLower.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
              const cCodeLower = (c.code || '').toLowerCase().trim();
              return (
                cCodeLower === qRawLower ||
                cCodeLower === qCleanLower ||
                cNameLower === qRawLower ||
                cCleanLower === qCleanLower ||
                cCleanLower.includes(qCleanLower) ||
                qCleanLower.includes(cCleanLower) ||
                getAcronym(c.name) === qCleanLower ||
                getAcronym(c.name) === qRawLower
              );
            });
          }

          if (matchedCustomer) {
            setFormData((prev) => ({ ...prev, customerId: matchedCustomer!.id }));
          } else if (hasSpecifiedCustomer) {
            // Customer was explicitly given from Copilot or draft, but could not be matched with current tenant's active customers.
            // DO NOT silently select custs[0] (e.g. ABC)!
            const custLabel = qCustomerName || qCustomerCode || qCustomerId;
            setError(`Customer "${custLabel}" dari draft Copilot tidak cocok dengan master customer terdaftar pada tenant aktif ini. Silakan pilih customer dari daftar atau daftarkan customer baru.`);
          } else if (custs.length === 1 && !isFromCopilot) {
            // Only auto-select single customer if NOT coming from Copilot and no customer was specified
            setFormData((prev) => ({ ...prev, customerId: custs[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch customer lookup:', err);
      } finally {
        setLookupLoading(false);
      }
    }
    fetchLookup();
  }, []);

  const submitOrder = async (confirmImmediately: boolean) => {
    setError(null);

    if (!formData.customerId && !formData.engagementId) {
      setError('Silakan pilih Customer terlebih dahulu sebelum menyimpan Sales Order.');
      return;
    }

    if (!formData.orderDate) {
      setError('Tanggal Order (Order Date) wajib diisi.');
      return;
    }

    if (formData.totalAgreedRevenue < 0 || Number.isNaN(Number(formData.totalAgreedRevenue))) {
      setError('Total Nilai Kesepakatan (Total Agreed Revenue) harus berupa angka >= 0.');
      return;
    }

    setSubmitMode(confirmImmediately ? 'confirm' : 'draft');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/commercial/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId || undefined,
          engagementId: formData.engagementId || undefined,
          orderDate: formData.orderDate,
          targetFulfillmentDate: formData.targetFulfillmentDate || null,
          currency: formData.currency || 'IDR',
          totalAgreedRevenue: Number(formData.totalAgreedRevenue) || 0,
          paymentTermsDays: Number(formData.paymentTermsDays) || 30,
          incoterm: formData.incoterm || null,
          commercialNotes: formData.commercialNotes || null,
          confirmImmediately,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message || json.error || 'Gagal membuat Sales Order.');
      }

      const createdId = json.data?.id;
      if (confirmImmediately) {
        router.push(`/commercial/sales-orders/${createdId}?justConfirmed=1`);
      } else {
        router.push(`/commercial/sales-orders/${createdId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan Sales Order.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitOrder(false);
  };

  const handleCustomerChange = (customerId: string) => {
    const matchingEng = engagements.find((e) => e.customerId === customerId && e.status === 'OPEN');
    setFormData((prev) => ({
      ...prev,
      customerId,
      engagementId: matchingEng ? matchingEng.id : '',
    }));
  };

  const handleChange = (field: keyof CreateFormState, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const customerEngagements = formData.customerId
    ? engagements.filter((e) => e.customerId === formData.customerId)
    : engagements;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/commercial/sales-orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Sales Order
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Buat Sales Order (Order Pelanggan)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Catat order pelanggan baru sebagai Draft SO atau langsung Konfirmasi SO agar siap dilanjutkan ke Work Order (WO).
        </p>
      </div>

      {/* Copilot Draft Banner */}
      {copilotDraft && !copilotDraftDismissed && (
        <div className="relative p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Draft dari Percakapan Copilot
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 uppercase">
                    Auto-Filled
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Data berikut berhasil ditransfer dari percakapan. Silakan tinjau dan lengkapi sebelum menyimpan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-blue-950 dark:text-blue-100">
                  {copilotDraft.customerName && (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Customer:</span> {copilotDraft.customerCode ? `${copilotDraft.customerCode} — ` : ''}{copilotDraft.customerName}</div>
                  )}
                  {copilotDraft.serviceType && (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Layanan (SBU):</span> {copilotDraft.serviceType}</div>
                  )}
                  {copilotDraft.originName && (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Asal:</span> {copilotDraft.originName}</div>
                  )}
                  {copilotDraft.destinationName && (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Tujuan:</span> {copilotDraft.destinationName}</div>
                  )}
                  {copilotDraft.cargoDescription && (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Muatan:</span> {copilotDraft.cargoDescription} (Jumlah: {copilotDraft.quantity || '1'} {copilotDraft.unit || 'unit'})</div>
                  )}
                  {copilotDraft.estimatedRevenue ? (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Estimasi Nilai:</span> Rp {Number(copilotDraft.estimatedRevenue).toLocaleString('id-ID')}</div>
                  ) : (
                    <div><span className="text-blue-600 dark:text-blue-400 font-medium">Estimasi Nilai:</span> Belum ditentukan</div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCopilotDraftDismissed(true)}
              className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 p-1 rounded-md transition-colors"
              title="Tutup banner"
              aria-label="Tutup banner draft copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Customer (Pelanggan) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Daftar Customer Baru
              </button>
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!formData.engagementId}
              >
                <option value="">Pilih Customer...</option>
                {lookupLoading ? (
                  <option disabled>Memuat daftar customer...</option>
                ) : customers.length === 0 ? (
                  <option disabled>Tidak ada data customer aktif</option>
                ) : (
                  customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.code ? `(${cust.code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Engagement komersial pelanggan akan ditautkan atau dibuat otomatis secara aman di sisi server.
            </p>
          </div>

          {/* Optional Engagement Selection */}
          {customerEngagements.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Engagement Komersial (Otomatis / Opsional)
              </label>
              <select
                value={formData.engagementId}
                onChange={(e) => handleChange('engagementId', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Gunakan Engagement Aktif Otomatis</option>
                {customerEngagements.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.workOrderNumber} — {eng.customerName || eng.customerId.slice(0, 8)} ({eng.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Order Date & Target Fulfillment Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Order (Order Date) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleChange('orderDate', e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Target Penyelesaian / Pengiriman
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={formData.targetFulfillmentDate}
                  onChange={(e) => handleChange('targetFulfillmentDate', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Currency & Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Mata Uang (Currency)
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IDR">IDR — Rupiah Indonesia</option>
                <option value="USD">USD — US Dollar</option>
                <option value="CNY">CNY — Chinese Yuan</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nilai Kesepakatan (Total Agreed Revenue)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.totalAgreedRevenue ? Number(formData.totalAgreedRevenue).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const cleanNum = e.target.value.replace(/\D/g, '');
                    handleChange('totalAgreedRevenue', cleanNum ? parseInt(cleanNum, 10) : 0);
                  }}
                  placeholder="Contoh: 15.000.000"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Payment Terms & Incoterm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Termin Pembayaran (Hari)
              </label>
              <input
                type="number"
                min="0"
                value={formData.paymentTermsDays}
                onChange={(e) => handleChange('paymentTermsDays', parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Incoterm / Ketentuan Pengiriman
              </label>
              <select
                value={formData.incoterm}
                onChange={(e) => handleChange('incoterm', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Incoterm (Opsional)...</option>
                <option value="DOOR_TO_DOOR">DOOR_TO_DOOR — Door to Door</option>
                <option value="PORT_TO_PORT">PORT_TO_PORT — Port to Port</option>
                <option value="FOB">FOB — Free On Board</option>
                <option value="CIF">CIF — Cost, Insurance &amp; Freight</option>
                <option value="EXW">EXW — Ex Works</option>
                <option value="DDP">DDP — Delivered Duty Paid</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan Komersial / Rincian Layanan &amp; Rute
            </label>
            <textarea
              value={formData.commercialNotes}
              onChange={(e) => handleChange('commercialNotes', e.target.value)}
              rows={3}
              placeholder="Contoh: Pengiriman Trucking Wingbox Surabaya ke Jakarta, 2 ritase..."
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Link
            href="/commercial/sales-orders"
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading || (!formData.customerId && !formData.engagementId)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && submitMode === 'draft' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Simpan sebagai Draft SO
          </button>
          <button
            type="button"
            onClick={() => submitOrder(true)}
            disabled={loading || (!formData.customerId && !formData.engagementId)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading && submitMode === 'confirm' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Simpan &amp; Konfirmasi SO (Siap Buat WO)
          </button>
        </div>
      </form>

      {/* Master Customer Modal */}
      <MasterCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(newCustomer) => {
          if (newCustomer?.id) {
            // Add new customer to local list and select it immediately
            const newOpt = {
              id: newCustomer.id,
              name: newCustomer.name || 'Customer Baru',
              code: newCustomer.entity_code || null,
            };
            setCustomers((prev) => [newOpt, ...prev.filter((c) => c.id !== newCustomer.id)]);
            handleCustomerChange(newCustomer.id);
          }
        }}
      />
    </div>
  );
}
