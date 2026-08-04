# Logistics Core — Discovery & Duplication Audit

This document identifies business concepts that are currently duplicated or fragmented across different modules (Trucking, Warehouse, Commercial, CRM) and primes them for extraction into the Enterprise Logistics Core.

## 1. Status & State Machines
**Current Implementations**:
- `work_orders.status`: `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`.
- `job_orders.status`: `DRAFT`, `ASSIGNED`, `ON_JOURNEY`, `COMPLETED`, `CANCELLED`.
- `wh_inventory.status`: `AVAILABLE`, `ALLOCATED`, `QUARANTINED`, `DAMAGED`.
- `fw_order_headers.status`: Forwarding specific statuses.
**Current Technical Debt**: State transitions are handled by scattered React Server Components, raw UI button `onClick` handlers, or loose switch statements in API routes. There is no central, reusable FSM (Finite State Machine) Engine.

## 2. Document & Attachment Management
**Current Implementations**:
- `pod_documents`: Bucket for Proof of Delivery.
- `assignment_documents`: JSONB column inside `job_orders` containing `[{id, name, type, file_url}]`.
- `warehouse_documents`: Separate storage bucket and access policies for WMS.
**Current Technical Debt**: A new bucket or JSONB column is created every time a new document type is needed. There is no unified `Attachment` aggregate capable of handling polymorphic document associations (IMAGE, PDF, QR, SIGNATURE).

## 3. Timeline, Audit & History
**Current Implementations**:
- `wh_inventory_movements`: Custom table for WMS audit logs.
- `documents` (audit trail): Custom table for document modifications.
- Supabase Realtime/Webhooks: Disjointed system event logs.
**Current Technical Debt**: Every module implements its own history tracking table. There is no universal `Timeline` aggregate capable of logging Activity, Comments, and System Events uniformly.

## 4. GPS Tracking & Telemetry
**Current Implementations**:
- `job_tracking`: Stores raw PWA coordinates per `job_order`.
- `job_routes`: Stores `geofence_radius` and milestones.
**Current Technical Debt**: Built exclusively for Trucking. When Warehouse needs forklift indoor tracking or Forwarding needs vessel tracking, this tightly-coupled schema will force duplicated tables.

## 5. Master Data References
**Current Implementations**:
- `md_drivers`, `md_vehicles`, `md_warehouses`, `md_vendors`.
- Foreign keys scattered directly onto operations tables (`job_orders.driver_id`).
**Current Technical Debt**: The domain layer lacks referential entities (`DriverReference`, `LocationReference`) that decouple execution contexts from heavy master-data SQL schemas.

## 6. Resource Assignments
**Current Implementations**:
- Trucking `AssignmentModal.tsx`: Hand-rolled logic to link drivers/vehicles to JOs.
- `fw_container_assignments`: Hand-rolled logic to link forwarding jobs to vessels.
- `wo_organization_users`: Hand-rolled logic to link users to warehouses.
**Current Technical Debt**: Assignment logic (Availability Check, Approval, Notification, Capacity bounds) is written from scratch in every module.

---

**Conclusion**: The system is rife with identical concepts masquerading as unique features. Establishing the `LogisticsCore` bounded context will eliminate hundreds of lines of procedural repetition by formalizing `StatusMachine`, `Attachment`, `Timeline`, and `Assignment` as universal architectural platforms.
