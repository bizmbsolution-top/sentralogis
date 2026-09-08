/**
 * Sentralogis — Phase 5C-3
 * lib/sales-order/line-repository.ts
 *
 * Canonical SO Line Item repository (ADR-059/061/066).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Price snapshots are immutable after commitment.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type {
  SalesOrderLineItem,
  CreateSOLineItemInput,
  SOLineItemStatus,
} from './line-types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface SalesOrderLineDbClient {
  from(table: string): {
    select(cols?: string): SalesOrderLineQueryChain;
    insert(row: DbRow): SalesOrderLineInsertChain;
    update(row: DbRow): SalesOrderLineUpdateChain;
  };
}

interface SalesOrderLineQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): SalesOrderLineQueryChain;
  in(col: string, vals: unknown[]): SalesOrderLineQueryChain;
  order(col: string, opts: { ascending: boolean }): SalesOrderLineQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface SalesOrderLineUpdateChain {
  eq(col: string, val: unknown): SalesOrderLineUpdateChain;
  select(): Promise<DbListResult>;
}

interface SalesOrderLineInsertChain {
  select(): {
    single(): Promise<DbSingleResult>;
  };
}

let _lineClient: SalesOrderLineDbClient | null = null;

export function _setSalesOrderLineDbClient(client: SalesOrderLineDbClient | null): void {
  _lineClient = client;
}

async function db(): Promise<SalesOrderLineDbClient> {
  if (!_lineClient) {
    const mod = await import('../supabase/admin');
    _lineClient = mod.supabaseAdmin as unknown as SalesOrderLineDbClient;
  }
  return _lineClient;
}

// ============================================================================
// SO LINE ITEM REPOSITORY
// ============================================================================

export async function createSOLineItem(
  ctx: IdentityContext,
  input: CreateSOLineItemInput,
): Promise<SalesOrderLineItem> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await (await db())
    .from('sales_order_line_items')
    .insert({
      tenant_id: ctx.tenantId,
      sales_order_id: input.salesOrderId,
      line_sequence: input.lineSequence,
      source_quote_item_id: input.sourceQuoteItemId ?? null,
      capability_type: input.capabilityType,
      side: input.side,
      service_description: input.serviceDescription,
      quantity: input.quantity,
      unit_of_measure: input.unitOfMeasure,
      currency: input.currency,
      unit_rate: input.unitRate,
      line_total: input.lineTotal,
      price_snapshot: input.priceSnapshot,
      status: 'DRAFT',
      version_no: 1,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Line item already exists for this sequence or quote item.`);
    }
    throw new Error(`Failed to create SO line item: ${error.message}`);
  }

  return data as unknown as SalesOrderLineItem;
}

export async function getSOLineItemById(
  ctx: IdentityContext,
  lineItemId: string,
): Promise<SalesOrderLineItem | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await (await db())
    .from('sales_order_line_items')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', lineItemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch SO line item: ${error.message}`);
  }

  return data as unknown as SalesOrderLineItem | null;
}

export async function listSOLineItemsBySO(
  ctx: IdentityContext,
  salesOrderId: string,
): Promise<SalesOrderLineItem[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await (await db())
    .from('sales_order_line_items')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sales_order_id', salesOrderId)
    .order('line_sequence', { ascending: true });

  if (error) {
    throw new Error(`Failed to list SO line items: ${error.message}`);
  }

  return (data ?? []) as unknown as SalesOrderLineItem[];
}

export async function updateSOLineItemStatus(
  ctx: IdentityContext,
  lineItemId: string,
  status: SOLineItemStatus,
): Promise<SalesOrderLineItem> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await (await db())
    .from('sales_order_line_items')
    .update({
      status,
      updated_by: ctx.userId,
    })
    .eq('id', lineItemId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update SO line item status: ${error.message}`);
  }

  return data as unknown as SalesOrderLineItem;
}

export async function cancelSOLineItem(
  ctx: IdentityContext,
  lineItemId: string,
  reason: string,
): Promise<SalesOrderLineItem> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await (await db())
    .from('sales_order_line_items')
    .update({
      status: 'CANCELLED',
      updated_by: ctx.userId,
    })
    .eq('id', lineItemId)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'DRAFT')
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to cancel SO line item: ${error.message}`);
  }

  return data as unknown as SalesOrderLineItem;
}

export async function supersedeSOLineItem(
  ctx: IdentityContext,
  lineItemId: string,
  newLineItemId: string,
): Promise<void> {
  assertPermission(ctx, 'commercial:manage');

  const { error } = await supabaseAdmin
    .from('sales_order_line_items')
    .update({
      status: 'SUPERSEDED',
      superseded_by: newLineItemId,
      updated_by: ctx.userId,
    })
    .eq('id', lineItemId)
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    throw new Error(`Failed to supersede SO line item: ${error.message}`);
  }
}
