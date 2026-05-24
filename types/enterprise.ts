export interface Organization {
  id: string;
  tenant_id: string;
  parent_org_id: string | null;
  code: string;
  name: string;
  org_type: OrgType;
  address: string | null;
  city: string | null;
  province: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  org_path: string | null;
  created_at: string;
  updated_at: string;
}

export type OrgType =
  | 'HQ'
  | 'SBU_WAREHOUSE'
  | 'SBU_TRUCKING'
  | 'SBU_FORWARDING'
  | 'SBU_FINANCE'
  | 'SBU_CLEARANCE';

export interface OrganizationUser {
  id: string;
  tenant_id: string;
  organization_id: string;
  user_id: string;
  role_code: string;
  is_primary: boolean;
  assigned_warehouse_id: string | null;
  is_active: boolean;
  joined_at: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  correlation_id: string;
  tenant_id: string;
  originating_org_id: string;
  assigned_org_id: string | null;
  wo_number: string;
  wo_type: WoType;
  priority: Priority;
  status: WoStatus;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  notes: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  target_date: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WoType =
  | 'STOCK_TRANSFER'
  | 'INBOUND_RECEIVING'
  | 'OUTBOUND_DISPATCH'
  | 'STOCK_OPNAME'
  | 'TRANSFORMATION'
  | 'CROSS_DOCK'
  | 'RETURN'
  | 'THIRD_PARTY';

export type WoStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_COMPLETED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  tenant_id: string;
  line_number: number;
  product_sku_id: string | null;
  item_description: string | null;
  requested_quantity: number | null;
  fulfilled_quantity: number;
  uom: string;
  from_warehouse_id: string | null;
  from_bin_id: string | null;
  to_warehouse_id: string | null;
  to_bin_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_cost: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JobOrder {
  id: string;
  correlation_id: string;
  tenant_id: string;
  work_order_id: string;
  work_order_item_id: string | null;
  originating_org_id: string;
  executing_org_id: string;
  assigned_warehouse_id: string | null;
  jo_number: string;
  jo_type: JoType;
  sequence_order: number;
  depends_on_jo_id: string | null;
  status: JoStatus;
  assigned_to: string | null;
  assigned_fleet_id: string | null;
  assigned_driver_id: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  sla_minutes: number | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  result: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type JoType =
  | 'PICKING'
  | 'PUTAWAY'
  | 'LOADING'
  | 'UNLOADING'
  | 'TRUCKING'
  | 'RECEIVING'
  | 'STOWING'
  | 'PACKING'
  | 'CROSS_DOCK_TRANSFER'
  | 'STOCK_OPNAME_EXEC'
  | 'TRANSFORMATION_EXEC'
  | 'RETURN_PROCESSING'
  | 'INTERNAL_MOVE';

export type JoStatus =
  | 'PENDING'
  | 'READY'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export interface InventoryLedgerEntry {
  id: number;
  correlation_id: string;
  tenant_id: string;
  product_sku_id: string;
  warehouse_id: string;
  bin_id: string | null;
  movement_type: MovementType;
  movement_reason: string | null;
  quantity_change: number;
  quantity_before: number | null;
  quantity_after: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  pallet_id: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  source_document_type: string | null;
  source_document_id: string | null;
  job_order_id: string | null;
  job_order_item_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type MovementType =
  | 'RECEIPT' | 'PUTAWAY' | 'PICK' | 'PACK' | 'LOAD'
  | 'UNLOAD' | 'RECEIVE_AT_DEST' | 'TRANSFER_OUT'
  | 'TRANSFER_IN' | 'ADJUSTMENT_PLUS' | 'ADJUSTMENT_MINUS'
  | 'OPNAME_PLUS' | 'OPNAME_MINUS' | 'RETURN_IN'
  | 'RETURN_OUT' | 'DAMAGE' | 'EXPIRY' | 'TRANSFORMATION_IN'
  | 'TRANSFORMATION_OUT' | 'REBALANCE' | 'MANUAL_ADJUST';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';

export interface StatusHistoryEntry {
  id: number;
  tenant_id: string;
  correlation_id: string | null;
  entity_type: string;
  entity_id: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  trigger_source: 'SYSTEM' | 'USER' | 'WORKFLOW' | 'API' | 'CRON' | null;
  trigger_detail: Record<string, unknown> | null;
  performed_by: string | null;
  duration_in_previous_state: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  tenant_id: string | null;
  correlation_id: string | null;
  entity_type: string;
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  performed_by: string | null;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface MonitoringEvent {
  id: number;
  tenant_id: string | null;
  correlation_id: string | null;
  event_type: MonitoringEventType;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string | null;
  title: string;
  description: string | null;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  metric_name: string | null;
  metric_value: number | null;
  threshold: number | null;
  payload: Record<string, unknown> | null;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type MonitoringEventType =
  | 'SLA_BREACH' | 'WORKFLOW_TIMEOUT' | 'ANOMALY_DETECTED'
  | 'INVENTORY_THRESHOLD' | 'TEMP_ALERT' | 'SYSTEM_ERROR'
  | 'USER_ACTION_ANOMALY' | 'DUPLICATE_DETECTED' | 'WORKFLOW_ERROR';

export interface WorkflowInstance {
  id: string;
  tenant_id: string;
  correlation_id: string;
  workflow_name: string;
  workflow_version: string;
  trigger_entity_type: string | null;
  trigger_entity_id: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK' | 'PAUSED';
  current_step: string | null;
  steps_completed: number;
  steps_total: number;
  context: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}
