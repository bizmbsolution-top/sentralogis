/**
 * Sentralogis — Phase 3 / Unit 2
 * lib/work-order/mutation-types.ts
 *
 * Canonical Work Order mutation types for the WO/JO Operational Mutation boundary.
 *
 * MUTATION AUTHORITY: Canonical Unit 2 mutation authority.
 * Every command represents explicit business intent.
 * No generic CRUD abstraction.
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All mutations include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any mutation.
 * - Cross-tenant access is impossible (tenant filters on every mutation).
 */

import type { WorkOrder, JobOrder } from './types';

// ============================================================================
// WORK ORDER MUTATION COMMANDS
// ============================================================================

export type WoMutationCommand =
  | 'WO_CREATE'
  | 'WO_UPDATE'
  | 'WO_TRANSITION'
  | 'WO_CANCEL'
  | 'WO_COMMITMENT_UPDATE'
  // SO-Mandatory Trucking Slice 1 (Phase 3C — authorized)
  | 'WO_ITEM_UPSERT'
  | 'JO_CREATE';

// ============================================================================
// SLICE 1 OUTCOME CONTRACT (Phase 3C / L3)
// ============================================================================

export type MutationOutcome = 'SUCCEEDED' | 'FAILED' | 'PARTIAL' | 'UNKNOWN';

export interface MutationStage {
  stage: string;
  status: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  id?: string;
  error?: string;
}

// ============================================================================
// JOB ORDER MUTATION COMMANDS (Human-Operated)
// ============================================================================

export type JoMutationCommand =
  | 'ASSIGN_DRIVER'
  | 'REPLACE_DRIVER'
  | 'CANCEL_JOB'
  | 'ACCEPT_JOB'
  | 'START_JOB'
  | 'STATUS_TRANSITION';

// ============================================================================
// WORK ORDER MUTATION DTOs
// ============================================================================

export interface WoCreateInput {
  woNumber: string;
  customerId: string;
  /**
   * SO-Mandatory (Phase 3C): every new WO created through the authorized slice
   * must reference a tenant-owned, eligible Sales Order. Server-side validation
   * re-verifies tenant ownership, eligibility status, and customer consistency.
   * Interim evidence-grade only: the SO id is recorded in `work_order_audit.new_state`;
   * it is NOT a permanent foreign-key relationship.
   */
  salesOrderId: string;
  status?: string;
  orderDate?: string;
  executionDate?: string;
  executionTime?: string;
  orderTime?: string | null;
  regionId?: string | null;
  targetFulfillmentDate?: string;
  notes?: string | null;
  transporterId?: string | null;
  items?: WoItemCreateInput[];
}

// ============================================================================
// SLICE 1 INPUTS (Phase 3C — PROPOSED commands, server-side boundary)
// ============================================================================

export interface WoManifestInput {
  productSkuId?: string | null;
  quantity?: number | null;
  unitWeightKg?: number | null;
  unitVolumeM3?: number | null;
  notes?: string | null;
  locationCode?: string | null;
  inventoryId?: string | null;
  batchNumber?: string | null;
  earliestExpiry?: string | null;
}

export interface WoItemUpsertItemInput {
  /** Stable client-side key used to reconcile results across retries. */
  clientKey: string;
  /** Existing wo_items.id (update path). Must resolve within the authorized tenant. */
  id?: string | null;
  itemCode?: string | null;
  sbuType: 'FORWARDING' | 'CUSTOMS' | 'TRUCKING' | 'WAREHOUSE';
  maxJoCount?: number | null;
  unitPrice?: number | null;
  totalRevenue?: number | null;
  status?: string | null;
  itemData?: Record<string, unknown> | null;
  /** Conditional side effect: replaced when provided (delete-then-insert). */
  manifests?: WoManifestInput[] | null;
}

export interface WoItemUpsertInput {
  workOrderId: string;
  items: WoItemUpsertItemInput[];
}

export interface JobRouteInput {
  sequence?: number | null;
  stopType?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  locationName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  status?: string | null;
}

export interface JoCreateInput {
  /** Required wo_item_id — JO may never exist detached from its WO item. */
  woItemId: string;
  /** Caller-computed official JO number (natural key: UNIQUE(tenant_id, jo_number)). */
  joNumber: string;
  sbuType?: string | null;
  status?: string | null;
  totalStops?: number | null;
  /** Conditional trucking side effect: replaced (delete-then-insert) for this JO. */
  routes?: JobRouteInput[] | null;
}

export interface WoItemUpsertResultItem {
  clientKey: string;
  id: string | null;
  status: 'SUCCEEDED' | 'FAILED';
  error?: string;
}

export interface WoItemCreateInput {
  itemCode?: string | null;
  sbuType: 'FORWARDING' | 'CUSTOMS' | 'TRUCKING' | 'WAREHOUSE';
  maxJoCount?: number | null;
  unitPrice?: number | null;
  totalRevenue?: number | null;
  itemData?: Record<string, unknown> | null;
}

export interface WoUpdateInput {
  woNumber?: string;
  customerId?: string;
  status?: string;
  orderDate?: string;
  executionDate?: string;
  executionTime?: string;
  targetFulfillmentDate?: string;
  notes?: string | null;
  transporterId?: string | null;
}

export interface WoTransitionInput {
  newStatus: string;
  reason?: string | null;
}

export interface WoCancelInput {
  reason: string;
}

export interface WoCommitmentUpdateInput {
  basePrice?: number;
  purchasePrice?: number;
  vendorPrice?: number;
  notes?: string | null;
}

// ============================================================================
// JOB ORDER MUTATION DTOs (Human-Operated)
// ============================================================================

export interface JoAssignDriverInput {
  driverId: string;
  fleetId?: string | null;
  transporterId?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
}

export interface JoReplaceDriverInput {
  newDriverId: string;
  newFleetId?: string | null;
  newTransporterId?: string | null;
  reason?: string | null;
}

export interface JoCancelInput {
  reason: string;
}

export interface JoAcceptInput {
  notes?: string | null;
}

export interface JoStartInput {
  notes?: string | null;
}

export interface JoStatusTransitionInput {
  newStatus: string;
  reason?: string | null;
}

// ============================================================================
// MUTATION RESULT TYPES
// ============================================================================

export interface WoMutationResult {
  success: boolean;
  workOrder?: WorkOrder;
  jobOrder?: JobOrder;
  items?: WoItemUpsertResultItem[];
  outcome?: MutationOutcome;
  stages?: MutationStage[];
  error?: string;
  code?: WoMutationErrorCode;
  auditId?: string;
}

export interface JoMutationResult {
  success: boolean;
  jobOrder?: JobOrder;
  error?: string;
  code?: JoMutationErrorCode;
  auditId?: string;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export type WoMutationErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'TENANT_MISMATCH'
  | 'DUPLICATE'
  | 'DATABASE_ERROR'
  | 'CONFIRMATION_REQUIRED'
  | 'IDEMPOTENCY_VIOLATION'
  | 'UNKNOWN_COMMAND'
  // SO-Mandatory Slice 1 (Phase 3C)
  | 'SO_REQUIRED'
  | 'SO_NOT_FOUND'
  | 'SO_STATUS_INELIGIBLE'
  | 'SO_CUSTOMER_MISMATCH'
  | 'IDEMPOTENCY_CONFLICT'
  | 'OPERATION_IN_PROGRESS'
  | 'PARTIAL';

export type JoMutationErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'TENANT_MISMATCH'
  | 'DUPLICATE'
  | 'DATABASE_ERROR'
  | 'CONFIRMATION_REQUIRED'
  | 'IDEMPOTENCY_VIOLATION';

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class WoMutationError extends Error {
  constructor(
    public readonly code: WoMutationErrorCode,
    public readonly statusCode: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'WoMutationError';
  }
}

export class JoMutationError extends Error {
  constructor(
    public readonly code: JoMutationErrorCode,
    public readonly statusCode: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'JoMutationError';
  }
}

// ============================================================================
// AUDIT RECORD
// ============================================================================

export interface MutationAuditRecord {
  id: string;
  tenantId: string;
  actorId: string;
  command: string;
  targetId: string;
  targetType: 'WORK_ORDER' | 'WORK_ORDER_ITEM' | 'JOB_ORDER';
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  reason?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  source: string;
  createdAt: string;
}

// ============================================================================
// IDEMPOTENCY RECORD
// ============================================================================

export interface IdempotencyRecord {
  tenantId: string;
  idempotencyKey: string;
  command: string;
  targetIdentity?: string | null;
  payloadHash: string;
  executionStatus: 'IN_PROGRESS' | 'COMPLETED';
  result?: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}