'use server';

// SENTRALOGIS — DATA-4E X6 R2
// Server actions for canonical driver assignment access classification (ADR-079).
// Auth pattern: server-side auth user check + profile.tenant_id derivation.
// Tenant: server-derived from profile.tenant_id (IdentityContext preserved).

import { createAdminClient } from '@/lib/supabase/admin';
import { DriverAccessClassificationService } from '@/lib/domain/driver/driver-access-classification-service';
import { EntityOwnershipService } from '@/lib/domain/entity/entity-ownership-service';
import type { DriverAccessClassification, DriverAccessType } from '@/lib/domain/driver/driver-access-classification-service';
import type { ServerActionResult } from './entity-role-actions';

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

export async function classifyDriverAccess(
  driverId: string | null,
  transporterId: string | null,
): Promise<ServerActionResult<DriverAccessClassification>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const ownershipService = new EntityOwnershipService(ctx.supabase as any);
    const accessService = new DriverAccessClassificationService(ctx.supabase as any, ownershipService);
    const result = await accessService.classifyDriverAccess(ctx.tenant_id, driverId, transporterId);
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function getDriversByAccessType(accessType: DriverAccessType): Promise<ServerActionResult<any[]>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const ownershipService = new EntityOwnershipService(ctx.supabase as any);
    const accessService = new DriverAccessClassificationService(ctx.supabase as any, ownershipService);

    const { data: drivers, error } = await ctx.supabase
      .from('md_drivers')
      .select('id, name, phone, status, entity_id, is_working, has_native_app, md_entities(name, is_own)')
      .eq('tenant_id', ctx.tenant_id)
      .eq('is_active', true)
      .not('entity_id', 'is', null)
      .order('name', { ascending: true });

    if (error) throw error;

    const filtered = (drivers || []).filter((d: any) => {
      const transporterId = d.entity_id;
      // This is a simplified synchronous filter; for production use,
      // classifyDriverAccess should be called per driver for full accuracy
      if (accessType === 'NATIVE_APP') {
        return d.has_native_app === true;
      }
      const entityOwnership = d.md_entities?.is_own;
      if (accessType === 'INTERNAL_PORTAL') {
        return entityOwnership === true;
      }
      return entityOwnership === false;
    });

    return { ok: true, data: filtered };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
