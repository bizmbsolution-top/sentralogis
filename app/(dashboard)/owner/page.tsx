'use client';

import { 
  Building2, 
  Coins, 
  Users, 
  Activity,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Owner Dashboard</h1>
        <p className="text-slate-500 font-medium">Welcome to the Sentralogis platform root executive console.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 hover:border-blue-200 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Building2 size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">Tenants</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Manage Clusters</p>
            <Link href="/owner/tenants" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 group">
              Manage Tenants <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 hover:border-emerald-200 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Coins size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">Tokens</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ledger & Statements</p>
            <Link href="/owner/topup" className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 group">
              View Ledger <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 hover:border-purple-200 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">Users</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Global Network</p>
            <Link href="/owner/users" className="text-[11px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-widest flex items-center gap-1 group">
              User Matrix <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border-slate-100 hover:border-amber-200 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              <Activity size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">System</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Logs & Telemetry</p>
            <Link href="/owner/settings" className="text-[11px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-1 group">
              Settings <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
