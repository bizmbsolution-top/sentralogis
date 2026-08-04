# Enterprise Logistics Platform — Discovery Validation

This document validates the shared business concepts discovered across multiple SentraForge modules (Trucking, Warehouse, CRM, Finance). These concepts currently suffer from fragmented logic, duplicated tables, and inconsistent API handlers. They are now officially classified for extraction into the **Enterprise Logistics Platform**.

## 1. State Management & Transitions
- **Current Implementations**: `job_orders.status`, `work_orders.status`, `wh_inventory.status`, `quotations.status`.
- **Classification**: **Shared Platform** (`src/platform/logistics/state-machine/`)
- **Reasoning**: Every entity relies on hardcoded string checks (`status === 'COMPLETED'`) in React Server Components or generic API routes. A universal FSM engine is required.

## 2. Attachment Management
- **Current Implementations**: `pod_documents` bucket, `assignment_documents` JSONB columns, `warehouse_documents` bucket.
- **Classification**: **Shared Platform** (`src/platform/logistics/attachment/`)
- **Reasoning**: The current architecture spawns new buckets and policies for every new document type. We need a single polymorphic `Attachment` aggregate.

## 3. Timeline, Audit & History
- **Current Implementations**: `wh_inventory_movements`, `documents` audit trails, Supabase Realtime webhooks.
- **Classification**: **Shared Platform** (`src/platform/logistics/timeline/`)
- **Reasoning**: Audit logs are currently completely decentralized. The Timeline platform will unify status changes, comments, and system events.

## 4. GPS & Telemetry Tracking
- **Current Implementations**: `job_tracking` (pings), `job_routes` (geofences).
- **Classification**: **Shared Platform** (`src/platform/logistics/tracking/`)
- **Reasoning**: Built exclusively for Trucking Job Orders. This prevents Warehouse indoor tracking or Forwarding vessel tracking without duplicating the entire schema.

## 5. Master Data References
- **Current Implementations**: Direct foreign keys (`driver_id`, `vehicle_id`, `warehouse_id`) injected straight into operation tables.
- **Classification**: **Shared Platform** (`src/platform/logistics/references/`)
- **Reasoning**: The pure Domain layer cannot depend directly on infrastructure tables. We need `DriverReference`, `LocationReference`, etc.

## 6. Resource Assignment & Approvals
- **Current Implementations**: `AssignmentModal.tsx` for Trucking, `ContractWizard.tsx` for Warehouse, `CostAuditDetail.tsx` for Finance approvals (`need_approval`).
- **Classification**: **Shared Platform** (`src/platform/logistics/assignment/`, `src/platform/logistics/approval/`)
- **Reasoning**: Linking resources (drivers, bins, budgets) to tasks is written from scratch in every module. We need a unified assignment lifecycle that handles availability, capacity, and approval flows.

---
### Conclusion
These six pillars are NOT specific to any single SBU. They are the foundational building blocks of all logistics operations. Extracting them into the `src/platform/logistics/` bounded context is a prerequisite before stabilizing Trucking and Warehouse.
