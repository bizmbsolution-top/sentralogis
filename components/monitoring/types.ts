export interface SystemHealth {
  api: 'online' | 'degraded' | 'down';
  database: 'healthy' | 'slow' | 'error';
  supabase: 'connected' | 'slow' | 'disconnected';
  active_users: number;
  error_rate: number;
  queue_status: 'healthy' | 'delayed' | 'stuck';
}

export interface CriticalAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  module: string;
  title: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  assigned_to?: string;
  timestamp: string;
  correlation_id?: string;
}

export interface TruckingMetrics {
  active_jo: number;
  pending_driver_accept: number;
  delivering: number;
  delayed_delivery: number;
  failed_wa: number;
  unassigned_wo: number;
}

export interface WmsMetrics {
  low_stock: number;
  negative_stock: number;
  pending_picking: number;
  pending_putaway: number;
  inbound_today: number;
  outbound_today: number;
}

export interface ForwardingMetrics {
  active_shipment: number;
  delayed_shipment: number;
  missing_documents: number;
  customs_pending: number;
  container_tracking_lost: number;
}

export interface WorkflowStep {
  step: string;
  status: 'completed' | 'in_progress' | 'stuck' | 'pending';
  count: number;
}

export interface ErrorEntry {
  id: string;
  message: string;
  count: number;
  module: string;
  last_seen: string;
  trend: 'up' | 'down' | 'stable';
}

export interface CronJobStatus {
  name: string;
  last_run: string;
  status: 'success' | 'failed' | 'running';
  duration_ms?: number;
}

export interface DbIntegrityIssue {
  type: 'orphan' | 'duplicate' | 'invalid_relation' | 'negative_total' | 'missing_reference';
  table: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export interface UserActivityEntry {
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  timestamp: string;
  ip?: string;
}

export interface PerformanceMetric {
  endpoint: string;
  avg_response_ms: number;
  error_count: number;
  calls: number;
}

export interface MonitoringData {
  health: SystemHealth;
  alerts: CriticalAlert[];
  trucking: TruckingMetrics;
  wms: WmsMetrics;
  forwarding: ForwardingMetrics;
  workflows: WorkflowStep[];
  errors: ErrorEntry[];
  audit_logs: Array<Record<string, unknown>>;
  crons: CronJobStatus[];
  db_integrity: DbIntegrityIssue[];
  user_activity: UserActivityEntry[];
  performance: PerformanceMetric[];
}
