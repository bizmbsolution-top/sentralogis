"use client";

import { Truck, Wallet } from "lucide-react";

interface TruckingHeroProps {
    tenantInfo: { name: string; mission_credits?: number };
}

export default function TruckingHero({ tenantInfo }: TruckingHeroProps) {
    return (
        <div className="relative mb-8 overflow-hidden rounded-[2.5rem] bg-[#0F172A] border border-slate-800 shadow-xl group/banner">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-transparent to-teal-900/20 z-0" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
            
            <div className="relative z-10 px-8 py-10 md:px-12 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    {/* Brand Identity */}
                    <div className="hidden lg:flex w-16 h-16 bg-emerald-600 rounded-3xl items-center justify-center shadow-2xl shadow-emerald-600/20">
                        <Truck className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Operational Cockpit v2.0</span>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-none">
                            {tenantInfo.name || 'Enterprise'}<br/>
                            <span className="text-slate-400 text-sm md:text-lg not-italic font-medium tracking-normal mt-1 block">Logistics Command & Fleet Intelligence</span>
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 lg:gap-6">
                    {/* Credit Pill */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Available Credits</p>
                            <p className="text-xl font-black text-white italic tracking-tighter leading-none">
                                {tenantInfo.mission_credits || 0} <span className="text-[10px] uppercase not-italic opacity-40">Tokens</span>
                            </p>
                        </div>
                    </div>

                    {/* Action Status */}
                    <div className="hidden xl:flex items-center gap-2 pr-4 self-end pb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Secured Environment</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
