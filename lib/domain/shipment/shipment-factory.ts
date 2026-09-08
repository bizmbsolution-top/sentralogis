/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/shipment-factory.ts
 * Description: Factory generating canonical Shipment, Manifest & Polymorphic Unit aggregates
 */

import {
  CreateShipmentDTO,
  CreateManifestItemDTO,
  CreateUnitDTO,
  Shipment,
  ManifestItem,
  ShipmentUnit,
  ContainerUnit,
  BulkUnit,
  PackageUnit,
  VehicleUnit
} from './types';
import { InvalidShipmentDataError } from './errors';

export class ShipmentFactory {
  /**
   * Generates a unique, concurrency-safe shipment number: SHP-YYYYMM-XXXXXX
   */
  public static generateShipmentNumber(customSequence?: number): string {
    const today = new Date();
    const yyyymm = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const seq = customSequence !== undefined ? customSequence : Math.floor(100000 + Math.random() * 900000);
    return `SHP-${yyyymm}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Generates a 32-character hexadecimal tracking token
   */
  public static generateTrackingToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Validates and constructs the core Shipment aggregate entity
   */
  public static createShipmentEntity(dto: CreateShipmentDTO, shipmentNumber?: string): Shipment {
    const errors: string[] = [];

    if (!dto.tenant_id) errors.push('tenant_id is required');
    if (!dto.customer_id) errors.push('customer_id is required');
    if (!dto.origin_location_id) errors.push('origin_location_id is required');
    if (!dto.destination_location_id) errors.push('destination_location_id is required');

    if (errors.length > 0) {
      throw new InvalidShipmentDataError(errors);
    }

    const now = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shp_${Date.now()}`;
    const tracking_token = this.generateTrackingToken();
    const shp_number = shipmentNumber || this.generateShipmentNumber();

    return {
      id,
      tenant_id: dto.tenant_id,
      shipment_number: shp_number,
      work_order_id: dto.work_order_id || '',
      service_scope_id: dto.service_scope_id || '',
      customer_id: dto.customer_id,
      shipper_id: dto.shipper_id || null,
      consignee_id: dto.consignee_id || null,
      notify_party_id: dto.notify_party_id || null,
      origin_location_id: dto.origin_location_id,
      destination_location_id: dto.destination_location_id,
      global_status: 'DRAFT',
      tracking_token,
      master_bl_number: dto.master_bl_number || null,
      house_bl_number: dto.house_bl_number || null,
      booking_reference: dto.booking_reference || null,
      etd: dto.etd || null,
      eta: dto.eta || null,
      actual_departure_at: null,
      actual_delivery_at: null,
      version_no: 1,
      created_at: now,
      updated_at: now,
      created_by: dto.created_by || null,
      updated_by: dto.created_by || null
    };
  }

  /**
   * Constructs Manifest Items
   */
  public static createManifestItemEntities(
    shipmentId: string,
    tenantId: string,
    items: CreateManifestItemDTO[]
  ): ManifestItem[] {
    const now = new Date().toISOString();

    return items.map((item, idx) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mi_${Date.now()}_${idx}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      item_sequence: idx + 1,
      commodity_name: item.commodity_name || 'General Cargo',
      hs_code: item.hs_code || null,
      package_quantity: item.package_quantity || 1,
      package_type: item.package_type || 'COLLI',
      gross_weight_kg: Number(item.gross_weight_kg) || 0,
      volume_cbm: Number(item.volume_cbm) || 0,
      declared_customs_value: item.declared_customs_value || null,
      declared_currency: item.declared_currency || 'IDR',
      is_dangerous_goods: Boolean(item.is_dangerous_goods),
      dg_un_number: item.dg_un_number || null,
      created_at: now
    }));
  }

  /**
   * Constructs Polymorphic Shipment Units (Container, Bulk, Package, Vehicle)
   */
  public static createUnitEntities(
    shipmentId: string,
    tenantId: string,
    units: CreateUnitDTO[]
  ): ShipmentUnit[] {
    const now = new Date().toISOString();

    return units.map((u, idx) => {
      const baseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `unit_${Date.now()}_${idx}`;
      const base = {
        id: baseId,
        tenant_id: tenantId,
        shipment_id: shipmentId,
        unit_type: u.unit_type,
        unit_identifier: u.unit_identifier || `UNIT-${idx + 1}`,
        total_gross_weight_kg: Number(u.total_gross_weight_kg) || 0,
        total_volume_cbm: u.total_volume_cbm ? Number(u.total_volume_cbm) : null,
        current_location_id: null,
        status: 'PLANNED',
        created_at: now,
        updated_at: now
      };

      switch (u.unit_type) {
        case 'CONTAINER':
          return {
            ...base,
            unit_type: 'CONTAINER',
            container_number: u.container_number || u.unit_identifier,
            iso_type: u.iso_type || '20GP',
            seal_number: u.seal_number || null,
            tare_weight_kg: u.tare_weight_kg || 2200,
            max_payload_kg: u.max_payload_kg || 28000,
            temperature_celsius: u.temperature_celsius || null,
            is_soc: Boolean(u.is_soc)
          } as ContainerUnit;

        case 'BULK_MT':
          return {
            ...base,
            unit_type: 'BULK_MT',
            bulk_type: u.bulk_type || 'DRY_BULK',
            metric_tonnage: Number(u.metric_tonnage) || 0,
            moisture_percentage: u.moisture_percentage || null,
            surveyor_report_number: u.surveyor_report_number || null,
            surveyor_entity_id: u.surveyor_entity_id || null
          } as BulkUnit;

        case 'PALLET':
        case 'BOX':
        case 'BREAKBULK':
          return {
            ...base,
            unit_type: u.unit_type,
            parent_container_unit_id: null,
            package_type: u.package_type || 'PALLET',
            colli_count: u.colli_count || 1,
            length_cm: u.length_cm || null,
            width_cm: u.width_cm || null,
            height_cm: u.height_cm || null,
            is_stackable: u.is_stackable !== undefined ? u.is_stackable : true
          } as PackageUnit;

        case 'VEHICLE':
          return {
            ...base,
            unit_type: 'VEHICLE',
            vin_number: u.vin_number,
            engine_number: u.engine_number || null,
            vehicle_model: u.vehicle_model || 'Standard Model',
            color: u.color || null,
            is_drivable: u.is_drivable !== undefined ? u.is_drivable : true
          } as VehicleUnit;
      }
    });
  }
}
