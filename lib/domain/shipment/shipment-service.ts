/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/shipment-service.ts
 * Description: Primary Application Service Facade for Canonical Shipment Aggregate Root
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CreateShipmentDTO,
  ShipmentAggregate,
  ShipmentGlobalStatus,
  Shipment
} from './types';
import { ShipmentFactory } from './shipment-factory';
import { ShipmentStateMachine } from './state-machine';
import { ShipmentRepository } from './repository';
import { ExecutionPlanService } from './execution-plan-service';
import { MilestoneService } from './milestone-service';
import { ExceptionService } from './exception-service';
import { UnresolvedExceptionsError, PodRequiredError } from './errors';

export class ShipmentService {
  private repo = new ShipmentRepository();
  private planService = new ExecutionPlanService();
  private milestoneService = new MilestoneService();
  private exceptionService = new ExceptionService();

  /**
   * Creates a new canonical Shipment aggregate with manifest items, units, and optional execution plan
   */
  public async createShipment(dto: CreateShipmentDTO): Promise<ShipmentAggregate> {
    // 1. Build Aggregate Entities via Factory
    const shipment = ShipmentFactory.createShipmentEntity(dto);
    const manifestItems = dto.manifest_items
      ? ShipmentFactory.createManifestItemEntities(shipment.id, dto.tenant_id, dto.manifest_items)
      : [];
    const units = dto.units
      ? ShipmentFactory.createUnitEntities(shipment.id, dto.tenant_id, dto.units)
      : [];

    let executionPlan = null;
    let executionLegs: any[] = [];
    if (dto.execution_legs && dto.execution_legs.length > 0) {
      const built = this.planService.buildPlanAndLegs(shipment.id, dto.tenant_id, dto.execution_legs);
      executionPlan = built.plan;
      executionLegs = built.legs;
    }

    // 2. Persist to Database via Repository
    await this.repo.createShipmentAggregate(
      shipment,
      manifestItems,
      units,
      executionPlan,
      executionLegs
    );

    // 3. Emit ShipmentCreated Event to Outbox
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: dto.tenant_id,
        event_name: 'ShipmentCreated',
        event_version: '1.0.0',
        aggregate_type: 'Shipment',
        aggregate_id: shipment.id,
        correlation_id: shipment.id,
        producer_domain: 'FORWARDING',
        payload: {
          shipment_id: shipment.id,
          shipment_number: shipment.shipment_number,
          work_order_id: shipment.work_order_id,
          customer_id: shipment.customer_id,
          origin_location_id: shipment.origin_location_id,
          destination_location_id: shipment.destination_location_id,
          total_units: units.length
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit ShipmentCreated outbox event:', e);
    }

    // 4. Record Initial Milestone
    await this.milestoneService.recordMilestone(
      dto.tenant_id,
      shipment.id,
      'SHIPMENT_CREATED',
      'Shipment record created in system',
      { recordedBy: dto.created_by }
    );

    return {
      shipment,
      manifest_items: manifestItems,
      units,
      execution_plan: executionPlan,
      execution_legs: executionLegs,
      leg_unit_allocations: [],
      milestones: [],
      exceptions: []
    };
  }

  /**
   * Retrieves a full shipment aggregate
   */
  public async getShipment(shipmentId: string, tenantId: string): Promise<ShipmentAggregate> {
    return this.repo.getShipmentAggregate(shipmentId, tenantId);
  }

  /**
   * Lists shipments for a tenant
   */
  public async listShipments(
    tenantId: string,
    filters?: { status?: ShipmentGlobalStatus; work_order_id?: string; customer_id?: string; limit?: number }
  ): Promise<Shipment[]> {
    return this.repo.listShipments(tenantId, filters);
  }

  /**
   * Transitions shipment status with state machine enforcement and business gating
   */
  public async updateShipmentStatus(
    shipmentId: string,
    tenantId: string,
    targetStatus: ShipmentGlobalStatus,
    userContext?: { userId?: string; notes?: string }
  ): Promise<void> {
    const aggregate = await this.repo.getShipmentAggregate(shipmentId, tenantId);
    const currentStatus = aggregate.shipment.global_status;

    // 1. State Machine Validation
    ShipmentStateMachine.assertTransition(currentStatus, targetStatus);

    // 2. Business Gating Rules
    if (targetStatus === 'COMPLETED') {
      // Check unresolved critical exceptions
      const hasBlockingExceptions = await this.exceptionService.checkBlockingExceptions(
        shipmentId,
        tenantId
      );
      if (hasBlockingExceptions) {
        throw new UnresolvedExceptionsError(shipmentId, 1);
      }
    }

    // 3. Update Database
    await this.repo.updateShipmentStatus(shipmentId, tenantId, targetStatus);

    // 4. Emit ShipmentStatusChanged Outbox Event
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'ShipmentStatusChanged',
        event_version: '1.0.0',
        aggregate_type: 'Shipment',
        aggregate_id: shipmentId,
        correlation_id: shipmentId,
        producer_domain: 'FORWARDING',
        payload: {
          shipment_id: shipmentId,
          previous_status: currentStatus,
          new_status: targetStatus,
          changed_by: userContext?.userId
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit ShipmentStatusChanged outbox event:', e);
    }

    // 5. Append Milestone
    await this.milestoneService.recordMilestone(
      tenantId,
      shipmentId,
      `STATUS_${targetStatus}`,
      `Shipment status changed to ${targetStatus}`,
      { recordedBy: userContext?.userId }
    );
  }

  /**
   * Dispatches an execution leg to its target SBU adapter via Service Request Contract
   */
  public async dispatchLeg(
    shipmentId: string,
    legId: string,
    tenantId: string
  ): Promise<{ serviceRequestId: string; domainJobId?: string; status: string }> {
    const aggregate = await this.repo.getShipmentAggregate(shipmentId, tenantId);
    return this.planService.dispatchExecutionLeg(legId, tenantId, aggregate);
  }
}
