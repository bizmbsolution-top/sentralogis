'use server';

// SENTRALOGIS — DATA-4E X6 Wave-1 P1
// Server actions for canonical entity role reads (called from client components).
// Auth pattern: server-side auth user check + profile.tenant_id derivation.
// Tenant: server-derived from profile.tenant_id (IdentityContext preserved).
// Canonical authority: party_roles = CANONICAL; md_entities.is_* = COMPATIBILITY PROJECTION ONLY.

import { createAdminClient } from '@/lib/supabase/admin';
import { PartyRoleService } from '@/lib/domain/party/party-role-service';
import type { PartyRoleType } from '@/lib/domain/party/types';

export interface ServerActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function resolveTenantForActor(actorId: string): Promise<{ tenant_id: string; supabase: ReturnType<typeof createAdminClient> } | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', actorId)
    .maybeSingle();
  if (!profile?.tenant_id) return null;
  return { tenant_id: profile.tenant_id, supabase };
}

export async function getEntitiesByRole(roleType: PartyRoleType): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const svc = new PartyRoleService(ctx.supabase as any);
    const partyIds = await svc.getPartyIdsByRole(ctx.tenant_id, roleType);

    if (partyIds.length === 0) return { ok: true, data: [] };

    const { data, error } = await ctx.supabase
      .from('md_entities')
      .select('id, entity_code, name, legal_name, vendor_type, parent_id')
      .eq('tenant_id', ctx.tenant_id)
      .in('id', partyIds)
      .order('name', { ascending: true });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function getEntitiesWithoutRole(roleType: PartyRoleType): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const svc = new PartyRoleService(ctx.supabase as any);
    const partyIds = await svc.getPartyIdsWithoutRole(ctx.tenant_id, roleType);

    if (partyIds.length === 0) return { ok: true, data: [] };

    const { data, error } = await ctx.supabase
      .from('md_entities')
      .select('id, entity_code, name, legal_name, vendor_type, parent_id')
      .eq('tenant_id', ctx.tenant_id)
      .in('id', partyIds)
      .order('name', { ascending: true });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function getInternalDrivers(): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const svc = new PartyRoleService(ctx.supabase as any);
    const vendorPartyIds = await svc.getPartyIdsByRole(ctx.tenant_id, 'VENDOR');

    const { data, error } = await ctx.supabase
      .from('md_drivers')
      .select('id, name, phone, status, entity_id, is_working, md_entities(name)')
      .eq('tenant_id', ctx.tenant_id)
      .eq('is_active', true)
      .not('entity_id', 'is', null)
      .order('name', { ascending: true });

    if (error) throw error;

    let drivers = data || [];
    if (vendorPartyIds.length > 0) {
      drivers = drivers.filter((d: any) => !vendorPartyIds.includes(d.entity_id));
    }

    return { ok: true, data: drivers };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
