/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/errors.ts
 * Description: Explicit domain error hierarchy for Shipment Aggregate Root & Journey Orchestration
 */

export abstract class ShipmentDomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ShipmentNotFoundError extends ShipmentDomainError {
  readonly code = 'SHIPMENT_NOT_FOUND';
  readonly statusCode = 404;

  constructor(shipmentId: string) {
    super(`Shipment not found: ${shipmentId}`, { shipmentId });
  }
}

export class InvalidShipmentStatusError extends ShipmentDomainError {
  readonly code = 'INVALID_SHIPMENT_STATUS_TRANSITION';
  readonly statusCode = 409;

  constructor(currentStatus: string, targetStatus: string, allowedTransitions: string[]) {
    super(
      `Cannot transition Shipment from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}]`,
      { currentStatus, targetStatus, allowedTransitions }
    );
  }
}

export class InvalidShipmentDataError extends ShipmentDomainError {
  readonly code = 'INVALID_SHIPMENT_DATA';
  readonly statusCode = 400;

  constructor(validationErrors: string[]) {
    super(`Shipment data validation failed: ${validationErrors.join('; ')}`, { validationErrors });
  }
}

export class ExecutionLegDependencyError extends ShipmentDomainError {
  readonly code = 'EXECUTION_LEG_DEPENDENCY_ERROR';
  readonly statusCode = 422;

  constructor(legSequence: number, prerequisiteLegSequence: number, reason: string) {
    super(
      `Execution leg #${legSequence} cannot proceed before leg #${prerequisiteLegSequence}: ${reason}`,
      { legSequence, prerequisiteLegSequence, reason }
    );
  }
}

export class UnresolvedExceptionsError extends ShipmentDomainError {
  readonly code = 'UNRESOLVED_EXCEPTIONS_HOLD';
  readonly statusCode = 412;

  constructor(shipmentId: string, unresolvedCount: number) {
    super(
      `Shipment '${shipmentId}' cannot be completed with ${unresolvedCount} active unresolved exception(s).`,
      { shipmentId, unresolvedCount }
    );
  }
}

export class PodRequiredError extends ShipmentDomainError {
  readonly code = 'POD_REQUIRED_FOR_COMPLETION';
  readonly statusCode = 412;

  constructor(shipmentId: string) {
    super(
      `Shipment '${shipmentId}' cannot be completed without verified Proof of Delivery (e-POD).`,
      { shipmentId }
    );
  }
}

export class UnitAllocationError extends ShipmentDomainError {
  readonly code = 'UNIT_ALLOCATION_ERROR';
  readonly statusCode = 400;

  constructor(unitId: string, legId: string, reason: string) {
    super(`Failed to allocate unit '${unitId}' to leg '${legId}': ${reason}`, { unitId, legId, reason });
  }
}

export class ShipmentTenantIsolationViolationError extends ShipmentDomainError {
  readonly code = 'TENANT_ISOLATION_VIOLATION';
  readonly statusCode = 403;

  constructor(resourceTenantId: string, requestedTenantId: string) {
    super(
      `Tenant boundary violation: shipment belongs to '${resourceTenantId}', but request context is '${requestedTenantId}'.`,
      { resourceTenantId, requestedTenantId }
    );
  }
}
