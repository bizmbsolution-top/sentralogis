"use client";

import { useEffect, useState } from "react";
import { Ship } from "lucide-react";

interface ForwardingHeroProps {
    title?: React.ReactNode;
}

export default function ForwardingHero({ title }: ForwardingHeroProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dayName = time.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
    const dateFormatted = time.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const timeFormatted = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    return (
        <div className="relative overflow-hidden rounded-[3rem] bg-[#001f3f] border border-slate-800 shadow-2xl group/banner">
            <div className="absolute inset-0 bg-gradient-to-br from-[#006699]/30 via-transparent to-transparent z-0" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 px-8 py-6 md:px-16 md:py-8 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center shadow-3xl backdrop-blur-md border border-white/20 rotate-3 group-hover:rotate-0 transition-all duration-500 overflow-hidden">
                        <Ship className="w-10 h-10 text-blue-400" />
                    </div>
                    
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">Operational Cockpit v4.2</span>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
                            {title || (
                                <>
                                    Global Consolidation,<br/>
                                    <span className="text-blue-400">Streamlined Logistics</span>
                                </>
                            )}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-1 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-[2rem] shadow-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic leading-none">Live Ops Node</span>
                    </div>
                    <div className="text-xl font-black text-white uppercase tracking-[0.4em] mb-[-2px]">{dayName}</div>
                    <div className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none font-mono py-1 drop-shadow-2xl">
                        {timeFormatted}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 tracking-[0.3em] mt-1 border-t border-white/10 pt-2 w-full text-center md:text-right">
                        {dateFormatted}
                    </div>
                </div>
            </div>
        </div>
    );
}
