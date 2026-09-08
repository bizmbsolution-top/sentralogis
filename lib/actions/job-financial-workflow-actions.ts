'use server';

// SENTRALOGIS — DATA-4E X6 R2
// Server actions for canonical job financial workflow classification (ADR-080).
// Auth pattern: server-side auth user check + profile.tenant_id derivation.
// Tenant: server-derived from profile.tenant_id (IdentityContext preserved).

import { createAdminClient } from '@/lib/supabase/admin';
import { JobFinancialWorkflowService } from '@/lib/domain/job/job-financial-workflow-service';
import { EntityOwnershipService } from '@/lib/domain/entity/entity-ownership-service';
import type { JobFinancialClassification, FinancialWorkflow } from '@/lib/domain/job/job-financial-workflow-service';
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

export async function classifyJobFinancialWorkflow(jobId: string): Promise<ServerActionResult<JobFinancialClassification>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const { data: job, error } = await ctx.supabase
      .from('job_orders')
      .select('purchase_price, driver_share_percentage')
      .eq('tenant_id', ctx.tenant_id)
      .eq('id', jobId)
      .maybeSingle();

    if (error) throw error;
    if (!job) return { ok: false, error: 'Job not found' };

    const ownershipService = new EntityOwnershipService(ctx.supabase as any);
    const workflowService = new JobFinancialWorkflowService(ctx.supabase as any, ownershipService);
    const result = workflowService.classifyJobFinancialWorkflow(job);
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function determineWorkflowAtAssignment(
  transporterId: string,
  driverSharePct: number,
): Promise<ServerActionResult<{ workflow: FinancialWorkflow }>> {
  try {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ctx = await resolveTenantForActor(user.id);
    if (!ctx) return { ok: false, error: 'No tenant in profile' };

    const ownershipService = new EntityOwnershipService(ctx.supabase as any);
    const workflowService = new JobFinancialWorkflowService(ctx.supabase as any, ownershipService);
    const result = await workflowService.determineWorkflowAtAssignment(ctx.tenant_id, transporterId, driverSharePct);
    return { ok: true, data: { workflow: result.workflow } };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
