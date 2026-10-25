'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface PaymentItem {
  id: string;
  paymentNumber: string;
  direction: 'AR' | 'AP';
  referenceType: string;
  referenceNumber: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'ALLOCATED' | 'COMPLETED' | 'CANCELLED';
  paymentDate: string;
  method: string;
}

const SAMPLE_PAYMENTS: PaymentItem[] = [
  {
    id: 'pay-001',
    paymentNumber: 'PAY-2026-10-001',
    direction: 'AR',
    referenceType: 'INVOICE',
    referenceNumber: 'INV-2026-09-0042',
    counterparty: 'PT Indofood CBP Sukses Makmur',
    amount: 85000000,
    currency: 'IDR',
    status: 'COMPLETED',
    paymentDate: '2026-10-18',
    method: 'Bank Transfer (BCA)',
  },
  {
    id: 'pay-002',
    paymentNumber: 'PAY-2026-10-002',
    direction: 'AR',
    referenceType: 'INVOICE',
    referenceNumber: 'INV-2026-09-0043',
    counterparty: 'PT Mayora Indah Tbk',
    amount: 42500000,
    currency: 'IDR',
    status: 'ALLOCATED',
    paymentDate: '2026-10-19',
    method: 'Bank Transfer (Mandiri)',
  },
  {
    id: 'pay-003',
    paymentNumber: 'PAY-2026-10-003',
    direction: 'AP',
    referenceType: 'SETTLEMENT',
    referenceNumber: 'SET-2026-10-0012',
    counterparty: 'PT Samudera Indonesia Logistics',
    amount: 31200000,
    currency: 'IDR',
    status: 'CONFIRMED',
    paymentDate: '2026-10-20',
    method: 'Bank Transfer (BCA)',
  },
  {
    id: 'pay-004',
    paymentNumber: 'PAY-2026-10-004',
    direction: 'AP',
    referenceType: 'DRIVER_ADVANCE',
    referenceNumber: 'JO-2026-10-0118',
    counterparty: 'Budi Santoso (Driver)',
    amount: 2500000,
    currency: 'IDR',
    status: 'COMPLETED',
    paymentDate: '2026-10-21',
    method: 'E-Wallet / Instant Transfer',
  },
  {
    id: 'pay-005',
    paymentNumber: 'PAY-2026-10-005',
    direction: 'AR',
    referenceType: 'INVOICE',
    referenceNumber: 'INV-2026-10-0001',
    counterparty: 'PT Unilever Indonesia Tbk',
    amount: 118000000,
    currency: 'IDR',
    status: 'PENDING',
    paymentDate: '2026-10-21',
    method: 'Virtual Account (BNI)',
  },
];

function formatCurrency(amount: number, currency: string = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_CONFIG: Record<
  PaymentItem['status'],
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', icon: Clock },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: CheckCircle2 },
  ALLOCATED: { label: 'Allocated', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: Clock },
};

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'AR' | 'AP'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredPayments = SAMPLE_PAYMENTS.filter((p) => {
    if (directionFilter !== 'ALL' && p.direction !== directionFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.paymentNumber.toLowerCase().includes(term) ||
        p.counterparty.toLowerCase().includes(term) ||
        p.referenceNumber.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalAR = SAMPLE_PAYMENTS.filter((p) => p.direction === 'AR' && p.status !== 'CANCELLED').reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const totalAP = SAMPLE_PAYMENTS.filter((p) => p.direction === 'AP' && p.status !== 'CANCELLED').reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const pendingCount = SAMPLE_PAYMENTS.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Payments & Collections
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Treasury
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track receivables receipts, vendor payables disbursements, and allocation status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/financial/invoices"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Invoices
          </Link>
          <Link
            href="/financial/settlements"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Settlements
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Collections (AR)
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalAR)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Customer receipts cleared</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Disbursements (AP)
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(totalAP)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Vendor & driver payouts</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Pending Verification
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingCount} transactions
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Requires bank reconciliation</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search payment number, counterparty, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setDirectionFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  directionFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDirectionFilter('AR')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  directionFilter === 'AR'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Inbound (AR)
              </button>
              <button
                onClick={() => setDirectionFilter('AP')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  directionFilter === 'AP'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Outbound (AP)
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Payment No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const statusCfg = STATUS_CONFIG[p.status];
                  const Icon = statusCfg.icon;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {p.paymentNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            p.direction === 'AR'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {p.direction === 'AR' ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {p.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {p.counterparty}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {p.referenceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.method}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          <Icon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                        {p.paymentDate}
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
  );
}
