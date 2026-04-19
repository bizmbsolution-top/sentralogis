"use client";

import { ArrowRight } from "lucide-react";

interface Category {
    id: string;
    label: string;
    desc: string;
    count: number;
    text: string;
    bg: string;
    border: string;
    icon: any;
    dot: string;
}

interface MissionOverviewProps {
    categories: Category[];
    onSelectCategory: (id: string) => void;
    totalOperations: number;
}

export default function MissionOverview({
    categories, onSelectCategory, totalOperations
}: MissionOverviewProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Mission Overview</h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{totalOperations} Operations Loaded</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {categories.map((cat) => {
                    const isHero = cat.id === 'active_journey';
                    const Icon = cat.icon;
                    return (
                        <button 
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`relative overflow-hidden p-6 rounded-3xl border-2 text-left flex flex-col justify-between transition-all group ${
                                isHero ? 'bg-[#0F172A] border-transparent shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20' 
                                       : `bg-white hover:border-slate-300 shadow-sm hover:shadow-md ${cat.border}`
                            }`}
                        >
                            {isHero && (
                                <>
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>
                                </>
                            )}

                            <div className="flex items-start justify-between mb-8 z-10 relative">
                                <div className={`p-3 rounded-2xl ${isHero ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-600'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className={`text-4xl md:text-5xl font-black ${isHero ? 'text-white' : 'text-slate-900'} tracking-tighter leading-none`}>
                                    {cat.count}
                                </span>
                            </div>
                            <div className="z-10 relative">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${cat.dot} animate-pulse`} />
                                    <h3 className={`font-black uppercase tracking-wide text-[11px] md:text-xs ${isHero ? 'text-white' : cat.text}`}>
                                        {cat.label}
                                    </h3>
                                </div>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isHero ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {cat.desc}
                                </p>
                            </div>
                            <div className={`absolute bottom-6 right-6 opacity-0 translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 ${isHero ? 'text-orange-400' : 'text-slate-300'}`}>
                                <ArrowRight className="w-6 h-6" />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
