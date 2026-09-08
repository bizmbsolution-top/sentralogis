/**
 * Sentralogis — Phase 4B-4 / U-06
 * lib/application/capability-bindings/repository.ts
 *
 * Lifecycle persistence boundary. All operations are tenant-scoped by
 * construction. The production transition delegates to the ATOMIC
 * SECURITY DEFINER function fn_transition_capability_binding (migration 016)
 * which performs UPDATE + outbox INSERT in one transaction with an optimistic
 * previous-status guard.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CapabilityBindingStatus } from '@/lib/domain/commercial/types';

export interface BindingRow {
  id: string;
  tenant_id: string;
  work_order_id: string;
  capability_type: string;
  status: CapabilityBindingStatus;
  currency: string;
  activated_at: string;
  completed_at: string | null;
  deactivated_at: string | null;
}

export interface TransitionAtomicParams {
  bindingId: string;
  tenantId: string;
  expectedStatus: string;
  newStatus: string;
  eventName: string;
  actor: string;
  correlationId: string;
}

export interface TransitionAtomicResult {
  outcome: 'TRANSITIONED' | 'NOT_FOUND_OR_STALE';
  updated?: BindingRow;
}

export interface BindingLifecycleRepository {
  findBinding(tenantId: string, workOrderId: string, bindingId: string): Promise<BindingRow | null>;
  transitionAtomic(params: TransitionAtomicParams): Promise<TransitionAtomicResult>;
}

/* ------------------------------------------------------------------ */
/*  Production implementation                                          */
/* ------------------------------------------------------------------ */

export const supabaseBindingLifecycleRepository: BindingLifecycleRepository = {
  async findBinding(tenantId, workOrderId, bindingId) {
    const { data, error } = await supabaseAdmin
      .from('commercial_capability_bindings')
      .select(
        'id, tenant_id, work_order_id, capability_type, status, currency, activated_at, completed_at, deactivated_at',
      )
      .eq('id', bindingId)
      .eq('work_order_id', workOrderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as BindingRow;
  },

  async transitionAtomic(params) {
    const { data, error } = await supabaseAdmin.rpc('fn_transition_capability_binding', {
      p_binding_id: params.bindingId,
      p_tenant_id: params.tenantId,
      p_expected_status: params.expectedStatus,
      p_new_status: params.newStatus,
      p_event_name: params.eventName,
      p_actor: params.actor,
      p_correlation_id: params.correlationId,
      p_payload: {},
    });

    if (error) throw new Error(`transitionAtomic: ${error.message}`);
    const result = (data ?? {}) as Record<string, unknown>;
    if (result.outcome !== 'TRANSITIONED') return { outcome: 'NOT_FOUND_OR_STALE' };

    // Re-read for a stable view projection (function returned identity fields).
    const row = await this.findBinding(params.tenantId, params.correlationId, params.bindingId);
    return { outcome: 'TRANSITIONED', updated: row ?? undefined };
  },
};

/* ------------------------------------------------------------------ */
/*  Injection seam for tests                                           */
/* ------------------------------------------------------------------ */

let _repo: BindingLifecycleRepository = supabaseBindingLifecycleRepository;

/** Override the repository for testing. Pass null to restore production. */
export function _setBindingLifecycleRepository(repo: BindingLifecycleRepository | null): void {
  _repo = repo ?? supabaseBindingLifecycleRepository;
}

export function getBindingLifecycleRepository(): BindingLifecycleRepository {
  return _repo;
}
