/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/service-request-validator.ts
 * Description: Server-side validation engine for Service Request Contracts
 */

import {
  IssueServiceRequestDTO,
  TruckingServicePayload,
  CustomsServicePayload,
  WarehouseServicePayload,
  ServiceTargetDomain
} from './types';
import {
  InvalidServiceRequestPayloadError,
  TenantIsolationViolationError
} from './errors';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ServiceRequestValidator {
  /**
   * Validates the top-level DTO before saving a Service Request
   */
  public static validateIssueRequest(dto: IssueServiceRequestDTO): void {
    const errors: string[] = [];

    if (!dto.tenant_id) errors.push('tenant_id is required');
    if (!dto.source_domain) errors.push('source_domain is required');
    if (!dto.target_domain) errors.push('target_domain is required');
    if (!dto.service_product_sku) errors.push('service_product_sku is required');
    if (!dto.idempotency_key) errors.push('idempotency_key is required');
    if (!dto.request_payload) errors.push('request_payload is required');

    if (errors.length > 0) {
      throw new InvalidServiceRequestPayloadError(errors, 'IssueServiceRequestDTO');
    }

    // Validate payload against target domain schema
    this.validatePayloadForDomain(dto.target_domain, dto.request_payload);
  }

  /**
   * Validates payload structure based on target execution domain
   */
  public static validatePayloadForDomain(
    targetDomain: ServiceTargetDomain,
    payload: unknown
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof payload !== 'object' || payload === null) {
      errors.push('Payload must be a non-null JSON object');
      throw new InvalidServiceRequestPayloadError(errors, targetDomain);
    }

    switch (targetDomain) {
      case 'TRUCKING': {
        const trk = payload as Partial<TruckingServicePayload>;
        if (!trk.route_specification) {
          errors.push('TRUCKING request missing route_specification');
        } else {
          if (!trk.route_specification.pickup?.location_id && !trk.route_specification.pickup?.location_name) {
            errors.push('TRUCKING pickup requires location_id or location_name');
          }
          if (!trk.route_specification.dropoff?.location_id && !trk.route_specification.dropoff?.location_name) {
            errors.push('TRUCKING dropoff requires location_id or location_name');
          }
        }
        if (!trk.cargo_units || !Array.isArray(trk.cargo_units) || trk.cargo_units.length === 0) {
          errors.push('TRUCKING request must have at least 1 cargo_unit');
        }
        break;
      }

      case 'CUSTOMS': {
        const cus = payload as Partial<CustomsServicePayload>;
        if (!cus.declaration_parameters) {
          errors.push('CUSTOMS request missing declaration_parameters');
        } else {
          if (!cus.declaration_parameters.declaration_type) {
            errors.push('CUSTOMS request missing declaration_type (e.g. PIB_IMPORT)');
          }
          if (!cus.declaration_parameters.customs_office_code) {
            errors.push('CUSTOMS request missing customs_office_code');
          }
          if (!cus.declaration_parameters.importer_entity_id) {
            errors.push('CUSTOMS request missing importer_entity_id');
          }
        }
        break;
      }

      case 'WAREHOUSE': {
        const wh = payload as Partial<WarehouseServicePayload>;
        if (!wh.handling_specification) {
          errors.push('WAREHOUSE request missing handling_specification');
        } else {
          if (!wh.handling_specification.warehouse_location_id) {
            errors.push('WAREHOUSE request missing warehouse_location_id');
          }
          if (!wh.handling_specification.operation_type) {
            errors.push('WAREHOUSE request missing operation_type');
          }
        }
        break;
      }

      case 'EXCHANGE': {
        // Basic check for exchange
        break;
      }

      default:
        errors.push(`Unsupported target domain: ${targetDomain}`);
    }

    if (errors.length > 0) {
      throw new InvalidServiceRequestPayloadError(errors, targetDomain);
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Enforces tenant isolation between resource context and actor context
   */
  public static assertTenantMatch(resourceTenantId: string, actorTenantId: string): void {
    if (resourceTenantId !== actorTenantId) {
      throw new TenantIsolationViolationError(resourceTenantId, actorTenantId);
    }
  }
}
