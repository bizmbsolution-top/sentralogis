'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { SBU_MAP, type SBUType } from '@/lib/utils/sbuMapping';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Truck, Package, FileCheck, Globe, Power, PowerOff, Loader2, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const SBU_ICONS: Record<string, any> = {
  tr: Truck,
  wh: Package,
  ink: FileCheck,
  fwd: Globe,
};

const SBU_DESCRIPTIONS: Record<string, string> = {
  tr: 'Land freight & fleet management.',
  wh: 'Inventory & storage solutions.',
  ink: 'Customs & PPJK clearance.',
  fwd: 'Ocean and Air freight forwarding.',
};

interface TenantSBU {
  id: string;
  sbu_type: string;
  sbu_code: string;
  sbu_name: string;
  status: string;
  staff_count?: number;
}

export default function TenantSBUConfigPage() {
  const { profile } = useAuth();
  const [sbus, setSbus] = useState<TenantSBU[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const isSuperadmin = profile?.role === 'tenant_superadmin' || profile?.role === 'tenant_admin';

  const fetchSbus = async () => {
    if (!profile) return;
    if (!profile.tenant_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('tenant_sbus' as any) as any)
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch staff count per SBU
      const sbuIds = ((data as any[]) || []).map((s: any) => s.id);
      const staffCounts: Record<string, number> = {};
      if (sbuIds.length > 0) {
        const { data: staffData } = await supabase
          .from('tenant_users')
          .select('sbu_id')
          .in('sbu_id', sbuIds)
          .eq('is_active', true);
        (staffData || []).forEach((s: any) => {
          staffCounts[s.sbu_id] = (staffCounts[s.sbu_id] || 0) + 1;
        });
      }

      // [AI] Always display the 4 standard SBUs. If not in DB, mark as inactive.
      const standardTypes: SBUType[] = ['tr', 'wh', 'ink', 'fwd'];
      const combinedSbus: TenantSBU[] = standardTypes.map(type => {
        const existing = ((data as any[]) || []).find((s: any) => s.sbu_type === type);
        if (existing) {
          return { ...existing, staff_count: staffCounts[existing.id] || 0 };
        } else {
          const info = SBU_MAP[type];
          return {
            id: `new-${type}`,
            sbu_type: type,
            sbu_code: type.toUpperCase(),
            sbu_name: `SBU ${info.label}`,
            status: 'inactive',
            staff_count: 0
          };
        }
      });

      setSbus(combinedSbus);
    } catch (err: any) {
      toast.error('Failed to load SBU data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSbus(); }, [profile?.tenant_id]);

  const handleToggle = async (sbuId: string, currentStatus: string, sbuType: string, sbuName: string, sbuCode: string) => {
    setToggling(sbuId);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      if (sbuId.startsWith('new-')) {
        // [AI] Insert if it doesn't exist yet
        const { error } = await supabase
          .from('tenant_sbus')
          .insert({
            tenant_id: profile?.tenant_id,
            sbu_type: sbuType,
            sbu_code: sbuCode,
            sbu_name: sbuName,
            status: 'active'
          });
        if (error) throw error;
        toast.success(`SBU ${sbuName} activated`);
      } else {
        // [AI] Update existing
        const { error } = await supabase
          .from('tenant_sbus')
          .update({ status: newStatus })
          .eq('id', sbuId);
        if (error) throw error;
        toast.success(`SBU ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      }
      
      fetchSbus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <ShieldAlert className="w-16 h-16 text-slate-300" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Access Restricted</p>
        <p className="text-xs text-slate-400">Only Tenant Superadmin can access SBU Configuration.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading SBU Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SBU Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">Activate or deactivate your Strategic Business Units.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="!text-[10px]">
            {sbus.filter(s => s.status === 'active').length} / {sbus.length} Active
          </Badge>
        </div>
      </div>

      {/* SBU Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sbus.map((sbu) => {
          const info = SBU_MAP[sbu.sbu_type as SBUType] || SBU_MAP.tr;
          const Icon = SBU_ICONS[sbu.sbu_type] || Truck;
          const isActive = sbu.status === 'active';
          const isToggling = toggling === sbu.id;

          return (
            <Card
              key={sbu.id}
              className={`border-2 transition-all ${
                isActive
                  ? `border-${info.color}-500 bg-${info.color}-50/30`
                  : 'border-slate-200 opacity-60'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isActive ? `${info.bg} ${info.text}` : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={28} />
                  </div>
                  <Badge variant={isActive ? 'success' : 'default'} className="!text-[9px] uppercase font-black tracking-widest">
                    {info.label}
                  </Badge>
                </div>

                <h3 className="font-black text-slate-900 uppercase italic tracking-tight">{sbu.sbu_name}</h3>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Code: {sbu.sbu_code}
                </p>

                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  {SBU_DESCRIPTIONS[sbu.sbu_type] || 'Strategic Business Unit'}
                </p>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {sbu.staff_count || 0} staff
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {isActive ? 'Status: Active' : 'Status: Inactive'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleToggle(sbu.id, sbu.status, sbu.sbu_type, sbu.sbu_name, sbu.sbu_code)}
                    disabled={isToggling}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      isActive
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    } disabled:opacity-50`}
                  >
                    {isToggling ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isActive ? (
                      <PowerOff size={16} />
                    ) : (
                      <Power size={16} />
                    )}
                    {isActive ? 'Turn Off' : 'Activate SBU'}
                  </button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
    </div>
  );
}
