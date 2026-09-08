/**
 * Sentralogis — Phase 4B-6 / U-08
 * lib/application/service-contracts/forwarding-writer.ts
 *
 * Forwarding Service Request WRITER GUARD.
 *
 * ROOT CAUSE repaired: this writer previously took `tenant_id` from the
 * request BODY (D-2 violation) and passed a LEGACY `work_orders.id` into
 * `svc_service_requests.work_order_id`, whose FK targets
 * `commercial_work_orders` RESTRICT — the identifier came from the WRONG
 * LAYER (operational artifact vs commercial truth), so every SR write hit the
 * FK trap.
 *
 * AFTER (this unit):
 *   IdentityContext (U-01) ──► commercial:manage (U-02)
 *     ──► U-03 resolveOrCreateEngagement(customer)   [canonical, idempotent]
 *     ──► legacy operational WO + items (case file, unchanged behavior)
 *     ──► legacy_wo_bridge(legacy_wo ↔ engagement)   [U-07 lineage depends on it]
 *     ──► SR.work_order_id = CANONICAL commercial_work_orders.id
 *
 * The body's tenant_id/user_id are IGNORED (non-authoritative) so existing
 * clients that still send them remain compatible. Response contract is
 * preserved plus an additive `engagement_id`.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { resolveOrCreateEngagement } from '@/lib/application/engagement/engagement-bridge';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TruckingServicePayload } from '@/lib/domain/service-contracts/types';
import { PricingService } from '@/lib/pricing/service';
import type { PricingContext } from '@/lib/pricing/selection';
import type { CalculationInput } from '@/lib/pricing/calculation';

/* ================================================================== */
/*  Contracts                                                          */
/* ================================================================== */

export interface ForwardingWorkOrderBody {
  customer_id: string;
  order_date?: string;
  execution_date?: string;
  service_type: string;
  delivery_type?: string;
  origin_port?: string;
  destination_port?: string;
  containers?: Array<Record<string, unknown>>;
  notes?: string | null;
  status?: string;
}

export interface ForwardingWriterRepository {
  findCustomerCode(tenantId: string, customerId: string): Promise<{ entity_code: string; name: string } | null>;
  findTenantCode(tenantId: string): Promise<{ initial: string | null; tenant_code: string | null; name: string | null } | null>;
  countLegacyWorkOrders(): Promise<number>;
  insertLegacyWo(payload: Record<string, unknown>): Promise<{ id: string }>;
  insertWoItem(payload: Record<string, unknown>): Promise<{ id: string }>;
  /** Idempotent mapping legacy_wo ↔ engagement (UNIQUE constraints, DO NOTHING). */
  insertLegacyBridge(tenantId: string, legacyWoId: string, engagementId: string): Promise<void>;
  insertContainerItem(payload: Record<string, unknown>): Promise<void>;
}

export type ForwardingSrIssuer = (args: {
  tenant_id: string;
  source_domain: 'FORWARDING';
  target_domain: 'TRUCKING';
  work_order_id: string;
  service_product_sku: string;
  request_payload: TruckingServicePayload;
  idempotency_key: string;
}) => Promise<{ dispatchResult?: { domainJobId?: string | null } | null }>;

/* ================================================================== */
/*  Production implementation                                          */
/* ================================================================== */

export const supabaseForwardingWriterRepository: ForwardingWriterRepository = {
  async findCustomerCode(tenantId, customerId) {
    const { data } = await supabaseAdmin
      .from('md_entities')
      .select('entity_code, name')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return (data as { entity_code: string; name: string } | null) ?? null;
  },

  async findTenantCode(tenantId) {
    const { data } = await supabaseAdmin
      .from('md_tenants')
      .select('tenant_code, name, initial')
      .eq('id', tenantId)
      .maybeSingle();
    return (data as { initial: string | null; tenant_code: string | null; name: string | null } | null) ?? null;
  },

  async countLegacyWorkOrders() {
    const { count } = await supabaseAdmin
      .from('work_orders')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  },

  async insertLegacyWo(payload) {
    const { data, error } = await supabaseAdmin.from('work_orders').insert([payload]).select('id').single();
    if (error || !data) throw new Error(`work_orders insert failed: ${error?.message ?? 'unknown'}`);
    return data as { id: string };
  },

  async insertWoItem(payload) {
    const { data, error } = await supabaseAdmin.from('wo_items').insert([payload]).select('id').single();
    if (error || !data) throw new Error(`wo_items insert failed: ${error?.message ?? 'unknown'}`);
    return data as { id: string };
  },

  async insertLegacyBridge(tenantId, legacyWoId, engagementId) {
    // UNIQUE(legacy_wo_id)/(engagement_id) + ignoreDuplicates ⇒ idempotent.
    const { error } = await supabaseAdmin
      .from('legacy_wo_bridge')
      .insert(
        { tenant_id: tenantId, legacy_wo_id: legacyWoId, engagement_id: engagementId },
        { ignoreDuplicates: true } as never,
      );
    if (error && error.code !== '23505') {
      throw new Error(`legacy_wo_bridge insert failed: ${error.message}`);
    }
  },

  async insertContainerItem(payload) {
    const { error } = await supabaseAdmin.from('fw_container_items').insert([payload]);
    if (error) throw new Error(`fw_container_items insert failed: ${error.message}`);
  },
};

let _repo: ForwardingWriterRepository = supabaseForwardingWriterRepository;
let _issuer: ForwardingSrIssuer | null = null;
let _woNumberRpc: ((args: {
  p_tenant_id: string;
  p_tenant_code: string;
  p_customer_code: string;
}) => Promise<{ data: string | null; error: { message?: string } | null }>) | null = null;

export function _setForwardingWriterRepository(repo: ForwardingWriterRepository | null): void {
  _repo = repo ?? supabaseForwardingWriterRepository;
}
/** Test hook: intercept SR issuance (production uses domain ServiceRequestService). */
export function _setForwardingSrIssuer(issuer: ForwardingSrIssuer | null): void {
  _issuer = issuer;
}
/** Test hook: intercept WO number authority RPC (production uses supabaseAdmin.rpc). */
export function _setForwardingWoNumberRpc(
  rpc: ((args: {
    p_tenant_id: string;
    p_tenant_code: string;
    p_customer_code: string;
  }) => Promise<{ data: string | null; error: { message?: string } | null }>) | null,
): void {
  _woNumberRpc = rpc;
}

function getRepo(): ForwardingWriterRepository { return _repo; }

async function getDefaultIssuer() {
  const { ServiceRequestService } = await import('@/lib/domain/service-contracts/service-request-service');
  const svc = new ServiceRequestService();
  return (args: Parameters<ForwardingSrIssuer>[0]) => svc.issueRequest(args, true);
}

/* ================================================================== */
/*  The guarded writer                                                 */
/* ================================================================== */

export async function createForwardingWorkOrder(
  ctx: IdentityContext,
  body: ForwardingWorkOrderBody & Record<string, unknown>,
): Promise<{ wo_id: string; wo_number: string; engagement_id: string }> {
  // ---- Gate 1: manage authorization (U-02) ----
  assertPermission(ctx, 'commercial:manage');

  // ---- Gate 2: DTO validation (body tenant_id/user_id deliberately IGNORED) ----
  const { customer_id, service_type, delivery_type, origin_port, destination_port,
          order_date, execution_date, notes, status = 'PENDING' } = body;
  if (!customer_id || !service_type || !origin_port || !destination_port) {
    throw new Error('Missing required fields');
  }
  const containers = Array.isArray(body.containers) ? body.containers : [];

  const tenantId = ctx.tenantId;   // NEVER from body (D-2 closure)
  const userId = ctx.userId;

  // ---- Gate 3: U-03 CANONICAL ENGAGEMENT (validates customer ownership;
  //      deterministic resolve-or-create ⇒ no duplicate engagements) ----
  const engagementResult = await resolveOrCreateEngagement({ customerId: customer_id }, ctx);
  const engagementId = engagementResult.engagement.id;

  const repo = getRepo();

  // ---- Legacy operational case file (behavior preserved, authority hardened) ----
  const customerData = await repo.findCustomerCode(tenantId, customer_id);
  const customerCode = customerData?.entity_code || customerData?.name?.substring(0, 3).toUpperCase() || 'CUS';
  const tenantData = await repo.findTenantCode(tenantId);
  const tenantCode = tenantData?.initial || tenantData?.tenant_code?.split('-')[0] || tenantData?.name?.substring(0, 4).toUpperCase() || 'HQ';

  const woNumberRpc = _woNumberRpc ?? (() =>
    supabaseAdmin.rpc('next_forwarding_wo_number', {
      p_tenant_id: tenantId,
      p_tenant_code: tenantCode,
      p_customer_code: customerCode,
    }));

  const { data: woNumberData, error: woNumberError } = await woNumberRpc({
    p_tenant_id: tenantId,
    p_tenant_code: tenantCode,
    p_customer_code: customerCode,
  });

  if (woNumberError || !woNumberData) {
    throw new Error(`Failed to generate forwarding WO number: ${woNumberError?.message ?? 'unknown'}`);
  }

  const wo_number = woNumberData as string;

  const wo = await repo.insertLegacyWo({
    tenant_id: tenantId,
    wo_number,
    customer_id,
    order_date,
    execution_date,
    sbu_type: 'FORWARDING',
    status,
    notes,
    created_by: userId,
    updated_by: userId,
  });
  const wo_id = wo.id;

  // ---- Bridge: operational artifact ↔ canonical engagement (U-07 lineage) ----
  await repo.insertLegacyBridge(tenantId, wo_id, engagementId);

  const issuer: ForwardingSrIssuer = _issuer ?? await getDefaultIssuer();

  for (let i = 0; i < containers.length; i++) {
    const cont = containers[i] as {
      container_number?: string;
      container_type?: string;
      sell_price?: number;
      pickup_address?: string;
      delivery_address?: string;
      price_master_id?: string;
      cogs_pickup?: number;
      cogs_port_haulage_origin?: number;
      cogs_ocean_freight?: number;
      cogs_thc_origin?: number;
      cogs_port_haulage_dest?: number;
      cogs_last_mile?: number;
      cogs_documentation?: number;
      cogs_other?: number;
      volume_cbm?: number;
      gross_weight_kg?: number;
      commodity?: string;
      use_canonical_pricing?: boolean;
    };

    let unitPrice = cont.sell_price || 0;
    let totalRevenue = cont.sell_price || 0;

    if (cont.use_canonical_pricing) {
      const pricingService = new PricingService(ctx);
      const pricingContext: PricingContext = {
        capabilityType: 'FORWARDING',
        side: 'SELL',
        effectiveDate: order_date || new Date().toISOString().split('T')[0],
        customerId: customer_id,
        origin: origin_port || null,
        destination: destination_port || null,
        serviceType: service_type || null,
        containerType: cont.container_type || null,
        chargeBasis: 'PER_CONTAINER',
        currency: 'IDR',
      };

      const selectionResult = await pricingService.resolveRate(pricingContext);
      if (selectionResult.selected) {
        const selectedItem = selectionResult.selected.items[0];
        if (selectedItem) {
          const calcInput: CalculationInput = {
            quantity: 1,
            unitRate: selectedItem.unitRate,
            minCharge: selectedItem.minCharge,
            maxCharge: selectedItem.maxCharge,
            currency: selectedItem.currency,
            chargeBasis: selectedItem.chargeBasis,
            side: selectedItem.side,
          };
          const calculationResult = pricingService.calculateRate(calcInput);
          unitPrice = calculationResult.unitRate;
          totalRevenue = calculationResult.finalAmount;
        }
      }
    }

    const item = await repo.insertWoItem({
      tenant_id: tenantId,
      wo_id,
      item_code: `${wo_number}-${(i + 1).toString().padStart(3, '0')}`,
      status: 'PENDING',
      unit_price: unitPrice,
      total_revenue: totalRevenue,
      created_by: userId,
    });
    const wo_item_id = item.id;

    let pickupJobId: string | null = null;
    let lastMileJobId: string | null = null;

    if (delivery_type !== undefined && ['D2D', 'D2P'].includes(delivery_type)) {
      const pickupPayload: TruckingServicePayload = {
        route_specification: {
          pickup: { location_id: origin_port, location_name: cont.pickup_address || `Customer Site (${origin_port})` },
          dropoff: { location_id: origin_port, location_name: `Origin Port: ${origin_port}` },
        },
        cargo_units: [{
          unit_id: `unit-cont-${i + 1}`,
          unit_type: 'CONTAINER',
          container_number: cont.container_number || undefined,
          iso_type: cont.container_type || '20GP',
          gross_weight_kg: Number(cont.gross_weight_kg) || 20000,
        }],
      };

      // ---- U-08 CRITICAL REPAIR: CANONICAL engagement id, not legacy wo_id ----
      const { dispatchResult } = await issuer({
        tenant_id: tenantId,
        source_domain: 'FORWARDING',
        target_domain: 'TRUCKING',
        work_order_id: engagementId,
        service_product_sku: 'TRK_CONTAINER_HAULAGE',
        request_payload: pickupPayload,
        idempotency_key: `idem-fwd-pickup-${wo_id}-${i + 1}-${Date.now()}`,
      });
      pickupJobId = dispatchResult?.domainJobId || null;
    }

    if (delivery_type !== undefined && ['D2D', 'P2D'].includes(delivery_type)) {
      const lastMilePayload: TruckingServicePayload = {
        route_specification: {
          pickup: { location_id: destination_port, location_name: `Destination Port: ${destination_port}` },
          dropoff: { location_id: destination_port, location_name: cont.delivery_address || `Consignee Site (${destination_port})` },
        },
        cargo_units: [{
          unit_id: `unit-cont-last-${i + 1}`,
          unit_type: 'CONTAINER',
          container_number: cont.container_number || undefined,
          iso_type: cont.container_type || '20GP',
          gross_weight_kg: Number(cont.gross_weight_kg) || 20000,
        }],
      };

      const { dispatchResult } = await issuer({
        tenant_id: tenantId,
        source_domain: 'FORWARDING',
        target_domain: 'TRUCKING',
        work_order_id: engagementId,
        service_product_sku: 'TRK_CONTAINER_HAULAGE',
        request_payload: lastMilePayload,
        idempotency_key: `idem-fwd-lastmile-${wo_id}-${i + 1}-${Date.now()}`,
      });
      lastMileJobId = dispatchResult?.domainJobId || null;
    }

    const generateTrackingToken = () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

    await repo.insertContainerItem({
      tenant_id: tenantId,
      wo_item_id,
      delivery_type,
      delivery_address: cont.delivery_address || null,
      pickup_wo_id: pickupJobId,
      last_mile_wo_id: lastMileJobId,
      price_master_id: cont.price_master_id || null,
      sell_price_snapshot: cont.sell_price || 0,
      cogs_pickup: cont.cogs_pickup || 0,
      cogs_port_haulage_origin: cont.cogs_port_haulage_origin || 0,
      cogs_ocean_freight: cont.cogs_ocean_freight || 0,
      cogs_thc_origin: cont.cogs_thc_origin || 0,
      cogs_port_haulage_dest: cont.cogs_port_haulage_dest || 0,
      cogs_last_mile: cont.cogs_last_mile || 0,
      cogs_documentation: cont.cogs_documentation || 0,
      cogs_other: cont.cogs_other || 0,
      volume_cbm: cont.volume_cbm || null,
      gross_weight_kg: cont.gross_weight_kg || null,
      commodity: cont.commodity || null,
      tracking_token: generateTrackingToken(),
    });
  }

  return { wo_id, wo_number, engagement_id: engagementId };
}
