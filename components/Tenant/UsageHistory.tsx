"use client";

import React from 'react';
import { History, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const DUMMY_HISTORY = [
  { id: 1, type: 'DEBIT', amount: 50, description: 'Job Order JO-2026-001 Creation', date: '2026-04-30T10:00:00Z' },
  { id: 2, type: 'CREDIT', amount: 1000, description: 'Executive Token Grant - Welcome Bonus', date: '2026-04-28T09:00:00Z' },
  { id: 3, type: 'DEBIT', amount: 50, description: 'Work Order WO-992 Validation', date: '2026-04-25T15:30:00Z' },
  { id: 4, type: 'DEBIT', amount: 200, description: 'Bulk Import Service Fee', date: '2026-04-20T11:20:00Z' },
];

export function UsageHistory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Token Transaction Log</h3>
        </div>
        <button className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">View Full Statement</button>
      </div>

      <div className="rounded-[2.5rem] border border-white/5 bg-slate-950/50 overflow-hidden">
        <div className="divide-y divide-white/5">
          {DUMMY_HISTORY.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {item.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{item.description}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      {new Date(item.date).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black italic tracking-tighter ${item.type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.type === 'CREDIT' ? '+' : '-'}{item.amount}
                </span>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Credits</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
