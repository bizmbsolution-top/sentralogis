// lib/domain/forwarding/types.ts
// Domain types for SBU Forwarding operations

// Execution modes
export type ExecutionMode = 'OWN' | 'VENDOR';

// Container types
export type ContainerType = 'FCL' | 'LCL';

// Location type
export type LocationType = 'PORT' | 'WAREHOUSE' | 'DELIVERY_POINT';

// Order status
export type OrderStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'completed';

// Leg type
export type LegType = 'SEA' | 'LAND' | 'AIR' | 'CONSOLIDATION';

// Transportation mode
export type TransportationMode = 'TRUCK' | 'CONTAINER';

// Service type
export type ServiceType = 'SEA_FREIGHT' | 'LAND_FREIGHT' | 'CONSOLIDATION';

// Execution configuration
export interface ExecutionConfig {
  executionMode: ExecutionMode;
  containerType: ContainerType;
  startLocation: string;
  endLocation: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  vehicleId?: string;
  driverId?: string;
}

// Leg definition
export interface Leg {
  id: string;
  legType: LegType;
  startLocation: string;
  endLocation: string;
  status: OrderStatus;
  scheduledStart?: Date;
  scheduledEnd?: Date;
}

// Container item
export interface ContainerItem {
  sku: string;
  quantity: number;
  weight: number;
  volume: number;
  value: number;
  trackingToken?: string;
}

// Container
export interface Container {
  id: string;
  containerNumber: string;
  containerType: ContainerType;
  items: ContainerItem[];
}

// Forwarding order
export interface ForwardingOrder {
  orderId: string;
  customerId: string;
  cargoOwnerId: string;
  status: OrderStatus;
  legs: Leg[];
  containers: Container[];
  totalWeight: number;
  totalVolume: number;
  estimatedDelivery: Date;
}

// Unit price
interface UnitPrice {
  price: number;
  currency: string;
  effectiveFrom: Date;
}

// Tracking entity
interface TrackingEntity {
  token: string;
  timestamp: Date;
  location: string;
  signature: string;
  status: string;
}

// ---------------------------------------------------------------------------
// DB-row shapes used by SBU Forwarding pages (fw_* tables)
// ---------------------------------------------------------------------------

// Delivery type: Door/Port combination
export type DeliveryType = 'D2D' | 'D2P' | 'P2D' | 'P2P';

// Consolidation (fw_consolidations row)
export interface Consolidation {
  id: string;
  tenant_id: string;
  consol_number: string;
  vessel_name: string;
  voyage_number?: string | null;
  origin_port: string;
  destination_port: string;
  etd?: string | null;
  eta?: string | null;
  actual_etd?: string | null;
  actual_eta?: string | null;
  shipping_line_name?: string | null;
  status?: 'open' | 'stuffing' | 'shipped' | 'arrived' | 'deconsol_done' | 'closed' | string;
  created_at?: string;
  [key: string]: any;
}

// Container assignment (fw_container_assignments row)
export interface ContainerAssignment {
  id: string;
  tenant_id: string;
  consolidation_id: string;
  container_number: string;
  container_type: string;
  seal_number?: string | null;
  status?: string;
  max_volume_cbm?: number | null;
  max_weight_kg?: number | null;
  created_at?: string;
  [key: string]: any;
}

// Box assignment (fw_box_assignments row)
export interface BoxAssignment {
  id: string;
  tenant_id: string;
  container_assignment_id: string;
  box_code: string;
  volume_cbm?: number | null;
  colli?: number | null;
  weight_kg?: number | null;
  seal_number?: string | null;
  notes?: string | null;
  created_at?: string;
  [key: string]: any;
}

// Box item (fw_box_items row)
export interface BoxItem {
  id: string;
  tenant_id: string;
  box_assignment_id: string;
  wo_item_id: string;
  quantity?: number | null;
  description?: string | null;
  commodity?: string | null;
  volume_cbm?: number | null;
  gross_weight_kg?: number | null;
  created_at?: string;
  [key: string]: any;
}

// Price master (fw_price_master row)
export interface PriceMaster {
  id: string;
  tenant_id: string;
  origin_port: string;
  destination_port: string;
  service_type: string;
  container_type?: string | null;
  delivery_type: DeliveryType | string;
  sell_price?: number | null;
  cogs_pickup?: number | null;
  cogs_port_haulage_origin?: number | null;
  cogs_ocean_freight?: number | null;
  cogs_thc_origin?: number | null;
  cogs_thc_dest?: number | null;
  cogs_port_haulage_dest?: number | null;
  cogs_last_mile?: number | null;
  cogs_documentation?: number | null;
  cogs_other?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  [key: string]: any;
}