/**
 * lib/application/identity/master-data-server.ts
 *
 * SERVER-ONLY Master Data authorization. Uses the trusted, session-derived
 * IdentityContext (cookie session + tenant membership). Never reads role,
 * tenant or permission from the browser.
 */

import { resolveSessionIdentity } from './session-source';
import { IdentityResolutionError } from './errors';
import { canAccessAnyMasterData } from './master-data-guard';
import type { MasterDataAction, MasterDataCategory } from './master-data-permissions';
import type { IdentityContext } from './types';

export type MasterDataAccessResult =
  | { ok: true; ctx: IdentityContext }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolve the caller from the live session and check Master Data access.
 * Allowed when the role may perform `action` on ANY of `categories`.
 */
export async function requireMasterDataAccess(
  categories: readonly MasterDataCategory[],
  action: MasterDataAction = 'read',
): Promise<MasterDataAccessResult> {
  let ctx: IdentityContext;
  try {
    ctx = await resolveSessionIdentity();
  } catch (e) {
    if (e instanceof IdentityResolutionError) {
      return { ok: false, status: e.statusCode === 401 ? 401 : 403, error: e.message };
    }
    return { ok: false, status: 403, error: 'Unable to verify access.' };
  }
  if (!canAccessAnyMasterData(ctx.role, categories, action)) {
    return { ok: false, status: 403, error: 'Anda tidak memiliki akses ke Master Data ini.' };
  }
  return { ok: true, ctx };
}
