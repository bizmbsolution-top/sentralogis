/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * Domain: Commercial Capability Binding
 * File: lib/domain/commercial/types.ts
 * Description: Canonical types for progressive capability composition
 */

// ============================================================================
// CAPABILITY TYPES
// ============================================================================

export type CapabilityType = 'CUSTOMS' | 'FORWARDING' | 'TRUCKING' | 'WAREHOUSE';

export type CapabilityBindingStatus = 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';

// ============================================================================
// ENTITIES
// ============================================================================

export interface CommercialCapabilityBinding {
  id: string;
  tenant_id: string;
  work_order_id: string;
  capability_type: CapabilityType;
  status: CapabilityBindingStatus;
  scope: Record<string, unknown>;
  pricing: Record<string, unknown>;
  currency: string;
  activated_at: string;
  completed_at?: string | null;
  deactivated_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateCapabilityBindingDTO {
  tenant_id: string;
  work_order_id: string;
  capability_type: CapabilityType;
  scope?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  currency?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateCapabilityBindingStatusDTO {
  status: CapabilityBindingStatus;
  completed_at?: string;
  deactivated_at?: string;
}

// ============================================================================
// ATTACHMENT TYPES (Cross-Domain References)
// ============================================================================

export interface AttachmentCommand {
  declaration_id: string;
  tenant_id: string;
  user_id?: string;
}

export interface AttachShipmentCommand extends AttachmentCommand {
  shipment_id: string;
  execution_leg_id?: string;
}

export interface AttachTruckingCommand extends AttachmentCommand {
  job_order_id: string;
}

export interface AttachmentResult {
  success: boolean;
  action: 'ATTACHED' | 'ALREADY_ATTACHED' | 'CONFLICT' | 'NOT_FOUND' | 'FORBIDDEN';
  declaration_id: string;
  reference_type: 'SHIPMENT' | 'TRUCKING';
  reference_id: string;
  message: string;
}

// ============================================================================
// AUDIT EVENT TYPES (for composition changes)
// ============================================================================

export type CompositionAuditEventType =
  | 'CAPABILITY_ACTIVATED'
  | 'CAPABILITY_SUSPENDED'
  | 'CAPABILITY_COMPLETED'
  | 'CAPABILITY_CANCELLED'
  | 'CUSTOMS_ATTACHED_TO_SHIPMENT'
  | 'CUSTOMS_ATTACHED_TO_TRUCKING'
  | 'ATTACHMENT_CONFLICT_REJECTED'
  | 'CROSS_TENANT_ATTACHMENT_REJECTED';
