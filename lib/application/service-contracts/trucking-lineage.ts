/**
 * Sentralogis — Phase 4B-5 / U-07
 * lib/application/service-contracts/trucking-lineage.ts
 *
 * Execution Lineage resolution for trucking dispatch.
 *
 * INVARIANT (mandate §34): execution MUST NOT become detached from the
 * commercial intent that authorized it:
 *
 *   SR.work_order_id ──► ENGAGEMENT (commercial_work_orders)
 *        or legacy WO ──► legacy_wo_bridge ──► ENGAGEMENT
 * ENGAGEMENT ──► operational legacy WO(s) ──► REAL wo_items.id
 *                                            ──► job_orders.wo_item_id
 *
 * ROOT CAUSE this repairs: the trucking adapter previously inserted
 * `job_orders` WITHOUT `wo_item_id` (NOT NULL FK → wo_items), i.e. attempted
 * detached execution. It now resolves — or deterministically FAILS — before
 * any JO write. Fabricated IDs are prohibited; when a usable commercial work
 * item cannot be resolved, dispatch FAILS (no detached execution).
 *
 * Controlled minimal-slot provision: when the engagement resolves and an
 * operational legacy WO exists but has NO usable item, ONE minimal PENDING
 * wo_item is created under THAT WO (the operational case file — NOT canonical
 * commerce). This is the "adapter creates its own minimal slot" design the
 * U-06 backlog delegated to this unit. If no operational WO exists at all,
 * the result is a hard failure — never fabrication, never NULL.
 *
 * Tenant authority: system dispatch processes a persisted SR row and uses the
 * row's own tenant (repo convention for background flows ✅). When an
 * IdentityContext is present (user-initiated), it MUST match — mismatch 403.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import type { ServiceRequest } from '@/lib/domain/service-contracts/types';

/* ================================================================== */
/*  Contracts                                                          */
/* ================================================================== */

export interface TruckingLineageContext {
  tenantId: string;
  /** Canonical engagement (commercial_work_orders.id). */
  engagementId: string;
  /** Operational legacy WO backing the execution slot, when identified. */
  legacyWorkOrderId: string | null;
  /** REAL wo_items.id — satisfies job_orders.wo_item_id NOT NULL/FK. */
  woItemId: string;
  serviceRequestId: string;
  capabilityCode: 'TRUCKING';
}

export type TruckingLineageErrorCode =
  | 'LINEAGE_TENANT_MISMATCH'
  | 'CAPABILITY_MISMATCH'
  | 'CAPABILITY_UNREGISTERED'
  | 'TRUCKING_LINEAGE_UNRESOLVED';

export class TruckingLineageError extends Error {
  constructor(
    public readonly code: TruckingLineageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TruckingLineageError';
  }
}

export interface LineageCandidateItem {
  id: string;
  wo_id: string;
  item_code: string;
  status: string | null;
}

export interface TruckingLineageRepository {
  findCommercialWo(tenantId: string, id: string): Promise<{ id: string } | null>;
  findLegacyWo(tenantId: string, id: string): Promise<{ id: string } | null>;
  findBridgeByLegacyWo(
    tenantId: string,
    legacyWoId: string,
  ): Promise<{ engagement_id: string } | null>;
  findBridgedLegacyWoIds(tenantId: string, engagementId: string): Promise<string[]>;
  findCandidateItems(tenantId: string, legacyWoIds: string[]): Promise<LineageCandidateItem[]>;
  insertMinimalSlot(tenantId: string, legacyWoId: string, itemCode: string): Promise<{ id: string }>;
  insertJobOrder(payload: Record<string, unknown>): Promise<{ id: string; jo_number: string }>;
  insertJobRoutes(routes: Array<Record<string, unknown>>): Promise<void>;
}

/* ================================================================== */
/*  Production implementation                                          */
/* ================================================================== */

/** Item statuses considered unusable for new execution. */
const TERMINAL_ITEM_STATUSES = new Set([
  'completed', 'COMPLETED', 'cancelled', 'CANCELLED', 'rejected', 'REJECTED',
]);

function isUsableItem(item: LineageCandidateItem): boolean {
  return !TERMINAL_ITEM_STATUSES.has(item.status ?? '');
}

export const supabaseTruckingLineageRepository: TruckingLineageRepository = {
  async findCommercialWo(tenantId, id) {
    const { data } = await supabaseAdmin
      .from('commercial_work_orders')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return (data as { id: string } | null) ?? null;
  },

  async findLegacyWo(tenantId, id) {
    const { data } = await supabaseAdmin
      .from('work_orders')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return (data as { id: string } | null) ?? null;
  },

  async findBridgeByLegacyWo(tenantId, legacyWoId) {
    const { data } = await supabaseAdmin
      .from('legacy_wo_bridge')
      .select('engagement_id')
      .eq('tenant_id', tenantId)
      .eq('legacy_wo_id', legacyWoId)
      .maybeSingle();
    return (data as { engagement_id: string } | null) ?? null;
  },

  async findBridgedLegacyWoIds(tenantId, engagementId) {
    const { data } = await supabaseAdmin
      .from('legacy_wo_bridge')
      .select('legacy_wo_id')
      .eq('tenant_id', tenantId)
      .eq('engagement_id', engagementId);
    return ((data ?? []) as Array<{ legacy_wo_id: string }>).map(r => r.legacy_wo_id);
  },

  async findCandidateItems(tenantId, legacyWoIds) {
    if (legacyWoIds.length === 0) return [];
    const { data } = await supabaseAdmin
      .from('wo_items')
      .select('id, wo_id, item_code, status')
      .eq('tenant_id', tenantId)
      .in('wo_id', legacyWoIds)
      .order('created_at', { ascending: true })
      .limit(50);
    return ((data ?? []) as unknown as LineageCandidateItem[]).filter(isUsableItem);
  },

  async insertMinimalSlot(tenantId, legacyWoId, itemCode) {
    const { data, error } = await supabaseAdmin
      .from('wo_items')
      .insert({
        tenant_id: tenantId,
        wo_id: legacyWoId,
        item_code: itemCode,
        status: 'PENDING',
        unit_price: 0,
        total_revenue: 0,
      })
      .select('id')
      .single();
    if (error || !data) {
      throw new TruckingLineageError(
        'TRUCKING_LINEAGE_UNRESOLVED',
        `Failed to provision execution slot: ${error?.message ?? 'unknown'}`,
      );
    }
    return data as { id: string };
  },

  async insertJobOrder(payload) {
    const { data, error } = await supabaseAdmin
      .from('job_orders')
      .insert(payload)
      .select('id, jo_number')
      .single();
    if (error || !data) {
      throw new Error(`Failed to insert job_orders: ${error?.message ?? 'unknown'}`);
    }
    return data as { id: string; jo_number: string };
  },

  async insertJobRoutes(routes) {
    const { error } = await supabaseAdmin.from('job_routes').insert(routes);
    if (error) {
      // Preserve existing adapter semantics: route failure is logged, not fatal.
      console.error('Failed to insert job_routes for Trucking JO:', error);
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Injection seam for tests                                           */
/* ------------------------------------------------------------------ */

let _repo: TruckingLineageRepository = supabaseTruckingLineageRepository;

/** Override the repository for testing. Pass null to restore production. */
export function _setTruckingLineageRepository(repo: TruckingLineageRepository | null): void {
  _repo = repo ?? supabaseTruckingLineageRepository;
}

/** Access the active repository (production or injected). */
export function getTruckingLineageRepository(): TruckingLineageRepository {
  return _repo;
}

/* ================================================================== */
/*  Resolver                                                           */
/* ================================================================== */

/**
 * Resolve the canonical commercial lineage required before ANY trucking JO
 * creation. Throws TruckingLineageError on every unresolvable path — the
 * caller must NEVER proceed to execution without a real woItemId.
 */
export async function resolveTruckingLineage(
  request: ServiceRequest,
  ctx?: IdentityContext | null,
): Promise<TruckingLineageContext> {
  const tenantId = request.tenant_id;

  // ---- Tenant authority: user-initiated context MUST match the SR row ----
  if (ctx && ctx.tenantId !== tenantId) {
    throw new TruckingLineageError(
      'LINEAGE_TENANT_MISMATCH',
      'Identity tenant does not match the service request tenant.',
    );
  }

  // ---- Capability authority (U-05 registry; system-safe sync check) ----
  if (request.target_domain !== 'TRUCKING') {
    throw new TruckingLineageError(
      'CAPABILITY_MISMATCH',
      `Service request targets "${request.target_domain}", not the trucking capability.`,
    );
  }

  const { isRegisteredCapability } = await import('@/lib/application/capabilities/registry');
  if (!isRegisteredCapability('TRUCKING')) {
    throw new TruckingLineageError(
      'CAPABILITY_UNREGISTERED',
      '"TRUCKING" is not registered in the canonical capability registry.',
    );
  }

  // ---- Engagement resolution ----
  const srWoId = request.work_order_id ?? null;
  if (!srWoId) {
    throw new TruckingLineageError(
      'TRUCKING_LINEAGE_UNRESOLVED',
      'Service request carries no work_order_id — commercial lineage cannot be established.',
    );
  }

  const repo = _repo;
  let engagementId: string | null = null;
  let legacyWorkOrderId: string | null = null;

  const canonical = await repo.findCommercialWo(tenantId, srWoId);
  if (canonical) {
    // Direct canonical engagement reference (post-U-08 writers).
    engagementId = canonical.id;
  } else {
    // Pre-U-08 reality: SR references the OPERATIONAL legacy WO.
    const legacy = await repo.findLegacyWo(tenantId, srWoId);
    if (legacy) {
      const bridge = await repo.findBridgeByLegacyWo(tenantId, srWoId);
      if (!bridge) {
        throw new TruckingLineageError(
          'TRUCKING_LINEAGE_UNRESOLVED',
          'Referenced operational work order is not bridged to a canonical engagement.',
        );
      }
      engagementId = bridge.engagement_id;
      legacyWorkOrderId = legacy.id;
    }
  }

  if (!engagementId) {
    // Cross-tenant or bogus IDs land here indistinguishably (no existence leak).
    throw new TruckingLineageError(
      'TRUCKING_LINEAGE_UNRESOLVED',
      'Service request work_order_id does not resolve to a tenant-valid engagement.',
    );
  }

  // ---- Commercial work-item resolution ----
  const candidateWos = legacyWorkOrderId
    ? [legacyWorkOrderId]
    : await repo.findBridgedLegacyWoIds(tenantId, engagementId);

  const items = await repo.findCandidateItems(tenantId, candidateWos);
  let woItemId: string;

  if (items.length > 0) {
    woItemId = items[0].id;
  } else if (candidateWos.length > 0) {
    // Controlled minimal-slot provision under the engagement's OWN
    // operational case file — a REAL wo_items.id, never a fabricated value.
    const slot = await repo.insertMinimalSlot(
      tenantId,
      candidateWos[0],
      `SLOT-SR-${request.request_number}`,
    );
    woItemId = slot.id;
  } else {
    throw new TruckingLineageError(
      'TRUCKING_LINEAGE_UNRESOLVED',
      'Engagement has no operational work order to authorize trucking execution.',
    );
  }

  return {
    tenantId,
    engagementId,
    legacyWorkOrderId,
    woItemId,
    serviceRequestId: request.id,
    capabilityCode: 'TRUCKING',
  };
}
