'use client';

import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, Filter, Download,
  Clock, CheckCircle2, XCircle, Coins, TrendingUp,
  FileText, ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import TopupModal from '@/components/Owner/TopupModal';
import {
  getAllTopupRequests,
  getTransactionSummary,
  getTenantsList,
} from '../actions';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function OwnerTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenueMonth: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [tenants, setTenants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tenantFilter, setTenantFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, sumRes, tenantRes] = await Promise.all([
        getAllTopupRequests(),
        getTransactionSummary(),
        getTenantsList(),
      ]);
      if (txRes.success) setTransactions(txRes.data || []);
      if (sumRes.success) setSummary(sumRes.summary);
      if (tenantRes.success) setTenants(tenantRes.data || []);
    } catch {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'warning' as const, icon: Clock, label: 'Pending' },
      approved: { variant: 'success' as const, icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'danger' as const, icon: XCircle, label: 'Rejected' },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant}>
        <Icon size={12} className="inline mr-1" />
        {c.label}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.tenants?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.tenants?.tenant_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.proof_url || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (tenantFilter && tx.tenant_id !== tenantFilter) return false;
    if (dateFrom && new Date(tx.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(tx.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportCSV = () => {
    const headers = ['Date', 'Tenant', 'Tenant Code', 'Tokens', 'Amount (Rp)', 'Status', 'Proof URL'];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.created_at).toISOString(),
      tx.tenants?.name || 'Unknown',
      tx.tenants?.tenant_code || '',
      tx.tokens,
      tx.total_amount,
      tx.status,
      tx.proof_url || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">All top-up requests and revenue across tenants</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 border-0 text-white">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-black">{formatRupiah(summary.totalRevenueMonth)}</p>
            <p className="text-emerald-200 text-xs font-medium mt-1">Revenue This Month</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-700 border-0 text-white">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-black">{summary.pendingCount}</p>
            <p className="text-amber-200 text-xs font-medium mt-1">Pending Requests</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0 text-white">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-black">{summary.approvedCount}</p>
            <p className="text-blue-200 text-xs font-medium mt-1">Approved (All Time)</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-700 border-0 text-white">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <XCircle size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-black">{summary.rejectedCount}</p>
            <p className="text-rose-200 text-xs font-medium mt-1">Rejected (All Time)</p>
          </div>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by tenant name or code..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Filter size={16} />} onClick={() => setShowFilters(!showFilters)}>
            Filters
          </Button>
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  statusFilter === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Tenant</label>
              <select
                value={tenantFilter}
                onChange={(e) => { setTenantFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="">All Tenants</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tenant_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Transactions Table */}
      {loading ? (
        <Card className="p-12 text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-slate-400" size={32} />
          <p className="text-slate-500 font-medium">Loading transactions...</p>
        </Card>
      ) : filteredTransactions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <FileText size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions found</p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{tx.tenants?.name || 'Unknown'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{tx.tenants?.tenant_code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          <Coins size={14} className="text-amber-500" />
                          {tx.tokens?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatRupiah(tx.total_amount || 0)}</td>
                      <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tx.status === 'pending' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest({
                                  ...tx,
                                  requestId: tx.id,
                                  requestAmount: tx.tokens,
                                  requestPrice: tx.total_amount,
                                  name: tx.tenants?.name || 'Unknown',
                                  tenant_code: tx.tenants?.tenant_code || '',
                                });
                                setIsTopupOpen(true);
                              }}
                            >
                              Process
                            </Button>
                          )}
                          {tx.proof_url && (
                            <a href={tx.proof_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />}>
                                Proof
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                      page === currentPage ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Topup Modal */}
      <TopupModal
        isOpen={isTopupOpen}
        onClose={() => { setIsTopupOpen(false); setSelectedRequest(null); }}
        onRefresh={fetchData}
        tenant={selectedRequest}
      />
    </div>
  );
}
