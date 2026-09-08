'use server';

// SENTRALOGIS — DATA-4E X2
// Server actions for role mutation (called from client components).
// Auth pattern: server-side auth user check + profile.tenant_id derivation (matches masterCodeActions.ts).
// Tenant: server-derived from profile.tenant_id (IdentityContext preserved per BR10 D2).
// Scope: W1 (HQ contacts) wiring only. W2/W4 deferred.

import { createAdminClient } from '@/lib/supabase/admin';
import { RoleMutationService, AssignRoleDTO, RevokeRoleDTO } from '@/lib/domain/party/role-mutation-service';
import type { PartyRoleType, PartyRoleContextType } from '@/lib/domain/party/types';

export interface ServerActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function resolveTenantForActor(actorId: string): Promise<{ tenantId: string; supabase: ReturnType<typeof createAdminClient> } | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', actorId)
    .maybeSingle();
  if (!profile?.tenant_id) return null;
  return { tenantId: profile.tenant_id, supabase };
}

export async function assignRoleAction(
  partyId: string,
  roleType: PartyRoleType,
  contextType: PartyRoleContextType = 'GLOBAL',
  contextId: string | null = null,
): Promise<ServerActionResult> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };
    const svc = new RoleMutationService(ctx.supabase as any);
    const dto: AssignRoleDTO = { party_id: partyId, role_type: roleType, context_type: contextType, context_id: contextId };
    const role = await svc.assignRole(ctx.tenantId, dto, user.id);
    return { ok: true, data: { id: role.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function revokeRoleAction(
  partyId: string,
  roleType: PartyRoleType,
  contextType: PartyRoleContextType = 'GLOBAL',
  contextId: string | null = null,
): Promise<ServerActionResult> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };
    const svc = new RoleMutationService(ctx.supabase as any);
    const dto: RevokeRoleDTO = { party_id: partyId, role_type: roleType, context_type: contextType, context_id: contextId };
    const role = await svc.revokeRole(ctx.tenantId, dto, user.id);
    return { ok: true, data: { id: role.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Legacy-shaped wrappers (X2 preserves existing call sites; W1 can migrate gradually)
export async function assignVendorRoleAction(partyId: string): Promise<ServerActionResult> {
  return assignRoleAction(partyId, 'VENDOR', 'GLOBAL', null);
}
export async function revokeVendorRoleAction(partyId: string): Promise<ServerActionResult> {
  return revokeRoleAction(partyId, 'VENDOR', 'GLOBAL', null);
}
