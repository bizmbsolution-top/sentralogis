"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Briefcase,
  LayoutGrid,
  BarChart3,
  Calendar,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatThousand } from '../../../sbu/trucking/utils';

export default function HQFinanceSummaryPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    arAging: {
      current: 0,
      overdue30: 0,
      overdue60: 0,
      critical: 0
    },
    auditStatus: {
        total: 0,
        finished: 0,
        percentage: 0
    },
    unbilledRevenue: 0
  });

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    
    try {
      setLoading(true);

      const [joResult, wiResult, ecResult] = await Promise.all([
        supabase
          .from('job_orders')
          .select(`
              id, status, base_price, purchase_price, driver_share_percentage, driver_payment_amount,
              created_at, completed_at, is_cost_finished,
              wo_item:wo_items!wo_item_id (id, sbu_type, total_revenue, unit_price)
          `)
          .eq('tenant_id', profile.tenant_id),
        supabase
          .from('wo_items')
          .select('id, total_revenue, sbu_type')
          .eq('tenant_id', profile.tenant_id),
        supabase
          .from('extra_costs')
          .select('jo_id, amount')
          .in('status', ['approved', 'paid']),
      ]);

      const jos = joResult.data || [];
      const woItems = wiResult.data || [];
      const extraCosts = ecResult.data || [];
      const joError = joResult.error;

      if (joError) throw joError;

      // Pre-index extra costs by jo_id for fast lookup
      const extraCostsByJoId: Record<string, number> = {};
      for (const ec of extraCosts) {
        const joId = ec.jo_id;
        if (joId) {
          extraCostsByJoId[joId] = (extraCostsByJoId[joId] || 0) + (Number(ec.amount) || 0);
        }
      }

      const now = new Date();
      let rev = 0, cogs = 0, unbilled = 0;
      let auditTotal = 0, auditFinished = 0;
      const ar = { current: 0, overdue30: 0, overdue60: 0, critical: 0 };

      // Revenue from WO Items (authoritative source)
      rev = (woItems || []).reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);

      // Costs, audit, and AR aging from Job Orders
      const countedWoForUnbilled = new Set<string>();
      (jos || []).forEach(jo => {
          const cost = Number(jo.purchase_price) || 0;
          const driverCost = Number(jo.driver_payment_amount) || 0;
          // If no purchase_price (internal fleet), use driver cost
          const effectiveCogs = cost > 0 ? cost : driverCost;
          const val = Number(jo.base_price) || 0;
          
          // 1. Profitability (COGS only — revenue already from wo_items)
          cogs += effectiveCogs;
          // Add approved extra costs for this JO
          cogs += extraCostsByJoId[jo.id] || 0;

          // 2. Audit Status
          if (['completed', 'ready_for_billing', 'invoiced', 'paid'].includes(jo.status as string)) {
              auditTotal++;
              if (jo.is_cost_finished) auditFinished++;
          }

          // 3. Cash Flow / AR Aging (use wo_item revenue distribution)
          const wiId = jo.wo_item?.id;
          if (['completed', 'ready_for_billing', 'invoiced', 'paid'].includes(jo.status as string)) {
              if (jo.status === 'completed' && wiId && !countedWoForUnbilled.has(wiId)) {
                  countedWoForUnbilled.add(wiId);
                  unbilled += Number(jo.wo_item?.total_revenue) || val;
              }

              if (['invoiced', 'ready_for_billing'].includes(jo.status as string)) {
                  const compDate = jo.completed_at ? new Date(jo.completed_at) : new Date(jo.created_at);
                  const diffDays = Math.floor((now.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24));
                  const arVal = Number(jo.wo_item?.total_revenue) || val;
                  
                  if (diffDays <= 30) ar.current += arVal;
                  else if (diffDays <= 60) ar.overdue30 += arVal;
                  else if (diffDays <= 90) ar.overdue60 += arVal;
                  else ar.critical += arVal;
              }
          }
      });

      const gp = rev - cogs;
      const gm = rev > 0 ? (gp / rev) * 100 : 0;

      setStats({
          totalRevenue: rev,
          totalCogs: cogs,
          grossProfit: gp,
          grossMargin: Math.round(gm * 10) / 10,
          arAging: ar,
          auditStatus: {
              total: auditTotal,
              finished: auditFinished,
              percentage: auditTotal > 0 ? Math.round((auditFinished / auditTotal) * 100) : 0
          },
          unbilledRevenue: unbilled
      });

    } catch (err) {
      console.error("Finance Summary Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-xs text-slate-400">Loading dashboard...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Finance Dashboard</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Finance</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                   <Wallet size={18} />
                </div>
                <div>
                   <p className="text-[10px] font-medium text-slate-400 uppercase">P&L Margin</p>
                   <p className="text-sm font-semibold text-emerald-600">{stats.grossMargin}%</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Profitability Cards */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                <p className="text-xs text-slate-400 mb-2">Gross Revenue</p>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Rp {formatThousand(stats.totalRevenue)}</h2>
                <div className="flex items-center gap-1.5">
                    <ArrowUpCircle className="text-emerald-500" size={12} />
                    <span className="text-xs text-slate-400">Aggregate inflow</span>
                </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                <p className="text-xs text-slate-400 mb-2">Total COGS</p>
                <h2 className="text-lg font-semibold text-rose-600 mb-3">Rp {formatThousand(stats.totalCogs)}</h2>
                <div className="flex items-center gap-1.5">
                    <ArrowDownCircle className="text-rose-500" size={12} />
                    <span className="text-xs text-slate-400">Consolidated outflow</span>
                </div>
            </div>

            <div className="p-5 bg-emerald-600 text-white rounded-xl">
                <p className="text-xs text-emerald-100 mb-2">Gross Profit</p>
                <h2 className="text-lg font-semibold mb-3">Rp {formatThousand(stats.grossProfit)}</h2>
                <p className="text-xs text-emerald-100 opacity-70">Retained earnings</p>
            </div>

            <div className="p-5 bg-white border border-emerald-200 shadow-sm rounded-xl">
                <p className="text-xs text-emerald-600 mb-2">Operational Margin</p>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">{stats.grossMargin}%</h2>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs text-slate-400">Efficiency status</span>
                </div>
            </div>
        </div>

        {/* AR Aging & Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Accounts Receivable</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Aging matrix & liquidity</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-medium text-slate-400 uppercase">Unbilled</p>
                        <p className="text-sm font-semibold text-amber-600">Rp {formatThousand(stats.unbilledRevenue)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Current (0-30)', value: stats.arAging.current, color: 'emerald', desc: 'Secure' },
                        { label: 'Overdue (31-60)', value: stats.arAging.overdue30, color: 'amber', desc: 'Follow-up' },
                        { label: 'Overdue (61-90)', value: stats.arAging.overdue60, color: 'rose', desc: 'Risk' },
                        { label: 'Critical (>90)', value: stats.arAging.critical, color: 'red', desc: 'Bad debt' },
                    ].map((m, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-medium text-slate-400 mb-2">{m.label}</p>
                            <h3 className={`text-sm font-semibold text-${m.color}-600 mb-2`}>Rp {formatThousand(m.value)}</h3>
                            <div className="h-1 w-full bg-slate-200 rounded-full mb-2 overflow-hidden">
                                <div className={`h-full bg-${m.color}-500 transition-all duration-1000`} style={{ width: `${stats.totalRevenue > 0 ? (m.value / stats.totalRevenue) * 100 : 0}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400">{m.desc}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><PieChart size={16}/></div>
                   <h3 className="text-sm font-semibold text-slate-900">Cost Audit</h3>
                </div>
                
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between items-end mb-2">
                         <p className="text-xs text-slate-400">Audit Progress</p>
                         <p className="text-lg font-semibold text-emerald-600">{stats.auditStatus.percentage}%</p>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.auditStatus.percentage}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{stats.auditStatus.finished} of {stats.auditStatus.total} jobs</p>
                   </div>

                   <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Accounting Sync</span>
                          <span className="text-emerald-600 font-medium">Stable</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">VAT Compliance</span>
                          <span className="text-emerald-600 font-medium">Verified</span>
                       </div>
                   </div>
                </div>
            </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/hq/finance/cost-audit" className="group">
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><LayoutGrid size={16}/></div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-900">Cost Audit Center</h4>
                            <p className="text-xs text-slate-400">Review vendor invoices</p>
                        </div>
                    </div>
                </div>
            </Link>
            <Link href="/hq/invoice-customer" className="group">
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><BarChart3 size={16}/></div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-900">Customer Invoicing</h4>
                            <p className="text-xs text-slate-400">Manage receivables</p>
                        </div>
                    </div>
                </div>
            </Link>
            <Link href="/hq/finance/coa" className="group">
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all"><Briefcase size={16}/></div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-900">Master COA</h4>
                            <p className="text-xs text-slate-400">Account structure</p>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
}
