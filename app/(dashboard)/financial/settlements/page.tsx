'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Truck,
  Ship,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface SettlementItem {
  id: string;
  settlementNumber: string;
  type: 'VENDOR_TRANSPORTER' | 'DRIVER_TRIP' | 'PORT_TERMINAL' | 'CUSTOMS_DISBURSEMENT';
  partnerName: string;
  referenceOrders: string;
  grossAmount: number;
  deductions: number;
  netPayable: number;
  currency: string;
  status: 'OPEN' | 'VERIFIED' | 'APPROVED' | 'SETTLED' | 'DISPUTED';
  dueDate: string;
}

const SAMPLE_SETTLEMENTS: SettlementItem[] = [
  {
    id: 'set-001',
    settlementNumber: 'SET-2026-10-001',
    type: 'VENDOR_TRANSPORTER',
    partnerName: 'PT Samudera Logistik Nusantara',
    referenceOrders: 'WO-2026-10-0084, WO-2026-10-0085',
    grossAmount: 34500000,
    deductions: 690000, // PPh 23 2%
    netPayable: 33810000,
    currency: 'IDR',
    status: 'SETTLED',
    dueDate: '2026-10-15',
  },
  {
    id: 'set-002',
    settlementNumber: 'SET-2026-10-002',
    type: 'DRIVER_TRIP',
    partnerName: 'Ahmad Supriyadi (Fleet B-9241-UXX)',
    referenceOrders: 'JO-2026-10-0091 (Surabaya - Banyuwangi)',
    grossAmount: 3800000,
    deductions: 2500000, // Cash Advance deducted
    netPayable: 1300000,
    currency: 'IDR',
    status: 'APPROVED',
    dueDate: '2026-10-22',
  },
  {
    id: 'set-003',
    settlementNumber: 'SET-2026-10-003',
    type: 'PORT_TERMINAL',
    partnerName: 'PT Pelindo Terminal Petikemas',
    referenceOrders: 'SHP-2026-09-0019 (Lift-on/Lift-off)',
    grossAmount: 18400000,
    deductions: 0,
    netPayable: 18400000,
    currency: 'IDR',
    status: 'VERIFIED',
    dueDate: '2026-10-25',
  },
  {
    id: 'set-004',
    settlementNumber: 'SET-2026-10-004',
    type: 'CUSTOMS_DISBURSEMENT',
    partnerName: 'Kantor Pelayanan Utama Bea Cukai Tanjung Priok',
    referenceOrders: 'DEC-2026-10-0012 (PIB Import Duty)',
    grossAmount: 67200000,
    deductions: 0,
    netPayable: 67200000,
    currency: 'IDR',
    status: 'SETTLED',
    dueDate: '2026-10-12',
  },
  {
    id: 'set-005',
    settlementNumber: 'SET-2026-10-005',
    type: 'VENDOR_TRANSPORTER',
    partnerName: 'PT Karunia Angkutan Cepat',
    referenceOrders: 'WO-2026-10-0099',
    grossAmount: 12500000,
    deductions: 1250000, // Claim for cargo demurrage
    netPayable: 11250000,
    currency: 'IDR',
    status: 'OPEN',
    dueDate: '2026-10-30',
  },
];

function formatCurrency(amount: number, currency: string = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const TYPE_CONFIG: Record<SettlementItem['type'], { label: string; icon: typeof Truck }> = {
  VENDOR_TRANSPORTER: { label: 'Transporter Vendor', icon: Truck },
  DRIVER_TRIP: { label: 'Driver Trip Settlement', icon: Truck },
  PORT_TERMINAL: { label: 'Port & Terminal', icon: Ship },
  CUSTOMS_DISBURSEMENT: { label: 'Customs Duty', icon: Building2 },
};

const STATUS_CONFIG: Record<
  SettlementItem['status'],
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  OPEN: { label: 'Open Draft', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', icon: Clock },
  VERIFIED: { label: 'Audit Verified', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: CheckCircle2 },
  APPROVED: { label: 'Approved', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', icon: CheckCircle2 },
  SETTLED: { label: 'Settled & Paid', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2 },
  DISPUTED: { label: 'Disputed', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', icon: AlertTriangle },
};

export default function SettlementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredSettlements = SAMPLE_SETTLEMENTS.filter((s) => {
    if (typeFilter !== 'ALL' && s.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        s.settlementNumber.toLowerCase().includes(term) ||
        s.partnerName.toLowerCase().includes(term) ||
        s.referenceOrders.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalPayable = SAMPLE_SETTLEMENTS.filter((s) => s.status !== 'SETTLED').reduce(
    (sum, s) => sum + s.netPayable,
    0
  );
  const totalSettled = SAMPLE_SETTLEMENTS.filter((s) => s.status === 'SETTLED').reduce(
    (sum, s) => sum + s.netPayable,
    0
  );
  const openCount = SAMPLE_SETTLEMENTS.filter((s) => s.status === 'OPEN' || s.status === 'VERIFIED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Settlements
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Operations AP
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit and reconcile operational payables for transporters, internal drivers, terminals, and customs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/financial/payments"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Payments
          </Link>
          <Link
            href="/financial/invoices"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Invoices
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Outstanding Payables
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(totalPayable)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Pending payment disbursement</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Settled This Month
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalSettled)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Fully audited and disbursed</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Audits in Progress
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {openCount} batches
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Trip logs & invoice match in progress</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search settlement no, partner, related orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="VENDOR_TRANSPORTER">Transporter Vendor</option>
              <option value="DRIVER_TRIP">Driver Trip Settlement</option>
              <option value="PORT_TERMINAL">Port & Terminal</option>
              <option value="CUSTOMS_DISBURSEMENT">Customs Duty</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open Draft</option>
              <option value="VERIFIED">Audit Verified</option>
              <option value="APPROVED">Approved</option>
              <option value="SETTLED">Settled & Paid</option>
              <option value="DISPUTED">Disputed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Settlements Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Settlement No</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Partner / Driver</th>
                <th className="px-4 py-3">Related Orders</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No settlements found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => {
                  const typeCfg = TYPE_CONFIG[s.type];
                  const statusCfg = STATUS_CONFIG[s.status];
                  const StatusIcon = statusCfg.icon;
                  const TypeIcon = typeCfg.icon;
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {s.settlementNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {s.partnerName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {s.referenceOrders}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {formatCurrency(s.grossAmount, s.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-500 text-xs">
                        {s.deductions > 0 ? `-${formatCurrency(s.deductions, s.currency)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(s.netPayable, s.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                        {s.dueDate}
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
