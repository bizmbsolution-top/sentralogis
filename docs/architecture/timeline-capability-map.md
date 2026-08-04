# Timeline Platform Capability Map

## 1. Capability Overview

**Capability**: Enterprise Timeline Platform
**Business Owner**: Shared Enterprise Platform
**Consumers**: Trucking Operations, Warehouse Operations, Forwarding Operations, Customer Portals, Audit & Compliance.
**Lifecycle**: Appended continuously during operational execution; retained indefinitely for audit and compliance; archived after standard data retention periods (e.g., 5 years).

### Required Inputs
- Domain Events (e.g., `JobOrderStatusChanged`, `GeofenceTriggered`, `DriverAssigned`).
- Actor Metadata (User ID, System ID, Driver ID).
- Temporal Data (UTC Timestamps, recorded vs received).

### Expected Outputs
- Chronological, immutable event feeds.
- Grouped timelines by entity (Job Order, Customer, Work Order).
- Audit trails for compliance.

## 2. Integration Analysis

The Timeline Platform acts as an integration hub for enterprise events.

| Integration Target | Status | Integration Method |
| :--- | :--- | :--- |
| **Tracking Platform** | Validated | Generates `GeofenceTriggered` events that Timeline consumes to record physical milestones. |
| **Trucking Platform** | Validated | Generates `JobOrder` status changes (Accepted, Arrived, Completed). |
| **Attachment Platform** | Future Recommendation | POD (Proof of Delivery) uploads will generate Timeline events (e.g., `DocumentAttached`). |
| **Notification Platform** | Future Recommendation | Timeline events (like delays) can trigger push notifications or SMS to customers/drivers. |
| **Workflow Platform** | Concept | Automated state-machine transitions driven by Timeline rules. |
| **Reporting / BI** | Concept | Mining timeline events for SLA performance and operational bottlenecks. |
| **AI Platform** | Future Recommendation | Predictive analysis based on historical timeline patterns (e.g., "This route is historically delayed at this time"). |
| **Security / Audit** | Future Recommendation | Recording unauthorized access attempts or critical data modifications. |

## 3. UI Requirements

The capability must support multiple UI representations:
- **Driver Timeline**: Mobile-optimized view of today's completed stops.
- **Dispatcher Timeline**: Real-time operational feed with SLA warnings.
- **Customer Timeline**: Public-facing, sanitized tracking page (similar to FedEx/UPS tracking).
- **Audit Timeline**: Raw, unredacted system logs for administrators.

*Note: UI components should be highly reusable standard components (e.g., `VerticalStepper`, `TimelineFeed`). No implementation is active yet.*

## 4. Repository Traceability

| Capability | Repository | Status | Evidence |
| :--- | :--- | :--- | :--- |
| Job Order Logging | `src/infrastructure/repositories/trucking/SupabaseJobOrderRepository.ts` | Production Validation Pending | Legacy `job_tracking` table insertions scattered in APIs and Repos. |
| GPS Telemetry Logging | `src/infrastructure/repositories/tracking/SupabaseTrackingRepository.ts` | Validated | Phase 3D.7 introduced `tracking_points` decoupled from `job_tracking`. |
| Cross-Domain Event Sourcing | N/A | Concept | Lack of central Event Bus or unified Timeline Domain. |
