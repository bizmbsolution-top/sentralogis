'use client';

import React from 'react';
import {
  DollarSign,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface FinancialStat {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

interface Exception {
  id: string;
  label: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
}

const STATS: FinancialStat[] = [
  { label: 'Total Revenue', value: '$128,500', change: '+12%', icon: <DollarSign className="w-5 h-5" />, trend: 'up' },
  { label: 'Outstanding AR', value: '$42,000', change: '-5%', icon: <Receipt className="w-5 h-5" />, trend: 'down' },
  { label: 'AP Payable', value: '$28,000', change: '+3%', icon: <CreditCard className="w-5 h-5" />, trend: 'up' },
  { label: 'Gross Margin', value: '22%', change: '+2%', icon: <TrendingUp className="w-5 h-5" />, trend: 'up' },
];

const EXCEPTIONS: Exception[] = [
  { id: '1', label: 'Overdue Invoice', description: 'INV-2026-00042 — 15 days overdue', urgency: 'high', href: '/financial/invoices/inv-2026-00042' },
  { id: '2', label: 'Unmatched Payment', description: 'Payment without invoice allocation', urgency: 'medium', href: '/financial/reconciliation' },
  { id: '3', label: 'Pending Cost Audit', description: '5 WOs awaiting audit', urgency: 'low', href: '/financial/cost-audit' },
];

export default function FinanceDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Financial
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Invoices, receivables, payables, and financial settlement
          </p>
        </div>
        <Link
          href="/financial/invoices/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gridols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 dark:text-slate-400">{stat.icon}</span>
              <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-slate-400'}`}>
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Exceptions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exceptions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Financial Exceptions
          </h2>
          <div className="space-y-2">
            {EXCEPTIONS.map((exc) => (
              <Link
                key={exc.id}
                href={exc.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${exc.urgency === 'high' ? 'bg-red-500' : exc.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{exc.label}</div>
                  <div className="text-xs text-slate-500">{exc.description}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/financial/invoices" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Receipt className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Invoices</span>
            </Link>
            <Link href="/financial/payments" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Payments</span>
            </Link>
            <Link href="/financial/ar" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">AR</span>
            </Link>
            <Link href="/financial/reconciliation" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Reconcile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
