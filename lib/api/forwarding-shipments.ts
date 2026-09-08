/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/api/forwarding-shipments.ts
 * Description: Client API Helper for Canonical Forwarding Shipment REST Endpoints
 */

import {
  Shipment,
  ShipmentAggregate,
  ShipmentGlobalStatus,
  CreateShipmentDTO
} from '@/lib/domain/shipment/types';

export interface ListShipmentsParams {
  status?: ShipmentGlobalStatus;
  work_order_id?: string;
  customer_id?: string;
  limit?: number;
}

export interface ListShipmentsResponse {
  success: boolean;
  data: Shipment[];
  meta: {
    total: number;
    tenant_id: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Fetches shipment directory list from canonical REST API
 */
export async function fetchShipments(params?: ListShipmentsParams): Promise<ListShipmentsResponse> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.set('status', params.status);
  if (params?.work_order_id) queryParams.set('work_order_id', params.work_order_id);
  if (params?.customer_id) queryParams.set('customer_id', params.customer_id);
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const url = `/api/v1/forwarding/shipments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP error ${res.status}: Failed to fetch shipments`);
  }

  return json as ListShipmentsResponse;
}

/**
 * Fetches single full composite Shipment Aggregate by ID
 */
export async function fetchShipmentById(id: string): Promise<ShipmentAggregate> {
  const res = await fetch(`/api/v1/forwarding/shipments/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP error ${res.status}: Failed to load shipment details`);
  }

  return json.data as ShipmentAggregate;
}

/**
 * Creates a new canonical Shipment aggregate atomically
 */
export async function createShipment(
  dto: Partial<CreateShipmentDTO>,
  idempotencyKey?: string
): Promise<{ success: boolean; data: ShipmentAggregate }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch('/api/v1/forwarding/shipments', {
    method: 'POST',
    headers,
    body: JSON.stringify(dto)
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to create shipment (HTTP ${res.status})`);
  }

  return json;
}

export interface CommandCenterProjection extends ShipmentAggregate {
  service_requests: Array<{
    id: string;
    target_domain: string;
    service_product_sku: string;
    status: string;
    requested_at: string;
    accepted_at?: string | null;
    completed_at?: string | null;
    correlation_id?: string | null;
  }>;
  customs_summary?: {
    declaration_id?: string;
    nomor_pengajuan?: string;
    declaration_type?: string;
    customs_channel?: string;
    status?: string;
    total_tax_amount?: number;
    sppb_number?: string | null;
  } | null;
  attention_items: Array<{
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    description: string;
    action_label?: string;
    action_target?: string;
  }>;
  next_action?: {
    title: string;
    target_sbu: string;
    status: string;
    action_label: string;
    action_type: string;
  } | null;
  risk_assessment: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    eta_variance_hours: number;
    factors: string[];
  };
}

/**
 * Fetches high-density consolidated Command Center projection for a single shipment
 */
export async function fetchCommandCenterProjection(id: string): Promise<CommandCenterProjection> {
  const res = await fetch(`/api/v1/forwarding/shipments/${id}/command-center`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP error ${res.status}: Failed to load Command Center projection`);
  }

  return json.data as CommandCenterProjection;
}

