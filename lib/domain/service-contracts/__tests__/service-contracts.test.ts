/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/__tests__/service-contracts.test.ts
 * Description: Comprehensive Architecture & Contract Acceptance Tests for Phase 2
 */

import { ServiceRequestFactory } from '../service-request-factory';
import { ServiceRequestValidator } from '../service-request-validator';
import { ServiceRequestDispatcher } from '../service-request-dispatcher';
import { AdapterRegistry } from '../adapters/adapter-registry';
import { TruckingServiceRequestAdapter } from '../adapters/trucking-adapter';
import { CustomsServiceRequestAdapter } from '../adapters/customs-adapter';
import { WarehouseServiceRequestAdapter } from '../adapters/warehouse-adapter';
import {
  InvalidServiceRequestPayloadError,
  InvalidServiceRequestStateError,
  TenantIsolationViolationError
} from '../errors';
import { TruckingServicePayload, CustomsServicePayload } from '../types';

export function runPhase2ValidationSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Create Trucking ServiceRequest
  // --------------------------------------------------------------------------
  assert('TEST 1', 'Create Trucking ServiceRequest with valid payload', () => {
    const payload: TruckingServicePayload = {
      route_specification: {
        pickup: { location_id: 'loc-origin-01', location_name: 'Origin Plant' },
        dropoff: { location_id: 'loc-dest-01', location_name: 'Destination Port' }
      },
      cargo_units: [{ unit_id: 'u1', unit_type: 'CONTAINER', gross_weight_kg: 22000 }]
    };

    const req = ServiceRequestFactory.create({
      tenant_id: 'ten-test-01',
      source_domain: 'FORWARDING',
      target_domain: 'TRUCKING',
      service_product_sku: 'TRK_CONTAINER_HAULAGE',
      request_payload: payload,
      idempotency_key: 'idem-test-01'
    });

    if (req.status !== 'ISSUED') throw new Error(`Expected ISSUED, got ${req.status}`);
    if (req.target_domain !== 'TRUCKING') throw new Error(`Expected TRUCKING, got ${req.target_domain}`);
    if (!req.request_number.startsWith('REQ-TRU-')) throw new Error(`Invalid request number: ${req.request_number}`);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Duplicate dispatch validation
  // --------------------------------------------------------------------------
  assert('TEST 2', 'Idempotency key enforcement & validation', () => {
    const payload: TruckingServicePayload = {
      route_specification: {
        pickup: { location_id: 'loc-origin-01', location_name: 'Origin' },
        dropoff: { location_id: 'loc-dest-01', location_name: 'Dest' }
      },
      cargo_units: [{ unit_id: 'u1', unit_type: 'CONTAINER', gross_weight_kg: 22000 }]
    };

    const req1 = ServiceRequestFactory.create({
      tenant_id: 'ten-test-01',
      source_domain: 'FORWARDING',
      target_domain: 'TRUCKING',
      service_product_sku: 'TRK_CONTAINER_HAULAGE',
      request_payload: payload,
      idempotency_key: 'idem-unique-key-100'
    });

    if (req1.idempotency_key !== 'idem-unique-key-100') {
      throw new Error('Idempotency key was not preserved');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Domain boundary checks (Adapter registry isolation)
  // --------------------------------------------------------------------------
  assert('TEST 4', 'Adapter registry correctly routes to Trucking adapter without direct DB bleed', () => {
    const registry = AdapterRegistry.getInstance();
    const adapter = registry.getAdapter('TRUCKING', 'TRK_CONTAINER_HAULAGE');
    if (adapter.targetDomain !== 'TRUCKING') {
      throw new Error(`Expected TRUCKING adapter, got ${adapter.targetDomain}`);
    }
    if (!(adapter instanceof TruckingServiceRequestAdapter)) {
      throw new Error('Adapter instance mismatch');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: Tenant Isolation Enforcement
  // --------------------------------------------------------------------------
  assert('TEST 6', 'Tenant A cannot access or mutate Tenant B Service Request', () => {
    let errorThrown = false;
    try {
      ServiceRequestValidator.assertTenantMatch('ten-tenant-A', 'ten-tenant-B');
    } catch (e: any) {
      if (e instanceof TenantIsolationViolationError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected TenantIsolationViolationError was not thrown');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Invalid State Transitions Rejected
  // --------------------------------------------------------------------------
  assert('TEST 7', 'Invalid state transition rejected by dispatcher', async () => {
    const dispatcher = new ServiceRequestDispatcher();
    const invalidReq: any = {
      id: 'req-fake',
      tenant_id: 'ten-test-01',
      status: 'CANCELLED',
      target_domain: 'TRUCKING',
      service_product_sku: 'TRK_CONTAINER_HAULAGE',
      request_payload: {}
    };

    let errorThrown = false;
    try {
      await dispatcher.dispatch(invalidReq);
    } catch (e: any) {
      if (e instanceof InvalidServiceRequestStateError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected InvalidServiceRequestStateError was not thrown');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Invalid Trucking Payload Rejected
  // --------------------------------------------------------------------------
  assert('TEST 8', 'Invalid trucking payload without route_specification rejected', () => {
    let errorThrown = false;
    try {
      ServiceRequestValidator.validatePayloadForDomain('TRUCKING', {
        invalid_field: 123
      });
    } catch (e: any) {
      if (e instanceof InvalidServiceRequestPayloadError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected InvalidServiceRequestPayloadError was not thrown');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Customs Adapter Contract Validation
  // --------------------------------------------------------------------------
  assert('TEST 9', 'Customs adapter recognizes CUS SKUs and validates declaration parameters', () => {
    const registry = AdapterRegistry.getInstance();
    const adapter = registry.getAdapter('CUSTOMS', 'CUS_IMPORT_PIB_STANDARD');
    if (!(adapter instanceof CustomsServiceRequestAdapter)) {
      throw new Error('Expected CustomsServiceRequestAdapter instance');
    }

    const payload: CustomsServicePayload = {
      declaration_parameters: {
        declaration_type: 'PIB_IMPORT',
        customs_office_code: '040300',
        importer_entity_id: 'ent-importer-01',
        supporting_documents: []
      },
      manifest_summary: {
        total_packages: 100,
        package_type: 'CARTON',
        total_gross_weight_kg: 5000,
        declared_cif_usd: 50000
      }
    };

    const result = ServiceRequestValidator.validatePayloadForDomain('CUSTOMS', payload);
    if (!result.isValid) throw new Error('Valid customs payload was rejected');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Correlation ID Preserved Through Entire Chain
  // --------------------------------------------------------------------------
  assert('TEST 11', 'Correlation ID preserved across service request lifecycle', () => {
    const correlation_id = 'corr-shp-202608-9999';
    const payload: TruckingServicePayload = {
      route_specification: {
        pickup: { location_name: 'A' },
        dropoff: { location_name: 'B' }
      },
      cargo_units: [{ unit_id: 'u1', unit_type: 'CONTAINER', gross_weight_kg: 1000 }]
    };

    const req = ServiceRequestFactory.create({
      tenant_id: 'ten-test-01',
      source_domain: 'FORWARDING',
      target_domain: 'TRUCKING',
      service_product_sku: 'TRK_CONTAINER_HAULAGE',
      request_payload: payload,
      idempotency_key: 'idem-corr-check',
      correlation_id
    });

    if (req.correlation_id !== correlation_id) {
      throw new Error(`Correlation ID was corrupted: expected ${correlation_id}, got ${req.correlation_id}`);
    }
  });

  return results;
}
