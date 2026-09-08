/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/repository.ts
 *
 * Repository boundary: the ONLY place raw database access happens for this
 * module. Production uses supabaseAdmin; tests inject a mock via
 * _setWorkOrderRepository.
 *
 * All reads/writes are tenant-scoped by construction — tenantId is a required
 * parameter on every operation and originates exclusively from IdentityContext.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ListWorkOrdersFilters } from './types';

export interface WorkOrderRow {
  id: string;
  tenant_id: string;
  wo_number: string;
  customer_id: string;
  status: string;
  order_date: string;
  target_fulfillment_date: string | null;
  currency: string;
  contract_reference: string | null;
  created_at: string;
}

/**
 * Narrow repository port — intentionally NOT a generic chainable query
 * builder, so business code cannot express unscoped queries.
 */
export interface WorkOrderRepository {
  findEngagementById(tenantId: string, engagementId: string): Promise<WorkOrderRow | null>;
  listEngagements(
    tenantId: string,
    filters: ListWorkOrdersFilters,
  ): Promise<{ rows: WorkOrderRow[]; total: number }>;
}

/* ------------------------------------------------------------------ */
/*  Production implementation                                          */
/* ------------------------------------------------------------------ */

export const supabaseWorkOrderRepository: WorkOrderRepository = {
  async findEngagementById(tenantId, engagementId) {
    const { data, error } = await supabaseAdmin
      .from('commercial_work_orders')
      .select(
        'id, tenant_id, wo_number, customer_id, status, order_date, target_fulfillment_date, currency, contract_reference, created_at',
      )
      .eq('id', engagementId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) return null;
    return (data as unknown as WorkOrderRow) ?? null;
  },

  async listEngagements(tenantId, filters) {
    const selectCols =
      'id, tenant_id, wo_number, customer_id, status, order_date, target_fulfillment_date, currency, contract_reference, created_at';

    // ---- Total count (same scoping/filters) ----
    let countQuery = supabaseAdmin
      .from('commercial_work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    if (filters.customerId) countQuery = countQuery.eq('customer_id', filters.customerId);
    if (filters.statuses && filters.statuses.length > 0) {
      countQuery = countQuery.in('status', filters.statuses as string[]);
    }
    if (filters.dateFrom) countQuery = countQuery.gte('order_date', filters.dateFrom);
    if (filters.dateTo) countQuery = countQuery.lte('order_date', filters.dateTo);

    const { count, error: countErr } = await countQuery;
    if (countErr) throw new Error(`listEngagements(count): ${countErr.message}`);

    // ---- Page rows ----
    let pageQuery = supabaseAdmin
      .from('commercial_work_orders')
      .select(selectCols)
      .eq('tenant_id', tenantId);
    if (filters.customerId) pageQuery = pageQuery.eq('customer_id', filters.customerId);
    if (filters.statuses && filters.statuses.length > 0) {
      pageQuery = pageQuery.in('status', filters.statuses as string[]);
    }
    if (filters.dateFrom) pageQuery = pageQuery.gte('order_date', filters.dateFrom);
    if (filters.dateTo) pageQuery = pageQuery.lte('order_date', filters.dateTo);

    const { data, error } = await pageQuery
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) throw new Error(`listEngagements(page): ${error.message}`);

    return { rows: (data as unknown as WorkOrderRow[]) ?? [], total: count ?? 0 };
  },
};

/* ------------------------------------------------------------------ */
/*  Injection seam for tests                                           */
/* ------------------------------------------------------------------ */

let _repo: WorkOrderRepository = supabaseWorkOrderRepository;

/** Override the repository for testing. Pass null to restore production. */
export function _setWorkOrderRepository(repo: WorkOrderRepository | null): void {
  _repo = repo ?? supabaseWorkOrderRepository;
}

export function getWorkOrderRepository(): WorkOrderRepository {
  return _repo;
}
