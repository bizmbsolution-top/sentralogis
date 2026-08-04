// Temporary Phase 1A compatibility types.
// TODO: Replace with proper domain entity types during SBU Forwarding domain migration.
// These are minimal placeholder interfaces to satisfy TypeScript compilation.

export interface WorkOrder {
  id: string;
  wo_number: string;
  wo_type: string;
  status: string;
  customer_id?: string;
  org_id?: string;
  priority?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Fields used by lib/workflow/engine.ts
  correlation_id?: string;
  originating_org_id?: string;
  assigned_org_id?: string;
  tenant_id?: string;
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  product_sku_id?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  // Fields used by lib/workflow/engine.ts
  line_number?: number;
  requested_quantity?: number;
  from_bin_id?: string;
  to_bin_id?: string;
  batch_number?: string;
  expiry_date?: string;
}

export type WoType = string;
export type Priority = string;

export interface JobOrder {
  id: string;
  jo_number: string;
  work_order_id: string;
  jo_type: string;
  status: string;
  driver_id?: string;
  fleet_id?: string;
  org_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type JoType = string;

export interface Organization {
  id: string;
  name: string;
  org_type?: string;
  parent_org_id?: string;
  is_active?: boolean;
}

export interface InventoryLedgerEntry {
  id: string;
  product_sku_id: string;
  warehouse_id: string;
  bin_id?: string;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string;
  correlation_id?: string;
  created_at?: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
