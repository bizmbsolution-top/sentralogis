/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * Domain: Commercial Capability Binding
 * File: lib/domain/commercial/capability-binding-service.ts
 * Description: Capability lifecycle management for progressive service composition
 *
 * ADR-018: Reuses commercial_work_orders as the engagement root.
 * ADR-020: UNIQUE(tenant_id, work_order_id, capability_type) enforced.
 *
 * This service does NOT own customs, forwarding, trucking, or warehouse records.
 * It only manages the capability registry that tracks which service capabilities
 * are active under a commercial work order.
 */

import {
  CommercialCapabilityBinding,
  CreateCapabilityBindingDTO,
  CapabilityType,
  CapabilityBindingStatus,
} from './types';
import { isValidCapabilityCode } from './capability-code-source';

// ============================================================================
// FACTORY
// ============================================================================

export class CapabilityBindingFactory {
  /**
   * Constructs a capability binding entity from a DTO.
   * Does NOT persist — caller must save to DB.
   */
  public static create(dto: CreateCapabilityBindingDTO): CommercialCapabilityBinding {
    const errors: string[] = [];
    if (!dto.tenant_id) errors.push('tenant_id is required');
    if (!dto.work_order_id) errors.push('work_order_id is required');
    if (!dto.capability_type) errors.push('capability_type is required');

    const validTypes: CapabilityType[] = ['CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE'];
    // U-05 seam: validation authority is injectable (capability-code-source).
    // Default = the static four types, so behavior is unchanged until the
    // application registry explicitly syncs itself in.
    if (!isValidCapabilityCode(dto.capability_type)) {
      errors.push(`capability_type must be one of: ${validTypes.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new CapabilityBindingError(errors.join('; '));
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    return {
      id,
      tenant_id: dto.tenant_id,
      work_order_id: dto.work_order_id,
      capability_type: dto.capability_type,
      status: 'ACTIVE',
      scope: dto.scope || {},
      pricing: dto.pricing || {},
      currency: dto.currency || 'IDR',
      activated_at: now,
      completed_at: null,
      deactivated_at: null,
      metadata: dto.metadata || {},
      created_at: now,
      updated_at: now,
      created_by: dto.created_by || null,
    };
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export class CapabilityBindingService {
  /**
   * Activates a new capability on a commercial work order (engagement).
   *
   * Enforces ADR-020: UNIQUE(tenant_id, work_order_id, capability_type).
   * If the same capability already exists and is ACTIVE, returns it (idempotent).
   * If it exists but is CANCELLED/SUSPENDED, reactivates it.
   *
   * @param dto  The capability binding to create
   * @param existingBindings  Current bindings on the work order (loaded from DB by caller)
   * @returns The created or reactivated binding, plus an action indicator
   */
  public static activateCapability(
    dto: CreateCapabilityBindingDTO,
    existingBindings: CommercialCapabilityBinding[]
  ): { binding: CommercialCapabilityBinding; action: 'CREATED' | 'ALREADY_ACTIVE' | 'REACTIVATED' } {
    // Check for existing binding of same type on same work order
    const existing = existingBindings.find(
      b => b.work_order_id === dto.work_order_id &&
           b.capability_type === dto.capability_type &&
           b.tenant_id === dto.tenant_id
    );

    if (existing) {
      if (existing.status === 'ACTIVE') {
        // Idempotent: already active, return as-is
        return { binding: existing, action: 'ALREADY_ACTIVE' };
      }

      // Reactivate cancelled/suspended binding
      const now = new Date().toISOString();
      const reactivated: CommercialCapabilityBinding = {
        ...existing,
        status: 'ACTIVE',
        activated_at: now,
        deactivated_at: null,
        updated_at: now,
      };
      return { binding: reactivated, action: 'REACTIVATED' };
    }

    // Create new binding
    const binding = CapabilityBindingFactory.create(dto);
    return { binding, action: 'CREATED' };
  }

  /**
   * Transitions a capability binding to a new status.
   */
  public static transitionStatus(
    binding: CommercialCapabilityBinding,
    targetStatus: CapabilityBindingStatus
  ): CommercialCapabilityBinding {
    const validTransitions: Record<CapabilityBindingStatus, CapabilityBindingStatus[]> = {
      ACTIVE: ['SUSPENDED', 'COMPLETED', 'CANCELLED'],
      SUSPENDED: ['ACTIVE', 'CANCELLED'],
      COMPLETED: [], // Terminal
      CANCELLED: ['ACTIVE'], // Allow reactivation
    };

    const allowed = validTransitions[binding.status];
    if (!allowed.includes(targetStatus)) {
      throw new CapabilityBindingError(
        `Cannot transition capability from ${binding.status} to ${targetStatus}`
      );
    }

    const now = new Date().toISOString();
    return {
      ...binding,
      status: targetStatus,
      completed_at: targetStatus === 'COMPLETED' ? now : binding.completed_at,
      deactivated_at: targetStatus === 'CANCELLED' || targetStatus === 'SUSPENDED' ? now : binding.deactivated_at,
      updated_at: now,
    };
  }

  /**
   * Lists all bindings for a work order, optionally filtered by type or status.
   */
  public static filterBindings(
    bindings: CommercialCapabilityBinding[],
    filters?: { capability_type?: CapabilityType; status?: CapabilityBindingStatus }
  ): CommercialCapabilityBinding[] {
    let result = [...bindings];
    if (filters?.capability_type) {
      result = result.filter(b => b.capability_type === filters.capability_type);
    }
    if (filters?.status) {
      result = result.filter(b => b.status === filters.status);
    }
    return result;
  }

  /**
   * Checks if a specific capability type is active on a work order.
   */
  public static hasActiveCapability(
    bindings: CommercialCapabilityBinding[],
    capabilityType: CapabilityType
  ): boolean {
    return bindings.some(
      b => b.capability_type === capabilityType && b.status === 'ACTIVE'
    );
  }

  /**
   * Resolves all active capability types for a work order.
   */
  public static resolveActiveCapabilities(
    bindings: CommercialCapabilityBinding[]
  ): CapabilityType[] {
    return bindings
      .filter(b => b.status === 'ACTIVE')
      .map(b => b.capability_type);
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class CapabilityBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityBindingError';
  }
}
