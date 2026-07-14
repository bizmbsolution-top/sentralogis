'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, ShieldCheck } from 'lucide-react';

export interface TenantBrandInfo {
  id: string;
  name: string;
  logo_url?: string | null;
  code?: string | null;
}

interface TenantBrandShowcaseProps {
  portalName: string;
  className?: string;
  isDark?: boolean;
}

export default function TenantBrandShowcase({
  portalName,
  className = '',
  isDark = true,
}: TenantBrandShowcaseProps) {
  const [activeTenant, setActiveTenant] = useState<TenantBrandInfo | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if URL has explicit tenant branding parameter e.g. ?tenant=HALU
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant') || urlParams.get('tenant_id');

    if (tenantParam) {
      fetchSingleTenantByCodeOrId(tenantParam);
      return;
    }

    // 2. Or check existing active session (if already logged in or remembered)
    const whSession = localStorage.getItem('sentralogis_wh_session');
    if (whSession) {
      try {
        const parsed = JSON.parse(whSession);
        if (parsed.tenant_id) {
          fetchSingleTenantByCodeOrId(parsed.tenant_id);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    const saved = localStorage.getItem('sentralogis_active_tenant_brand');
    if (saved) {
      try {
        setActiveTenant(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const fetchSingleTenantByCodeOrId = async (param: string) => {
    try {
      let { data } = await supabase
        .from('md_tenants')
        .select('id, name, logo_url, tenant_code')
        .or(`id.eq.${param},tenant_code.ilike.${param}`)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('tenants')
          .select('id, name, logo_url')
          .or(`id.eq.${param}`)
          .maybeSingle();
        data = res.data;
      }

      if (data) {
        const brand: TenantBrandInfo = {
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          code: data.tenant_code,
        };
        setActiveTenant(brand);
        localStorage.setItem('sentralogis_active_tenant_brand', JSON.stringify(brand));
      }
    } catch (err) {
      console.error('[TenantBrandShowcase] Error auto-detecting tenant:', err);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      <div 
        className={`relative overflow-hidden rounded-2xl p-3 px-5 border flex items-center gap-3.5 shadow-lg ${
          isDark 
            ? 'bg-slate-900/90 border-slate-700/80 text-white' 
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent rounded-full blur-xl pointer-events-none" />

        {/* Logo Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden shadow-inner ${
          isDark ? 'bg-slate-950/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'
        }`}>
          {activeTenant?.logo_url ? (
            <img 
              src={activeTenant.logo_url} 
              alt={activeTenant.name} 
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <ShieldCheck className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          )}
        </div>

        {/* Text Info */}
        <div className="text-left flex-1 min-w-[170px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {activeTenant?.code || 'Sentralogis OS'}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              • {portalName}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black tracking-tight mt-0.5 truncate max-w-[220px] sm:max-w-[280px]">
            {activeTenant ? activeTenant.name : 'SBU Unified Gateway'}
          </h3>
          <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeTenant ? 'Tenant Official Portal Access' : 'Auto-detected credentials check'}
          </p>
        </div>
      </div>
    </div>
  );
}
