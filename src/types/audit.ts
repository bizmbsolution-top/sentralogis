// src/types/audit.ts
/**
 * Core audit event structure used by the AuditService.
 * Each mutation on a tenant‑scoped entity should emit an event
 * conforming to this interface.
 */
export interface AuditEvent {
  /** UUID of the audit record */
  id: string;
  /** Tenant identifier for multi‑tenant isolation */
  tenant_id: string;
  /** Entity name (e.g., "work_order", "job_order") */
  entity: string;
  /** Action performed – create, update, delete, etc. */
  action: string;
  /** ISO timestamp when the event occurred */
  timestamp: string;
  /** User that performed the action */
  performed_by: string;
  /** Optional free‑form details */
  payload?: Record<string, unknown>;
}
