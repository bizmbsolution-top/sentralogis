"use client";

import { 
    Building2, Wallet, Search, Truck, MapIcon, User, LogOut
} from "lucide-react";
import Link from "next/link";

interface TruckingHeaderProps {
    tenantInfo: { name: string; logo: string | null; mission_credits?: number };
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    onShowMap: () => void;
    onLogout: () => void;
    userProfile?: any;
}

export default function TruckingHeader({
    tenantInfo, searchTerm, setSearchTerm, onShowMap, onLogout, userProfile
}: TruckingHeaderProps) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 md:px-10 md:py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-[#1E293B] flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                        {tenantInfo.logo ? <img src={tenantInfo.logo} className="w-8 h-8 object-contain" alt="Logo" /> : <Building2 className="w-6 h-6 text-emerald-500" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Welcome back,</p>
                        <h1 className="text-sm md:text-xl font-black text-[#1E293B] tracking-tight leading-none uppercase italic">{tenantInfo.name || 'sentralogis'}</h1>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-3 bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-sm group hover:border-amber-200 transition-all">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Mission Credits</span>
                        <span className="text-base font-black italic tracking-tighter text-[#1E293B]">
                        {tenantInfo.mission_credits || 0} <span className="text-[9px] uppercase not-italic opacity-40">Tokens</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden md:flex relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Cari Resi atau Lokasi..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-100 border-transparent rounded-full pl-10 pr-4 py-2 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none w-48 md:w-64 transition-all" 
                    />
                </div>
                
                <Link href="/sbu/trucking/fleet" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors">
                <Truck className="w-5 h-5" />
                </Link>

                <button onClick={onShowMap} className="hidden md:flex w-10 h-10 rounded-full bg-slate-50 border border-slate-200 items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors">
                <MapIcon className="w-5 h-5" />
                </button>
                
                <div className="hidden md:block w-px h-6 bg-slate-200 mx-2"></div>
                
                <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 group">
                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Logout</span>
                </button>
            </div>
        </header>
    );
}
