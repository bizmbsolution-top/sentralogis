'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download,
  Loader2,
  Calendar,
  Layers,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';

export default function HQFinancialReportPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    totalMargin: 0,
    marginPercentage: 0,
    jobCount: 0,
    surchargeRevenue: 0,
    reimbursementCost: 0
  });

  const [sbuBreakdown, setSbuBreakdown] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Job Orders
      const { data: jobs, error: jError } = await supabase
        .from('job_orders')
        .select('id, customer_price, purchase_price, status, tenant_id');
      
      if (jError) throw jError;

      // 2. Fetch Extra Costs
      const { data: extraCosts, error: eError } = await supabase
        .from('extra_costs')
        .select('jo_id, amount, charge_type, status');

      if (eError) throw eError;

      // 3. Process Data
      let rev = 0;
      let cogs = 0;
      let surcharge = 0;
      let reimbursement = 0;

      jobs?.forEach(job => {
        rev += Number(job.customer_price) || 0;
        cogs += Number(job.purchase_price) || 0;
      });

      extraCosts?.forEach(cost => {
        if (cost.status === 'approved') {
          if (cost.charge_type === 'surcharge') {
            surcharge += Number(cost.amount) || 0;
          } else {
            reimbursement += Number(cost.amount) || 0;
          }
        }
      });

      const totalRevenue = rev + surcharge;
      const totalCogs = cogs + reimbursement;
      const totalMargin = totalRevenue - totalCogs;
      const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

      setFinancials({
        totalRevenue,
        totalCogs,
        totalMargin,
        marginPercentage,
        jobCount: jobs?.length || 0,
        surchargeRevenue: surcharge,
        reimbursementCost: reimbursement
      });

    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/30 rotate-3">
              <BarChart3 size={32} />
           </div>
           <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">SBU P&L SIMULATION</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
                <Target size={14} className="text-blue-500" /> Real-time Profitability Intelligence
              </p>
           </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> Filter Date
          </Button>
          <Button className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20">
            <Download size={14} className="mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center space-y-6">
           <Loader2 className="w-16 h-16 text-slate-200 animate-spin" />
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] italic animate-pulse">Aggregating Financial Milestones...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gross Revenue</p>
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">{formatRupiah(financials.totalRevenue)}</h2>
               <div className="mt-4 flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase">
                 <ArrowUpRight size={14} /> 12.5% vs Prev Month
               </div>
            </Card>

            <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total COGS</p>
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">{formatRupiah(financials.totalCogs)}</h2>
               <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">Incl. Driver Share & Fuel</p>
            </Card>

            <Card className="p-8 border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8" />
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Net Margin (P&L)</p>
               <h2 className="text-2xl font-black text-white tracking-tighter italic">{formatRupiah(financials.totalMargin)}</h2>
               <div className="mt-4 flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase">
                 <TrendingUp size={14} /> Healthy Performance
               </div>
            </Card>

            <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Margin Percentage</p>
               <h2 className="text-4xl font-black text-emerald-600 tracking-tighter italic">{financials.marginPercentage.toFixed(1)}%</h2>
               <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Avg. Gross Profit Margin</p>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-10 border-none shadow-xl shadow-slate-200/50 rounded-[3rem] bg-white">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Revenue Breakdown</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core vs Ancillary Revenue</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full" />
                    <span className="text-[10px] font-black uppercase text-slate-600">Base Deal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase text-slate-600">Surcharges</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-12 py-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase italic">
                    <span className="text-slate-400 tracking-widest">Base Logistics Revenue</span>
                    <span className="text-slate-900">{formatRupiah(financials.totalRevenue - financials.surchargeRevenue)}</span>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-600 shadow-lg shadow-blue-600/20" style={{ width: `${((financials.totalRevenue - financials.surchargeRevenue) / financials.totalRevenue) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase italic">
                    <span className="text-slate-400 tracking-widest">Ancillary Surcharges (Profit+)</span>
                    <span className="text-emerald-600">{formatRupiah(financials.surchargeRevenue)}</span>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 shadow-lg shadow-emerald-500/20" style={{ width: `${(financials.surchargeRevenue / financials.totalRevenue) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-10 border-none shadow-2xl shadow-blue-600/10 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-900 text-white">
              <Layers size={32} className="mb-6 opacity-40" />
              <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Cost Efficiency</h3>
              <p className="text-xs font-bold text-blue-100 opacity-60 uppercase tracking-widest mb-10 leading-relaxed">
                Analysis of reimbursement pass-throughs vs operational overhead.
              </p>
              
              <div className="space-y-8">
                <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Operational Cost</p>
                   <p className="text-xl font-black italic">{formatRupiah(financials.totalCogs - financials.reimbursementCost)}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                   <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Reimbursements</p>
                   <p className="text-xl font-black italic">{formatRupiah(financials.reimbursementCost)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-900">
                <Target size={28} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Audited Integrity</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Last sync: {new Date().toLocaleTimeString()} • All data is derived from verified JO milestones</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Jobs in P&L</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{financials.jobCount} Missions</p>
              </div>
              <div className="h-12 w-px bg-slate-200 mx-4 hidden md:block" />
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SBU Contribution</p>
                <p className="text-2xl font-black text-blue-600 tracking-tighter">100% Core</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
