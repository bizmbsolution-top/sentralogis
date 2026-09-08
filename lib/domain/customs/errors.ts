/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/errors.ts
 * Description: Explicit typed domain error hierarchy for Customs Declaration context
 */

export abstract class CustomsDomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DeclarationNotFoundError extends CustomsDomainError {
  readonly code = 'DECLARATION_NOT_FOUND';
  readonly statusCode = 404;

  constructor(declarationId: string) {
    super(`Customs declaration not found: ${declarationId}`, { declarationId });
  }
}

export class InvalidDeclarationStateError extends CustomsDomainError {
  readonly code = 'INVALID_DECLARATION_STATUS_TRANSITION';
  readonly statusCode = 409;

  constructor(currentStatus: string, targetStatus: string, allowedTransitions: string[]) {
    super(
      `Cannot transition Customs Declaration from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}]`,
      { currentStatus, targetStatus, allowedTransitions }
    );
  }
}

export class InvalidClassificationDataError extends CustomsDomainError {
  readonly code = 'INVALID_CLASSIFICATION_DATA';
  readonly statusCode = 400;

  constructor(validationErrors: string[]) {
    super(`Customs classification validation failed: ${validationErrors.join('; ')}`, { validationErrors });
  }
}

export class SppbIssuanceError extends CustomsDomainError {
  readonly code = 'SPPB_ISSUANCE_NOT_PERMITTED';
  readonly statusCode = 412;

  constructor(reason: string) {
    super(`Cannot issue SPPB Customs Release: ${reason}`, { reason });
  }
}

export class CustomsTenantIsolationViolationError extends CustomsDomainError {
  readonly code = 'TENANT_ISOLATION_VIOLATION';
  readonly statusCode = 403;

  constructor(resourceTenantId: string, requestedTenantId: string) {
    super(
      `Tenant boundary violation: customs declaration belongs to '${resourceTenantId}', but request context is '${requestedTenantId}'.`,
      { resourceTenantId, requestedTenantId }
    );
  }
}

export class TaxCalculationError extends CustomsDomainError {
  readonly code = 'TAX_CALCULATION_ERROR';
  readonly statusCode = 422;

  constructor(reason: string) {
    super(`Tax calculation failed: ${reason}`, { reason });
  }
}

export class CustomsIdempotencyConflictError extends CustomsDomainError {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly statusCode = 409;

  constructor(message: string = 'Idempotency key provided with a different payload') {
    super(message);
  }
}

export class CustomsValidationExceptionError extends CustomsDomainError {
  readonly code = 'CUSTOMS_EXCEPTION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

