'use server';

// SENTRALOGIS — DATA-4E X6 R2 + D-Repair-5A.3
// Server actions for canonical entity ownership classification (ADR-078).
// Auth pattern: server-side auth user check + profile.tenant_id derivation.
// Tenant: server-derived from profile.tenant_id (IdentityContext preserved).
// Mutation authority: EntityOwnershipService.setOwnership() → PostgreSQL set_entity_ownership()
// Idempotency: correlation_id via p_idempotency_key on audit_logs.

import { createAdminClient } from '@/lib/supabase/admin';
import { EntityOwnershipService } from '@/lib/domain/entity/entity-ownership-service';
import { assertPermission } from '@/lib/application/identity/resolver';
import type { IdentityContext } from '@/lib/application/identity/types';
import type { ServerActionResult } from '@/lib/actions/entity-role-actions';
import type { OwnershipClassification, SetOwnershipCommand, SetOwnershipResult } from '@/lib/domain/entity/entity-ownership-service';

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

export async function classifyOwnership(entityId: string): Promise<ServerActionResult<OwnershipClassification>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const svc = new EntityOwnershipService(ctx.supabase as any);
    const result = await svc.classifyOwnership(ctx.tenant_id, entityId);
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function getEntitiesByOwnership(isOwn: boolean): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const { data, error } = await ctx.supabase
      .from('md_entities')
      .select('id, entity_code, name, legal_name, vendor_type, parent_id, is_own, type')
      .eq('tenant_id', ctx.tenant_id)
      .eq('is_own', isOwn)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function getAllEntitiesWithOwnership(): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const { data, error } = await ctx.supabase
      .from('md_entities')
      .select('id, entity_code, name, legal_name, vendor_type, parent_id, is_own, type')
      .eq('tenant_id', ctx.tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// ============================================================================
// D-Repair-5A.3: Mutation Server Action
// ============================================================================

export async function setEntityOwnershipAction(
  entityId: string,
  isOwn: boolean | null,
  expectedCurrentValue: boolean | null,
  reason: string,
  idempotencyKey?: string,
): Promise<ServerActionResult<SetOwnershipResult>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };

    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    // Build authoritative IdentityContext
    const identityContext: IdentityContext = {
      userId: user.id,
      tenantId: ctx.tenant_id,
      membershipId: null,
      role: 'MEMBER',
      isTenantOwner: false,
      permissions: ['commercial:manage'],
      sbuScope: null,
    };

    assertPermission(identityContext, 'commercial:manage');

    const svc = new EntityOwnershipService(ctx.supabase as any);

    // Pass null isOwn through; the PostgreSQL function requires boolean,
    // so the service will reject with a clear error (future: add NULL support).
    const command: SetOwnershipCommand = {
      entityId,
      isOwn,
      expectedCurrentValue,
      reason,
      idempotencyKey,
    };

    const result = await svc.setOwnership(identityContext, command);
    return { ok: true, data: result };
  } catch (e: any) {
    const message = e?.message || String(e);
    // Map service-layer errors to server-action results
    if (e.code === 'INVALID_MUTATION' && message.includes('not supported via this RPC')) {
      return { ok: false, error: message };
    }
    if (e.code === 'INVALID_REASON') {
      return { ok: false, error: message };
    }
    if (e.code === 'ENTITY_NOT_FOUND') {
      return { ok: false, error: message };
    }
    if (e.code === 'CONCURRENCY_CONFLICT') {
      return { ok: false, error: message };
    }
    if (e.code === 'FORBIDDEN_PERMISSION') {
      return { ok: false, error: message };
    }
    return { ok: false, error: `Failed to set entity ownership: ${message}` };
  }
}