/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/identity/session-source.ts
 *
 * Production async wiring for the U-01 resolver.
 *
 * Fetches the live membership arrays from Supabase (staff branch via
 * tenant_users UNIQUE(user_id); owner branch via tenants.user_id), then runs
 * the synchronous core resolver. No identity logic duplicated here — this is
 * pure transport wiring deferred from U-01 (membership-source.ts NOTE).
 */

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveIdentityContext } from './resolver';
import { resolveFromArrays } from './membership-source';
import type { IdentityContext } from './types';

/**
 * Resolve the trusted IdentityContext from the incoming request session.
 *
 * @param requestedTenantId optional client-requested tenant — validated,
 *        never trusted (U-01 Gate 3).
 * @throws {IdentityResolutionError} 401 unauthenticated / 403 no membership
 *         or tenant mismatch.
 */
export async function resolveSessionIdentity(
  requestedTenantId?: string | null,
): Promise<IdentityContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Null userId → core resolver raises UNAUTHENTICATED (401).
  if (!user) {
    return resolveIdentityContext({
      userId: null,
      source: resolveFromArrays([], []),
    });
  }

  const [staffRes, ownedRes] = await Promise.all([
    supabaseAdmin
      .from('tenant_users')
      .select('id, tenant_id, role_code')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('tenants')
      .select('id, tenant_code')
      .eq('user_id', user.id),
  ]);

  const source = resolveFromArrays(staffRes.data ?? [], ownedRes.data ?? []);
  return resolveIdentityContext({ userId: user.id, requestedTenantId, source });
}
