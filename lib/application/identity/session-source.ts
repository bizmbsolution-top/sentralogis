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
import type { NextRequest } from 'next/server';

function extractBearerToken(request?: NextRequest): string | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim() || null;
}

/**
 * Resolve the trusted IdentityContext from the incoming request session.
 *
 * @param requestedTenantId optional client-requested tenant — validated,
 *        never trusted (U-01 Gate 3).
 * @param request optional NextRequest for Bearer token extraction (API routes).
 * @throws {IdentityResolutionError} 401 unauthenticated / 403 no membership
 *         or tenant mismatch.
 */
export async function resolveSessionIdentity(
  requestedTenantId?: string | null,
  request?: NextRequest,
): Promise<IdentityContext> {
  const supabase = await createClient();
  
  const bearerToken = extractBearerToken(request);
  
  let user;
  if (bearerToken) {
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(bearerToken);
    user = adminUser;
  } else {
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

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
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabaseAdmin
      .from('tenants')
      .select('id, tenant_code')
      .eq('user_id', user.id),
  ]);

  const source = resolveFromArrays(staffRes.data ?? [], ownedRes.data ?? []);
  return resolveIdentityContext({ userId: user.id, requestedTenantId, source });
}
