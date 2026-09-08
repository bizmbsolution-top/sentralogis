/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/adapters/trucking-adapter.ts
 * Description: Trucking SBU Adapter translating ServiceRequests into existing job_orders & job_routes
 *
 * U-07 LINEAGE REPAIR: this adapter no longer creates detached execution.
 * Before ANY write it resolves the canonical commercial lineage via the U-07
 * Execution Lineage boundary (resolveTruckingLineage): SR → engagement →
 * operational WO item. The inserted job_orders row now carries a REAL,
 * tenant-valid `wo_item_id`. If lineage cannot be resolved, dispatch FAILS
 * deterministically (TruckingLineageError) — never fabricated IDs, never NULL.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  ServiceRequestAdapter,
  AdapterExecutionResult,
  AdapterCompensationContext
} from './service-request-adapter.interface';
import { ServiceRequest, TruckingServicePayload } from '../types';
import { ValidationResult } from '../service-request-validator';
import {
  AdapterExecutionFailedError,
  DomainJobCreationFailedError
} from '../errors';
import {
  resolveTruckingLineage,
  getTruckingLineageRepository,
} from '@/lib/application/service-contracts/trucking-lineage';

export class TruckingServiceRequestAdapter implements ServiceRequestAdapter {
  public readonly targetDomain = 'TRUCKING' as const;

  /**
   * Supports all Trucking SKUs: e.g. TRK_CONTAINER_HAULAGE, TRK_HEAVY_HAUL, TRK_FTL, TRK_LTL, TRK_LAST_MILE
   */
  public supports(serviceProductSku: string): boolean {
    return (
      serviceProductSku.startsWith('TRK_') ||
      serviceProductSku.includes('TRUCKING') ||
      serviceProductSku.includes('HAULAGE')
    );
  }

  /**
   * Validates target SBU readiness
   */
  public async validate(request: ServiceRequest): Promise<ValidationResult> {
    const payload = request.request_payload as TruckingServicePayload;
    if (!payload?.route_specification?.pickup || !payload?.route_specification?.dropoff) {
      return { isValid: false, errors: ['Missing pickup or dropoff route specification'] };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Executes creation of existing job_orders & job_routes without modifying Trucking schema.
   * U-07: canonical commercial lineage is resolved FIRST; execution is impossible
   * without it.
   */
  public async execute(request: ServiceRequest): Promise<AdapterExecutionResult> {
    const tenant_id = request.tenant_id;
    const payload = request.request_payload as TruckingServicePayload;
    const pickup = payload.route_specification.pickup;
    const dropoff = payload.route_specification.dropoff;
    const cargoUnits = payload.cargo_units || [];

    // ===== U-07: CANONICAL LINEAGE RESOLUTION (fails closed) =====
    const lineage = await resolveTruckingLineage(request);

    try {
      // 1. Generate unique Job Order Number
      const today = new Date();
      const mmyy = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const jo_number = `JO-TRK-${mmyy}-${randomSuffix}`;

      // 2. Generate Tracking Token
      const tracking_token =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. Resolve Primary Container Number
      const primaryContainerNumber = cargoUnits.find(u => u.container_number)?.container_number || null;

      // 4. Insert into existing job_orders table (Privatized to SBU Trucking)
      //    U-07: wo_item_id is the REAL canonical work item resolved above.
      const repo = getTruckingLineageRepository();
      let joData: { id: string; jo_number: string };
      try {
        joData = await repo.insertJobOrder({
          tenant_id,
          wo_item_id: lineage.woItemId,
          jo_number,
          status: 'pending',
          sbu_type: 'TRUCKING',
          tracking_token,
          container_number: primaryContainerNumber,
          total_stops: 2 + (payload.route_specification.intermediate_stops?.length || 0),
          notes: `Dispatched via ServiceRequest ${request.request_number}`
        });
      } catch (err: unknown) {
        throw new DomainJobCreationFailedError(
          'TRUCKING',
          err instanceof Error ? err.message : 'Failed to insert job_orders'
        );
      }

      const job_order_id = joData.id;

      // 5. Insert Job Routes (Pickup & Dropoff)
      const routesToInsert: Array<Record<string, unknown>> = [
        {
          job_order_id,
          sequence: 1,
          stop_type: 'pickup',
          location_name: pickup.location_name || 'Origin Pickup',
          latitude: pickup.coordinates?.latitude || null,
          longitude: pickup.coordinates?.longitude || null,
          status: 'pending'
        }
      ];

      // Add intermediate stops if any
      if (payload.route_specification.intermediate_stops && Array.isArray(payload.route_specification.intermediate_stops)) {
        payload.route_specification.intermediate_stops.forEach((stop, idx) => {
          routesToInsert.push({
            job_order_id,
            sequence: 2 + idx,
            stop_type: 'intermediate',
            location_name: stop.location_name || `Stop ${idx + 1}`,
            latitude: stop.coordinates?.latitude || null,
            longitude: stop.coordinates?.longitude || null,
            status: 'pending'
          });
        });
      }

      // Add final dropoff
      routesToInsert.push({
        job_order_id,
        sequence: routesToInsert.length + 1,
        stop_type: 'dropoff',
        location_name: dropoff.location_name || 'Destination Dropoff',
        latitude: dropoff.coordinates?.latitude || null,
        longitude: dropoff.coordinates?.longitude || null,
        status: 'pending'
      });

      await repo.insertJobRoutes(routesToInsert);

      return {
        success: true,
        domainJobId: job_order_id,
        domainJobNumber: joData.jo_number,
        metadata: {
          tracking_token,
          routes_count: routesToInsert.length,
          engagement_id: lineage.engagementId,
          wo_item_id: lineage.woItemId
        }
      };
    } catch (err: unknown) {
      if (err instanceof DomainJobCreationFailedError) throw err;
      throw new AdapterExecutionFailedError('TRUCKING', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Compensates if downstream orchestration fails
   */
  public async compensate(context: AdapterCompensationContext): Promise<void> {
    if (!context.domainJobId) return;
    try {
      await supabaseAdmin
        .from('job_orders')
        .update({ status: 'cancelled', notes: `Cancelled due to compensation: ${context.reason}` })
        .eq('id', context.domainJobId)
        .eq('tenant_id', context.tenantId);
    } catch (error) {
      console.error(`Failed to compensate Trucking domain job ${context.domainJobId}:`, error);
    }
  }
}
