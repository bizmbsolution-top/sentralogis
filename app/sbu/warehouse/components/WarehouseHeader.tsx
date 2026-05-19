"use client";

import { Search, Wallet, PlusCircle, ChevronDown, Coins, LogOut, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface WarehouseHeaderProps {
    tenantInfo: { name: string; logo?: string; mission_credits?: number };
    searchTerm?: string;
    setSearchTerm?: (term: string) => void;
    userProfile: any;
    showProfileMenu: boolean;
    setShowProfileMenu: (show: boolean) => void;
    onLogout: () => void;
}

export default function WarehouseHeader({ 
    tenantInfo, searchTerm, setSearchTerm, userProfile, 
    showProfileMenu, setShowProfileMenu, onLogout 
}: WarehouseHeaderProps) {
    return (
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-[100] px-6 py-4">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
                {/* 1. LOGO & TENANT NAME */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10 overflow-hidden">
                        {tenantInfo.logo ? (
                            <Image src="" alt="Logo" fill className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-5 h-5 text-orange-500" />
                        )}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase leading-none mb-1">Sentralogis SBU</p>
                        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{tenantInfo.name || 'WAREHOUSE'}</h1>
                    </div>
                </div>

                {/* 2. SEARCH FIELD (WIDER) */}
                <div className="flex-1 max-w-2xl relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="SEARCH BARCODE, SKU, OR INBOUND REF..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-3 text-[11px] font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none placeholder:text-slate-400 uppercase tracking-widest" 
                    />
                </div>

                {/* 3. PROFILE & ACTIONS */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <Link href="/sbu/warehouse/finances" className="h-11 px-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-3 hover:bg-white hover:shadow-xl transition-all group/finance">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start leading-none pr-1">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Finances</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SBU Fiscal</span>
                        </div>
                    </Link>

                    <Link href="/sbu/warehouse/inbound" className="h-11 w-11 rounded-xl bg-orange-600 border border-orange-500 flex items-center justify-center text-white hover:bg-orange-500 transition-all active:scale-95 shadow-xl shadow-orange-950/20">
                    <PlusCircle className="w-5 h-5" />
                    </Link>
                    
                    <div className="hidden md:block w-px h-6 bg-slate-200 mx-1"></div>

                    <div className="relative">
                        <button 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`flex items-center gap-3 border px-4 py-2 rounded-2xl transition-all ${showProfileMenu ? 'bg-white border-slate-300 shadow-md translate-y-0.5' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'}`}
                        >
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black italic shadow-sm">
                                {userProfile?.full_name?.charAt(0) || 'W'}
                            </div>
                            <div className="text-left hidden lg:block">
                                <p className="text-[10px] font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">{userProfile?.full_name || 'WAREHOUSE TEAM'}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Ops Lead</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfileMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-2xl rounded-[2rem] p-4 z-50 animate-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Usage Credits</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-black italic text-slate-900 tracking-tighter uppercase">{tenantInfo.mission_credits || 0} <span className="text-[10px] text-slate-400 not-italic ml-1">UNITS</span></p>
                                            <Coins className="w-5 h-5 text-amber-500" />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all border-t border-slate-50 mt-2 pt-4"
                                    >
                                        <LogOut className="w-4 h-4" /> Terminate Session
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
