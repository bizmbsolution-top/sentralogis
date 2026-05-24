'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Activity, Zap, ArrowRight,
  Coins, FileText, BarChart3, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getOwnerDashboard } from '@/lib/actions/ownerDashboardActions';

export default function ReportsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getOwnerDashboard('monthly');
        setData(result);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const reportCards = [
    {
      title: 'Financial Report',
      description: 'Revenue, top-ups, and financial analytics across all tenants',
      href: '/owner/reports/financial',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      iconColor: 'text-emerald-600',
      stat: data ? formatRupiah(data.hero?.revenue || 0) : '—',
      statLabel: 'Revenue (30 days)',
    },
    {
      title: 'Operational Report',
      description: 'Work orders, job completion rates, and SBU performance',
      href: '/owner/reports/operational',
      icon: Activity,
      color: 'from-blue-500 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      iconColor: 'text-blue-600',
      stat: data ? `${data.hero?.joCompletionRate?.toFixed(0) || 0}%` : '—',
      statLabel: 'JO Completion Rate',
    },
    {
      title: 'Token Analytics',
      description: 'Token distribution, consumption patterns, and burn rates',
      href: '/owner/reports/token-analytics',
      icon: Zap,
      color: 'from-purple-500 to-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      iconColor: 'text-purple-600',
      stat: data ? `${data.hero?.tokensBurned?.toLocaleString() || 0}` : '—',
      statLabel: 'Tokens Burned',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Platform analytics and performance reports</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                <Coins size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{formatRupiah(data.hero?.revenue || 0)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue MTD</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{data.hero?.completedJOs || 0} / {data.hero?.totalJOs || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JO Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                <BarChart3 size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{data.hero?.totalTenants || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="group hover:shadow-md transition-all overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${report.color}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${report.bgColor} rounded-xl flex items-center justify-center border ${report.borderColor}`}>
                      <Icon size={22} className={report.iconColor} />
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{report.title}</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{report.description}</p>
                  <div className={`p-3 ${report.bgColor} rounded-lg border ${report.borderColor}`}>
                    <p className="text-lg font-black text-slate-900">{report.stat}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{report.statLabel}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {loading && (
        <Card className="p-12 text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-slate-400" size={32} />
          <p className="text-slate-500 font-medium">Loading report data...</p>
        </Card>
      )}
    </div>
  );
}
