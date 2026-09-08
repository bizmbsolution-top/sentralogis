/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/types.ts
 * Description: Canonical TypeScript domain types for Shipment Aggregate Root & Polymorphic Units
 */

// ----------------------------------------------------------------------------
// ENUMS & VALUE OBJECTS
// ----------------------------------------------------------------------------

export type IncotermType =
  | 'EXW'
  | 'FCA'
  | 'FAS'
  | 'FOB'
  | 'CFR'
  | 'CIF'
  | 'CPT'
  | 'CIP'
  | 'DAP'
  | 'DPU'
  | 'DDP';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'IN_EXECUTION'
  | 'FULFILLED'
  | 'BILLED'
  | 'CLOSED'
  | 'CANCELLED';

export type ShipmentGlobalStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'AT_INTERMEDIATE_NODE'
  | 'CUSTOMS_HOLD'
  | 'CUSTOMS_RELEASED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'EXCEPTION_HOLD'
  | 'CANCELLED';

export type ShipmentUnitType =
  | 'CONTAINER'
  | 'BULK_MT'
  | 'BREAKBULK'
  | 'PALLET'
  | 'BOX'
  | 'VEHICLE'
  | 'TANK';

export type TransportMode =
  | 'ROAD_TRUCK'
  | 'OCEAN_VESSEL'
  | 'BARGE'
  | 'AIR_FREIGHT'
  | 'RAIL_FREIGHT'
  | 'PORT_TERMINAL_HANDLING'
  | 'WAREHOUSE_STAGING'
  | 'CUSTOMS_CLEARANCE';

export type ExecutionProviderType =
  | 'INTERNAL_SBU'
  | 'EXTERNAL_VENDOR';

// ----------------------------------------------------------------------------
// COMMERCIAL DOMAIN ENTITIES
// ----------------------------------------------------------------------------

export interface CommercialServiceScope {
  id: string;
  tenant_id: string;
  scope_code: string;
  scope_name: string;
  incoterm: IncotermType;
  incoterm_named_place?: string | null;
  origin_scope_node_id?: string | null;
  dest_scope_node_id?: string | null;
  included_services: string[];
  excluded_services: string[];
  billing_currency: string;
  is_active: boolean;
  version_no: number;
  created_at: string;
  updated_at: string;
}

export interface CommercialWorkOrder {
  id: string;
  tenant_id: string;
  wo_number: string;
  customer_id: string;
  service_scope_id: string;
  contract_reference?: string | null;
  order_date: string;
  target_fulfillment_date?: string | null;
  status: WorkOrderStatus;
  currency: string;
  total_agreed_revenue: number;
  payment_terms_days: number;
  commercial_notes?: string | null;
  version_no: number;
  created_at: string;
  updated_at: string;
}

export interface CommercialLineItem {
  id: string;
  tenant_id: string;
  work_order_id: string;
  line_sequence: number;
  service_product_sku: string;
  service_description: string;
  quantity: number;
  unit_of_measure: string;
  unit_sell_price: number;
  total_sell_price: number;
  created_at: string;
}

// ----------------------------------------------------------------------------
// SHIPMENT AGGREGATE ROOT & MANIFEST
// ----------------------------------------------------------------------------

export interface Shipment {
  id: string;
  tenant_id: string;
  shipment_number: string;
  work_order_id: string;
  service_scope_id: string;
  customer_id: string;
  shipper_id?: string | null;
  consignee_id?: string | null;
  notify_party_id?: string | null;
  origin_location_id: string;
  destination_location_id: string;
  global_status: ShipmentGlobalStatus;
  tracking_token: string;
  master_bl_number?: string | null;
  house_bl_number?: string | null;
  booking_reference?: string | null;
  etd?: string | null;
  eta?: string | null;
  actual_departure_at?: string | null;
  actual_delivery_at?: string | null;
  version_no: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ManifestItem {
  id: string;
  tenant_id: string;
  shipment_id: string;
  item_sequence: number;
  commodity_name: string;
  hs_code?: string | null;
  package_quantity: number;
  package_type: string;
  gross_weight_kg: number;
  volume_cbm: number;
  declared_customs_value?: number | null;
  declared_currency?: string | null;
  is_dangerous_goods: boolean;
  dg_un_number?: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// POLYMORPHIC SHIPMENT UNITS (TABLE-PER-TYPE)
// ----------------------------------------------------------------------------

export interface BaseShipmentUnit {
  id: string;
  tenant_id: string;
  shipment_id: string;
  unit_type: ShipmentUnitType;
  unit_identifier: string;
  total_gross_weight_kg: number;
  total_volume_cbm?: number | null;
  current_location_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContainerUnit extends BaseShipmentUnit {
  unit_type: 'CONTAINER';
  container_number: string;
  iso_type: string;
  seal_number?: string | null;
  tare_weight_kg: number;
  max_payload_kg: number;
  temperature_celsius?: number | null;
  is_soc: boolean;
}

export interface BulkUnit extends BaseShipmentUnit {
  unit_type: 'BULK_MT';
  bulk_type: string;
  metric_tonnage: number;
  moisture_percentage?: number | null;
  surveyor_report_number?: string | null;
  surveyor_entity_id?: string | null;
}

export interface PackageUnit extends BaseShipmentUnit {
  unit_type: 'PALLET' | 'BOX' | 'BREAKBULK';
  parent_container_unit_id?: string | null;
  package_type: string;
  colli_count: number;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  is_stackable: boolean;
}

export interface VehicleUnit extends BaseShipmentUnit {
  unit_type: 'VEHICLE';
  vin_number: string;
  engine_number?: string | null;
  vehicle_model: string;
  color?: string | null;
  is_drivable: boolean;
}

export type ShipmentUnit =
  | ContainerUnit
  | BulkUnit
  | PackageUnit
  | VehicleUnit;

// ----------------------------------------------------------------------------
// EXECUTION PLANS, LEGS & ALLOCATIONS
// ----------------------------------------------------------------------------

export interface ExecutionPlan {
  id: string;
  tenant_id: string;
  shipment_id: string;
  plan_version: number;
  total_legs: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLeg {
  id: string;
  tenant_id: string;
  shipment_id: string;
  execution_plan_id: string;
  leg_sequence: number;
  leg_code: string;
  transport_mode: TransportMode;
  execution_provider_type: ExecutionProviderType;
  origin_location_id: string;
  destination_location_id: string;
  assigned_vendor_id?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  aircraft_name?: string | null;
  flight_number?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LegUnitAllocation {
  id: string;
  tenant_id: string;
  execution_leg_id: string;
  unit_id: string;
  allocated_at: string;
}

export interface Milestone {
  id: string;
  tenant_id: string;
  shipment_id: string;
  execution_leg_id?: string | null;
  milestone_code: string;
  milestone_label: string;
  occurred_at: string;
  location_id?: string | null;
  recorded_by?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ShipmentException {
  id: string;
  tenant_id: string;
  shipment_id: string;
  execution_leg_id?: string | null;
  exception_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// COMPOSITE AGGREGATE & DTOs
// ----------------------------------------------------------------------------

export interface CreateManifestItemDTO {
  commodity_name: string;
  hs_code?: string;
  package_quantity?: number;
  package_type?: string;
  gross_weight_kg: number;
  volume_cbm: number;
  declared_customs_value?: number;
  declared_currency?: string;
  is_dangerous_goods?: boolean;
  dg_un_number?: string;
}

export interface CreateContainerUnitDTO {
  unit_type: 'CONTAINER';
  unit_identifier: string;
  container_number: string;
  iso_type?: string;
  seal_number?: string;
  tare_weight_kg?: number;
  max_payload_kg?: number;
  temperature_celsius?: number;
  is_soc?: boolean;
  total_gross_weight_kg: number;
  total_volume_cbm?: number;
}

export interface CreateBulkUnitDTO {
  unit_type: 'BULK_MT';
  unit_identifier: string;
  bulk_type: string;
  metric_tonnage: number;
  moisture_percentage?: number;
  surveyor_report_number?: string;
  surveyor_entity_id?: string;
  total_gross_weight_kg: number;
  total_volume_cbm?: number;
}

export interface CreatePackageUnitDTO {
  unit_type: 'PALLET' | 'BOX' | 'BREAKBULK';
  unit_identifier: string;
  package_type: string;
  colli_count: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  is_stackable?: boolean;
  total_gross_weight_kg: number;
  total_volume_cbm?: number;
}

export interface CreateVehicleUnitDTO {
  unit_type: 'VEHICLE';
  unit_identifier: string;
  vin_number: string;
  engine_number?: string;
  vehicle_model: string;
  color?: string;
  is_drivable?: boolean;
  total_gross_weight_kg: number;
  total_volume_cbm?: number;
}

export type CreateUnitDTO =
  | CreateContainerUnitDTO
  | CreateBulkUnitDTO
  | CreatePackageUnitDTO
  | CreateVehicleUnitDTO;

export interface CreateExecutionLegDTO {
  leg_sequence: number;
  leg_code: string;
  transport_mode: TransportMode;
  execution_provider_type?: ExecutionProviderType;
  origin_location_id: string;
  destination_location_id: string;
  assigned_vendor_id?: string;
  planned_start_at?: string;
  planned_end_at?: string;
  aircraft_name?: string;
  flight_number?: string;
  unit_identifiers?: string[];
}

export interface CreateShipmentDTO {
  tenant_id: string;
  /** Canonical engagement (commercial_work_orders.id). Server resolves via U-03 when omitted. */
  work_order_id?: string;
  /** Canonical service scope (commercial_service_scopes.id). Server resolves via U-03 when omitted. */
  service_scope_id?: string;
  /** Canonical customer entity (md_entities.id). Required. */
  customer_id: string;
  shipper_id?: string;
  consignee_id?: string;
  notify_party_id?: string;
  origin_location_id: string;
  destination_location_id: string;
  master_bl_number?: string;
  house_bl_number?: string;
  booking_reference?: string;
  etd?: string;
  eta?: string;
  manifest_items?: CreateManifestItemDTO[];
  units?: CreateUnitDTO[];
  execution_legs?: CreateExecutionLegDTO[];
  created_by?: string;
}

export interface ShipmentAggregate {
  shipment: Shipment;
  manifest_items: ManifestItem[];
  units: ShipmentUnit[];
  execution_plan?: ExecutionPlan | null;
  execution_legs: ExecutionLeg[];
  leg_unit_allocations: LegUnitAllocation[];
  milestones: Milestone[];
  exceptions: ShipmentException[];
}

export interface SanitizedCustomerTracking {
  shipment_id: string;
  shipment_number: string;
  global_status: ShipmentGlobalStatus;
  origin_name: string;
  origin_city: string;
  destination_name: string;
  destination_city: string;
  etd?: string | null;
  eta?: string | null;
  actual_departure_at?: string | null;
  actual_delivery_at?: string | null;
  milestones: Array<{
    code: string;
    label: string;
    occurred_at: string;
  }>;
  manifest_items: Array<{
    commodity: string;
    packages: number;
    package_type: string;
    gross_weight_kg: number;
    volume_cbm: number;
  }>;
}
