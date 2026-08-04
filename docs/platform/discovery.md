# Enterprise Logistics Platform — Discovery Audit

Before writing the reusable Platform architecture, this audit locates the duplicated and disjointed implementations currently scattered across SentraForge's operational SBUs (Trucking, Warehouse, CRM, Finance).

## 1. Status & State Machines
- **Location**: `job_orders.status`, `work_orders.status`, `wh_inventory.status`, API Route handlers (`/api/jo/[token]`).
- **Implementation**: Hardcoded string checks (e.g., `if (status === 'COMPLETED')`).
- **Technical Debt**: State transition rules are duplicated across Next.js API routes and React Server Components. There is no `StateMachineEngine` governing guards, transitions, or history.

## 2. Document & Attachment Management
- **Location**: `pod_documents` (bucket), `assignment_documents` (JSONB), `warehouse_documents` (bucket).
- **Implementation**: A separate storage bucket or JSONB schema is created every time a new SBU needs a document.
- **Technical Debt**: Inability to manage unified access policies or metadata (QR/Barcode/Signature) across different SBUs.

## 3. Timeline & History
- **Location**: `wh_inventory_movements`, `documents` audit tables.
- **Implementation**: Decentralized PostgreSQL triggers and application-level logging.
- **Technical Debt**: Fragmented audit trails. Customer portals cannot query a single unified timeline for a shipment traversing Warehouse -> Trucking -> Forwarding.

## 4. GPS & Telemetry Tracking
- **Location**: `job_tracking` (lat/lng coordinates), `job_routes` (geofences).
- **Implementation**: Directly tethered to `job_orders`.
- **Technical Debt**: Built exclusively for Trucking. If Container Depot requires yard tracking or Forwarding requires vessel AIS integration, the entire schema must be duplicated.

## 5. Master Data References
- **Location**: `job_orders.driver_id`, `job_orders.vehicle_id`, `wh_inventory.location_id`.
- **Implementation**: Foreign keys linking directly to raw master data tables.
- **Technical Debt**: The pure domain layer becomes tightly coupled to infrastructure schemas instead of passing lightweight immutable references (`DriverReference`).

## 6. Resource Assignments
- **Location**: `AssignmentModal.tsx`, `ContractWizard.tsx`.
- **Implementation**: React UI handling the availability checks and linkages.
- **Technical Debt**: No generic `AssignmentPolicy` to handle overlapping schedules, capacity limits, or dispatch rules.

## 7. Approval Workflows
- **Location**: `CostAuditDetail.tsx`, `quotations/[id]/page.tsx`.
- **Implementation**: Scattered `approval_status` enum fields (`PENDING`, `APPROVED`, `REJECTED`).
- **Technical Debt**: No centralized workflow engine. Escalation, delegation, and multi-level approvals must be rebuilt from scratch per SBU.

---
### Conclusion
These seven pillars form the absolute core of logistics operations. Extracting them into the **Enterprise Logistics Platform** (`src/platform/logistics/`) will eliminate severe technical debt and provide a "Build Once, Reuse Everywhere" foundation for all future SBUs.
