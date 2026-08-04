# Timeline Platform Architecture Roadmap

## 1. Repository Strategy

The repository layer for the Timeline platform will adhere to the following principles:
- **Persist Only**: The primary write repository (`ITimelineCommandRepository`) will only feature an `append(event: TimelineEvent)` method. It will not have update or delete methods.
- **Translation Only**: As per ADR-008, the repository must translate the domain `TimelineEvent` into the infrastructure schema (`timeline_events` table) without performing any workflow validation.
- **Remain Append-Only**: Repositories will enforce immutability at the application boundary. No `save()` method that updates existing rows will be implemented.

## 2. Architecture Roadmap

### Phase 3D.10: Timeline Platform Foundation & Dual-Write
- **Objective**: Establish the core Timeline Domain, Application Services, and Infrastructure schema.
- **Tasks**:
  - Implement `TimelineEvent` entity.
  - Implement `TimelineService` (Append-only).
  - Create `timeline_events` schema migration.
  - **Strangler Fig Compatibility**: Update the `JobOrderService` and `DriverPortalCommandRepository` to dual-write to the new `TimelineService` alongside the legacy `job_tracking` table.

### Phase 3D.11: Read-Model Cutover & Legacy Deprecation
- **Objective**: Shift UI reads to the new Timeline Platform and drop the legacy table.
- **Tasks**:
  - Implement `TimelineQueryService` for chronologically ordered reads.
  - Update `DriverPortalQuery` to read from `timeline_events` instead of `job_tracking`.
  - **Backward Compatibility**: Run a one-time script to migrate historical `job_tracking` data into `timeline_events` via translation mapping.
  - Drop the `job_tracking` table.

## 3. Dependencies
To execute Phase 3D.10, the following dependencies must be met:
- **Tracking Platform Completion**: (Done in Phase 3D.7/8). `job_tracking` has been relieved of raw GPS telemetry, leaving only discrete events.
- **Event Bus Definition**: An interim direct-call or in-memory event bus is needed to decouple `JobOrderService` from directly calling `TimelineService`.

## 4. Risk Analysis

| Risk Type | Description | Impact | Evidence |
| :--- | :--- | :--- | :--- |
| **Architecture Risk** | Coupling Trucking directly to Timeline. | High | Legacy API heavily relies on direct SQL inserts into `job_tracking` scattered across methods. |
| **Business Risk** | Loss of historical audit trails during migration. | Critical | `job_tracking` currently holds the authoritative state for past disputes. |
| **Migration Risk** | Dual-write failures causing data inconsistency. | Medium | If `JobOrder` saves but `TimelineService` fails, the timeline is out of sync. Requires transactional outbox or robust event handling. |
| **Performance Risk** | Missing pagination leading to OOM on UI. | Medium | Current `route.ts` `GET` fetches all `job_tracking` without limits. |
| **Operational Risk** | Bloat from legacy GPS telemetry. | High | Evidence: `job_tracking` was previously flooded with per-minute pings before Phase 3D.7 separated tracking points. |
