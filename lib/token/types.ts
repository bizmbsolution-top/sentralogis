/**
 * Sentralogis — Phase TOKEN-3
 * lib/token/types.ts
 *
 * Canonical Token Economy domain types.
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

// ============================================================================
// TOKEN PRICE
// ============================================================================

export interface TenantTokenPrice {
  id: string;
  tenantId: string;
  pricePerToken: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantTokenPriceInput {
  tenantId: string;
  pricePerToken: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

// ============================================================================
// SERVICE RATE
// ============================================================================

export type TokenServiceType =
  | 'TRUCKING'
  | 'CUSTOMS'
  | 'WMS_INBOUND'
  | 'WMS_OUTBOUND'
  | 'WMS_TRANSFER'
  | 'FORWARDING';

export interface TenantServiceRate {
  id: string;
  tenantId: string;
  serviceType: TokenServiceType;
  tokensPerCompletion: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantServiceRateInput {
  tenantId: string;
  serviceType: TokenServiceType;
  tokensPerCompletion: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

// ============================================================================
// CONSUMPTION EVENT (immutable)
// ============================================================================

export type TokenSourceType =
  | 'JO'
  | 'SHP'
  | 'CUS_DECLARATION'
  | 'WH_INBOUND'
  | 'WH_OUTBOUND'
  | 'WH_TRANSFER';

export interface TokenConsumptionEvent {
  id: string;
  tenantId: string;
  sourceType: TokenSourceType;
  sourceId: string;
  serviceType: TokenServiceType;
  tokensConsumed: number;
  tokenValueSnapshot: number;
  monetaryEquivalent: number;
  ruleVersion: number;
  idempotencyKey: string;
  consumedAt: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ConsumeTokenInput {
  sourceType: TokenSourceType;
  sourceId: string;
  serviceType: TokenServiceType;
}

// ============================================================================
// BALANCE
// ============================================================================

export interface TokenBalance {
  tenantId: string;
  balance: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type TokenErrorCode =
  | 'TOKEN_PRICE_NOT_FOUND'
  | 'TOKEN_RATE_NOT_FOUND'
  | 'TOKEN_BALANCE_NOT_FOUND'
  | 'TOKEN_INSUFFICIENT_BALANCE'
  | 'TOKEN_DUPLICATE_CONSUMPTION'
  | 'DATABASE_ERROR';

export class TokenError extends Error {
  constructor(
    public readonly code: TokenErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'TokenError';
  }
}
