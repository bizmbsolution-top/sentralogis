# JobOrder Domain Model (Phase 3A.3 Discovery)

## 1. Aggregate Boundary
The **JobOrder** is the central operational transaction in the Trucking Domain. It encapsulates the temporal assignment of a Driver and a Vehicle to execute a physical transport mission. 

**Inside the boundary:**
- Core identity (`jo_number`, `token`).
- Assignment states (`driver_id`, `vehicle_id`).
- Temporal states (`assigned_at`, `started_at`, `completed_at`).
- Status lifecycle tracking.

**Outside the boundary:**
- WorkOrder (Parent document; referenced by `work_order_id`).
- Driver/Vehicle metrics (Handled by their own Aggregates).
- GPS Telemetry points (Handled by Tracking platform, linked by `job_order_id`).

## 2. Lifecycle State Machine

**States:**
- `PENDING`: Created but unassigned.
- `ASSIGNED`: Resources allocated, driver notified via WhatsApp.
- `MENUNGGU SELESAI (IN_PROGRESS)`: Driver accepted and started journey. GPS tracking active.
- `COMPLETED`: Mission finished, PODs uploaded.
- `CANCELLED`: Ops aborted the mission.

**Allowed Transitions:**
- `PENDING` ➔ `ASSIGNED`
- `ASSIGNED` ➔ `MENUNGGU SELESAI`
- `MENUNGGU SELESAI` ➔ `COMPLETED`
- `PENDING` | `ASSIGNED` ➔ `CANCELLED`

**Invalid Transitions:**
- `COMPLETED` ➔ `MENUNGGU SELESAI`
- `MENUNGGU SELESAI` ➔ `CANCELLED`

## 3. Actor Permissions
- **PENDING ➔ ASSIGNED**:
  - Actor: Dispatcher / System Cron
  - Permission: `trucking.ops.assign`
- **ASSIGNED ➔ MENUNGGU SELESAI**:
  - Actor: Driver (via PWA `app/api/jo/[token]`) / System Cron (`jo-autostart`)
  - Permission: `trucking.driver.execute`
- **MENUNGGU SELESAI ➔ COMPLETED**:
  - Actor: Driver / System Cron (`jo-autocomplete`)
  - Permission: `trucking.driver.complete`
- **➔ CANCELLED**:
  - Actor: Dispatcher
  - Permission: `trucking.ops.cancel`

## 4. Aggregate Relationships
- **Driver Reference**: Identity mapping (`driver_id`). No direct object nesting.
- **Vehicle Reference**: Identity mapping (`vehicle_id`). No direct object nesting.
- **POD Reference**: Linked via the `Attachment` Platform module (e.g., entityType="JOB_ORDER", ownerId=jobOrderId).
- **Tracking Reference**: Linked via the `Tracking` Platform module (telemetry pings store `job_order_id`).

## 5. Business Rules (Verified)
- A JobOrder CANNOT be assigned to a Driver or Vehicle that is not `AVAILABLE`.
- A JobOrder CANNOT transition to `COMPLETED` until mandatory POD conditions are met (evaluated by Ops or auto-cron).
- Changing a Driver/Vehicle after `ASSIGNED` requires a "Reject/Reassign" flow (`ops_reject_reassign_jo.sql`).

## 6. NOT VERIFIED
- **Costing/Billing**: Does completion of a JobOrder synchronously trigger ledger entries? (NOT VERIFIED).
- **WhatsApp Webhook State Mutations**: Can drivers transition states strictly via WhatsApp text commands (e.g., "SELESAI"), or only via the PWA link? (NOT VERIFIED).
- **Consolidation**: Does a single Trucking JobOrder support multiple WorkOrder line items natively, or is consolidation handled at a higher level? (NOT VERIFIED).
