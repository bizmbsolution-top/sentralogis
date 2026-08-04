# Trucking Domain Discovery (Phase 3A.1)

## 1. Existing Database Tables
The foundation relies heavily on `md_drivers`, `md_fleets` (Vehicles), and `job_orders`.
- **`job_orders`**: The core transactional entity driving Trucking missions. Contains statuses, driver/fleet assignments, route data, SLA expectations, and timestamps.
- **`md_drivers`**: Master data for driver profiles, status (available/on_duty), readiness, and performance metrics.
- **`md_fleets`**: Master data for vehicles, capacity metrics, and assignment statuses.

## 2. Existing Supabase RPC Functions
The legacy implementation offloads several complex business workflows to Supabase RPCs, bypassing middle-tier domain validation. These must eventually be transitioned to Application Use Cases leveraging the Platform, but current constraints dictate that we **do not modify existing database contracts without approval**.

## 3. UI Flows & Application Coupling
- The UI layer (`app/(dashboard)/sbu/trucking/`) contains heavy business logic directly communicating with the database. For example, `RejectReassignModal.tsx`, `AssignmentModal.tsx`, and `WODetailSidebar.tsx` mutate state directly.
- The PWA/Driver Portal (`app/jo/[token]/`, `app/driver/portal/`) handles real-time GPS telemetry and status progression, sending patches to `app/api/jo/[token]/route.ts`.

## 4. Existing Validations
Currently, validations occur at the UI edge or inside Next.js API Routes (e.g., verifying a driver hasn't drifted outside a geofence). There is no strict Domain Layer intercepting these actions; they are tightly coupled to HTTP handlers.

## 5. Status Transitions
Job Order status progressions (e.g., `PENDING` -> `ASSIGNED` -> `MENUNGGU SELESAI` -> `COMPLETED`) are heavily embedded in UI files, API routes, and cron jobs (`app/api/cron/jo-autostart/route.ts`). 

## 6. Identified Unknowns
- **Billing / Costing triggers**: When a Job Order completes, how does costing calculation factor in? (NOT VERIFIED).
- **Consolidation**: How do FCL/LCL consolidate under Trucking if at all? (NOT VERIFIED).
