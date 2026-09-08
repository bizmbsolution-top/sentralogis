/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/repository.ts
 * Description: Supabase / PostgreSQL Repository for Canonical Shipment tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Shipment,
  ManifestItem,
  ShipmentUnit,
  ContainerUnit,
  BulkUnit,
  PackageUnit,
  VehicleUnit,
  ExecutionPlan,
  ExecutionLeg,
  LegUnitAllocation,
  Milestone,
  ShipmentException,
  ShipmentAggregate,
  ShipmentGlobalStatus
} from './types';
import { ShipmentTenantIsolationViolationError, ShipmentNotFoundError } from './errors';

export class ShipmentRepository {
  /**
   * Persists a complete canonical Shipment aggregate (Shipment, Manifests, Polymorphic Units, Plan & Legs)
   */
  public async createShipmentAggregate(
    shipment: Shipment,
    manifestItems: ManifestItem[],
    units: ShipmentUnit[],
    executionPlan?: ExecutionPlan | null,
    executionLegs: ExecutionLeg[] = []
  ): Promise<void> {
    // 1. Insert shp_shipments
    const { error: shpError } = await supabaseAdmin.from('shp_shipments').insert({
      id: shipment.id,
      tenant_id: shipment.tenant_id,
      shipment_number: shipment.shipment_number,
      work_order_id: shipment.work_order_id,
      service_scope_id: shipment.service_scope_id,
      customer_id: shipment.customer_id,
      shipper_id: shipment.shipper_id,
      consignee_id: shipment.consignee_id,
      notify_party_id: shipment.notify_party_id,
      origin_location_id: shipment.origin_location_id,
      destination_location_id: shipment.destination_location_id,
      global_status: shipment.global_status,
      tracking_token: shipment.tracking_token,
      master_bl_number: shipment.master_bl_number,
      house_bl_number: shipment.house_bl_number,
      booking_reference: shipment.booking_reference,
      etd: shipment.etd,
      eta: shipment.eta,
      created_by: shipment.created_by,
      updated_by: shipment.updated_by
    });

    if (shpError) throw new Error(`Failed to insert shp_shipments: ${shpError.message}`);

    // 2. Insert shp_manifest_items
    if (manifestItems.length > 0) {
      const { error: manifestError } = await supabaseAdmin
        .from('shp_manifest_items')
        .insert(
          manifestItems.map(m => ({
            id: m.id,
            tenant_id: m.tenant_id,
            shipment_id: m.shipment_id,
            item_sequence: m.item_sequence,
            commodity_name: m.commodity_name,
            hs_code: m.hs_code,
            package_quantity: m.package_quantity,
            package_type: m.package_type,
            gross_weight_kg: m.gross_weight_kg,
            volume_cbm: m.volume_cbm,
            declared_customs_value: m.declared_customs_value,
            declared_currency: m.declared_currency,
            is_dangerous_goods: m.is_dangerous_goods,
            dg_un_number: m.dg_un_number
          }))
        );

      if (manifestError) throw new Error(`Failed to insert shp_manifest_items: ${manifestError.message}`);
    }

    // 3. Insert shp_units and Subtypes (Table-per-Type)
    if (units.length > 0) {
      // 3A. Insert Base shp_units
      const { error: unitsError } = await supabaseAdmin.from('shp_units').insert(
        units.map(u => ({
          id: u.id,
          tenant_id: u.tenant_id,
          shipment_id: u.shipment_id,
          unit_type: u.unit_type,
          unit_identifier: u.unit_identifier,
          total_gross_weight_kg: u.total_gross_weight_kg,
          total_volume_cbm: u.total_volume_cbm,
          status: u.status
        }))
      );

      if (unitsError) throw new Error(`Failed to insert shp_units: ${unitsError.message}`);

      // 3B. Insert Subtypes
      const containers = units.filter(u => u.unit_type === 'CONTAINER') as ContainerUnit[];
      if (containers.length > 0) {
        await supabaseAdmin.from('shp_unit_containers').insert(
          containers.map(c => ({
            unit_id: c.id,
            tenant_id: c.tenant_id,
            container_number: c.container_number,
            iso_type: c.iso_type,
            seal_number: c.seal_number,
            tare_weight_kg: c.tare_weight_kg,
            max_payload_kg: c.max_payload_kg,
            temperature_celsius: c.temperature_celsius,
            is_soc: c.is_soc
          }))
        );
      }

      const bulkUnits = units.filter(u => u.unit_type === 'BULK_MT') as BulkUnit[];
      if (bulkUnits.length > 0) {
        await supabaseAdmin.from('shp_unit_bulk').insert(
          bulkUnits.map(b => ({
            unit_id: b.id,
            tenant_id: b.tenant_id,
            bulk_type: b.bulk_type,
            metric_tonnage: b.metric_tonnage,
            moisture_percentage: b.moisture_percentage,
            surveyor_report_number: b.surveyor_report_number,
            surveyor_entity_id: b.surveyor_entity_id
          }))
        );
      }

      const pkgUnits = units.filter(
        u => u.unit_type === 'PALLET' || u.unit_type === 'BOX' || u.unit_type === 'BREAKBULK'
      ) as PackageUnit[];
      if (pkgUnits.length > 0) {
        await supabaseAdmin.from('shp_unit_packages').insert(
          pkgUnits.map(p => ({
            unit_id: p.id,
            tenant_id: p.tenant_id,
            package_type: p.package_type,
            colli_count: p.colli_count,
            length_cm: p.length_cm,
            width_cm: p.width_cm,
            height_cm: p.height_cm,
            is_stackable: p.is_stackable
          }))
        );
      }

      const vehicles = units.filter(u => u.unit_type === 'VEHICLE') as VehicleUnit[];
      if (vehicles.length > 0) {
        await supabaseAdmin.from('shp_unit_vehicles').insert(
          vehicles.map(v => ({
            unit_id: v.id,
            tenant_id: v.tenant_id,
            vin_number: v.vin_number,
            engine_number: v.engine_number,
            vehicle_model: v.vehicle_model,
            color: v.color,
            is_drivable: v.is_drivable
          }))
        );
      }
    }

    // 4. Insert Execution Plan & Legs
    if (executionPlan) {
      const { error: planError } = await supabaseAdmin.from('shp_execution_plans').insert({
        id: executionPlan.id,
        tenant_id: executionPlan.tenant_id,
        shipment_id: executionPlan.shipment_id,
        plan_version: executionPlan.plan_version,
        total_legs: executionLegs.length,
        is_active: executionPlan.is_active
      });

      if (planError) throw new Error(`Failed to insert shp_execution_plans: ${planError.message}`);

      if (executionLegs.length > 0) {
        const { error: legsError } = await supabaseAdmin.from('shp_execution_legs').insert(
          executionLegs.map(l => ({
            id: l.id,
            tenant_id: l.tenant_id,
            shipment_id: l.shipment_id,
            execution_plan_id: l.execution_plan_id,
            leg_sequence: l.leg_sequence,
            leg_code: l.leg_code,
            transport_mode: l.transport_mode,
            execution_provider_type: l.execution_provider_type,
            origin_location_id: l.origin_location_id,
            destination_location_id: l.destination_location_id,
            assigned_vendor_id: l.assigned_vendor_id,
            planned_start_at: l.planned_start_at,
            planned_end_at: l.planned_end_at,
            aircraft_name: l.aircraft_name,
            flight_number: l.flight_number,
            status: l.status
          }))
        );

        if (legsError) throw new Error(`Failed to insert shp_execution_legs: ${legsError.message}`);
      }
    }
  }

  /**
   * Loads a full aggregate Shipment by ID with tenant isolation verification
   */
  public async getShipmentAggregate(shipmentId: string, tenantId: string): Promise<ShipmentAggregate> {
    const { data: shpData, error: shpError } = await supabaseAdmin
      .from('shp_shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (shpError || !shpData) {
      throw new ShipmentNotFoundError(shipmentId);
    }

    if (shpData.tenant_id !== tenantId) {
      throw new ShipmentTenantIsolationViolationError(shpData.tenant_id, tenantId);
    }

    // Load Manifest Items
    const { data: manifestData } = await supabaseAdmin
      .from('shp_manifest_items')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('item_sequence', { ascending: true });

    // Load Units
    const { data: unitsData } = await supabaseAdmin
      .from('shp_units')
      .select('*')
      .eq('shipment_id', shipmentId);

    // Load Subtypes
    const resolvedUnits: ShipmentUnit[] = [];
    for (const u of unitsData || []) {
      if (u.unit_type === 'CONTAINER') {
        const { data: sub } = await supabaseAdmin.from('shp_unit_containers').select('*').eq('unit_id', u.id).single();
        resolvedUnits.push({ ...u, ...(sub || {}) } as ContainerUnit);
      } else if (u.unit_type === 'BULK_MT') {
        const { data: sub } = await supabaseAdmin.from('shp_unit_bulk').select('*').eq('unit_id', u.id).single();
        resolvedUnits.push({ ...u, ...(sub || {}) } as BulkUnit);
      } else if (u.unit_type === 'PALLET' || u.unit_type === 'BOX' || u.unit_type === 'BREAKBULK') {
        const { data: sub } = await supabaseAdmin.from('shp_unit_packages').select('*').eq('unit_id', u.id).single();
        resolvedUnits.push({ ...u, ...(sub || {}) } as PackageUnit);
      } else if (u.unit_type === 'VEHICLE') {
        const { data: sub } = await supabaseAdmin.from('shp_unit_vehicles').select('*').eq('unit_id', u.id).single();
        resolvedUnits.push({ ...u, ...(sub || {}) } as VehicleUnit);
      } else {
        resolvedUnits.push(u as any);
      }
    }

    // Load Execution Plan & Legs
    const { data: planData } = await supabaseAdmin
      .from('shp_execution_plans')
      .select('*')
      .eq('shipment_id', shipmentId)
      .eq('is_active', true)
      .maybeSingle();

    const { data: legsData } = await supabaseAdmin
      .from('shp_execution_legs')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('leg_sequence', { ascending: true });

    const { data: legUnitsData } = await supabaseAdmin
      .from('shp_leg_units')
      .select('*')
      .eq('tenant_id', tenantId);

    // Load Milestones
    const { data: milestonesData } = await supabaseAdmin
      .from('shp_milestones')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('occurred_at', { ascending: true });

    // Load Exceptions
    const { data: exceptionsData } = await supabaseAdmin
      .from('shp_exceptions')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });

    return {
      shipment: shpData as unknown as Shipment,
      manifest_items: (manifestData || []) as unknown as ManifestItem[],
      units: resolvedUnits,
      execution_plan: planData as unknown as ExecutionPlan | null,
      execution_legs: (legsData || []) as unknown as ExecutionLeg[],
      leg_unit_allocations: (legUnitsData || []) as unknown as LegUnitAllocation[],
      milestones: (milestonesData || []) as unknown as Milestone[],
      exceptions: (exceptionsData || []) as unknown as ShipmentException[]
    };
  }

  /**
   * Lists Shipments for a tenant with optional filtering
   */
  public async listShipments(
    tenantId: string,
    filters?: {
      status?: ShipmentGlobalStatus;
      work_order_id?: string;
      customer_id?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<Shipment[]> {
    let query = supabaseAdmin
      .from('shp_shipments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('global_status', filters.status);
    }
    if (filters?.work_order_id) {
      query = query.eq('work_order_id', filters.work_order_id);
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list shipments: ${error.message}`);
    return (data || []) as unknown as Shipment[];
  }

  /**
   * Updates global status of a Shipment
   */
  public async updateShipmentStatus(
    shipmentId: string,
    tenantId: string,
    targetStatus: ShipmentGlobalStatus
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('shp_shipments')
      .update({
        global_status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', shipmentId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to update shipment status: ${error.message}`);
  }

  /**
   * Appends an immutable milestone record
   */
  public async insertMilestone(milestone: Milestone): Promise<void> {
    const { error } = await supabaseAdmin.from('shp_milestones').insert({
      id: milestone.id,
      tenant_id: milestone.tenant_id,
      shipment_id: milestone.shipment_id,
      execution_leg_id: milestone.execution_leg_id || null,
      milestone_code: milestone.milestone_code,
      milestone_label: milestone.milestone_label,
      occurred_at: milestone.occurred_at,
      location_id: milestone.location_id || null,
      recorded_by: milestone.recorded_by || null,
      metadata: milestone.metadata || {}
    });

    if (error) throw new Error(`Failed to insert milestone: ${error.message}`);
  }

  /**
   * Logs a new exception
   */
  public async insertException(exception: ShipmentException): Promise<void> {
    const { error } = await supabaseAdmin.from('shp_exceptions').insert({
      id: exception.id,
      tenant_id: exception.tenant_id,
      shipment_id: exception.shipment_id,
      execution_leg_id: exception.execution_leg_id || null,
      exception_type: exception.exception_type,
      severity: exception.severity,
      description: exception.description,
      is_resolved: exception.is_resolved
    });

    if (error) throw new Error(`Failed to insert exception: ${error.message}`);
  }

  /**
   * Resolves an active exception
   */
  public async resolveException(exceptionId: string, tenantId: string, resolvedBy?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('shp_exceptions')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy || null
      })
      .eq('id', exceptionId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to resolve exception: ${error.message}`);
  }

  /**
   * Retrieves all exceptions for a shipment
   */
  public async getExceptions(shipmentId: string, tenantId: string): Promise<ShipmentException[]> {
    const { data, error } = await supabaseAdmin
      .from('shp_exceptions')
      .select('*')
      .eq('shipment_id', shipmentId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to load exceptions: ${error.message}`);
    return (data || []) as unknown as ShipmentException[];
  }
}
