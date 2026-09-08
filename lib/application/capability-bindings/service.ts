/**
 * Sentralogis — Phase 4B-4 / U-06
 * lib/application/capability-bindings/service.ts
 *
 * Capability Binding Lifecycle orchestration.
 *
 * Flow (mandate §9):
 *   PATCH route (thin)
 *     → IdentityContext (U-01) → assertPermission('commercial:manage') (U-02)
 *     → parsePatch (status ONLY — mass-assignment guarded)
 *     → load binding (tenant+WO scoped; non-leaking 404)
 *     → resolveCapability (U-05 REGISTRY AUTHORITY)
 *     → same-state → NO_OP (idempotent, zero events — documented §14 decision)
 *     → domain transitionStatus (single source of transition rules)
 *     → ATOMIC persist + outbox event (migration 016 function, optimistic guard)
 *
 * The HTTP route contains NO transition rules. Transition rules live in the
 * domain service (CapabilityBindingService.transitionStatus) and are NOT
 * duplicated here.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { ERR_UNAUTHENTICATED } from '@/lib/application/identity/errors';
import { CapabilityBindingService } from '@/lib/domain/commercial/capability-binding-service';
import { CapabilityBindingError } from '@/lib/domain/commercial/capability-binding-service';
import type {
  CommercialCapabilityBinding,
  CapabilityBindingStatus,
} from '@/lib/domain/commercial/types';
import { resolveCapability } from '@/lib/application/capabilities/registry';
import { getBindingLifecycleRepository } from './repository';
import type { BindingRow } from './repository';
import {
  BINDING_STATUSES,
  EVENT_NAME_BY_STATUS,
  FORBIDDEN_PATCH_FIELDS,
  CapabilityBindingStatusPatch,
  CapabilityBindingView,
  BindingLifecycleError,
  TransitionResult,
} from './types';

/* ------------------------------------------------------------------ */
/*  PATCH DTO parsing (§10/§11 — lifecycle ONLY)                       */
/* ------------------------------------------------------------------ */

export function parseLifecyclePatch(body: unknown): CapabilityBindingStatusPatch {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BindingLifecycleError(
      'INVALID_BODY',
      400,
      'Request body must be a JSON object with a single "status" field.',
    );
  }

  const raw = body as Record<string, unknown>;
  const keys = Object.keys(raw);

  const forbidden = keys.filter(k => FORBIDDEN_PATCH_FIELDS.includes(k));
  if (forbidden.length > 0) {
    throw new BindingLifecycleError(
      'INVALID_BODY',
      400,
      `Fields are not mutable through the lifecycle endpoint: ${forbidden.join(', ')}.`,
    );
  }

  if (keys.length !== 1 || !('status' in raw)) {
    throw new BindingLifecycleError(
      'INVALID_BODY',
      400,
      'Only {"status": <lifecycle status>} is accepted.',
    );
  }

  const status = raw.status;
  if (typeof status !== 'string' || !(BINDING_STATUSES as readonly string[]).includes(status)) {
    throw new BindingLifecycleError(
      'INVALID_STATUS',
      400,
      `status must be one of: ${BINDING_STATUSES.join(', ')}.`,
    );
  }

  return { status: status as CapabilityBindingStatus };
}

/* ------------------------------------------------------------------ */
/*  View projection                                                    */
/* ------------------------------------------------------------------ */

function toView(row: BindingRow): CapabilityBindingView {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    capabilityCode: row.capability_type,
    status: row.status,
    currency: row.currency,
    activatedAt: row.activated_at,
    completedAt: row.completed_at,
    deactivatedAt: row.deactivated_at,
  };
}

function rowToDomainEntity(row: BindingRow): CommercialCapabilityBinding {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    work_order_id: row.work_order_id,
    capability_type: row.capability_type as CommercialCapabilityBinding['capability_type'],
    status: row.status,
    scope: {},
    pricing: {},
    currency: row.currency,
    activated_at: row.activated_at,
    completed_at: row.completed_at,
    deactivated_at: row.deactivated_at,
    metadata: {},
    created_at: row.activated_at,
    updated_at: row.activated_at,
    created_by: null,
  };
}

/**
 * Idempotency decision (mandate §14): requesting a transition to the CURRENT
 * status is a NO_OP — 200 with the unchanged binding and ZERO outbox events.
 * Rationale: lifecycle transitions are business facts; re-asserting an
 * already-held fact is not a new fact. Duplicate events would double-count
 * downstream consumers.
 */
export async function transitionBinding(
  ctx: IdentityContext,
  workOrderId: string,
  bindingId: string,
  body: unknown,
): Promise<TransitionResult> {
  // ---- Gate 0: authentication (explicit; assertPermission covers authority) ----
  if (!ctx || !ctx.userId) {
    throw ERR_UNAUTHENTICATED();
  }
  // ---- Gate 1: manage authorization (U-02) ----
  assertPermission(ctx, 'commercial:manage');

  // ---- Gate 2: DTO validation BEFORE any database access ----
  const patch = parseLifecyclePatch(body);

  const repo = getBindingLifecycleRepository();

  // ---- Gate 3: tenant-scoped lookup (non-leaking cross-tenant semantics) ----
  const row = await repo.findBinding(ctx.tenantId, workOrderId, bindingId);
  if (!row) {
    throw new BindingLifecycleError(
      'BINDING_NOT_FOUND',
      404,
      'Capability binding was not found under this work order.',
    );
  }

  // ---- Gate 4: REGISTRY AUTHORITY (U-05) — never a hard-coded vocabulary ----
  // Validates that the bound capability still exists and is ACTIVE in the
  // canonical registry. Case normalization follows U-05 semantics.
  try {
    await resolveCapability(ctx, row.capability_type);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'UNKNOWN_CAPABILITY') {
      throw new BindingLifecycleError(
        'UNKNOWN_CAPABILITY',
        409,
        `Bound capability "${row.capability_type}" is not registered in the canonical registry.`,
      );
    }
    if (code === 'INACTIVE_CAPABILITY') {
      throw new BindingLifecycleError(
        'INACTIVE_CAPABILITY',
        409,
        `Bound capability "${row.capability_type}" is currently inactive in the registry.`,
      );
    }
    throw err;
  }

  // ---- Idempotent no-op path (documented decision) ----
  if (patch.status === row.status) {
    return { action: 'NO_OP', binding: toView(row) };
  }

  // ---- Transition validation via the DOMAIN state machine (single source) ----
  try {
    CapabilityBindingService.transitionStatus(rowToDomainEntity(row), patch.status);
  } catch (err) {
    if (err instanceof CapabilityBindingError) {
      throw new BindingLifecycleError(
        'INVALID_TRANSITION',
        409,
        err.message,
      );
    }
    throw err;
  }

  // ---- ATOMIC persist + outbox emission (optimistic previous-status guard) ----
  const outcome = await repo.transitionAtomic({
    bindingId: row.id,
    tenantId: ctx.tenantId,
    expectedStatus: row.status,
    newStatus: patch.status,
    eventName: EVENT_NAME_BY_STATUS[patch.status],
    actor: ctx.userId,
    correlationId: row.work_order_id,
  });

  if (outcome.outcome !== 'TRANSITIONED' || !outcome.updated) {
    // A concurrent writer changed the binding between read and write.
    throw new BindingLifecycleError(
      'CONCURRENT_MODIFICATION',
      409,
      'Binding was modified concurrently; reload and retry.',
    );
  }

  return { action: 'TRANSITIONED', binding: toView(outcome.updated) };
}
