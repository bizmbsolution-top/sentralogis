# TRUCKING DOMAIN — CURRENT STATE DISCOVERY

This document maps the exact existing implementation of the Trucking domain found in the repository as of Phase 3A. No arbitrary concepts have been invented here.

## 1. Job Order & Work Order
**Current Implementation**: 
- The `job_orders` table drives execution, heavily coupled with `work_orders`.
- **UI**: `app/(dashboard)/sbu/trucking/work-orders/[id]/page.tsx`
- **Current Flow**: WOs are created with items marked `sbu_type = 'TRUCKING'`. JOs are generated and inherit this flag.
- **Tech Debt**: No formal aggregate bounds; JOs are mutated directly from UI pages or via generic Supabase RPCs.

## 2. Driver & Vehicle Assignment
**Current Implementation**:
- **Tables**: `md_drivers`, `md_vehicles`, `md_vendors`.
- **UI**: `app/(dashboard)/sbu/trucking/assignments/page.tsx`, `components/AssignmentModal.tsx`.
- **Current Flow**: Dispatchers assign drivers and vehicles to JOs. 
- **Tech Debt**: Assignment logic is baked into the React Server Component. There is no `AssignDriverUseCase`. Status transitions (`UNASSIGNED` -> `ASSIGNED`) are triggered by passing raw JSON patches to Supabase.

## 3. Dispatch & GPS Tracking
**Current Implementation**:
- **Tables**: `job_routes` (stores geofence config), `job_tracking` (stores lat/lng pings).
- **Mobile/PWA**: `app/jo/[token]/page.tsx`, `lib/hooks/useDriverGpsPing.ts`.
- **API**: `app/api/jo/[token]/route.ts`.
- **Current Flow**: The PWA pings coordinates every 5 minutes. The API route calculates Haversine distance against `job_routes.geofence_radius`. If within radius, the API patches the `job_orders` status to `ARRIVED` or `DEPARTED`.
- **Tech Debt**: The domain logic (distance calculation, status transition rules) is entirely embedded inside the Next.js API route handler.

## 4. Costing & Finances
**Current Implementation**:
- **Tables**: `job_costs`
- **UI**: `app/(dashboard)/sbu/trucking/finances/page.tsx`
- **Current Flow**: Operations can grant cash advances to drivers or record toll expenses.

## 5. Timeline & Status
**Current Implementation**:
- **Current Flow**: Driven entirely by a string field `status` on `job_orders` (`DRAFT`, `ASSIGNED`, `ON_JOURNEY`, `COMPLETED`).
- **Tech Debt**: Missing a robust State Machine. Invalid transitions (e.g., `DRAFT` straight to `COMPLETED`) are only prevented by UI button disabling, not by Domain validation.

## 6. Proof of Delivery (POD)
**Current Implementation**:
- **Tables**: `pod_documents`.
- **Current Flow**: Driver uploads photos upon completion; HQ reviews them in `/completed/page.tsx`.
