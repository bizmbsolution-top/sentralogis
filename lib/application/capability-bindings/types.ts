/**
 * Sentralogis — Phase 4B-4 / U-06
 * lib/application/capability-bindings/types.ts
 *
 * Capability Binding LIFECYCLE contracts.
 *
 * Core rule (mandate §4):
 *   Registry  = WHAT capabilities exist        (global, U-05)
 *   Binding   = WHETHER a tenant provides it   (tenant-scoped, THIS unit)
 *
 * The lifecycle controls the RELATIONSHIP only. It never mutates capability
 * definitions, engagements, work orders, or any execution domain.
 */

import type { CapabilityBindingStatus } from '@/lib/domain/commercial/types';
import type { CapabilityCode } from '@/lib/application/capabilities/types';

/** Canonical binding states — derived from migration 013 / domain types (§8). */
export const BINDING_STATUSES: readonly CapabilityBindingStatus[] = [
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
];

/**
 * Canonical outbox event per target status.
 * Naming follows the established dotted canonical style
 * (`customs.declaration.status_changed` family).
 * Reactivation (CANCELLED→ACTIVE) is expressed by `activated` +
 * `previous_status` in the payload — one fact per outcome.
 */
export const EVENT_NAME_BY_STATUS: Record<CapabilityBindingStatus, string> = {
  ACTIVE: 'capability.binding.activated',
  SUSPENDED: 'capability.binding.suspended',
  COMPLETED: 'capability.binding.completed',
  CANCELLED: 'capability.binding.cancelled',
};

// ============================================================================
// PATCH DTO — lifecycle ONLY (§10/§11)
// ============================================================================

/** The PATCH contract accepts NOTHING except a lifecycle status. */
export interface CapabilityBindingStatusPatch {
  status: CapabilityBindingStatus;
}

/** Fields that may NEVER appear in a lifecycle PATCH body (mass-assignment guard). */
export const FORBIDDEN_PATCH_FIELDS: readonly string[] = [
  'id',
  'tenant_id',
  'tenantId',
  'work_order_id',
  'workOrderId',
  'capability_type',
  'capabilityType',
  'capability_id',
  'capabilityId',
  'capability_code',
  'capabilityCode',
  'scope',
  'pricing',
  'currency',
  'metadata',
  'activated_at',
  'completed_at',
  'deactivated_at',
  'created_at',
  'created_by',
];

// ============================================================================
// VIEWS / RESULTS
// ============================================================================

export interface CapabilityBindingView {
  id: string;
  workOrderId: string;
  capabilityCode: CapabilityCode | string;
  status: CapabilityBindingStatus;
  currency: string;
  activatedAt: string;
  completedAt: string | null;
  deactivatedAt: string | null;
}

export interface TransitionResult {
  /** 'TRANSITIONED' = persisted + one outbox event · 'NO_OP' = same-state, zero side effects. */
  action: 'TRANSITIONED' | 'NO_OP';
  binding: CapabilityBindingView;
}

// ============================================================================
// ERRORS (§15)
// ============================================================================

export type BindingLifecycleErrorCode =
  | 'INVALID_BODY'
  | 'INVALID_STATUS'
  | 'BINDING_NOT_FOUND'
  | 'UNKNOWN_CAPABILITY'
  | 'INACTIVE_CAPABILITY'
  | 'INVALID_TRANSITION'
  | 'CONCURRENT_MODIFICATION';

export class BindingLifecycleError extends Error {
  constructor(
    public readonly code: BindingLifecycleErrorCode,
    public readonly statusCode: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'BindingLifecycleError';
  }
}
