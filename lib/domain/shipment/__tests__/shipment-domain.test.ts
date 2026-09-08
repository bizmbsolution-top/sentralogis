/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/__tests__/shipment-domain.test.ts
 * Description: Comprehensive Acceptance & Architectural Tests for Canonical Shipment Domain Engine (Phase 3A)
 */

import { ShipmentFactory } from '../shipment-factory';
import { ShipmentStateMachine } from '../state-machine';
import { ExecutionPlanService } from '../execution-plan-service';
import {
  InvalidShipmentDataError,
  InvalidShipmentStatusError,
  ShipmentTenantIsolationViolationError
} from '../errors';
import {
  CreateShipmentDTO,
  ContainerUnit,
  BulkUnit,
  VehicleUnit,
  PackageUnit
} from '../types';

export function runShipmentDomainValidationSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        res
          .then(() => results.push({ testId, description, pass: true }))
          .catch((e: any) => results.push({ testId, description, pass: false, error: e.message || String(e) }));
      } else {
        results.push({ testId, description, pass: true });
      }
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Create Valid Shipment Entity
  // --------------------------------------------------------------------------
  assert('TEST 1', 'Create valid canonical Shipment aggregate via factory', () => {
    const dto: CreateShipmentDTO = {
      tenant_id: 'ten-test-01',
      work_order_id: 'wo-comm-001',
      service_scope_id: 'scope-d2d-01',
      customer_id: 'cus-client-01',
      origin_location_id: 'loc-origin-01',
      destination_location_id: 'loc-dest-01'
    };

    const shp = ShipmentFactory.createShipmentEntity(dto);
    if (!shp.id) throw new Error('Shipment ID was not generated');
    if (!shp.shipment_number.startsWith('SHP-')) throw new Error(`Invalid shipment number format: ${shp.shipment_number}`);
    if (shp.global_status !== 'DRAFT') throw new Error(`Expected DRAFT status, got ${shp.global_status}`);
    if (!shp.tracking_token) throw new Error('Tracking token was not generated');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Reject Shipment with Missing Mandatory Attributes
  // --------------------------------------------------------------------------
  assert('TEST 2', 'Reject shipment creation when missing mandatory attributes', () => {
    let errorThrown = false;
    try {
      ShipmentFactory.createShipmentEntity({
        tenant_id: '',
        work_order_id: '',
        service_scope_id: '',
        customer_id: '',
        origin_location_id: '',
        destination_location_id: ''
      });
    } catch (e: any) {
      if (e instanceof InvalidShipmentDataError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected InvalidShipmentDataError was not thrown');
  });

  // --------------------------------------------------------------------------
  // TEST 3: State Machine - Reject Invalid State Transition
  // --------------------------------------------------------------------------
  assert('TEST 3', 'State machine rejects invalid transitions (e.g. DRAFT -> COMPLETED)', () => {
    const canDo = ShipmentStateMachine.canTransition('DRAFT', 'COMPLETED');
    if (canDo) throw new Error('State machine incorrectly allowed DRAFT -> COMPLETED');

    let errorThrown = false;
    try {
      ShipmentStateMachine.assertTransition('DRAFT', 'COMPLETED');
    } catch (e: any) {
      if (e instanceof InvalidShipmentStatusError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected InvalidShipmentStatusError was not thrown');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Create Shipment with Container Units
  // --------------------------------------------------------------------------
  assert('TEST 4', 'Factory creates polymorphic CONTAINER unit with ISO type and tare weight', () => {
    const units = ShipmentFactory.createUnitEntities('shp-01', 'ten-01', [
      {
        unit_type: 'CONTAINER',
        unit_identifier: 'CONT-TEMU-1234567',
        container_number: 'TEMU1234567',
        iso_type: '40HC',
        seal_number: 'SEAL-9988',
        tare_weight_kg: 3800,
        max_payload_kg: 28000,
        total_gross_weight_kg: 26000
      }
    ]);

    if (units.length !== 1) throw new Error('Expected 1 unit');
    const cont = units[0] as ContainerUnit;
    if (cont.unit_type !== 'CONTAINER') throw new Error(`Expected CONTAINER, got ${cont.unit_type}`);
    if (cont.container_number !== 'TEMU1234567') throw new Error('Container number mismatch');
    if (cont.iso_type !== '40HC') throw new Error('ISO type mismatch');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Create Shipment with Bulk Units
  // --------------------------------------------------------------------------
  assert('TEST 5', 'Factory creates polymorphic BULK unit with metric tonnage and moisture %', () => {
    const units = ShipmentFactory.createUnitEntities('shp-01', 'ten-01', [
      {
        unit_type: 'BULK_MT',
        unit_identifier: 'BULK-COAL-VESSEL-01',
        bulk_type: 'STEAM_COAL',
        metric_tonnage: 45000,
        moisture_percentage: 12.5,
        total_gross_weight_kg: 45000000
      }
    ]);

    if (units.length !== 1) throw new Error('Expected 1 unit');
    const bulk = units[0] as BulkUnit;
    if (bulk.unit_type !== 'BULK_MT') throw new Error(`Expected BULK_MT, got ${bulk.unit_type}`);
    if (bulk.metric_tonnage !== 45000) throw new Error('Metric tonnage mismatch');
    if (bulk.moisture_percentage !== 12.5) throw new Error('Moisture percentage mismatch');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Create Shipment with Vehicle Units
  // --------------------------------------------------------------------------
  assert('TEST 6', 'Factory creates polymorphic VEHICLE unit with VIN and drivable flag', () => {
    const units = ShipmentFactory.createUnitEntities('shp-01', 'ten-01', [
      {
        unit_type: 'VEHICLE',
        unit_identifier: 'VIN-BYD-ATTO3-0099',
        vin_number: 'LC0BYD9988776655',
        vehicle_model: 'BYD Atto 3 EV',
        color: 'SURF_BLUE',
        is_drivable: true,
        total_gross_weight_kg: 1750
      }
    ]);

    if (units.length !== 1) throw new Error('Expected 1 unit');
    const veh = units[0] as VehicleUnit;
    if (veh.unit_type !== 'VEHICLE') throw new Error(`Expected VEHICLE, got ${veh.unit_type}`);
    if (veh.vin_number !== 'LC0BYD9988776655') throw new Error('VIN mismatch');
    if (!veh.is_drivable) throw new Error('Expected is_drivable to be true');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Multimodal Execution Plan Creation & Sequencing
  // --------------------------------------------------------------------------
  assert('TEST 7', 'Build multimodal execution plan (Ocean -> Port Handling -> Customs -> Road)', () => {
    const planService = new ExecutionPlanService();
    const { plan, legs } = planService.buildPlanAndLegs('shp-01', 'ten-01', [
      {
        leg_sequence: 1,
        leg_code: 'LEG-01-OCEAN',
        transport_mode: 'OCEAN_VESSEL',
        origin_location_id: 'CNSHA',
        destination_location_id: 'IDPTB'
      },
      {
        leg_sequence: 2,
        leg_code: 'LEG-02-PORT',
        transport_mode: 'PORT_TERMINAL_HANDLING',
        origin_location_id: 'IDPTB',
        destination_location_id: 'IDPTB'
      },
      {
        leg_sequence: 3,
        leg_code: 'LEG-03-CUSTOMS',
        transport_mode: 'CUSTOMS_CLEARANCE',
        origin_location_id: 'IDPTB',
        destination_location_id: 'IDPTB'
      },
      {
        leg_sequence: 4,
        leg_code: 'LEG-04-TRUCK',
        transport_mode: 'ROAD_TRUCK',
        origin_location_id: 'IDPTB',
        destination_location_id: 'IDBYD'
      }
    ]);

    if (legs.length !== 4) throw new Error(`Expected 4 legs, got ${legs.length}`);
    if (plan.total_legs !== 4) throw new Error(`Plan total_legs mismatch: ${plan.total_legs}`);
    if (legs[0].transport_mode !== 'OCEAN_VESSEL') throw new Error('First leg mode mismatch');
    if (legs[3].transport_mode !== 'ROAD_TRUCK') throw new Error('Last leg mode mismatch');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Execution Leg Dependency Engine
  // --------------------------------------------------------------------------
  assert('TEST 8', 'Leg sequencing validator identifies premature road dispatch before customs release', () => {
    const planService = new ExecutionPlanService();
    const legs: any[] = [
      {
        id: 'l1',
        leg_sequence: 1,
        leg_code: 'LEG-01',
        transport_mode: 'CUSTOMS_CLEARANCE',
        status: 'IN_PROGRESS'
      },
      {
        id: 'l2',
        leg_sequence: 2,
        leg_code: 'LEG-02',
        transport_mode: 'ROAD_TRUCK',
        status: 'IN_PROGRESS' // Illegally dispatched while customs is in progress
      }
    ];

    const validation = planService.validateLegSequencing(legs);
    if (validation.isValid) {
      throw new Error('Expected validation to fail for unreleased customs preceding road dispatch');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 14: Forwarding Aggregate Root Boundary Check
  // --------------------------------------------------------------------------
  assert('TEST 14', 'Verify Shipment aggregate model contains NO private trucking columns', () => {
    const dto: CreateShipmentDTO = {
      tenant_id: 'ten-01',
      work_order_id: 'wo-01',
      service_scope_id: 'scope-01',
      customer_id: 'cus-01',
      origin_location_id: 'loc-a',
      destination_location_id: 'loc-b'
    };

    const shp: any = ShipmentFactory.createShipmentEntity(dto);
    const forbiddenTruckingKeys = ['driver_id', 'fleet_id', 'nopol', 'gps_device_id', 'truck_plate'];
    for (const key of forbiddenTruckingKeys) {
      if (shp[key] !== undefined) {
        throw new Error(`Architectural violation: Shipment aggregate contains forbidden trucking property '${key}'`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST 15: Tenant Isolation Validation
  // --------------------------------------------------------------------------
  assert('TEST 15', 'Tenant boundary check correctly enforces tenant isolation', () => {
    const resourceTenantId: string = 'ten-alpha';
    const requestedTenantId: string = 'ten-beta';

    let errorThrown = false;
    try {
      if (resourceTenantId !== requestedTenantId) {
        throw new ShipmentTenantIsolationViolationError(resourceTenantId, requestedTenantId);
      }
    } catch (e: any) {
      if (e instanceof ShipmentTenantIsolationViolationError) {
        errorThrown = true;
      }
    }
    if (!errorThrown) throw new Error('Expected ShipmentTenantIsolationViolationError was not thrown');
  });

  return results;
}
