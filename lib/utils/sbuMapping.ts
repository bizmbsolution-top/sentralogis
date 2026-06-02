// [AI] Single source of truth for SBU type mappings across the entire app
// tenant_sbus.sbu_type (lowercase) ↔ wo_items.sbu_type (UPPERCASE) ↔ UI display

import { supabase } from '@/lib/supabaseClient';

export const SBU_MAP = {
  tr:  { woType: 'TRUCKING',   label: 'Trucking',   color: 'blue',    bg: 'bg-blue-50',    text: 'text-blue-600' },
  wh:  { woType: 'WAREHOUSE',  label: 'Warehouse',  color: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  ink: { woType: 'CLEARANCE',  label: 'Clearance',  color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  fwd: { woType: 'FORWARDING', label: 'Forwarding', color: 'indigo',  bg: 'bg-indigo-50',  text: 'text-indigo-600' },
} as const;

export type SBUType = keyof typeof SBU_MAP;

// Convert tenant_sbus.sbu_type → wo_items.sbu_type
export function sbuToWoType(sbuType: SBUType): string {
  return SBU_MAP[sbuType]?.woType || sbuType.toUpperCase();
}

// Convert wo_items.sbu_type → tenant_sbus.sbu_type
export function woTypeToSbu(woType: string): SBUType {
  const entry = Object.entries(SBU_MAP).find(([, v]) => v.woType === woType.toUpperCase());
  return (entry?.[0] as SBUType) || 'tr';
}

// Get display info for a SBU type
export function getSbuInfo(sbuType: SBUType) {
  return SBU_MAP[sbuType] || SBU_MAP.tr;
}

// Get all registered & active SBU types for a tenant
export async function getActiveSBUs(tenantId: string): Promise<SBUType[]> {
  const { data, error } = await supabase
    .from('tenant_sbus')
    .select('sbu_type')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error || !data) return [];
  return data.map((s: any) => s.sbu_type as SBUType).filter(t => t in SBU_MAP);
}

// Check if a specific SBU type is active for a tenant
export async function isSbuActive(tenantId: string, sbuType: SBUType): Promise<boolean> {
  const { data, error } = await supabase
    .from('tenant_sbus')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('sbu_type', sbuType)
    .eq('status', 'active')
    .maybeSingle();

  return !error && !!data;
}
