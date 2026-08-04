# Trucking Domain Audit

## 1. Overview
The Trucking Domain manages fleet operations, driver assignments, GPS tracking, and proof-of-delivery (POD) for domestic transport.

## 2. Existing Implementations & UI Pages
- **Operations Dashboard**: `app/(dashboard)/sbu/trucking/...`
  - `/assignments` (Driver/Vehicle allocation to Job Orders)
  - `/tracking` (Live Map, Geofence threshold visualization)
  - `/completed` (Job closure, Cost review)
  - `/fleet` (Master data list of vehicles/drivers)
  - `/finances` (Advances, Vendor settlements, Cash flow)
- **Mobile/Driver PWA**: `/jo/[token]` (Manifest rendering, Auto-Assign, Push Notifications).

## 3. Existing Database Tables
- `job_orders`: Tracks the execution instance (currently conflated with Warehouse JOs).
- `job_routes`: Status progression (`DISPATCH_READY`, `ON_JOURNEY`, `COMPLETED`).
- `job_tracking`: Geospatial telemetry (Lat/Lng, timestamps, geofence enter/exit).
- `job_costs`: Operating expenses, driver cash advances, tolls, vendor invoices.
- `md_vehicles` / `md_drivers` / `md_vendors`: Extracted master entities.
- `driver_coins`: Driver reward ledger.

## 4. Existing Business Logic (Tech Debt)
- **RSC Coupling**: Server components (e.g., `app/(dashboard)/sbu/trucking/assignments/page.tsx`) directly embed complex filtering logic to separate Trucking JOs from Warehouse JOs (`jo.sbu_type === 'TRUCKING'`).
- **Implicit FSM**: Transitions from `Assigned` to `On Journey` rely on raw string matching inside `/api/jo/[token]/route.ts`, bypassing domain validation.
- **Geofence God-Methods**: The geofence threshold calculation is hardcoded inside the `lib/hooks/useDriverGpsPing.ts` and API handlers instead of residing in a pure domain aggregate.

## 5. Required Domain Services
- `DispatchEngine`: To manage valid Driver + Vehicle + Trailer combinations.
- `TelemetryProcessor`: To ingest coordinates and yield route milestone events.
- `CostingCalculator`: To aggregate cash advances against actual route expenses.
