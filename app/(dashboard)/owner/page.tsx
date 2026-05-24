'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Coins, Users, TrendingUp, Building2, Calendar, ChevronDown,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, Zap,
  BarChart3, FileText, HardDrive, Clock, CheckCircle2, Truck,
  Package, Shield, Eye, DollarSign, Percent, Timer
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getOwnerDashboard } from '@/lib/actions/ownerDashboardActions';

type TimePeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// ============================================
// ANIMATED COUNTER
// ============================================

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1000 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = new Intl.NumberFormat('id-ID').format(display);
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ============================================
// SPARKLINE
// ============================================

function Sparkline({ data, color = '#3b82f6', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================
// PROGRESS RING
// ============================================

function ProgressRing({ value, size = 60, strokeWidth = 6, color = '#3b82f6' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOwnerDashboard(period);
      setData(result);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const periodLabels: Record<TimePeriod, string> = { weekly: '7 Hari', monthly: '30 Hari', quarterly: '3 Bulan', yearly: '1 Tahun' };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-blue-700 text-sm font-bold tracking-wider">LOADING DASHBOARD</p>
        </div>
      </div>
    );
  }

  const { hero, revenueTimeline, tokenUsage, revenueByTenant, storage, activeUsers, newTenants, sbuBreakdown, pendingTopups } = data;

  const revenueData = revenueTimeline.timeline?.map((t: any) => t.amount) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                <Zap size={24} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Command Center
              </h1>
              <p className="text-slate-600 text-sm font-medium">Real-time platform intelligence</p>
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowPeriodDropdown(!showPeriodDropdown)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all shadow-sm">
              <Calendar size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-900">{periodLabels[period]}</span>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
                  <button key={p} onClick={() => { setPeriod(p); setShowPeriodDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between ${period === p ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}>
                    {periodLabels[p]}
                    {period === p && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== HERO METRICS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Revenue Card - Gradient Blue */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border-0 text-white shadow-lg shadow-blue-600/20 group hover:shadow-xl hover:shadow-blue-600/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <DollarSign size={18} className="text-white" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${hero.revenueGrowth >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                  {hero.revenueGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(hero.revenueGrowth).toFixed(1)}%
                </div>
              </div>
              <p className="text-2xl font-black mb-1">
                <AnimatedCounter value={hero.revenue} prefix="Rp " />
              </p>
              <p className="text-blue-200 text-xs font-medium">Total Revenue</p>
              <div className="mt-3 h-8">
                <Sparkline data={revenueData} color="rgba(255,255,255,0.6)" height={32} />
              </div>
            </div>
          </Card>

          {/* Tokens Burned - Purple */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 border-0 text-white shadow-lg shadow-purple-600/20 group hover:shadow-xl hover:shadow-purple-600/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Zap size={18} className="text-white" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${hero.tokensBurnedGrowth >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                  {hero.tokensBurnedGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(hero.tokensBurnedGrowth).toFixed(1)}%
                </div>
              </div>
              <p className="text-2xl font-black mb-1">
                <AnimatedCounter value={hero.tokensBurned} />
              </p>
              <p className="text-purple-200 text-xs font-medium">Tokens Burned (JO Done)</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full transition-all duration-1000" style={{ width: `${hero.totalJOs ? (hero.completedJOs / hero.totalJOs) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-bold text-white/80">{hero.joCompletionRate.toFixed(0)}%</span>
              </div>
            </div>
          </Card>

          {/* Active Users - Emerald */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border-0 text-white shadow-lg shadow-emerald-600/20 group hover:shadow-xl hover:shadow-emerald-600/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Users size={18} className="text-white" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${hero.activeUsersGrowth >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                  {hero.activeUsersGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(hero.activeUsersGrowth).toFixed(1)}%
                </div>
              </div>
              <p className="text-2xl font-black mb-1">
                <AnimatedCounter value={hero.activeUsers} />
              </p>
              <p className="text-emerald-200 text-xs font-medium">Active Users</p>
              <div className="mt-4 flex items-center gap-2">
                <Building2 size={14} className="text-emerald-200" />
                <span className="text-xs font-bold text-white/80">{hero.totalTenants} Tenants</span>
                <span className="text-emerald-300">•</span>
                <span className="text-xs font-bold text-emerald-200">+{hero.newTenants} new</span>
              </div>
            </div>
          </Card>

          {/* Storage - Amber */}
          <Card className="relative overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -translate-y-6 translate-x-6" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                  <HardDrive size={18} className="text-amber-600" />
                </div>
                <ProgressRing value={storage.usagePercent || 0} size={44} strokeWidth={4} color={storage.usagePercent > 80 ? '#ef4444' : storage.usagePercent > 50 ? '#f59e0b' : '#10b981'} />
              </div>
              <p className="text-2xl font-black text-slate-900 mb-1">
                <AnimatedCounter value={storage.totalFiles || 0} />
              </p>
              <p className="text-slate-500 text-xs font-medium">Files Stored</p>
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${storage.usagePercent > 80 ? 'bg-red-500 animate-pulse' : storage.usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className={`text-[10px] font-bold ${storage.usagePercent > 80 ? 'text-red-600' : storage.usagePercent > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {storage.usagePercent?.toFixed(1)}% of 1GB limit
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Token Usage by Tenant - Wide */}
          <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
                    <BarChart3 size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Token Balance by Tenant</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-slate-500 font-medium">Light = Total, Dark = Remaining</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-200" />
                        <span className="text-[10px] text-slate-400 font-medium">Total</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-[10px] text-slate-400 font-medium">Sisa</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-bold">
                  {tokenUsage.byTenant?.length || 0} tenants
                </Badge>
              </div>

              {tokenUsage.byTenant?.length === 0 ? (
                <div className="text-center py-12">
                  <Zap size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No token usage yet</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {tokenUsage.byTenant.slice(0, 8).map((tenant: any, i: number) => {
                    const maxTotal = tokenUsage.byTenant[0]?.total || 1;
                    const barWidth = (tenant.total / maxTotal) * 100;
                    const remainingPct = tenant.total > 0 ? (tenant.remaining / tenant.total) * 100 : 0;
                    const consumedPct = tenant.total > 0 ? (tenant.consumed / tenant.total) * 100 : 0;
                    
                    const colorSets = [
                      { light: 'bg-blue-200', dark: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
                      { light: 'bg-purple-200', dark: 'bg-purple-600', text: 'text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
                      { light: 'bg-indigo-200', dark: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                      { light: 'bg-fuchsia-200', dark: 'bg-fuchsia-600', text: 'text-fuchsia-700', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
                      { light: 'bg-cyan-200', dark: 'bg-cyan-600', text: 'text-cyan-700', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                      { light: 'bg-violet-200', dark: 'bg-violet-600', text: 'text-violet-700', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
                      { light: 'bg-sky-200', dark: 'bg-sky-600', text: 'text-sky-700', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
                      { light: 'bg-pink-200', dark: 'bg-pink-600', text: 'text-pink-700', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
                    ];
                    const c = colorSets[i % colorSets.length];
                    
                    return (
                      <div key={tenant.tenant_id} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg ${c.dark} flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>
                              {i + 1}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{tenant.tenant_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${c.light}`} />
                              <span className="text-[10px] font-bold text-slate-500">{tenant.total}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${c.dark}`} />
                              <span className="text-[10px] font-bold text-slate-500">{tenant.remaining}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Two-color bar */}
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                          {/* Light background = total tokens */}
                          <div 
                            className={`h-full ${c.light} rounded-full transition-all duration-700 ease-out absolute left-0 top-0`}
                            style={{ width: `${barWidth}%` }}
                          />
                          {/* Dark overlay = remaining tokens */}
                          <div 
                            className={`h-full ${c.dark} rounded-full transition-all duration-700 ease-out absolute left-0 top-0`}
                            style={{ width: `${barWidth * (remainingPct / 100)}%` }}
                          />
                        </div>
                        
                        {/* Labels below bar */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {tenant.consumed} consumed
                          </span>
                          <span className={`text-[10px] font-bold ${c.text}`}>
                            {remainingPct.toFixed(0)}% remaining
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Revenue Leaders */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Coins size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Revenue Leaders</h3>
                  <p className="text-xs text-slate-500 font-medium">Top contributors</p>
                </div>
              </div>

              {revenueByTenant.byTenant?.length === 0 ? (
                <div className="text-center py-12">
                  <Coins size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No revenue yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revenueByTenant.byTenant.slice(0, 6).map((tenant: any, i: number) => (
                    <div key={tenant.tenant_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                          i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm' :
                          i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm' :
                          i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{tenant.tenant_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{tenant.tokens} tokens</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-emerald-600">{formatRupiah(tenant.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ===== SECOND ROW ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* SBU Breakdown */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Package size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">SBU Breakdown</h3>
                  <p className="text-xs text-slate-500 font-medium">Work orders by type</p>
                </div>
              </div>

              {sbuBreakdown.bySbu?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No data</p>
              ) : (
                <div className="space-y-4">
                  {sbuBreakdown.bySbu.map((sbu: any, i: number) => {
                    const sbuColors = [
                      { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', icon: Truck },
                      { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: Package },
                      { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', bar: 'bg-purple-500', icon: Shield },
                      { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', bar: 'bg-amber-500', icon: FileText },
                    ];
                    const c = sbuColors[i % sbuColors.length];
                    const Icon = c.icon;
                    
                    return (
                      <div key={sbu.sbu_type} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className={c.text} />
                            <span className={`text-sm font-bold uppercase ${c.text}`}>{sbu.sbu_type}</span>
                          </div>
                          <span className={`text-xs font-bold ${c.text}`}>{sbu.completion_rate.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                            <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${sbu.completion_rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{sbu.total} WO</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Storage Monitor */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                    <HardDrive size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Storage Monitor</h3>
                    <p className="text-xs text-slate-500 font-medium">Files per tenant</p>
                  </div>
                </div>
                {storage.usagePercent > 80 && (
                  <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-bold animate-pulse">
                    <AlertTriangle size={12} className="inline mr-1" />
                    Warning
                  </Badge>
                )}
              </div>

              {/* Big Meter */}
              <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">SUPABASE FREE TIER</span>
                  <span className="text-sm font-black text-slate-900">{storage.totalFiles?.toLocaleString()} / 1,000</span>
                </div>
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${storage.usagePercent > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' : storage.usagePercent > 50 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`} style={{ width: `${Math.min(storage.usagePercent || 0, 100)}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {storage.usagePercent > 80 ? '⚠️ Approaching limit — consider upgrade' : storage.usagePercent > 50 ? 'Moderate usage — monitor closely' : '✅ Healthy storage usage'}
                </p>
              </div>

              <div className="space-y-2">
                {storage.byTenant?.filter((t: any) => t.files > 0).slice(0, 6).map((tenant: any, i: number) => (
                  <div key={tenant.tenant_id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">{tenant.tenant_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-600">{tenant.files}</span>
                      <span className="text-[10px] text-slate-500 font-medium">files</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Pending Top-Ups */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
                  <Clock size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pending Top-Ups</h3>
                  <p className="text-xs text-slate-500 font-medium">Needs approval</p>
                </div>
              </div>

              {pendingTopups.pending?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={48} className="text-emerald-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTopups.pending.slice(0, 6).map((req: any) => (
                    <div key={req.id} className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-900">{req.tenant_name}</span>
                        <span className="text-sm font-black text-rose-600">{formatRupiah(req.total_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">{req.tokens} tokens</span>
                        <div className="flex items-center gap-1">
                          <Timer size={12} className="text-rose-500" />
                          <span className="text-[10px] font-bold text-rose-600">{req.hours_pending}h pending</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ===== THIRD ROW ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Active Users */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Users size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active Users</h3>
                    <p className="text-xs text-slate-500 font-medium">For platform valuation</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  {activeUsers.totalUsers || 0} total
                </Badge>
              </div>

              <div className="space-y-3">
                {activeUsers.byTenant?.slice(0, 8).map((tenant: any, i: number) => (
                  <div key={tenant.tenant_id} className="p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                          <Building2 size={14} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{tenant.tenant_name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tenant.users?.slice(0, 4).map((user: any) => (
                              <span key={user.id} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                {user.name?.split(' ')[0] || 'User'}
                              </span>
                            ))}
                            {tenant.users?.length > 4 && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">+{tenant.users.length - 4}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">{tenant.count}</p>
                        <p className="text-[10px] text-slate-500 font-medium">users</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* New Tenants Growth */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/20">
                    <TrendingUp size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tenant Growth</h3>
                    <p className="text-xs text-slate-500 font-medium">Monthly onboarding</p>
                  </div>
                </div>
                <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs font-bold">
                  <ArrowUpRight size={12} className="inline mr-1" />
                  {newTenants.totalNew || 0} total
                </Badge>
              </div>

              {/* Bar Chart */}
              <div className="flex items-end gap-1.5 h-32 mb-4">
                {newTenants.monthly?.map((month: any) => {
                  const maxCount = Math.max(...newTenants.monthly.map((m: any) => m.count), 1);
                  const height = (month.count / maxCount) * 100;
                  return (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full flex justify-center">
                        {month.count > 0 && (
                          <div className="absolute -top-7 px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {month.count}
                          </div>
                        )}
                        <div className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${month.count > 0 ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300' : 'bg-slate-100'}`} style={{ height: `${Math.max(height, 4)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold truncate w-full text-center">{month.label.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Recent Tenants */}
              {newTenants.monthly?.some((m: any) => m.count > 0) && (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Recently Onboarded</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {newTenants.monthly.flatMap((m: any) => m.tenants).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4).map((tenant: any) => (
                      <div key={tenant.id} className="p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{tenant.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">
                          {new Date(tenant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-600 font-bold tracking-wider uppercase">System Online</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold tracking-wider">SENTRALOGIS COMMAND CENTER v3.0</span>
        </div>
      </div>
    </div>
  );
}
