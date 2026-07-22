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
interface ExecutionConfig {
  executionMode: ExecutionMode;
  containerType: ContainerType;
  startLocation: string;
  endLocation: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  vehicleId?: string;
  driverId?: string;
}

// Container item
interface ContainerItem {
  sku: string;
  quantity: number;
  weight: number;
  volume: number;
  value: number;
  trackingToken?: string;
}

// Forwarding order
interface ForwardingOrder {
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