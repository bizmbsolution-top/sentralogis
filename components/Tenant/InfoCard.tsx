"use client";

import React from 'react';
import { Shield, MapPin, BadgeCheck, Zap } from 'lucide-react';

interface InfoCardProps {
  label: string;
  value: string;
  icon: any;
  color?: string;
}

export function InfoCard({ label, value, icon: Icon, color = "text-emerald-500" }: InfoCardProps) {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5 backdrop-blur-xl flex items-center gap-6 hover:bg-slate-900 transition-all group">
      <div className={`w-14 h-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        <span className="text-sm font-black text-white uppercase italic tracking-tight">{value}</span>
      </div>
    </div>
  );
}
