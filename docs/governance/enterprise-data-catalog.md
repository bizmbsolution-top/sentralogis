# Enterprise Data Catalog v1.0

## 1. Data Governance Principles
- **Business owns data**: Data exists exclusively to support business processes. Technology merely persists it.
- **Domains own business data**: Every persistent dataset must have a single owning Bounded Context (Domain).
- **Repositories persist only their own aggregates**: A repository is responsible solely for the persistence and hydration of the domain aggregate it serves. It cannot cross domain boundaries.
- **Shared Platforms may reference data but never own business entities**: Platforms such as Timeline or Notification can store abstract IDs or metadata payloads but must never duplicate or control business entity state.
- **Data ownership never depends on framework or storage technology**: The logical ownership of data remains constant whether it is stored in PostgreSQL, Redis, or a flat file.

## 2. Enterprise Dataset Inventory
The following represents the known business datasets required to execute the platform's logistics and administrative processes.

**Core Logistics Datasets**
- `work_orders`: Validated
- `work_order_items`: Validated
- `job_orders`: Production Validation Pending
- `drivers`: Production Validation Pending
- `vehicles`: Production Validation Pending

**Platform & Security Datasets**
- `users`: Validated
- `roles`: Validated
- `permissions`: Validated
- `tenants`: Validated
- `organizations`: Validated

**Operational / Shared Datasets**
- `attachments`: Future Recommendation (Planned for Phase 3E)
- `tracking_points`: Future Recommendation (Planned for Phase 3D)
- `timeline_entries`: Future Recommendation (Planned for Phase 3D)
- `notifications`: Concept (NOT VERIFIED)

## 3. Dataset Ownership
To prevent overlapping responsibilities, each dataset is strictly mapped to an owning domain and aggregate.

| Dataset | Owning Domain | Owning Aggregate | Business Owner | Technology Owner | Repository | Application Service | Current Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `job_orders` | Trucking | `JobOrder` | Trucking Ops | SentraForge Eng | `SupabaseJobOrderRepository` | `JobOrderService` | `src/domains/trucking/job-order` |
| `drivers` | Trucking | `Driver` | Trucking Ops | SentraForge Eng | `SupabaseDriverRepository` | `DriverService` (Future) | `src/domains/trucking/driver` |
| `vehicles` | Trucking | `Vehicle` | Fleet Mgmt | SentraForge Eng | `SupabaseVehicleRepository` | `VehicleService` (Future) | `src/domains/trucking/vehicle` |
| `work_orders` | Customer Ops | `WorkOrder` | Account Mgmt | SentraForge Eng | (Legacy Adapter) | `WorkOrderService` (Legacy) | Legacy integration intact |

## 4. Mutation Rules
Strict governance defines who is authorized to mutate persistent state. Direct database mutations from UI or arbitrary API routes are strictly forbidden.

**Dataset: `job_orders`**
- **Who may create**: Dispatchers via `JobOrderService.assignDriverAndVehicle()`.
- **Who may update**: Drivers (via Driver API) and Dispatchers (via UI), brokered exclusively through `JobOrderService`.
- **Who may archive/delete**: Data Governance Admins (soft-delete only).
- **Allowed Application Services**: `JobOrderService` ONLY.
- **Forbidden**: Direct `supabase.from('job_orders').update()` calls from UI components.

## 5. Cross-Domain References
Business processes span domains, requiring datasets to reference each other. These are referential links, not ownership transfers.

- `JobOrder` → `WorkOrder`: (Reference). Trucking domain reads the Work Order ID to link transport but does not own the billing/customer data.
- `JobOrder` → `Driver`: (Reference). JobOrder binds a Driver ID to a trip. The Driver aggregate itself is managed independently.
- `JobOrder` → `Vehicle`: (Reference).
- `TrackingPoint` → `JobOrder`: (Reference). Tracking records point back to the JobOrder they describe.
- `Attachment` → `JobOrder`: (Reference). The attachment platform stores the POD image and references the JobOrder.

## 6. Repository Traceability
Mapping validated persistent datasets back to their architectural implementation layers.

| Domain | Aggregate | Dataset | Repository Adapter | Application Service | UI Component | ADR | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trucking** | `JobOrder` | `job_orders` | `SupabaseJobOrderRepository` | `JobOrderService.ts` | `work-orders/page.tsx` | ADR-008 | Verified Codebase |
| **Trucking** | `Driver` | `drivers` | `SupabaseDriverRepository` | TBD | Master Driver UI | ADR-008 | Verified Codebase |
| **Trucking** | `Vehicle` | `vehicles` | `SupabaseVehicleRepository` | TBD | Master Vehicle UI | ADR-008 | Verified Codebase |
| **Security** | `Permission`| `permissions`| N/A (Identity Platform) | `PermissionEngine` | Middleware | Constitution | Verified Codebase |

## 7. Lifecycle
The generic lifecycle of core operational datasets (using `job_orders` as the baseline example):
- **Created By**: Explicit application service commands (e.g., dispatch assignment).
- **Updated By**: Application services interpreting domain events (e.g., driver app pinging an arrival status).
- **Consumed By**: Read models, UI dashboards, Reporting services, and Future Shared Platforms (Timeline, Analytics).
- **Archived By**: Automated retention policies executing soft-deletes (`deleted_at`).
- **Events Produced**: `JobOrderCreated`, `MissionStarted`, `MissionCompleted`.
- **Retention**: Production data retained indefinitely until architectural storage limits necessitate cold-storage archiving.

## 8. Data Quality Rules
To ensure data integrity, all validated persistent datasets must adhere to the following rules:
- **Required Identifiers**: Every record must possess a UUID primary key.
- **Tenant Isolation**: Operational tables must contain an `org_id` or equivalent tenant identifier to enforce Row Level Security (RLS) and logical segregation.
- **Referential Integrity**: Foreign key constraints must be enforced at the database level where practical, though cross-domain references may be enforced logically by the application if strict microservices are adopted.
- **Immutable Identifiers**: Primary keys, creation timestamps (`created_at`), and creator IDs are immutable once written.
- **Mutable Operational Fields**: Statuses and coordinates may update frequently, but must be brokered through domain aggregates.

## 9. Operational Readiness
The operational readiness of persistent datasets within the current scope:

- **Transactions**: Validated. Handled efficiently via Supabase client patterns.
- **Concurrency**: NOT VERIFIED. High-volume concurrent mutations on single aggregates require empirical validation.
- **Backup**: Validated. Handled via Supabase automated PITR (Point-in-Time Recovery).
- **Recovery**: Production Validation Pending.
- **Monitoring**: Production Validation Pending.
- **Performance**: Production Validation Pending.

## 10. Executive Summary
The Enterprise Data Catalog establishes the structural ownership of persistent business data across the SentraForge platform.

Currently, the datasets powering the **Trucking** domain (`job_orders`, `drivers`, `vehicles`) are classified as Production Validation Pending. They possess validated business owners, well-defined domain aggregates, and strict repository boundaries governed by ADR-008.

Crucially, mutation rules forbid direct UI-to-database writes, requiring all state changes to flow through explicit Application Services (`JobOrderService`). Datasets supporting Future Platforms (`tracking_points`, `timeline_entries`, `attachments`) are structurally planned for upcoming phases but remain categorized as Future Recommendations. 

There are no architectural blockers within the validated scope. This document serves as the absolute baseline ensuring that as data scales, business ownership and domain boundaries remain intact.
