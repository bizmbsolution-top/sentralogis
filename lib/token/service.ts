/**
 * Sentralogis — Phase TOKEN-3
 * lib/token/service.ts
 *
 * Canonical Token Economy domain service.
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Rate identity is DB-generated UUID.
 * - DB client injection for testability (TOKEN-5).
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import {
  createTenantTokenPrice,
  getActiveTokenPrice,
  createTenantServiceRate,
  getActiveServiceRate,
  recordConsumptionEvent,
  getConsumptionByIdempotencyKey,
  getTokenBalance,
  deductTokenBalance,
} from './repository';
import type {
  TenantTokenPrice,
  CreateTenantTokenPriceInput,
  TenantServiceRate,
  CreateTenantServiceRateInput,
  TokenConsumptionEvent,
  ConsumeTokenInput,
  TokenServiceType,
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

let _injectedDb: TokenDbClient | null = null;

export function _setTokenDbClient(client: TokenDbClient | null): void {
  _injectedDb = client;
}

export function _getTokenDbClient(): TokenDbClient | null {
  return _injectedDb;
}

export class TokenService {
  constructor(private readonly ctx: IdentityContext) {}

  async createTokenPrice(input: CreateTenantTokenPriceInput): Promise<TenantTokenPrice> {
    return createTenantTokenPrice(this.ctx, input);
  }

  async getActiveTokenPrice(tenantId: string): Promise<TenantTokenPrice | null> {
    return getActiveTokenPrice(this.ctx, tenantId);
  }

  async createServiceRate(input: CreateTenantServiceRateInput): Promise<TenantServiceRate> {
    return createTenantServiceRate(this.ctx, input);
  }

  async getActiveServiceRate(tenantId: string, serviceType: TokenServiceType): Promise<TenantServiceRate | null> {
    return getActiveServiceRate(this.ctx, tenantId, serviceType);
  }

  async consumeToken(input: ConsumeTokenInput): Promise<TokenConsumptionEvent> {
    const rate = await getActiveServiceRate(this.ctx, this.ctx.tenantId, input.serviceType);
    if (!rate) {
      throw new TokenError('TOKEN_RATE_NOT_FOUND', 404, `No active rate for service ${input.serviceType}`);
    }

    const tokenValue = await this.getActiveTokenValue(this.ctx.tenantId);
    const tokensConsumed = rate.tokensPerCompletion;
    const monetaryEquivalent = tokensConsumed * tokenValue;

    const idempotencyKey = `${input.sourceType}:${input.sourceId}:${input.serviceType}`;

    const existing = await getConsumptionByIdempotencyKey(this.ctx, idempotencyKey);
    if (existing) {
      throw new TokenError('TOKEN_DUPLICATE_CONSUMPTION', 409, 'Token consumption already recorded.');
    }

    const balance = await getTokenBalance(this.ctx, this.ctx.tenantId);
    if (balance < tokensConsumed) {
      throw new TokenError('TOKEN_INSUFFICIENT_BALANCE', 422, 'Insufficient token balance.');
    }

    const event = await recordConsumptionEvent(this.ctx, {
      ...input,
      tokensConsumed,
      tokenValueSnapshot: tokenValue,
      monetaryEquivalent,
      idempotencyKey,
    });

    await deductTokenBalance(this.ctx, this.ctx.tenantId, tokensConsumed);

    return event;
  }

  async getBalance(tenantId: string): Promise<number> {
    return getTokenBalance(this.ctx, tenantId);
  }

  private async getActiveTokenValue(tenantId: string): Promise<number> {
    const price = await getActiveTokenPrice(this.ctx, tenantId);
    return price?.pricePerToken ?? 1000;
  }
}