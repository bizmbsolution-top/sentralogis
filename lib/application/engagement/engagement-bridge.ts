/**
 * Sentralogis — Phase 4B-1b / U-03
 * lib/application/engagement/engagement-bridge.ts
 *
 * Engagement Resolve-or-Create Bridge (ADR-032).
 *
 * This is the FIRST application bridge toward the canonical commercial model.
 * It resolves or creates canonical engagements (commercial_work_orders)
 * idempotently, deterministically, and tenant-safely.
 *
 * RESOLUTION KEY: (tenant_id, customer_id) for OPEN engagements (DRAFT/SUBMITTED).
 * IDEMPOTENCY: enforced by partial unique index + application-level retry.
 * CONCURRENCY: INSERT + catch unique_violation + SELECT (safe under concurrency).
 * AUTHORIZATION: commercial:manage permission (from U-02).
 * ANTI-CORRUPTION: all tenant/user come from IdentityContext, never from client.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import type {
  Engagement,
  EngagementStatus,
  ResolveOrCreateEngagementInput,
  EngagementResult,
  LegacyWoBridge,
} from './types';
import { OPEN_ENGAGEMENT_STATUSES, EngagementError } from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

/**
 * Abstract database client interface — sufficient for bridge operations.
 * Production uses supabaseAdmin; tests inject a mock.
 */
type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface EngagementDbClient {
  from(table: string): {
    select(cols?: string): EngagementQueryChain;
    insert(row: DbRow): EngagementInsertChain;
  };
}

interface EngagementQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): EngagementQueryChain;
  in(col: string, vals: unknown[]): EngagementQueryChain;
  like(col: string, pattern: string): EngagementQueryChain;
  order(col: string, opts: { ascending: boolean }): EngagementQueryChain;
  limit(n: number): EngagementQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface EngagementInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
  single(): Promise<DbSingleResult>;
}

let _client: EngagementDbClient = supabaseAdmin as unknown as EngagementDbClient;

/**
 * Override the database client for testing.
 * Call with `null` to restore the production client.
 */
export function _setEngagementDbClient(client: EngagementDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as EngagementDbClient);
}

function db(): EngagementDbClient {
  return _client;
}

// ============================================================================
// CLEAN CODE HELPER
// ============================================================================

function cleanCode(str: string, maxLen = 4): string {
  if (!str) return 'CUS';
  const words = str
    .toUpperCase()
    .replace(/\b(PT|CV|TBK|LTD|INC|PERSERO|INDONESIA)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return (cleaned || 'CUS').substring(0, maxLen);
  }
  if (words.length === 1) return words[0].substring(0, maxLen);
  return words.map(w => w[0]).join('').substring(0, maxLen);
}

// ============================================================================
// ROW → ENGAGEMENT MAPPER
// ============================================================================

/**
 * Map a raw database row to the canonical Engagement type.
 * This isolates the application layer from raw schema column names.
 */
export function mapRowToEngagement(row: Record<string, unknown>): Engagement {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    woNumber: row.wo_number as string,
    customerId: row.customer_id as string,
    serviceScopeId: (row.service_scope_id as string) ?? null,
    contractReference: (row.contract_reference as string) ?? null,
    orderDate: row.order_date as string,
    targetFulfillmentDate: (row.target_fulfillment_date as string) ?? null,
    status: row.status as EngagementStatus,
    currency: row.currency as string,
    totalAgreedRevenue: Number(row.total_agreed_revenue) || 0,
    paymentTermsDays: Number(row.payment_terms_days) || 30,
    commercialNotes: (row.commercial_notes as string) ?? null,
    versionNo: Number(row.version_no) || 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// ============================================================================
// CORE: RESOLVE-OR-CREATE ENGAGEMENT
// ============================================================================

/**
 * Resolve an existing open engagement or create a new one.
 *
 * IDEMPOTENCY GUARANTEE:
 *   resolveOrCreateEngagement(X) called N times → same engagement identity.
 *
 * CONCURRENCY SAFETY:
 *   Two simultaneous requests for the same (tenant, customer) → ONE engagement.
 *   Enforced by partial unique index on (tenant_id, customer_id)
 *   WHERE status IN ('DRAFT','SUBMITTED').
 *   Application catches unique_violation and retries with SELECT.
 *
 * ANTI-CORRUPTION:
 *   tenantId and userId come from IdentityContext (U-01) — never from client.
 *   customerId is validated against tenant ownership before engagement creation.
 *
 * @throws {IdentityResolutionError} 401/403 from U-01/U-02 gates.
 * @throws {EngagementError} 400/404/409 for domain-specific errors.
 */
export async function resolveOrCreateEngagement(
  input: ResolveOrCreateEngagementInput,
  context: IdentityContext,
): Promise<EngagementResult> {
  // ---- GATE 1: Authorization (U-02) ----
  assertPermission(context, 'commercial:manage');

  // ---- GATE 2: Trusted tenant (U-01 invariant — §7) ----
  // tenantId comes EXCLUSIVELY from IdentityContext, never from input.
  const tenantId = context.tenantId;

  // ---- GATE 3: Tenant ownership of customer ----
  const customer = await validateCustomerOwnership(tenantId, input.customerId);

  // ---- STEP 4: Resolve existing open engagement ----
  const existing = await findOpenEngagement(tenantId, input.customerId);
  if (existing) {
    return { engagement: existing, created: false };
  }

  // ---- STEP 5: Create new engagement (may recover a concurrent winner) ----
  const outcome = await createEngagement(tenantId, input, context, customer);

  // ---- STEP 6: Create legacy bridge mapping ONLY on genuine creation ----
  if (input.legacyWorkOrderId && outcome.created) {
    await createLegacyBridge(tenantId, input.legacyWorkOrderId, outcome.engagement.id, context.userId);
  }

  return outcome;
}

// ============================================================================
// VALIDATE CUSTOMER OWNERSHIP
// ============================================================================

/**
 * Validate that the customer entity belongs to the given tenant.
 * Returns the customer row for code extraction (wo_number generation).
 *
 * @throws {EngagementError} 404 if customer not found in tenant.
 */
async function validateCustomerOwnership(
  tenantId: string,
  customerId: string,
): Promise<{ id: string; entity_code: string; name: string }> {
  const { data, error } = await db()
    .from('md_entities')
    .select('id, entity_code, name')
    .eq('id', customerId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new EngagementError(
      'CUSTOMER_NOT_FOUND',
      404,
      `Customer ${customerId} not found in tenant ${tenantId}.`,
    );
  }

  return data as unknown as { id: string; entity_code: string; name: string };
}

// ============================================================================
// FIND OPEN ENGAGEMENT
// ============================================================================

/**
 * Find the most recent open engagement for a tenant+customer pair.
 * "Open" = status IN ('DRAFT', 'SUBMITTED').
 */
async function findOpenEngagement(
  tenantId: string,
  customerId: string,
): Promise<Engagement | null> {
  const { data, error } = await db()
    .from('commercial_work_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('customer_id', customerId)
    .in('status', OPEN_ENGAGEMENT_STATUSES as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new EngagementError(
      'DATABASE_ERROR',
      400,
      `Failed to query engagement: ${error.message}`,
    );
  }

  if (!data) return null;
  return mapRowToEngagement(data);
}

// ============================================================================
// CREATE ENGAGEMENT
// ============================================================================

/**
 * Create a new canonical engagement.
 *
 * Uses INSERT + catch unique_violation for concurrency safety.
 * The partial unique index on (tenant_id, customer_id)
 * WHERE status IN ('DRAFT','SUBMITTED') ensures at most one open engagement
 * per customer per tenant.
 *
 * If a concurrent request creates the engagement first, we catch the
 * unique_violation and return the existing engagement.
 */
async function createEngagement(
  tenantId: string,
  input: ResolveOrCreateEngagementInput,
  context: IdentityContext,
  customer: { id: string; entity_code: string; name: string },
): Promise<EngagementResult> {
  const woNumber = await generateWoNumberForTenant(tenantId, customer.entity_code);

  const insertPayload = {
    tenant_id: tenantId,
    wo_number: woNumber,
    customer_id: input.customerId,
    service_scope_id: null,
    contract_reference: input.contractReference ?? null,
    order_date: new Date().toISOString().split('T')[0],
    target_fulfillment_date: input.targetFulfillmentDate ?? null,
    status: 'DRAFT' as const,
    currency: input.currency || 'IDR',
    total_agreed_revenue: 0,
    payment_terms_days: 30,
    commercial_notes: input.commercialNotes ?? null,
    version_no: 1,
    created_by: context.userId,
    updated_by: context.userId,
  };

  const { data, error } = await db()
    .from('commercial_work_orders')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Concurrent request won the race — return its engagement as RESOLVED.
      const existing = await findOpenEngagement(tenantId, input.customerId);
      if (existing) return { engagement: existing, created: false };
    }
    throw new EngagementError(
      'UNIQUE_VIOLATION',
      409,
      `Failed to create engagement: ${error.message}`,
    );
  }

  return { engagement: mapRowToEngagement(data as DbRow), created: true };
}

// ============================================================================
// WO NUMBER GENERATION (server-side)
// ============================================================================

/**
 * Generate a unique wo_number for a tenant, querying commercial_work_orders
 * for the current max sequence.
 * Pattern: {TENANT_CODE}-{CUSTOMER_CODE}-{MMYY}-{SEQ}
 */
async function generateWoNumberForTenant(
  tenantId: string,
  customerCode: string,
): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearShort = now.getFullYear().toString().slice(-2);
  const mmyy = `${month}${yearShort}`;

  const { data: tenantData } = await db()
    .from('md_tenants')
    .select('tenant_code')
    .eq('id', tenantId)
    .single();

  const tenantCode = cleanCode(
    ((tenantData as Record<string, unknown> | null)?.tenant_code as string) || 'HQ',
    5,
  );
  const cleanCustomer = cleanCode(customerCode, 5);
  const prefix = `${tenantCode}-${cleanCustomer}-${mmyy}-`;

  const { data } = await db()
    .from('commercial_work_orders')
    .select('wo_number')
    .eq('tenant_id', tenantId)
    .like('wo_number', `${prefix}%`)
    .order('wo_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const parts = String(data[0].wo_number ?? '').split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

// ============================================================================
// LEGACY BRIDGE MAPPING
// ============================================================================

/**
 * Create a legacy_wo_bridge mapping between a legacy work_orders.id
 * and the canonical engagement.
 */
async function createLegacyBridge(
  tenantId: string,
  legacyWoId: string,
  engagementId: string,
  userId: string,
): Promise<LegacyWoBridge> {
  const { data, error } = await db()
    .from('legacy_wo_bridge')
    .insert({
      tenant_id: tenantId,
      legacy_wo_id: legacyWoId,
      engagement_id: engagementId,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await db()
        .from('legacy_wo_bridge')
        .select('*')
        .eq('legacy_wo_id', legacyWoId)
        .single();
      if (existing) {
        return {
          id: (existing as Record<string, unknown>).id as string,
          tenantId: (existing as Record<string, unknown>).tenant_id as string,
          legacyWoId: (existing as Record<string, unknown>).legacy_wo_id as string,
          engagementId: (existing as Record<string, unknown>).engagement_id as string,
          createdAt: (existing as Record<string, unknown>).created_at as string,
          createdBy: ((existing as Record<string, unknown>).created_by as string) ?? null,
        };
      }
    }
    throw new EngagementError(
      'DATABASE_ERROR',
      400,
      `Failed to create legacy bridge: ${error.message}`,
    );
  }

  return {
    id: (data as Record<string, unknown>).id as string,
    tenantId: (data as Record<string, unknown>).tenant_id as string,
    legacyWoId: (data as Record<string, unknown>).legacy_wo_id as string,
    engagementId: (data as Record<string, unknown>).engagement_id as string,
    createdAt: (data as Record<string, unknown>).created_at as string,
    createdBy: ((data as Record<string, unknown>).created_by as string) ?? null,
  };
}

// ============================================================================
// RESOLVE LEGACY BRIDGE (PUBLIC)
// ============================================================================

/**
 * Find the canonical engagement mapped to a legacy work order.
 * Returns null if no bridge mapping exists.
 */
export async function resolveLegacyBridge(
  tenantId: string,
  legacyWoId: string,
): Promise<Engagement | null> {
  const { data: bridge, error: bridgeError } = await db()
    .from('legacy_wo_bridge')
    .select('engagement_id')
    .eq('legacy_wo_id', legacyWoId)
    .single();

  if (bridgeError || !bridge) return null;

  const { data: eng, error: engError } = await db()
    .from('commercial_work_orders')
    .select('*')
    .eq('id', (bridge as Record<string, unknown>).engagement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (engError || !eng) return null;
  return mapRowToEngagement(eng as Record<string, unknown>);
}
