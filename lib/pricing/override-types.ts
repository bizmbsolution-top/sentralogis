/**
 * Sentralogis — Phase 5C-4
 * lib/pricing/override-types.ts
 *
 * Canonical Price Override types (ADR-063).
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

import type { PricingCapabilityType, PricingSide } from './types';

// ============================================================================
// OVERRIDE STATUS
// ============================================================================

export type PricingOverrideStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED';

// ============================================================================
// PRICE OVERRIDE ENTITY
// ============================================================================

export interface PricingOverride {
  id: string;
  tenantId: string;
  salesOrderId: string;
  soLineItemId: string | null;
  sourceQuoteItemId: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  originalCalculatedPrice: number;
  overridePrice: number;
  currency: string;
  unitOfMeasure: string;
  varianceAmount: number;
  variancePercentage: number | null;
  reason: string;
  status: PricingOverrideStatus;
  requesterId: string;
  requestedAt: string;
  approverId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — from IdentityContext)
// ============================================================================

export interface RequestOverrideInput {
  salesOrderId: string;
  soLineItemId?: string | null;
  sourceQuoteItemId?: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  originalCalculatedPrice: number;
  overridePrice: number;
  currency: string;
  unitOfMeasure: string;
  reason: string;
}

export interface ApproveOverrideInput {
  overrideId: string;
}

export interface RejectOverrideInput {
  overrideId: string;
  rejectionReason: string;
}

export interface ApplyOverrideInput {
  overrideId: string;
}

export interface CancelOverrideInput {
  overrideId: string;
}

// ============================================================================
// THRESHOLD GOVERNANCE
// ============================================================================

export interface ThresholdResult {
  varianceAmount: number;
  variancePercentage: number | null;
  approvalRequired: boolean;
  autoApprove: boolean;
  threshold: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface RequestOverrideResult {
  override: PricingOverride;
  threshold: ThresholdResult;
  approvalRequired: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type PricingOverrideErrorCode =
  | 'OVERRIDE_NOT_FOUND'
  | 'OVERRIDE_NOT_OWNED'
  | 'INVALID_TRANSITION'
  | 'ALREADY_APPLIED'
  | 'SO_LINE_IMMUTABLE'
  | 'UNAUTHORIZED_REQUEST'
  | 'UNAUTHORIZED_APPROVE'
  | 'SELF_APPROVAL'
  | 'DATABASE_ERROR';

export class PricingOverrideError extends Error {
  constructor(
    public readonly code: PricingOverrideErrorCode,
    public readonly statusCode: 400 | 403 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'PricingOverrideError';
  }
}
