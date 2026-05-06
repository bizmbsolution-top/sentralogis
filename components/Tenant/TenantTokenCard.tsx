"use client";

import React from 'react';
import { CreditCard, Zap, TrendingUp } from 'lucide-react';

interface TokenCardProps {
  balance: number;
  used: number;
}

export function TenantTokenCard({ balance, used }: TokenCardProps) {
  const total = balance + used;
  const percentage = total > 0 ? (balance / total) * 100 : 0;

  return (
    <div className="relative p-10 rounded-[3rem] bg-slate-900 border border-white/10 overflow-hidden group shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50 transition-opacity" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse" />

      <div className="relative z-10 space-y-10">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Liquidity</p>
             <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Mission Ready Tokens</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
             <CreditCard className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="space-y-1">
           <h2 className="text-7xl font-black italic tracking-tighter text-emerald-400">
             {balance.toLocaleString()}
           </h2>
           <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">System Credits Available</span>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Resource Allocation</span>
              <span className="text-xs font-black text-white italic">{percentage.toFixed(1)}% Remaining</span>
           </div>
           <div className="h-4 bg-slate-950 rounded-full p-1 border border-white/5">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                style={{ width: `${percentage}%` }}
              />
           </div>
           <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <span>Consumption: {used.toLocaleString()}</span>
              <span>Total: {total.toLocaleString()}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
