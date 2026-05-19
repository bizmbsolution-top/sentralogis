"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { 
    TrendingUp, 
    TrendingDown,
    Target, 
    Briefcase, 
    BarChart3, 
    ArrowUpRight, 
    DollarSign,
    Activity,
    Globe,
    Zap,
    Crown,
    ArrowRight,
    Layers,
    LayoutGrid,
    Ship
} from "lucide-react";
import { formatThousand } from "../../sbu/trucking/utils";
import Link from "next/link";
import { SentralogisLogo } from "@/components/brand/SentralogisLogo";

export default function HQBusinessDashboard() {
    const supabase = createClient();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        currentMonthRevenue: 0,
        lastMonthRevenue: 0,
        variance: 0,
        activeProjects: 0,
        grossMargin: 72.4,
        groupVolume: 0
    });
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [sbuPerformance, setSbuPerformance] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        // [AI] ensure we have tenant_id from profile
        const tenantId = profile?.tenant_id;
        if (!tenantId) {
            console.warn("HQ Business: No tenant_id found in profile");
            return;
        }
        
        try {
            setLoading(true);

            // 1. Fetch Consolidated Job Orders with SBU info
            // [AI] relationship path: job_orders -> wo_items (as wo_item)
            const { data: jos, error: joError } = await supabase
                .from('job_orders')
                .select(`
                    id, base_price, created_at, status,
                    wo_item:wo_items!wo_item_id (
                        sbu_type,
                        wo:work_orders!wo_id (
                            customer:md_entities!customer_id (name)
                        )
                    )
                `)
                .eq('tenant_id', tenantId);

            if (joError) {
                console.error("Supabase JO Error:", joError);
                throw joError;
            }

            // 2. Process Monthly Metrics
            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

            const currentMonthJos = (jos || []).filter(j => new Date(j.created_at) >= startOfCurrentMonth);
            const lastMonthJos = (jos || []).filter(j => {
                const d = new Date(j.created_at);
                return d >= startOfLastMonth && d <= endOfLastMonth;
            });

            const currentRev = currentMonthJos.reduce((acc, curr) => acc + (Number(curr.base_price) || 0), 0);
            const lastRev = lastMonthJos.reduce((acc, curr) => acc + (Number(curr.base_price) || 0), 0);
            const variance = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 0;

            // 3. Group by SBU (from wo_item.sbu_type)
            const sbuMap = new Map();
            (jos || []).forEach(jo => {
                const sbuType = (jo as any).wo_item?.sbu_type || "OTHER";
                
                if (!sbuMap.has(sbuType)) {
                    sbuMap.set(sbuType, { 
                        name: sbuType, 
                        currentRev: 0, 
                        lastRev: 0, 
                        history: new Map(),
                        color: 'blue'
                    });
                }
                
                const sbuData = sbuMap.get(sbuType);
                const joDate = new Date(jo.created_at);
                const joRev = Number(jo.base_price) || 0;

                if (joDate >= startOfCurrentMonth) sbuData.currentRev += joRev;
                if (joDate >= startOfLastMonth && joDate <= endOfLastMonth) sbuData.lastRev += joRev;

                const monthKey = joDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                sbuData.history.set(monthKey, (sbuData.history.get(monthKey) || 0) + joRev);
            });

            // Format SBU Performance for UI
            const colors = ['blue', 'emerald', 'amber', 'rose', 'indigo'];
            const formattedSBU = Array.from(sbuMap.values()).map((sbu, idx) => {
                const last6Months = [];
                for(let i=5; i>=0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const m = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                    last6Months.push({ m, v: sbu.history.get(m) || 0 });
                }

                return {
                    name: sbu.name === 'TRUCKING' ? 'TRUCKING UNIT' : sbu.name,
                    currentRev: sbu.currentRev,
                    lastRev: sbu.lastRev,
                    margin: 32, 
                    color: colors[idx % colors.length],
                    history: last6Months
                };
            }).sort((a, b) => b.currentRev - a.currentRev);

            // 4. Top Customers
            const customerMap = new Map();
            (jos || []).forEach(jo => {
                const custName = (jo as any).wo_item?.wo?.customer?.name || "Unknown Customer";
                customerMap.set(custName, (customerMap.get(custName) || 0) + (Number(jo.base_price) || 0));
            });

            const formattedCustomers = Array.from(customerMap.entries())
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // 5. Global Trend (Combined)
            const trendMap = new Map();
            for(let i=5; i>=0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const m = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                trendMap.set(m, 0);
            }

            (jos || []).forEach(jo => {
                const joDate = new Date(jo.created_at);
                const m = joDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                if (trendMap.has(m)) {
                    trendMap.set(m, trendMap.get(m) + (Number(jo.base_price) || 0));
                }
            });

            setStats({
                currentMonthRevenue: currentRev,
                lastMonthRevenue: lastRev,
                variance: variance,
                activeProjects: (jos || []).filter(j => j.status === 'active' || j.status === 'pending').length,
                grossMargin: 72.4, 
                groupVolume: (jos || []).length
            });

            setTopCustomers(formattedCustomers);
            setSbuPerformance(formattedSBU.length > 0 ? formattedSBU : []);
            setMonthlyData(Array.from(trendMap.entries()).map(([month, val]) => ({ month, val })));

        } catch (err: any) {
            console.error("HQ Business Real Fetch Error:", err?.message || err);
        } finally {
            setLoading(false);
        }
    }, [supabase, profile]);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile, fetchData]);

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A]">
                <SentralogisLogo size={120} animate className="mb-10" />
                <h2 className="text-xl font-black text-white tracking-[0.4em] uppercase italic">Consolidating Group Matrix</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans selection:bg-blue-500 selection:text-white">
            {/* Glossy Header */}
            <div className="relative border-b border-white/5 bg-slate-900/50 backdrop-blur-xl px-8 py-8 sticky top-0 z-30">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none"></div>
                <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] group">
                            <SentralogisLogo size={40} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="w-8 h-[2px] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em]">Executive Strategy Matrix</p>
                            </div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Director <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Console</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shadow-inner"><Globe size={20} /></div>
                            <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Global Status</p>
                                <p className="text-xs font-black text-emerald-400 uppercase italic tracking-tighter flex items-center gap-2">
                                   <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span> Live Matrix Synced
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1800px] mx-auto space-y-10">
                {/* Midnight KPI Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white"><DollarSign size={80} /></div>
                        <div className="relative z-10">
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic">Group Revenue (All SBU)</p>
                            <h2 className="text-3xl font-black text-white tracking-tighter leading-none mb-6">Rp {formatThousand(stats.currentMonthRevenue)}</h2>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 ${stats.variance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} text-[9px] font-black rounded-lg uppercase flex items-center gap-1.5 border border-white/10 shadow-md`}>
                                    {stats.variance >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(stats.variance).toFixed(1)}%
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">vs Last Month</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900 border border-blue-500/10 shadow-xl rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 text-blue-500"><Zap size={80} /></div>
                        <div className="relative z-10">
                            <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic">Group Avg Margin</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-6">{stats.grossMargin}%</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Consolidated Efficiency</p>
                        </div>
                    </div>

                    <div className="p-6 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white"><Activity size={80} /></div>
                        <div className="relative z-10">
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic">Consolidated Projects</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-6">{stats.activeProjects}</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Total Live Work Orders</p>
                        </div>
                    </div>

                    <div className="p-6 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white"><Layers size={80} /></div>
                        <div className="relative z-10">
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic">Transaction Volume</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-6">{stats.groupVolume}</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Total Operations (YTD)</p>
                        </div>
                    </div>
                </div>

                {/* SBU Strategic Performance Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight italic">SBU COMPARATIVE ANALYSIS</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-[0.3em]">Multi-Unit Performance Comparison</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {sbuPerformance.map((sbu, idx) => {
                            const sbuVariance = sbu.lastRev > 0 ? ((sbu.currentRev - sbu.lastRev) / sbu.lastRev) * 100 : 0;
                            return (
                                <div key={idx} className="p-6 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                                    <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                                        <Activity size={120} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`w-10 h-10 bg-${sbu.color}-500/10 text-${sbu.color}-400 rounded-xl flex items-center justify-center border border-${sbu.color}-500/20 shadow-md`}>
                                                {idx === 0 ? <Truck size={20} /> : idx === 1 ? <Box size={20} /> : <Ship size={20} />}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-3 py-1 ${sbuVariance >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'} text-[9px] font-black rounded-lg uppercase border flex items-center gap-1.5`}>
                                                    {sbuVariance >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(sbuVariance).toFixed(1)}%
                                                </span>
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">MoM Growth</span>
                                            </div>
                                        </div>
                                        
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{sbu.name}</h4>
                                        <div className="flex items-baseline gap-2 mb-6">
                                            <h2 className="text-2xl font-black text-white tracking-tighter italic">Rp {formatThousand(sbu.currentRev)}</h2>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">/ THIS MONTH</span>
                                        </div>
                                        
                                        {/* Mini Comparison Chart with Legend */}
                                        <div className="mb-6 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                            <div className="h-20 flex items-end justify-between gap-2 px-1">
                                                {sbu.history.map((h: any, hIdx: number) => {
                                                    const maxVal = Math.max(...sbu.history.map((x: any) => x.v)) || 1;
                                                    const height = (h.v / maxVal) * 100;
                                                    return (
                                                        <div key={hIdx} className="flex-1 flex flex-col items-center gap-3 group/bar">
                                                            <div className="w-full relative">
                                                                <div 
                                                                    className={`w-full rounded-t-lg transition-all duration-700 ${hIdx === 5 ? `bg-${sbu.color}-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]` : 'bg-white/10 group-hover/bar:bg-white/20'}`}
                                                                    style={{ height: `${height}%`, minHeight: '4px' }}
                                                                />
                                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                                    {h.m}: {Math.round(h.v / 1000000)}M
                                                                </div>
                                                            </div>
                                                            <span className={`text-[8px] font-black uppercase tracking-tighter ${hIdx === 5 ? `text-${sbu.color}-400` : 'text-slate-600'}`}>{h.m}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-500 italic">Historical Context</span>
                                                <span className="text-white">Last Month: Rp {formatThousand(Math.round(sbu.lastRev / 1000000))}M</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full p-[2px]">
                                                <div 
                                                    className={`h-full bg-slate-700 rounded-full`}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Dark Growth Chart */}
                    <div className="lg:col-span-2 p-8 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic">GLOBAL REVENUE VELOCITY</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-[0.3em]">Aggregate Monthly Performance Matrix</p>
                                </div>
                            </div>

                            <div className="h-64 flex items-end justify-between gap-6 px-4">
                                {monthlyData.map((d, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-4 group cursor-pointer">
                                        <div className="w-full relative">
                                            <div className="w-full bg-white/5 rounded-[1rem] h-[200px]" />
                                            <div 
                                                className={`absolute bottom-0 w-full transition-all duration-1000 delay-${idx*100} rounded-[1rem] ${idx === monthlyData.length - 1 ? 'bg-gradient-to-t from-blue-700 to-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-700 group-hover:bg-slate-600'}`} 
                                                style={{ height: `${(d.val / (Math.max(...monthlyData.map(x=>x.val)) || 1)) * 100}%`, minHeight: '10px' }} 
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-black px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                   {Math.round(d.val / 1000000)}M
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">{d.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Premium Key Accounts */}
                    <div className="p-8 bg-[#1E293B] border border-white/5 shadow-xl rounded-[2.5rem] flex flex-col relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full -mb-24 -mr-24 blur-[60px]"></div>
                        <div className="mb-8 relative z-10">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight italic">KEY ACCOUNT MATRIX</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-[0.3em]">Top Tier Revenue Streams</p>
                        </div>
                        
                        <div className="flex-1 space-y-8 relative z-10">
                            {topCustomers.map((cust, idx) => (
                                <div key={idx} className="group/item cursor-pointer">
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="flex items-center gap-5">
                                            <span className="text-[11px] font-black text-blue-500 opacity-40">0{idx+1}</span>
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[140px] group-hover/item:text-blue-400 transition-colors">{cust.name}</h4>
                                        </div>
                                        <span className="text-sm font-black text-white/80 tabular-nums">Rp {formatThousand(cust.revenue)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[2px]">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full group-hover/item:from-blue-500 group-hover/item:to-cyan-400 transition-all duration-1000"
                                            style={{ width: `${(cust.revenue / (topCustomers[0]?.revenue || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link href="/hq/customers" className="relative z-10">
                            <button className="mt-8 w-full py-4 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                                Strategic Insights <ArrowRight size={14} />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple icons for SBU types
function Truck({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>; }
function Box({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>; }
