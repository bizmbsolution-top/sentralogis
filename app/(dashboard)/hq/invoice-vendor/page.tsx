'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileText, Search, Loader2, Truck,
  ArrowRight, CheckCircle2, Clock, AlertCircle,
  RefreshCw, DollarSign, Eye, Upload, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { createJournalEntry } from '@/lib/finance/journaling';

const supabase = createClient()!;

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50' },
  verified: { label: 'Verified', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  approved: { label: 'Approved', color: 'text-purple-700', bg: 'bg-purple-50' },
  paid: { label: 'Paid', color: 'text-slate-700', bg: 'bg-slate-100' },
  rejected: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50' },
};

type VendorInvoiceRow = {
  id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name: string;
  vendor_type: string;
  invoice_amount: number;
  status: string;
  received_at: string | null;
  verified_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_terms: string | null;
  due_date: string | null;
  wo_id: string | null;
  wo_number: string | null;
  jo_ids: string[];
  notes: string | null;
  proof_url: string | null;
};

export default function HQInvoiceVendorPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendorInvoiceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'submitted' | 'verified' | 'approved' | 'paid' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoiceRow | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data: invoices, error: invError } = await supabase
        .from('vendor_invoices')
        .select(`
          *,
          vendor:md_entities!vendor_id(name, vendor_type),
          work_orders!wo_id(wo_number)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('received_at', { ascending: false });

      if (invError) throw invError;

      const rows: VendorInvoiceRow[] = (invoices || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number || 'N/A',
        vendor_id: inv.vendor_id,
        vendor_name: inv.vendor?.name || 'Unknown Vendor',
        vendor_type: inv.vendor?.vendor_type || '-',
        invoice_amount: Number(inv.invoice_amount) || 0,
        status: inv.status || 'pending',
        received_at: inv.received_at,
        verified_at: inv.verified_at,
        approved_at: inv.approved_at,
        paid_at: inv.paid_at,
        payment_terms: inv.vendor?.payment_terms || null,
        due_date: inv.due_date || null,
        wo_id: inv.wo_id,
        wo_number: inv.work_orders?.wo_number || null,
        jo_ids: inv.jo_ids || [],
        notes: inv.notes,
        proof_url: inv.proof_url,
      }));

      setData(rows);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data invoice vendor');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSearch = row.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || row.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [data, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const pending = data.filter(d => d.status === 'pending');
    const submitted = data.filter(d => d.status === 'submitted');
    const verified = data.filter(d => d.status === 'verified');
    const approved = data.filter(d => d.status === 'approved');
    const paid = data.filter(d => d.status === 'paid');
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, d) => s + d.invoice_amount, 0),
      submittedCount: submitted.length,
      submittedTotal: submitted.reduce((s, d) => s + d.invoice_amount, 0),
      verifiedCount: verified.length,
      verifiedTotal: verified.reduce((s, d) => s + d.invoice_amount, 0),
      approvedCount: approved.length,
      approvedTotal: approved.reduce((s, d) => s + d.invoice_amount, 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((s, d) => s + d.invoice_amount, 0),
    };
  }, [data]);

  const handleVerify = async (row: VendorInvoiceRow) => {
    try {
      const { error } = await supabase.from('vendor_invoices').update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (error) throw error;
      toast.success('Invoice verified');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleApprove = async (row: VendorInvoiceRow) => {
    try {
      const { error } = await supabase.from('vendor_invoices').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (error) throw error;

      if (row.invoice_amount > 0) {
        try {
          await createJournalEntry({
            jobOrderId: row.jo_ids?.[0],
            amount: row.invoice_amount,
            description: `Vendor Cost ${row.invoice_number} - ${row.vendor_name}`,
            sourceType: 'vendor_cost',
            woId: row.wo_id ?? undefined,
            metadata: { vendor_invoice_id: row.id }
          });
        } catch (journalErr) {
          console.error('Journal vendor_cost failed (non-blocking):', journalErr);
        }
      }

      toast.success('Invoice approved for payment');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleMarkPaid = async (row: VendorInvoiceRow) => {
    setSelectedInvoice(row);
    setShowUploadModal(true);
  };

  const handleConfirmPaid = async () => {
    if (!selectedInvoice) return;
    try {
      const { error } = await supabase.from('vendor_invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: uploadNotes || selectedInvoice.notes,
      }).eq('id', selectedInvoice.id);

      if (error) throw error;

      if (selectedInvoice.invoice_amount > 0) {
        try {
          await createJournalEntry({
            jobOrderId: selectedInvoice.jo_ids?.[0],
            amount: selectedInvoice.invoice_amount,
            description: `Pembayaran ${selectedInvoice.invoice_number} - ${selectedInvoice.vendor_name}`,
            sourceType: 'vendor_payment',
            woId: selectedInvoice.wo_id ?? undefined,
            metadata: { vendor_invoice_id: selectedInvoice.id }
          });
        } catch (journalErr) {
          console.error('Journal vendor_payment failed (non-blocking):', journalErr);
        }
      }

      toast.success('Invoice marked as paid');
      setShowUploadModal(false);
      setSelectedInvoice(null);
      setUploadNotes('');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleReject = async (row: VendorInvoiceRow) => {
    try {
      const { error } = await supabase.from('vendor_invoices').update({
        status: 'rejected',
      }).eq('id', row.id);

      if (error) throw error;
      toast.success('Invoice rejected');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'verified', label: 'Verified' },
    { key: 'approved', label: 'Approved' },
    { key: 'paid', label: 'Paid' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />

      {/* Upload/Paid Modal */}
      {showUploadModal && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Mark as Paid</h3>
              <button onClick={() => { setShowUploadModal(false); setSelectedInvoice(null); }} className="p-1 hover:bg-slate-100 rounded">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="text-sm font-mono font-medium">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Vendor</p>
                <p className="text-sm font-medium">{selectedInvoice.vendor_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-lg font-semibold text-slate-900">{formatRupiah(selectedInvoice.invoice_amount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Notes</label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Transfer ref, bank, etc..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => { setShowUploadModal(false); setSelectedInvoice(null); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPaid}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 size={14} className="mr-1" /> Confirm Paid
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Truck size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">Vendor Invoicing</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Invoice Vendor</h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative group w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search invoice or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all outline-none"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-slate-400' : 'text-slate-500'} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
          {tabs.map(tab => {
            const count = tab.key === 'all' ? data.length : data.filter(d => d.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Pending Review</p>
          <h3 className="text-xl font-semibold text-amber-600">{stats.pendingCount + stats.submittedCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.pendingTotal + stats.submittedTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Verified</p>
          <h3 className="text-xl font-semibold text-blue-600">{stats.verifiedCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.verifiedTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Approved for Payment</p>
          <h3 className="text-xl font-semibold text-purple-600">{stats.approvedCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.approvedTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Paid</p>
          <h3 className="text-xl font-semibold text-emerald-600">{stats.paidCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.paidTotal)}</p>
        </Card>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Received</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">TOP</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Loader2 className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-400">Loading vendor invoices...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText size={24} className="text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400">No vendor invoices found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => {
                    const statusCfg = STATUS_CONFIG[row.status] || { label: row.status, color: 'text-slate-600', bg: 'bg-slate-100' };

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-mono font-medium text-slate-900">{row.invoice_number}</div>
                          {row.wo_number && (
                            <div className="text-xs text-slate-500 font-mono">WO: {row.wo_number}</div>
                          )}
                          {row.jo_ids.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{row.jo_ids.length} JO(s)</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900">{row.vendor_name}</div>
                          <div className="text-[10px] text-slate-400">{row.vendor_type}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-slate-900">{formatRupiah(row.invoice_amount)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-700">{formatDate(row.received_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {row.payment_terms ? (
                            <div className="text-xs text-slate-700">{row.payment_terms}</div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(row.status === 'pending' || row.status === 'submitted') && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleVerify(row)}
                                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                                >
                                  <Eye size={12} className="mr-1" /> Verify
                                </Button>
                                <button
                                  onClick={() => handleReject(row)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            {row.status === 'verified' && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(row)}
                                className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg"
                              >
                                <CheckCircle2 size={12} className="mr-1" /> Approve
                              </Button>
                            )}
                            {(row.status === 'approved' || row.status === 'verified') && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(row)}
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
                              >
                                <DollarSign size={12} className="mr-1" /> Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
