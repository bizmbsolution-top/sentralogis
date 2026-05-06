"use client";

import React from 'react';
import { CreditCard, MoreVertical, Shield, Calendar } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  whatsapp?: string;
  mission_credits: number;
  created_at: string;
  is_active: boolean;
}

interface TenantsTableProps {
  tenants: Tenant[];
  onGrantToken: (tenant: Tenant) => void;
}

export function TenantsTable({ tenants, onGrantToken }: TenantsTableProps) {
  return (
    <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-900/50 backdrop-blur-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/5">
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant Details</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Info</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Token Balance</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Created</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="hover:bg-white/5 transition-colors group">
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white">{tenant.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate w-40">{tenant.id}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{tenant.email || 'N/A'}</span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase italic mt-1 tracking-widest">
                    {tenant.whatsapp ? `📱 ${tenant.whatsapp}` : 'NO WHATSAPP'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CreditCard className="w-3 h-3 text-emerald-500" />
                  <span className="text-sm font-black text-emerald-400">{tenant.mission_credits.toLocaleString()}</span>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </span>
                </div>
              </td>
              <td className="px-6 py-5 text-right">
                <button 
                  onClick={() => onGrantToken(tenant)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Grant Token
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tenants.length === 0 && (
        <div className="p-20 text-center">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No tenants found in system.</p>
        </div>
      )}
    </div>
  );
}
