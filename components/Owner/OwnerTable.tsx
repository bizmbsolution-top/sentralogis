"use client";

import React from 'react';
import { CreditCard, Shield, Calendar, Mail, Key } from 'lucide-react';

interface Tenant {
  tenant_code: string;
  name: string;
  subscription_tier: string;
  token_balance: number;
  admin_email: string;
  admin_name: string;
  created_at: string;
}

export function OwnerTable({ tenants, onGrant, onReset }: { tenants: Tenant[], onGrant: (t: Tenant) => void, onReset: (t: Tenant) => void }) {
  return (
    <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-900/50 backdrop-blur-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/5">
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity & Code</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subscription Tier</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Balance</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Delegate</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tenants.map((tenant) => (
            <tr key={tenant.tenant_code} className="hover:bg-white/5 transition-colors group">
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white">{tenant.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{tenant.tenant_code}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">{tenant.subscription_tier}</span>
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <CreditCard className="w-3 h-3 text-emerald-500" />
                  <span className="text-sm font-black text-emerald-400">{tenant.token_balance.toLocaleString()}</span>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{tenant.admin_name}</span>
                  <span className="text-[9px] font-bold text-slate-600 truncate w-32 italic">{tenant.admin_email}</span>
                </div>
              </td>
              <td className="px-6 py-5 text-right space-x-2">
                <button 
                  onClick={() => onGrant(tenant)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  Grant
                </button>
                <button 
                  onClick={() => onReset(tenant)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                >
                  Reset Pass
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
