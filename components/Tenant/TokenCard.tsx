"use client";

import React from 'react';
import { CreditCard, ArrowUpRight, TrendingUp } from 'lucide-react';

interface TokenCardProps {
  balance: number;
  totalUsed: number;
  tenantName: string;
}

export function TokenCard({ balance, totalUsed, tenantName }: TokenCardProps) {
  const total = balance + totalUsed;
  const percentage = total > 0 ? (balance / total) * 100 : 0;
  const isLow = balance < 100;

  return (
    <div className="relative p-8 rounded-[3rem] bg-slate-900 border border-white/10 overflow-hidden shadow-2xl group">
      {/* Decorative Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${isLow ? 'from-rose-500/10' : 'from-emerald-500/10'} to-transparent opacity-50 transition-colors`} />
      
      {/* Background Animated Glow */}
      <div className={`absolute -top-24 -right-24 w-64 h-64 ${isLow ? 'bg-rose-500/10' : 'bg-emerald-500/10'} blur-[100px] rounded-full animate-pulse`} />

      <div className="relative z-10 flex flex-col h-full space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Credits</p>
            <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">{tenantName}</h3>
          </div>
          <div className={`w-12 h-12 rounded-2xl ${isLow ? 'bg-rose-500' : 'bg-emerald-500'} flex items-center justify-center shadow-lg transition-colors`}>
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className={`text-6xl font-black italic tracking-tighter ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
            {balance.toLocaleString()}
          </h2>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${isLow ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Mission Ready Tokens</span>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex justify-between items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resource Allocation</span>
             <span className="text-xs font-black text-white italic">{percentage.toFixed(1)}% Remaining</span>
          </div>
          <div className="h-3 bg-slate-950 rounded-full p-1 border border-white/5">
             <div 
               className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-rose-500' : 'bg-emerald-500'} shadow-[0_0_15px_rgba(16,185,129,0.4)]`} 
               style={{ width: `${percentage}%` }}
             />
          </div>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic text-center">
             Total Consumption to Date: {totalUsed.toLocaleString()} Tokens
          </p>
        </div>
      </div>
    </div>
  );
}
