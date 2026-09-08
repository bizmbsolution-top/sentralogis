/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/execution-plan-service.ts
 * Description: Multi-Modal Execution Plan, Leg Sequencing & Service Request Dispatch Engine
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  ExecutionPlan,
  ExecutionLeg,
  CreateExecutionLegDTO,
  TransportMode,
  ShipmentAggregate
} from './types';
import { ExecutionLegDependencyError } from './errors';
import { ServiceRequestService } from '../service-contracts/service-request-service';
import { ServiceTargetDomain, TruckingServicePayload, CustomsServicePayload } from '../service-contracts/types';

export class ExecutionPlanService {
  private serviceRequestService = new ServiceRequestService();

  /**
   * Validates multi-modal leg dependencies (e.g. SEA discharge must precede CUSTOMS, CUSTOMS release before ROAD)
   */
  public validateLegSequencing(legs: ExecutionLeg[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sorted = [...legs].sort((a, b) => a.leg_sequence - b.leg_sequence);

    for (let i = 1; i < sorted.length; i++) {
      const prevLeg = sorted[i - 1];
      const currentLeg = sorted[i];

      // Rule: Road haulage following an international sea leg with a customs leg must be preceded by customs release
      if (currentLeg.transport_mode === 'ROAD_TRUCK') {
        const hasCustomsLeg = sorted.slice(0, i).find(l => l.transport_mode === 'CUSTOMS_CLEARANCE');
        if (hasCustomsLeg && hasCustomsLeg.status !== 'COMPLETED' && currentLeg.status === 'IN_PROGRESS') {
          errors.push(
            `Leg #${currentLeg.leg_sequence} (${currentLeg.leg_code}) cannot start before Customs Clearance Leg #${hasCustomsLeg.leg_sequence} is COMPLETED.`
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Constructs execution plan and legs from DTO
   */
  public buildPlanAndLegs(
    shipmentId: string,
    tenantId: string,
    legsDto: CreateExecutionLegDTO[]
  ): { plan: ExecutionPlan; legs: ExecutionLeg[] } {
    const planId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `plan_${Date.now()}`;
    const now = new Date().toISOString();

    const plan: ExecutionPlan = {
      id: planId,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      plan_version: 1,
      total_legs: legsDto.length,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const legs: ExecutionLeg[] = legsDto.map((l, idx) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `leg_${Date.now()}_${idx}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      execution_plan_id: planId,
      leg_sequence: l.leg_sequence || idx + 1,
      leg_code: l.leg_code || `LEG-${String(idx + 1).padStart(2, '0')}`,
      transport_mode: l.transport_mode,
      execution_provider_type: l.execution_provider_type || 'INTERNAL_SBU',
      origin_location_id: l.origin_location_id,
      destination_location_id: l.destination_location_id,
      assigned_vendor_id: l.assigned_vendor_id || null,
      planned_start_at: l.planned_start_at || null,
      planned_end_at: l.planned_end_at || null,
      aircraft_name: l.aircraft_name || null,
      flight_number: l.flight_number || null,
      actual_start_at: null,
      actual_end_at: null,
      status: 'PLANNED',
      created_at: now,
      updated_at: now
    }));

    return { plan, legs };
  }

  /**
   * Dispatches an execution leg to its target SBU adapter via Service Request Contract
   */
  public async dispatchExecutionLeg(
    legId: string,
    tenantId: string,
    aggregate: ShipmentAggregate
  ): Promise<{ serviceRequestId: string; domainJobId?: string; status: string }> {
    const leg = aggregate.execution_legs.find(l => l.id === legId);
    if (!leg) throw new Error(`Execution leg ${legId} not found in shipment`);

    // Determine target domain from transport mode
    let targetDomain: ServiceTargetDomain = 'TRUCKING';
    let sku = 'TRK_CONTAINER_HAULAGE';
    let payload: Record<string, unknown> = {};

    if (leg.transport_mode === 'ROAD_TRUCK') {
      targetDomain = 'TRUCKING';
      sku = 'TRK_CONTAINER_HAULAGE';
      const trkPayload: TruckingServicePayload = {
        route_specification: {
          pickup: {
            location_id: leg.origin_location_id,
            location_name: `Leg Origin (${leg.origin_location_id})`
          },
          dropoff: {
            location_id: leg.destination_location_id,
            location_name: `Leg Destination (${leg.destination_location_id})`
          }
        },
        cargo_units: aggregate.units.map(u => ({
          unit_id: u.id,
          unit_type: u.unit_type,
          container_number: (u as any).container_number || undefined,
          gross_weight_kg: u.total_gross_weight_kg
        }))
      };
      payload = trkPayload as any;
    } else if (leg.transport_mode === 'CUSTOMS_CLEARANCE') {
      targetDomain = 'CUSTOMS';
      sku = 'CUS_IMPORT_PIB_STANDARD';
      const cusPayload: CustomsServicePayload = {
        declaration_parameters: {
          declaration_type: 'PIB_IMPORT',
          customs_office_code: '040300',
          importer_entity_id: aggregate.shipment.customer_id,
          supporting_documents: []
        },
        manifest_summary: {
          total_packages: aggregate.manifest_items.reduce((acc, m) => acc + m.package_quantity, 0) || 1,
          package_type: aggregate.manifest_items[0]?.package_type || 'COLLI',
          total_gross_weight_kg: aggregate.manifest_items.reduce((acc, m) => acc + m.gross_weight_kg, 0) || 1000,
          declared_cif_usd: aggregate.manifest_items.reduce((acc, m) => acc + (m.declared_customs_value || 0), 0) || 10000
        }
      };
      payload = cusPayload as any;
    } else if (leg.transport_mode === 'WAREHOUSE_STAGING') {
      targetDomain = 'WAREHOUSE';
      sku = 'WH_CROSSDOCK_STAGING';
      payload = {
        handling_specification: {
          warehouse_location_id: leg.origin_location_id,
          operation_type: 'CROSSDOCK_SORT_AND_STAGING'
        }
      };
    }

    const { request, dispatchResult } = await this.serviceRequestService.issueRequest(
      {
        tenant_id: tenantId,
        source_domain: 'FORWARDING',
        target_domain: targetDomain,
        shipment_id: aggregate.shipment.id,
        execution_leg_id: leg.id,
        work_order_id: aggregate.shipment.work_order_id,
        service_product_sku: sku,
        request_payload: payload,
        idempotency_key: `idem-leg-${leg.id}-${Date.now()}`
      },
      true // auto-dispatch
    );

    // Update leg status to DISPATCHED / IN_PROGRESS
    await supabaseAdmin
      .from('shp_execution_legs')
      .update({
        status: 'DISPATCHED',
        actual_start_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leg.id)
      .eq('tenant_id', tenantId);

    return {
      serviceRequestId: request.id,
      domainJobId: dispatchResult?.domainJobId,
      status: request.status
    };
  }
}
