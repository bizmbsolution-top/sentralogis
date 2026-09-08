/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/types.ts
 * Description: Canonical TypeScript interfaces and schemas for svc_service_requests
 */

export type ServiceRequestStatus =
  | 'ISSUED'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'FULFILLED'
  | 'REROUTING'
  | 'CANCELLED';

export type ServiceTargetDomain =
  | 'TRUCKING'
  | 'CUSTOMS'
  | 'WAREHOUSE'
  | 'EXCHANGE';

export type ServiceSourceDomain =
  | 'FORWARDING'
  | 'COMMERCIAL';

export interface ServiceRequestHeader {
  request_number: string;
  correlation_id: string;
  causation_id?: string;
  idempotency_key: string;
  source_domain: ServiceSourceDomain;
  target_domain: ServiceTargetDomain;
  service_product_sku: string;
}

export interface SlaContract {
  max_transit_duration_minutes?: number;
  target_sppb_duration_hours?: number;
  gps_telemetry_interval_seconds?: number;
  electronic_pod_required?: boolean;
  physical_surat_jalan_return_required?: boolean;
  auto_notify_billing_simponi?: boolean;
}

// ----------------------------------------------------------------------------
// SBU SPECIFIC PAYLOAD CONTRACTS
// ----------------------------------------------------------------------------

export interface TruckingRouteStop {
  location_id?: string;
  location_name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  window_start?: string;
  window_end?: string;
  target_delivery_time?: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface TruckingCargoUnitSpec {
  unit_id: string;
  unit_type: 'CONTAINER' | 'BULK_MT' | 'BREAKBULK' | 'PALLET' | 'BOX' | 'VEHICLE';
  container_number?: string;
  iso_type?: string;
  seal_number?: string;
  gross_weight_kg: number;
  is_hazardous?: boolean;
}

export interface TruckingServicePayload {
  route_specification: {
    pickup: TruckingRouteStop;
    dropoff: TruckingRouteStop;
    intermediate_stops?: TruckingRouteStop[];
  };
  cargo_units: TruckingCargoUnitSpec[];
  fleet_requirement?: {
    fleet_type_code?: string;
    require_gps_tracking?: boolean;
  };
  sla_contract?: SlaContract;
}

export interface CustomsSupportingDocument {
  doc_type: 'BILL_OF_LADING' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'COO_FORM_E' | 'IMPORT_PERMIT';
  doc_number: string;
  doc_date: string;
  document_url?: string;
}

export interface CustomsServicePayload {
  declaration_parameters: {
    declaration_type: 'PIB_IMPORT' | 'PEB_EXPORT' | 'TPB_BC23' | 'TRANSIT_BC12';
    customs_office_code: string;
    importer_entity_id: string;
    ppjk_entity_id?: string;
    supporting_documents: CustomsSupportingDocument[];
  };
  manifest_summary: {
    total_packages: number;
    package_type: string;
    total_gross_weight_kg: number;
    declared_cif_usd: number;
  };
  sla_contract?: SlaContract;
}

export interface WarehouseServicePayload {
  handling_specification: {
    warehouse_location_id: string;
    operation_type: 'CROSSDOCK_SORT_AND_STAGING' | 'CONSOLIDATION_STUFFING' | 'DECONSOLIDATION_STRIPPING' | 'STORAGE';
    inbound_carrier?: {
      mode: string;
      reference?: string;
    };
    outbound_carrier?: {
      mode: string;
      reference?: string;
    };
    manifest_items: Array<{
      commodity: string;
      quantity: number;
      uom: string;
      gross_weight_kg: number;
      volume_cbm?: number;
    }>;
  };
  sla_contract?: SlaContract;
}

export type ServiceRequestPayload =
  | TruckingServicePayload
  | CustomsServicePayload
  | WarehouseServicePayload
  | Record<string, unknown>;

// ----------------------------------------------------------------------------
// AGGREGATE ENTITY INTERFACE
// ----------------------------------------------------------------------------

export interface ServiceRequest {
  id: string;
  tenant_id: string;
  request_number: string;
  correlation_id: string;
  causation_id?: string | null;
  idempotency_key: string;
  source_domain: ServiceSourceDomain;
  target_domain: ServiceTargetDomain;
  shipment_id?: string | null;
  execution_leg_id?: string | null;
  work_order_id?: string | null;
  service_product_sku: string;
  request_payload: ServiceRequestPayload;
  sla_target_time?: string | null;
  status: ServiceRequestStatus;
  assigned_domain_job_id?: string | null;
  rejection_reason?: string | null;
  version_no: number;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// COMMAND DTOs
// ----------------------------------------------------------------------------

export interface IssueServiceRequestDTO {
  tenant_id: string;
  source_domain: ServiceSourceDomain;
  target_domain: ServiceTargetDomain;
  shipment_id?: string;
  execution_leg_id?: string;
  work_order_id?: string;
  service_product_sku: string;
  request_payload: ServiceRequestPayload;
  sla_target_time?: string;
  idempotency_key: string;
  correlation_id?: string;
}

export interface AcceptServiceRequestDTO {
  service_request_id: string;
  assigned_domain_job_id: string; // trk_job_orders.id, cus_declarations.id, etc.
}

export interface RejectServiceRequestDTO {
  service_request_id: string;
  rejection_reason: string;
}
