/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/errors.ts
 * Description: Explicit domain error hierarchy for Service Contracts & Adapters
 */

export abstract class ServiceContractError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServiceRequestNotFoundError extends ServiceContractError {
  readonly code = 'SERVICE_REQUEST_NOT_FOUND';
  readonly statusCode = 404;

  constructor(requestId: string) {
    super(`Service Request not found: ${requestId}`, { requestId });
  }
}

export class InvalidServiceRequestStateError extends ServiceContractError {
  readonly code = 'INVALID_SERVICE_REQUEST_STATE';
  readonly statusCode = 409;

  constructor(currentState: string, attemptedAction: string, expectedStates: string[]) {
    super(
      `Cannot execute '${attemptedAction}' on Service Request in state '${currentState}'. Expected one of: [${expectedStates.join(', ')}]`,
      { currentState, attemptedAction, expectedStates }
    );
  }
}

export class InvalidServiceRequestPayloadError extends ServiceContractError {
  readonly code = 'INVALID_SERVICE_REQUEST_PAYLOAD';
  readonly statusCode = 400;

  constructor(validationErrors: string[], schemaType?: string) {
    super(
      `Service Request payload validation failed: ${validationErrors.join('; ')}`,
      { validationErrors, schemaType }
    );
  }
}

export class CapabilityNotSupportedError extends ServiceContractError {
  readonly code = 'CAPABILITY_NOT_SUPPORTED';
  readonly statusCode = 501;

  constructor(targetDomain: string, serviceSku: string) {
    super(
      `Capability '${serviceSku}' is not supported by target domain '${targetDomain}' or no adapter is registered.`,
      { targetDomain, serviceSku }
    );
  }
}

export class TenantIsolationViolationError extends ServiceContractError {
  readonly code = 'TENANT_ISOLATION_VIOLATION';
  readonly statusCode = 403;

  constructor(resourceTenantId: string, requestedTenantId: string) {
    super(
      `Tenant boundary violation: resource belongs to '${resourceTenantId}', but request context is '${requestedTenantId}'.`,
      { resourceTenantId, requestedTenantId }
    );
  }
}

export class ExecutionLegNotDispatchableError extends ServiceContractError {
  readonly code = 'EXECUTION_LEG_NOT_DISPATCHABLE';
  readonly statusCode = 422;

  constructor(legId: string, reason: string) {
    super(`Execution leg '${legId}' cannot be dispatched: ${reason}`, { legId, reason });
  }
}

export class AdapterExecutionFailedError extends ServiceContractError {
  readonly code = 'ADAPTER_EXECUTION_FAILED';
  readonly statusCode = 502;

  constructor(targetDomain: string, underlyingError: string, details?: Record<string, unknown>) {
    super(
      `Adapter execution for domain '${targetDomain}' failed: ${underlyingError}`,
      { targetDomain, underlyingError, ...details }
    );
  }
}

export class DuplicateServiceRequestError extends ServiceContractError {
  readonly code = 'DUPLICATE_SERVICE_REQUEST';
  readonly statusCode = 409;

  constructor(idempotencyKey: string, existingRequestId: string) {
    super(
      `Duplicate Service Request with idempotency key '${idempotencyKey}'. Existing request: ${existingRequestId}`,
      { idempotencyKey, existingRequestId }
    );
  }
}

export class DomainJobCreationFailedError extends ServiceContractError {
  readonly code = 'DOMAIN_JOB_CREATION_FAILED';
  readonly statusCode = 500;

  constructor(targetDomain: string, reason: string) {
    super(`Failed to create domain execution job in '${targetDomain}': ${reason}`, { targetDomain, reason });
  }
}
