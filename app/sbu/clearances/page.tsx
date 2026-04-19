"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
    FileText, ShieldCheck, Target, Clock, Activity, 
    Search, RefreshCw, LayoutGrid, CheckCircle2, 
    AlertCircle, FilePlus2, ArrowRight, Save, 
    ChevronDown, ChevronUp, MapPin, Building2,
    CheckCircle, XCircle, Loader2, Filter, LogOut
} from "lucide-react";

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type ClearanceItem = {
    id: string;
    work_order_id: string;
    sbu_type: string;
    sbu_metadata: {
        doc_code?: string;
        lane?: string;
        aju_number?: string;
        status_clearance?: string;
    };
    deal_price: number;
    notes?: string;
    created_at: string;
    work_orders: {
        id: string;
        wo_number: string;
        order_date: string;
        status: string;
        customers: {
            id: string;
            name: string;
            company_name: string;
        };
    };
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function SBUClearancesPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<ClearanceItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [stats, setStats] = useState({
        total: 0,
        green_lane: 0,
        red_lane: 0,
        pending_aju: 0,
        completed: 0
    });

    // =====================================================
    // FETCH DATA
    // =====================================================
    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const { data, error } = await supabase
                .from("work_order_items")
                .select(`
                    *,
                    work_orders!inner (
                        id, wo_number, order_date, status,
                        customers (id, name, company_name)
                    )
                `)
                .eq("sbu_type", "clearances")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const clearanceItems = data || [];
            setItems(clearanceItems);

            // Calculate stats
            const newStats = {
                total: clearanceItems.length,
                green_lane: clearanceItems.filter(i => i.sbu_metadata?.lane === 'Hijau').length,
                red_lane: clearanceItems.filter(i => i.sbu_metadata?.lane === 'Merah').length,
                pending_aju: clearanceItems.filter(i => !i.sbu_metadata?.aju_number).length,
                completed: clearanceItems.filter(i => i.sbu_metadata?.status_clearance === 'SPPB Issued').length
            };
            setStats(newStats);

        } catch (err: any) {
            console.error("Fetch error:", err);
            toast.error("Gagal mengambil data: " + err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // =====================================================
    // HANDLERS
    // =====================================================
    const updateClearanceMetadata = async (itemId: string, metadata: any) => {
        try {
            const { error } = await supabase
                .from("work_order_items")
                .update({ sbu_metadata: metadata })
                .eq("id", itemId);

            if (error) throw error;
            toast.success("Data diperbarui!");
            fetchData();
        } catch (err: any) {
            toast.error("Gagal update: " + err.message);
        }
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = "/";
        } catch (error: any) {
            toast.error("Logout gagal: " + error.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        </div>
    );

    const filteredItems = items.filter(i => {
        const matchesSearch = 
            i.work_orders?.wo_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.work_orders?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.sbu_metadata?.aju_number?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeFilter === 'all') return matchesSearch;
        if (activeFilter === 'red') return matchesSearch && i.sbu_metadata?.lane === 'Merah';
        if (activeFilter === 'green') return matchesSearch && i.sbu_metadata?.lane === 'Hijau';
        if (activeFilter === 'pending') return matchesSearch && !i.sbu_metadata?.aju_number;
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans pb-32">
            <Toaster position="top-center" />

            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/5 p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform -rotate-6">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">CLEARANCE CENTER</h1>
                            <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase opacity-60">Customs & Regulatory Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchData}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all border border-white/10"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 group"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                
                {/* STATS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total的任务</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.total}</h3>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Jalur Hijau</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.green_lane}</h3>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(stats.green_lane/stats.total || 0) * 100}%` }} />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">Jalur Merah</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.red_lane}</h3>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${(stats.red_lane/stats.total || 0) * 100}%` }} />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Pending Aju</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.pending_aju}</h3>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${(stats.pending_aju/stats.total || 0) * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* SEARCH & FILTERS */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari No. WO, Customer, atau No. Aju..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all placeholder:text-slate-700 text-white shadow-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { id: 'all', label: 'SEMUA', icon: LayoutGrid },
                            { id: 'green', label: 'HIJAU', icon: ShieldCheck },
                            { id: 'red', label: 'MERAH', icon: AlertCircle },
                            { id: 'pending', label: 'NO AJU', icon: Clock },
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-3 ${activeFilter === f.id ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                            >
                                <f.icon className="w-4 h-4" />
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-[#151f32]/60 border border-white/5 hover:border-blue-500/30 rounded-[2.5rem] transition-all p-8 group shadow-2xl overflow-hidden relative">
                            {/* Accent line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.sbu_metadata?.lane === 'Merah' ? 'bg-red-500' : item.sbu_metadata?.lane === 'Hijau' ? 'bg-emerald-500' : 'bg-blue-500/30'}`} />
                            
                            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                {/* WO & CUSTOMER */}
                                <div className="w-full lg:w-72 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg tracking-tighter italic">{item.work_orders?.wo_number}</span>
                                        <span className="text-[11px] font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase truncate tracking-tight">{item.work_orders?.customers?.company_name}</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                        <Building2 className="w-4 h-4" />
                                        {item.work_orders?.customers?.name}
                                    </div>
                                </div>

                                {/* CLEARANCE STATUS */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-blue-500/5 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Doc Code</p>
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                            <span className="text-sm font-black text-white italic">{item.sbu_metadata?.doc_code || "-"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-blue-500/5 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Jalur</p>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${item.sbu_metadata?.lane === 'Merah' ? 'bg-red-500' : item.sbu_metadata?.lane === 'Hijau' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                            <span className={`text-sm font-black italic ${item.sbu_metadata?.lane === 'Merah' ? 'text-red-400' : item.sbu_metadata?.lane === 'Hijau' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                {item.sbu_metadata?.lane || "TBA"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-blue-500/5 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">No. Aju</p>
                                        <div className="flex items-center gap-3">
                                            <Target className="w-5 h-5 text-amber-500/50" />
                                            <span className="text-sm font-black text-white tracking-widest">{item.sbu_metadata?.aju_number || "-"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-blue-500/5 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Clearance Progress</p>
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-5 h-5 text-emerald-500/50" />
                                            <span className="text-sm font-black text-emerald-400 italic">{item.sbu_metadata?.status_clearance || "Pending"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex items-center gap-3 ml-auto">
                                    <button 
                                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                        className={`p-5 rounded-2xl border transition-all shadow-xl ${expandedId === item.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                                    >
                                        {expandedId === item.id ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>

                            {/* EXPANDED EDIT FORM */}
                            {expandedId === item.id && (
                                <div className="mt-8 pt-8 border-t border-white/5 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Nomor Aju (Customs)</label>
                                            <input 
                                                type="text"
                                                defaultValue={item.sbu_metadata?.aju_number}
                                                onBlur={(e) => updateClearanceMetadata(item.id, { ...item.sbu_metadata, aju_number: e.target.value })}
                                                placeholder="Input No. Aju..."
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Transport & Route</label>
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-white/5 p-2 rounded-lg border border-white/5">
                                                        <p className="text-[8px] text-slate-500 uppercase font-black">Carrier</p>
                                                        <p className="text-[10px] text-white font-bold">{item.sbu_metadata?.carrier || "-"}</p>
                                                    </div>
                                                    <div className="flex-1 bg-white/5 p-2 rounded-lg border border-white/5">
                                                        <p className="text-[8px] text-slate-500 uppercase font-black">POL</p>
                                                        <p className="text-[10px] text-white font-bold">{item.sbu_metadata?.pol || "-"}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <p className="text-[8px] text-slate-500 uppercase font-black">ETA / ETD</p>
                                                    <p className="text-[10px] text-white font-bold">{item.sbu_metadata?.eta || "-"} / {item.sbu_metadata?.etd || "-"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Commercial & Weight</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <p className="text-[8px] text-slate-500 uppercase font-black">Inco / Valuta</p>
                                                    <p className="text-[10px] text-amber-400 font-black">{item.sbu_metadata?.incoterms || "-"} / {item.sbu_metadata?.currency || "-"}</p>
                                                </div>
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <p className="text-[8px] text-slate-500 uppercase font-black">Gross Weight</p>
                                                    <p className="text-[10px] text-white font-bold">{item.sbu_metadata?.gross_weight || "0"} Kgs</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Progress Status</label>
                                            <select 
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                                defaultValue={item.sbu_metadata?.status_clearance || "Aju Submitted"}
                                                onChange={(e) => updateClearanceMetadata(item.id, { ...item.sbu_metadata, status_clearance: e.target.value })}
                                            >
                                                <option value="Aju Submitted">Aju Submitted</option>
                                                <option value="Billing Issued">Billing Issued</option>
                                                <option value="Billing Paid">Billing Paid</option>
                                                <option value="SPPB Issued">SPPB Issued</option>
                                                <option value="Invoiced">Invoiced</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                                        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">BC 1.1 & Manifest Info</p>
                                            <p className="text-sm font-black text-white italic">{item.sbu_metadata?.bc11_number || "NO BC 1.1 REGISTERED"}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Container & Seal Number</p>
                                            <p className="text-sm font-black text-white">{item.sbu_metadata?.container_info || "N/A"}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Warehouse / TPS Location</p>
                                            <p className="text-sm font-black text-emerald-400 font-mono tracking-tighter uppercase">{item.sbu_metadata?.tps || "NOT SET"}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* ITEMS LIST FROM ADMIN */}
                                        <div className="bg-black/20 rounded-[2rem] p-6 border border-white/5">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4" /> Item Content Analysis
                                            </h4>
                                            <div className="space-y-2">
                                                {(item.sbu_metadata?.items || []).length > 0 ? (
                                                    (item.sbu_metadata?.items || []).map((it: any, iIdx: number) => (
                                                        <div key={iIdx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center group">
                                                            <div>
                                                                <p className="text-[10px] font-black text-white uppercase">{it.brand} - {it.type}</p>
                                                                <p className="text-[9px] text-slate-500 font-mono mt-0.5">HS: {it.hs_code || 'N/A'}</p>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                                <CheckCircle className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-slate-600 italic py-4">Belum ada rincian barang diinput</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* DOCUMENT REPOSITORY */}
                                        <div className="bg-black/20 rounded-[2rem] p-6 border border-white/5">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Verified Documents
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {(item.sbu_metadata?.checklist || []).map((doc: any, dIdx: number) => (
                                                    <div key={dIdx} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${doc.received ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                                            <div>
                                                                <p className="text-[10px] font-black text-white uppercase">{doc.name}</p>
                                                                <p className="text-[8px] text-slate-500 font-bold">{doc.ref_no || 'No Ref'} {doc.ref_date ? `• ${doc.ref_date}` : ''}</p>
                                                            </div>
                                                        </div>
                                                        {doc.file_url && (
                                                            <a 
                                                                href={doc.file_url} 
                                                                target="_blank" 
                                                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                                                            >
                                                                View File
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                                {(item.sbu_metadata?.checklist || []).length === 0 && (
                                                    <p className="text-[10px] text-slate-600 italic py-4 text-center">Admin belum memverifikasi checklist dokumen</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3">
                                            <ShieldCheck className="w-5 h-5" /> All Data Synchronized
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="py-20 text-center bg-white/5 border border-white/5 rounded-[3rem]">
                            <Inbox className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-20" />
                            <p className="text-slate-600 font-black uppercase text-xs tracking-[0.4em]">Belum ada data Clearance yang diproses</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
