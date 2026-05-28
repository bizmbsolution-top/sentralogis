import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthProfileLike } from './roles';
import { isGlobalRole } from './roles';

export interface TenantContext {
  tenantId: string;
  isGlobalFallback: boolean;
}

export async function resolveTenantContext(
  profile: AuthProfileLike,
  supabase: SupabaseClient
): Promise<TenantContext | null> {
  if (profile.tenant_id) {
    return { tenantId: profile.tenant_id, isGlobalFallback: false };
  }

  if (!isGlobalRole(profile)) {
    return null;
  }

  const { data, error } = await supabase.from('tenants').select('id').limit(1);
  if (error || !data?.length) {
    return null;
  }

  return { tenantId: data[0].id, isGlobalFallback: true };
}
