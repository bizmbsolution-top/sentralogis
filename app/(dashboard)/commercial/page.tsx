'use client';

import React from 'react';
import {
  Users,
  FileText,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

interface AttentionItem {
  id: string;
  label: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
}

const STATS: StatCard[] = [
  { label: 'Active Orders', value: '24', change: '+3', icon: <ShoppingCart className="w-5 h-5" />, trend: 'up' },
  { label: 'Pending Quotes', value: '8', change: '-2', icon: <FileText className="w-5 h-5" />, trend: 'down' },
  { label: 'Revenue (MTD)', value: '$128,500', change: '+12%', icon: <DollarSign className="w-5 h-5" />, trend: 'up' },
  { label: 'Avg Margin', value: '22%', change: '+2%', icon: <TrendingUp className="w-5 h-5" />, trend: 'up' },
];

const ATTENTION_ITEMS: AttentionItem[] = [
  { id: '1', label: 'Quote Expiring', description: 'QT-2026-0042 expires tomorrow', urgency: 'high', href: '/commercial/quotations/qt-2026-0042' },
  { id: '2', label: 'Pending Approval', description: '3 price overrides awaiting review', urgency: 'medium', href: '/pricing/overrides' },
  { id: '3', label: 'New Lead', description: 'PT. Logistik Nusantara requested quote', urgency: 'low', href: '/commercial/leads' },
];

export default function CommercialDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Commercial
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customer engagements, orders, and commercial performance
          </p>
        </div>
        <Link
          href="/commercial/sales-orders/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Sales Order
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Attention + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Needs Attention
          </h2>
          <div className="space-y-2">
            {ATTENTION_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${item.urgency === 'high' ? 'bg-red-500' : item.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.description}</div>
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
            <Link href="/commercial/quotations/create" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">New Quote</span>
            </Link>
            <Link href="/commercial/sales-orders/create" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ShoppingCart className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">New Order</span>
            </Link>
            <Link href="/commercial/customers/create" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">New Customer</span>
            </Link>
            <Link href="/commercial/engagements/create" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">New Engagement</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Sales Orders</h2>
          <Link href="/commercial/sales-orders" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
          <Link href="/commercial/sales-orders" className="text-blue-600 hover:underline">View sales orders</Link>
        </div>
      </div>
    </div>
  );
}
