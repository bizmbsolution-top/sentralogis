'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileText, Search, Loader2, Banknote,
  ArrowRight, CheckCircle2, Clock, AlertCircle,
  Send, Eye, Printer, RefreshCw, Calendar, DollarSign, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

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

const getDaysUntilDue = (dueDate: string | null) => {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getDueBadge = (days: number | null) => {
  if (days === null) return { label: '-', className: 'bg-slate-100 text-slate-500' };
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, className: 'bg-rose-100 text-rose-700' };
  if (days === 0) return { label: 'Today', className: 'bg-orange-100 text-orange-700' };
  if (days <= 3) return { label: `H-${days}`, className: 'bg-amber-100 text-amber-700' };
  return { label: `${days}d`, className: 'bg-slate-100 text-slate-600' };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-50' },
  ready: { label: 'Ready to Bill', color: 'text-blue-700', bg: 'bg-blue-50' },
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-50' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  paid: { label: 'Paid', color: 'text-purple-700', bg: 'bg-purple-50' },
};

type InvoiceRow = {
  id: string;
  wo_id: string;
  wo_number: string;
  customer_name: string;
  invoice_number: string | null;
  total_billing: number;
  tax_amount: number;
  status: string;
  due_date: string | null;
  invoice_date: string | null;
  sent_at: string | null;
  customer_accepted_invoice_at: string | null;
  paid_at: string | null;
  days_until_due: number | null;
  jo_count: number;
  completed_jo: number;
  ready_for_billing: boolean;
};

const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string | null) => {
  try {
    const res = await fetch(`/api/invoice/pdf?invoice_id=${invoiceId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceNumber || invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    toast.error('Gagal download PDF: ' + (err.message || 'unknown'));
  }
};

export default function HQInvoiceCustomerPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InvoiceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'paid' | 'ready'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data: wos, error: woError } = await supabase
        .from('work_orders')
        .select(`
          id, wo_number, customer_id, created_at,
          customer:md_entities!customer_id(name, legal_name),
          wo_items (
            id, unit_price, total_revenue,
            job_orders (
              id, jo_number, status, base_price, is_doc_finished, is_cost_finished
            )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false });

      if (woError) {
        console.error('WO query error detail:', { message: woError.message, details: woError.details, hint: woError.hint, code: woError.code });
        throw woError;
      }

      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .in('wo_id', (wos || []).map(w => w.id));

      if (invError) {
        console.warn('Invoices query warning:', { message: invError.message, details: invError.details, code: invError.code });
      }

      const invoiceMap = new Map();
      if (invoices && invoices.length > 0) {
        invoices.forEach(inv => invoiceMap.set(inv.wo_id, inv));
      }

      const rows: InvoiceRow[] = [];
      for (const wo of wos || []) {
        const jos = (wo as any).wo_items?.flatMap((wi: any) => wi.job_orders || []) || [];
        if (jos.length === 0) continue;

        const completedJo = jos.filter((j: any) =>
          ['completed', 'COMPLETED', 'PEKERJAAN SELESAI', 'awaiting_audit', 'AWAITING_AUDIT', 'ready_for_billing', 'invoiced', 'paid'].includes(j.status)
        ).length;
        const allDocDone = jos.every((j: any) => j.is_doc_finished);
        const allCostDone = jos.every((j: any) => j.is_cost_finished);
        const readyForBilling = completedJo === jos.length && allDocDone && allCostDone;

        const totalBilling = (wo as any).wo_items?.reduce((sum: number, wi: any) => {
          const wiRevenue = Number(wi.total_revenue) || (Number(wi.unit_price || 0) * (wi.job_orders?.length || 0));
          return sum + wiRevenue;
        }, 0) || 0;
        const inv = invoiceMap.get(wo.id);

        const customerName = (wo as any).customer?.legal_name || (wo as any).customer?.name || '';

        let status = 'in_progress';
        let dueDate: string | null = null;
        if (inv) {
          status = inv.status || 'draft';
          dueDate = inv.due_date || null;
        } else if (readyForBilling) {
          status = 'ready';
        } else {
          continue; // Skip WO that are still in progress/draft/on journey
        }

        rows.push({
          id: inv?.id || wo.id,
          wo_id: wo.id,
          wo_number: wo.wo_number,
          customer_name: customerName,
          invoice_number: inv?.invoice_number || null,
          total_billing: inv?.total_billing != null ? Number(inv.total_billing) : totalBilling,
          tax_amount: inv?.tax_amount || 0,
          status,
          due_date: dueDate,
          invoice_date: inv?.invoice_date || null,
          sent_at: inv?.sent_at || null,
          customer_accepted_invoice_at: inv?.customer_accepted_invoice_at || null,
          paid_at: inv?.paid_at || null,
          days_until_due: getDaysUntilDue(dueDate),
          jo_count: jos.length,
          completed_jo: completedJo,
          ready_for_billing: readyForBilling,
        });
      }

      setData(rows);
    } catch (err: any) {
      console.error('Fetch Error:', err?.message || JSON.stringify(err), err?.details || '', err?.code || '');
      toast.error('Gagal mengambil data invoice');
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
      const matchesSearch = row.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || row.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [data, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const ready = data.filter(d => d.status === 'ready');
    const sent = data.filter(d => d.status === 'sent');
    const accepted = data.filter(d => d.status === 'accepted');
    const paid = data.filter(d => d.status === 'paid');
    return {
      readyCount: ready.length,
      readyTotal: ready.reduce((s, d) => s + d.total_billing, 0),
      sentCount: sent.length,
      sentTotal: sent.reduce((s, d) => s + d.total_billing, 0),
      acceptedCount: accepted.length,
      acceptedTotal: accepted.reduce((s, d) => s + d.total_billing, 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((s, d) => s + d.total_billing, 0),
      overdueCount: data.filter(d => (d.days_until_due ?? 0) < 0 && ['sent', 'accepted'].includes(d.status)).length,
    };
  }, [data]);

  const handleGenerateInvoice = async (row: InvoiceRow) => {
    try {
      const invNumber = `INV-${row.wo_number.replace('WO', '')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: newInv, error } = await supabase.from('invoices').insert({
        wo_id: row.wo_id,
        invoice_number: invNumber,
        total_billing: row.total_billing,
        tax_amount: 0,
        status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
      }).select().single();

      if (error) throw error;
      toast.success(`Invoice ${invNumber} created`);
      router.push(`/hq/invoice-customer/${newInv.id}`);
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleSendInvoice = async (row: InvoiceRow) => {
    try {
      const { error } = await supabase.from('invoices').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (error) throw error;
      toast.success('Invoice sent to customer');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleAcceptInvoice = async (row: InvoiceRow) => {
    try {
      const { error } = await supabase.from('invoices').update({
        status: 'accepted',
        customer_accepted_invoice_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (error) throw error;
      toast.success('Invoice marked as accepted');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handlePaidInvoice = async (row: InvoiceRow) => {
    try {
      const { error } = await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', row.id);

      if (error) throw error;
      toast.success('Invoice marked as paid');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'ready', label: 'Ready Invoice' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'paid', label: 'Paid' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Banknote size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Customer Invoicing</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Invoice Customer</h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative group w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search WO or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
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
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Ready to Invoice</p>
          <h3 className="text-xl font-semibold text-amber-600">{stats.readyCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.readyTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Open Receivables</p>
          <h3 className="text-xl font-semibold text-blue-600">{stats.sentCount + stats.acceptedCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.sentTotal + stats.acceptedTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Collected (Paid)</p>
          <h3 className="text-xl font-semibold text-emerald-600">{stats.paidCount}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatRupiah(stats.paidTotal)}</p>
        </Card>
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Overdue</p>
          <h3 className={`text-xl font-semibold ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {stats.overdueCount}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Need follow-up</p>
        </Card>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">WO / Invoice</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">TOP</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-400">Loading invoices...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText size={24} className="text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400">No invoices found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => {
                    const statusCfg = STATUS_CONFIG[row.status] || { label: row.status, color: 'text-slate-600', bg: 'bg-slate-100' };
                    const dueBadge = getDueBadge(row.days_until_due);
                    const topDays = row.customer_accepted_invoice_at && row.due_date
                      ? Math.ceil((new Date(row.due_date).getTime() - new Date(row.customer_accepted_invoice_at).getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <tr key={row.wo_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-mono font-medium text-slate-900">{row.wo_number}</div>
                          {row.invoice_number && (
                            <div className="text-xs text-slate-500 font-mono">{row.invoice_number}</div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.completed_jo}/{row.jo_count} JO</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900 truncate max-w-[200px]">{row.customer_name || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-slate-900">{formatRupiah(row.total_billing)}</div>
                          {row.total_billing !== row.total_billing && (
                            <div className="text-[10px] text-slate-400">Base: {formatRupiah(row.total_billing)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.due_date ? (
                            <div>
                              <div className="text-xs text-slate-700">{formatDate(row.due_date)}</div>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${dueBadge.className}`}>
                                {dueBadge.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400">-</span>
                          {topDays !== null && row.status === 'accepted' && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{topDays} days TOP</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {row.status === 'ready' && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateInvoice(row)}
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                              >
                                <FileText size={12} className="mr-1" /> Generate
                              </Button>
                            )}
                            {row.status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSendInvoice(row)}
                                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                                >
                                  <Send size={12} className="mr-1" /> Send
                                </Button>
                              </>
                            )}
                            {row.status === 'sent' && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptInvoice(row)}
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
                              >
                                <CheckCircle2 size={12} className="mr-1" /> Accept
                              </Button>
                            )}
                            {(row.status === 'accepted' || row.status === 'sent') && (
                              <Button
                                size="sm"
                                onClick={() => handlePaidInvoice(row)}
                                className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg"
                              >
                                <DollarSign size={12} className="mr-1" /> Paid
                              </Button>
                            )}
                            {row.invoice_number && (
                              <>
                                <button
                                  onClick={() => router.push(`/hq/invoice-customer/${row.id}`)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="View Invoice"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleDownloadPdf(row.id, row.invoice_number)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Download PDF"
                                >
                                  <FileText size={14} />
                                </button>
                              </>
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
