'use client';

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  Target, AlertTriangle, ShieldCheck, ArrowRight,
  Loader2, Filter, Calendar, RefreshCcw, Briefcase
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DirectorFinanceDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch completed/active JOs with all financial related data
      const { data: joData, error } = await supabase
        .from('job_orders')
        .select(`
          id, 
          jo_number, 
          status, 
          purchase_price,
          wo_item:wo_items(
            item_data,
            wo:work_orders(
              customer:md_entities(name)
            )
          ),
          costs:extra_costs(
            amount, 
            status, 
            charge_type, 
            paid_by_sbu
          )
        `)
        .not('status', 'eq', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(joData || []);
    } catch (err: any) {
      toast.error("Failed to synchronize P&L: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    
    const joMetrics = data.map(group => {
      const dealPrice = Number(group.wo_item?.item_data?.deal_price || 0);
      const approvedSurcharges = group.costs?.reduce((sum: number, c: any) => 
        sum + (c.status === 'approved' && c.charge_type === 'surcharge' ? Number(c.amount) : 0), 0
      ) || 0;
      const revenue = dealPrice + approvedSurcharges;

      const purchasePrice = Number(group.purchase_price || 0);
      const approvedExtraCosts = group.costs?.reduce((sum: number, c: any) => 
        sum + ((c.status === 'approved' || c.status === 'rejected_as_cogs') && (c.paid_by_sbu || c.charge_type === 'reimbursement') ? Number(c.amount) : 0), 0
      ) || 0;
      const cogs = purchasePrice + approvedExtraCosts;

      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      totalRevenue += revenue;
      totalCogs += cogs;

      return {
        jo_number: group.jo_number,
        customer: group.wo_item?.wo?.customer?.name || '---',
        revenue,
        cogs,
        profit,
        margin
      };
    });

    const netProfit = totalRevenue - totalCogs;
    const avgMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      netProfit,
      avgMargin,
      joMetrics: joMetrics.sort((a, b) => b.margin - a.margin)
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-2">
      <Toaster position="top-right" />
      
      {/* 🌌 HEADER COMMAND */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-1 bg-blue-600 rounded-full" />
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">Board of Directors Terminal</p>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 italic tracking-tight uppercase leading-none">Finance <span className="text-blue-600">P&L Overview</span></h1>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100">
           <button onClick={fetchData} className="w-14 h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 transition-all active:scale-90">
             <RefreshCcw size={20} />
           </button>
           <div className="h-10 w-[1px] bg-slate-100" />
           <div className="px-6 flex items-center gap-3">
             <Calendar size={18} className="text-blue-500" />
             <span className="text-xs font-black uppercase tracking-widest text-slate-900">Live: All Time</span>
           </div>
        </div>
      </div>

      {/* 📊 CORE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard 
          label="Gross Revenue" 
          value={formatRupiah(stats.totalRevenue)} 
          icon={<DollarSign size={24} />} 
          color="blue"
          description="Total Invoice Potential"
        />
        <MetricCard 
          label="Total COGS" 
          value={formatRupiah(stats.totalCogs)} 
          icon={<Briefcase size={24} />} 
          color="slate"
          description="Vendor & SBU Direct Costs"
        />
        <MetricCard 
          label="Net Gross Profit" 
          value={formatRupiah(stats.netProfit)} 
          icon={<TrendingUp size={24} />} 
          color={stats.netProfit >= 0 ? "emerald" : "rose"}
          description="Earnings before OpEx"
        />
        <MetricCard 
          label="Average Margin" 
          value={`${stats.avgMargin.toFixed(1)}%`} 
          icon={<PieChart size={24} />} 
          color={stats.avgMargin >= 15 ? "emerald" : stats.avgMargin >= 10 ? "amber" : "rose"}
          description="Profitability Health Score"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 🏆 PERFORMANCE LIST */}
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <Target size={14} className="text-blue-500" /> Bottom Margin Performers (Risk List)
              </p>
           </div>
           
           <div className="space-y-4">
             {stats.joMetrics.slice(-5).reverse().map((jo: any) => (
               <PerformanceCard key={jo.jo_number} jo={jo} />
             ))}
           </div>

           <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <TrendingUp size={14} className="text-emerald-500" /> Top Margin Performers
              </p>
           </div>
           
           <div className="space-y-4">
             {stats.joMetrics.slice(0, 5).map((jo: any) => (
               <PerformanceCard key={jo.jo_number} jo={jo} />
             ))}
           </div>
        </div>

        {/* 🛡️ STRATEGIC SUMMARY */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden border-none text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px]" />
              <ShieldCheck className="w-16 h-16 text-blue-500 mb-8" />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Financial <br/>Guardrail</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Rata-rata margin saat ini berada di angka <span className="text-white font-bold">{stats.avgMargin.toFixed(1)}%</span>. 
                Unit bisnis disarankan menjaga ambang batas minimum 15% untuk menjamin keberlanjutan operasional.
              </p>
              <div className="space-y-6">
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Target Achievement</span>
                  <span className="text-blue-400">82%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[82%] bg-blue-500" />
                </div>
              </div>
           </Card>

           <Card className="rounded-[3rem] p-10 border-slate-100 shadow-xl bg-white border">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" /> Critical Alerts
              </h4>
              <div className="space-y-6">
                {stats.joMetrics.filter(j => j.margin < 5).length > 0 ? (
                  <div className="flex gap-4">
                    <div className="w-1.5 h-12 bg-rose-500 rounded-full" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-slate-900">{stats.joMetrics.filter(j => j.margin < 5).length} Jobs under 5% Margin</p>
                      <p className="text-[10px] text-slate-500 mt-1">Sangat berisiko merugi setelah biaya OpEx.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No critical margin alerts detected.</p>
                )}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, description }: any) {
  const colorMap: any = {
    blue: "from-blue-600 to-indigo-600 shadow-blue-500/20",
    emerald: "from-emerald-600 to-teal-600 shadow-emerald-500/20",
    rose: "from-rose-600 to-pink-600 shadow-rose-500/20",
    slate: "from-slate-800 to-slate-900 shadow-slate-900/20",
    amber: "from-amber-600 to-orange-600 shadow-amber-500/20"
  };

  const bgMap: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-50 text-slate-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-xl group hover:scale-105 transition-all duration-500">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${bgMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-2">{value}</h3>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">{description}</p>
      </div>
    </Card>
  );
}

function PerformanceCard({ jo }: { jo: any }) {
  const isHealthy = jo.margin >= 15;
  const isWarning = jo.margin >= 5 && jo.margin < 15;
  
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 hover:border-blue-100 hover:shadow-xl transition-all flex items-center justify-between group">
      <div className="flex items-center gap-6">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black italic tracking-tighter ${
          isHealthy ? 'bg-emerald-50 text-emerald-600' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
        }`}>
          <span className="text-lg leading-none">{jo.margin.toFixed(0)}</span>
          <span className="text-[8px] uppercase tracking-widest">%</span>
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{jo.jo_number}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{jo.customer}</p>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="text-right hidden md:block">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Profit</p>
          <p className={`text-sm font-black italic tracking-tight ${isHealthy ? 'text-emerald-500' : 'text-slate-900'}`}>{formatRupiah(jo.profit)}</p>
        </div>
        <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-2 transition-all" size={20} />
      </div>
    </div>
  );
}

