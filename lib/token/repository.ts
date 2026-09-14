/**
 * Sentralogis — Phase TOKEN-3
 * lib/token/repository.ts
 *
 * Canonical Token Economy repository.
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Rate identity is DB-generated UUID.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type {
  TenantTokenPrice,
  CreateTenantTokenPriceInput,
  TenantServiceRate,
  CreateTenantServiceRateInput,
  TokenConsumptionEvent,
  ConsumeTokenInput,
  TokenServiceType,
  TokenSourceType,
} from './types';
import { TokenError } from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability — TOKEN-5)
// ============================================================================
type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface TokenDbClient {
  from(table: string): {
    select(cols?: string): TokenQueryChain;
    insert(row: DbRow | DbRow[]): TokenInsertChain;
    update(row: DbRow): TokenUpdateChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: DbError | null }>;
}

interface TokenQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): TokenQueryChain;
  order(col: string, opts: { ascending: boolean }): TokenQueryChain;
  limit(n: number): TokenQueryChain;
  lte(col: string, val: unknown): TokenQueryChain;
  or(s: string): TokenQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface TokenInsertChain extends PromiseLike<DbSingleResult> {
  select(): { single(): Promise<DbSingleResult> };
}

interface TokenUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): TokenUpdateChain;
  select(): { single(): Promise<DbSingleResult> };
}

let _injectedDb: TokenDbClient = supabaseAdmin as unknown as TokenDbClient;

export function _setTokenDbClient(client: TokenDbClient | null): void {
  _injectedDb = client ?? (supabaseAdmin as unknown as TokenDbClient);
}

function db(): TokenDbClient {
  return _injectedDb;
}

// ============================================================================
// CAMELCASE CONVERSION
// Supabase returns snake_case rows; domain types use camelCase.
// ============================================================================
function toCamel(row: DbRow | null): DbRow | null {
  if (!row) return null;
  const out: DbRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out;
}

// ============================================================================
// TENANT TOKEN PRICE REPOSITORY
// ============================================================================

export async function createTenantTokenPrice(
  ctx: IdentityContext,
  input: CreateTenantTokenPriceInput,
): Promise<TenantTokenPrice> {
  assertPermission(ctx, 'tenant:manage');

  const { data, error } = await db()
    .from('tenant_token_prices')
    .insert({
      tenant_id: input.tenantId,
      price_per_token: input.pricePerToken,
      currency: input.currency ?? 'IDR',
      effective_from: input.effectiveFrom ?? new Date().toISOString(),
      effective_to: input.effectiveTo ?? null,
      is_active: true,
      created_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new TokenError('DATABASE_ERROR', 409, 'Token price already exists for this effective date.');
    }
    throw new TokenError('DATABASE_ERROR', 400, `Failed to create token price: ${error.message}`);
  }

  return toCamel(data) as unknown as TenantTokenPrice;
}

export async function getActiveTokenPrice(
  ctx: IdentityContext,
  tenantId: string,
): Promise<TenantTokenPrice | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('tenant_token_prices')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lte('effective_from', new Date().toISOString())
    .or(`effective_to.is.null,effective_to.gt.${new Date().toISOString()}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TokenError('DATABASE_ERROR', 400, `Failed to fetch token price: ${error.message}`);
  }

  return toCamel(data) as unknown as TenantTokenPrice | null;
}

// ============================================================================
// TENANT SERVICE RATE REPOSITORY
// ============================================================================

export async function createTenantServiceRate(
  ctx: IdentityContext,
  input: CreateTenantServiceRateInput,
): Promise<TenantServiceRate> {
  assertPermission(ctx, 'tenant:manage');

  const { data, error } = await db()
    .from('tenant_service_rates')
    .insert({
      tenant_id: input.tenantId,
      service_type: input.serviceType,
      tokens_per_completion: input.tokensPerCompletion,
      effective_from: input.effectiveFrom ?? new Date().toISOString(),
      effective_to: input.effectiveTo ?? null,
      is_active: true,
      created_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new TokenError('DATABASE_ERROR', 409, 'Service rate already exists for this effective date.');
    }
    throw new TokenError('DATABASE_ERROR', 400, `Failed to create service rate: ${error.message}`);
  }

  return toCamel(data) as unknown as TenantServiceRate;
}

export async function getActiveServiceRate(
  ctx: IdentityContext,
  tenantId: string,
  serviceType: TokenServiceType,
): Promise<TenantServiceRate | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error} = await db()
    .from('tenant_service_rates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .lte('effective_from', new Date().toISOString())
    .or(`effective_to.is.null,effective_to.gt.${new Date().toISOString()}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TokenError('DATABASE_ERROR', 400, `Failed to fetch service rate: ${error.message}`);
  }

  return toCamel(data) as unknown as TenantServiceRate | null;
}

// ============================================================================
// CONSUMPTION EVENT REPOSITORY
// ============================================================================

export async function recordConsumptionEvent(
  ctx: IdentityContext,
  input: ConsumeTokenInput & {
    tokensConsumed: number;
    tokenValueSnapshot: number;
    monetaryEquivalent: number;
    idempotencyKey: string;
  },
): Promise<TokenConsumptionEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('token_consumption_events')
    .insert({
      tenant_id: ctx.tenantId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      service_type: input.serviceType,
      tokens_consumed: input.tokensConsumed,
      token_value_snapshot: input.tokenValueSnapshot,
      monetary_equivalent: input.monetaryEquivalent,
      rule_version: 1,
      idempotency_key: input.idempotencyKey,
      created_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new TokenError('TOKEN_DUPLICATE_CONSUMPTION', 409, 'Token consumption already recorded for this event.');
    }
    throw new TokenError('DATABASE_ERROR', 400, `Failed to record consumption: ${error.message}`);
  }

  return toCamel(data) as unknown as TokenConsumptionEvent;
}

export async function getConsumptionByIdempotencyKey(
  ctx: IdentityContext,
  idempotencyKey: string,
): Promise<TokenConsumptionEvent | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('token_consumption_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new TokenError('DATABASE_ERROR', 400, `Failed to fetch consumption: ${error.message}`);
  }

  return toCamel(data) as unknown as TokenConsumptionEvent | null;
}

// ============================================================================
// BALANCE REPOSITORY
// ============================================================================

export async function getTokenBalance(
  ctx: IdentityContext,
  tenantId: string,
): Promise<number> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('tenants')
    .select('token_balance')
    .eq('id', tenantId)
    .single();

  if (error) {
    throw new TokenError('DATABASE_ERROR', 400, `Failed to fetch token balance: ${error.message}`);
  }

  return data?.token_balance ?? 0;
}

export async function deductTokenBalance(
  ctx: IdentityContext,
  tenantId: string,
  tokens: number,
): Promise<number> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('tenants')
    .update({
      token_balance: Math.max(
        (await getTokenBalance(ctx, tenantId)) - tokens,
        0,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)
    .select('token_balance')
    .single();

  if (error) {
    throw new TokenError('DATABASE_ERROR', 400, `Failed to deduct token balance: ${error.message}`);
  }

  return data.token_balance;
}
