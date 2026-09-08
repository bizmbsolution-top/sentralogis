// SENTRALOGIS — DATA-4E X5
// Reconciliation engine: party_roles → md_entities.is_* compatibility projection
//
// Authority rule:
//   party_roles = CANONICAL
//   md_entities.is_* = COMPATIBILITY PROJECTION ONLY
//
// Reconciliation direction:
//   party_roles → md_entities.is_*
//
// Forbidden:
//   md_entities.is_* → party_roles

import type { SupabaseClient } from '@supabase/supabase-js';
import { PartyRoleService } from './party-role-service';
import type { PartyRole, PartyRoleType } from './types';
import { PARTY_ROLE_TYPES, PARTY_ROLE_CONTEXT_TYPES } from './types';

// ========== Types ==========

export type DriftMode =
  | 'D1_MISSING_LEGACY_PROJECTION'
  | 'D2_STALE_LEGACY_PROJECTION'
  | 'D3_CANONICAL_LEGACY_MISMATCH'
  | 'D4_TENANT_MISMATCH'
  | 'D5_ORPHAN_CANONICAL_ROLE'
  | 'D6_UNSUPPORTED_ROLE_PROJECTION'
  | 'D7_MULTIPLE_GLOBAL_ROLES';

export interface DriftItem {
  tenant_id: string;
  party_id: string;
  role_type: PartyRoleType;
  context_type: string;
  context_id: string | null;
  canonical_state: boolean;
  legacy_state: boolean | null;
  drift_mode?: DriftMode;
  action: 'REPAIRED' | 'NO_OP' | 'SKIPPED' | 'CRITICAL';
  reason?: string;
}

export interface ReconciliationSummary {
  scanned: number;
  matched: number;
  drifted: number;
  repaired: number;
  skipped: number;
  critical: number;
  items: DriftItem[];
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  dry_run: boolean;
}

// ========== Service ==========

const LEGACY_BOOLEAN_BY_ROLE: Partial<Record<PartyRoleType, 'is_customer' | 'is_supplier' | 'is_vendor' | 'is_broker'>> = {
  CUSTOMER: 'is_customer',
  SUPPLIER: 'is_supplier',
  VENDOR: 'is_vendor',
  BROKER: 'is_broker',
};

export class RoleReconciliationService {
  private readonly roleService: PartyRoleService;

  constructor(private readonly supabase: SupabaseClient) {
    this.roleService = new PartyRoleService(supabase);
  }

  async detectDrift(tenantId?: string): Promise<ReconciliationSummary> {
    const summary: ReconciliationSummary = {
      scanned: 0,
      matched: 0,
      drifted: 0,
      repaired: 0,
      skipped: 0,
      critical: 0,
      items: [],
    };

    const canonicalRoles = await this.fetchActiveGlobalRoles(tenantId);
    summary.scanned = canonicalRoles.length;

    const entityMap = await this.buildEntityMap(tenantId);

    for (const role of canonicalRoles) {
      const item = this.evaluateRole(role, entityMap);
      summary.items.push(item);
      if (item.action === 'CRITICAL') summary.critical++;
      else if (item.action === 'SKIPPED') summary.skipped++;
      else if (item.action === 'REPAIRED') summary.repaired++;
      else if (item.drift_mode) summary.drifted++;
      else summary.matched++;
    }

    return summary;
  }

  async reconcile(dryRun = false): Promise<ReconciliationResult> {
    const summary = await this.detectDrift();

    for (const item of summary.items) {
      if (item.action !== 'REPAIRED' || dryRun) continue;

      try {
        await this.repairCompatibilityProjection(item);
      } catch {
        item.action = 'SKIPPED';
        item.reason = item.reason ? `${item.reason}; repair failed` : 'repair failed';
        summary.skipped++;
        summary.repaired--;
      }
    }

    return { summary, dry_run: dryRun };
  }

  private async fetchActiveGlobalRoles(tenantId?: string): Promise<PartyRole[]> {
    let query = this.supabase
      .from('party_roles')
      .select('*')
      .eq('context_type', 'GLOBAL')
      .is('context_id', null)
      .eq('is_active', true);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch party roles: ${error.message}`);
    return (data ?? []) as PartyRole[];
  }

  private async buildEntityMap(tenantId?: string): Promise<Map<string, { tenant_id: string; is_customer: boolean | null; is_supplier: boolean | null; is_vendor: boolean | null; is_broker: boolean | null }>> {
    const map = new Map();
    let query = this.supabase
      .from('md_entities')
      .select('id, tenant_id, is_customer, is_supplier, is_vendor, is_broker');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch entities: ${error.message}`);

    for (const row of (data ?? []) as any[]) {
      map.set(row.id, {
        tenant_id: row.tenant_id,
        is_customer: row.is_customer ?? null,
        is_supplier: row.is_supplier ?? null,
        is_vendor: row.is_vendor ?? null,
        is_broker: row.is_broker ?? null,
      });
    }

    return map;
  }

  private evaluateRole(role: PartyRole, entityMap: Map<string, any>): DriftItem {
    const entity = entityMap.get(role.party_id);
    const legacyField = LEGACY_BOOLEAN_BY_ROLE[role.role_type];

    if (!entity) {
      return {
        tenant_id: role.tenant_id,
        party_id: role.party_id,
        role_type: role.role_type,
        context_type: role.context_type,
        context_id: role.context_id,
        canonical_state: true,
        legacy_state: null,
        drift_mode: 'D5_ORPHAN_CANONICAL_ROLE',
        action: 'CRITICAL',
        reason: 'Entity referenced by party_role does not exist in md_entities',
      };
    }

    if (role.tenant_id !== entity.tenant_id) {
      return {
        tenant_id: role.tenant_id,
        party_id: role.party_id,
        role_type: role.role_type,
        context_type: role.context_type,
        context_id: role.context_id,
        canonical_state: true,
        legacy_state: (entity as any)[legacyField!] ?? null,
        drift_mode: 'D4_TENANT_MISMATCH',
        action: 'SKIPPED',
        reason: `Canonical tenant ${role.tenant_id} does not match entity tenant ${entity.tenant_id}`,
      };
    }

    if (!legacyField) {
      return {
        tenant_id: role.tenant_id,
        party_id: role.party_id,
        role_type: role.role_type,
        context_type: role.context_type,
        context_id: role.context_id,
        canonical_state: true,
        legacy_state: null,
        drift_mode: 'D6_UNSUPPORTED_ROLE_PROJECTION',
        action: 'SKIPPED',
        reason: `Role type ${role.role_type} has no legacy boolean mapping`,
      };
    }

    const legacyState = entity[legacyField] ?? false;
    const expectedLegacy = true;

    if (legacyState === expectedLegacy) {
      return {
        tenant_id: role.tenant_id,
        party_id: role.party_id,
        role_type: role.role_type,
        context_type: role.context_type,
        context_id: role.context_id,
        canonical_state: true,
        legacy_state: legacyState,
        action: 'NO_OP',
      };
    }

    return {
      tenant_id: role.tenant_id,
      party_id: role.party_id,
      role_type: role.role_type,
      context_type: role.context_type,
      context_id: role.context_id,
      canonical_state: true,
      legacy_state: legacyState,
      drift_mode: 'D1_MISSING_LEGACY_PROJECTION',
      action: 'REPAIRED',
      reason: `Expected ${legacyField}=true but found ${legacyState}`,
    };
  }

  private async repairCompatibilityProjection(item: DriftItem): Promise<void> {
    const legacyField = LEGACY_BOOLEAN_BY_ROLE[item.role_type];
    if (!legacyField) {
      throw new Error(`No legacy field for role type ${item.role_type}`);
    }

    const { error } = await this.supabase
      .from('md_entities')
      .update({ [legacyField]: item.canonical_state })
      .eq('id', item.party_id)
      .eq('tenant_id', item.tenant_id);

    if (error) {
      throw new Error(`Failed to update ${legacyField}: ${error.message}`);
    }
  }
}
