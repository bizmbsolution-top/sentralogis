// SENTRALOGIS — DATA-4E X1+X2
// Canonical Role Mutation Service with Dual-Write (X1 base + X2 compatibility projection)
//
// X1 BASE:
//   - Service class with assignRole() and revokeRole() methods
//   - Validation against PARTY_ROLE_TYPES vocabulary
//   - Tenant context resolution via resolveTenantContext (server-derived)
//   - Typed errors (RoleMutationError)
//   - Idempotency via PartyRoleService
//   - In-memory audit log
//
// X2 ADDITIONS:
//   - Compatibility projection to md_entities.is_* (4 legacy boolean fields)
//   - Two sequential Supabase calls (no atomic transaction in X2)
//   - Compensation log for X5 reconciliation when projection fails
//   - AuditEntryX2 with legacy_projection status (PENDING/SUCCESS/FAILED)
//
// NOT IN X2 SCOPE (deferred):
//   - True atomicity via Postgres function (requires DDL/migration)
//   - W2/W4 migration
//   - Reconciliation job
//   - Reader migration
//   - Persistent audit table

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PartyRole,
  PartyRoleType,
  PartyRoleContextType,
  CreatePartyRoleDTO,
} from './types';
import { PARTY_ROLE_TYPES, PARTY_ROLE_CONTEXT_TYPES } from './types';
import { PartyRoleService, PartyRoleError } from './party-role-service';
import { resolveTenantContext, TenantContext } from '../tenantContext';

// ========== X1 Types ==========

export class RoleMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleMutationError';
  }
}

export interface AssignRoleDTO extends CreatePartyRoleDTO {
  // actor is reserved for X2+ (audit trail enrichment).
}

export interface RevokeRoleDTO {
  party_id: string;
  role_type: PartyRoleType;
  context_type: PartyRoleContextType;
  context_id?: string | null;
}

export interface AuditEntry {
  timestamp: string;
  tenant_id: string;
  party_id: string;
  role_type: PartyRoleType;
  context_type: PartyRoleContextType;
  context_id: string | null;
  action: 'ASSIGN' | 'REVOKE';
  actor_id: string | null;
  tx_id: string;
  legacy_projection: string;
}

// ========== X2 Types ==========

export type LegacyProjectionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AuditEntryX2 extends AuditEntry {
  legacy_projection: LegacyProjectionStatus;
  legacy_error?: string;
}

const LEGACY_BOOLEAN_BY_ROLE: Partial<Record<PartyRoleType, 'is_vendor' | 'is_customer' | 'is_supplier' | 'is_broker'>> = {
  VENDOR: 'is_vendor',
  CUSTOMER: 'is_customer',
  SUPPLIER: 'is_supplier',
  BROKER: 'is_broker',
};

export class RoleMutationService {
  private readonly roleService: PartyRoleService;
  private readonly auditLog: AuditEntryX2[] = [];
  private readonly compensationLog: Array<{
    timestamp: string;
    tenant_id: string;
    party_id: string;
    role_type: PartyRoleType;
    context_type: PartyRoleContextType;
    legacy_projection: LegacyProjectionStatus;
    error?: string;
  }> = [];

  constructor(private readonly supabase: SupabaseClient) {
    this.roleService = new PartyRoleService(supabase);
  }

  async resolveContext(profile: { tenant_id: string | null; [k: string]: unknown }): Promise<TenantContext> {
    const ctx = await resolveTenantContext(profile as any, this.supabase);
    if (!ctx) {
      throw new RoleMutationError('Unable to resolve tenant context from profile');
    }
    return ctx;
  }

  private validateAssignDto(dto: AssignRoleDTO): void {
    const errors: string[] = [];
    if (!dto.party_id) errors.push('party_id is required');
    if (!dto.role_type) errors.push('role_type is required');
    if (!PARTY_ROLE_TYPES.includes(dto.role_type)) {
      errors.push(`role_type must be one of: ${PARTY_ROLE_TYPES.join(', ')}`);
    }
    if (!dto.context_type) errors.push('context_type is required');
    if (!PARTY_ROLE_CONTEXT_TYPES.includes(dto.context_type)) {
      errors.push(`context_type must be one of: ${PARTY_ROLE_CONTEXT_TYPES.join(', ')}`);
    }
    if (dto.context_type !== 'GLOBAL' && !dto.context_id) {
      errors.push('context_id is required for non-GLOBAL context types');
    }
    if (errors.length > 0) {
      throw new RoleMutationError(errors.join('; '));
    }
  }

  private async projectLegacy(
    tenantId: string,
    partyId: string,
    roleType: PartyRoleType,
    newActive: boolean,
  ): Promise<{ status: LegacyProjectionStatus; error?: string }> {
    const legacyField = LEGACY_BOOLEAN_BY_ROLE[roleType];
    if (!legacyField) {
      return { status: 'SUCCESS' };
    }
    try {
      const updatePayload: any = { [legacyField]: newActive };
      const result: any = await this.supabase
        .from('md_entities')
        .update(updatePayload)
        .eq('id', partyId)
        .eq('tenant_id', tenantId);
      if (result?.error) {
        return { status: 'FAILED', error: result.error.message };
      }
      return { status: 'SUCCESS' };
    } catch (e: any) {
      return { status: 'FAILED', error: e?.message || String(e) };
    }
  }

  async assignRole(tenantId: string, dto: AssignRoleDTO, actorId: string | null = null): Promise<PartyRole> {
    this.validateAssignDto(dto);
    if (!tenantId) {
      throw new RoleMutationError('tenantId is required (server-derived)');
    }

    let role: PartyRole;
    try {
      role = await this.roleService.createRole(tenantId, dto);
    } catch (e) {
      if (e instanceof PartyRoleError) {
        if (e.message.includes('already has this role')) {
          throw new RoleMutationError(`Role already assigned: ${dto.role_type} for party ${dto.party_id} in ${dto.context_type}`);
        }
        throw new RoleMutationError(`Canonical role write failed: ${e.message}`);
      }
      throw e;
    }

    const projection = await this.projectLegacy(tenantId, dto.party_id, dto.role_type, true);
    const entry: AuditEntryX2 = {
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      party_id: dto.party_id,
      role_type: dto.role_type,
      context_type: dto.context_type,
      context_id: dto.context_id ?? null,
      action: 'ASSIGN',
      actor_id: actorId,
      tx_id: this.newTxId(),
      legacy_projection: projection.status,
      legacy_error: projection.error,
    };
    this.auditLog.push(entry);
    this.compensationLog.push({
      timestamp: entry.timestamp,
      tenant_id: tenantId,
      party_id: dto.party_id,
      role_type: dto.role_type,
      context_type: dto.context_type,
      legacy_projection: projection.status,
      error: projection.error,
    });

    if (projection.status === 'FAILED') {
      throw new RoleMutationError(`Canonical role assigned but legacy projection FAILED for ${dto.role_type}: ${projection.error}`);
    }
    return role;
  }

  async revokeRole(tenantId: string, dto: RevokeRoleDTO, actorId: string | null = null): Promise<PartyRole> {
    if (!tenantId) {
      throw new RoleMutationError('tenantId is required (server-derived)');
    }
    if (!dto.party_id) {
      throw new RoleMutationError('party_id is required');
    }
    if (!PARTY_ROLE_TYPES.includes(dto.role_type)) {
      throw new RoleMutationError(`role_type must be one of: ${PARTY_ROLE_TYPES.join(', ')}`);
    }
    if (!PARTY_ROLE_CONTEXT_TYPES.includes(dto.context_type)) {
      throw new RoleMutationError(`context_type must be one of: ${PARTY_ROLE_CONTEXT_TYPES.join(', ')}`);
    }
    if (dto.context_type !== 'GLOBAL' && !dto.context_id) {
      throw new RoleMutationError('context_id is required for non-GLOBAL context types');
    }

    const { data: existing, error: fetchError } = await this.supabase
      .from('party_roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('party_id', dto.party_id)
      .eq('role_type', dto.role_type)
      .eq('context_type', dto.context_type)
      .is('context_id', dto.context_id ?? null)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      throw new RoleMutationError(`Failed to locate role: ${fetchError.message}`);
    }
    if (!existing) {
      throw new RoleMutationError(`No active role found to revoke: ${dto.role_type} for party ${dto.party_id} in ${dto.context_type}`);
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('party_roles')
      .update({ is_active: false })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      throw new RoleMutationError(`Failed to deactivate role: ${updateError.message}`);
    }

    const projection = await this.projectLegacy(tenantId, dto.party_id, dto.role_type, false);
    const entry: AuditEntryX2 = {
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      party_id: dto.party_id,
      role_type: dto.role_type,
      context_type: dto.context_type,
      context_id: dto.context_id ?? null,
      action: 'REVOKE',
      actor_id: actorId,
      tx_id: this.newTxId(),
      legacy_projection: projection.status,
      legacy_error: projection.error,
    };
    this.auditLog.push(entry);
    this.compensationLog.push({
      timestamp: entry.timestamp,
      tenant_id: tenantId,
      party_id: dto.party_id,
      role_type: dto.role_type,
      context_type: dto.context_type,
      legacy_projection: projection.status,
      error: projection.error,
    });

    if (projection.status === 'FAILED') {
      throw new RoleMutationError(`Canonical role revoked but legacy projection FAILED for ${dto.role_type}: ${projection.error}`);
    }
    return updated as PartyRole;
  }

  getAuditLog(): ReadonlyArray<AuditEntryX2> {
    return [...this.auditLog];
  }

  getCompensationLog(): ReadonlyArray<typeof this.compensationLog[number]> {
    return [...this.compensationLog];
  }

  private newTxId(): string {
    return `x2-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
