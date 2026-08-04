# Enterprise Timeline Platform Blueprint

## 1. Executive Summary
**Architecture Vision**: The Timeline Platform is envisioned as an immutable, append-only, chronologically ordered ledger of critical business events across the SentraForge Enterprise Logistics Platform. It will evolve from the legacy `job_tracking` table into a ubiquitous, cross-domain capability.
**Business Ownership**: Shared Enterprise Platform.
**Shared Capability**: Reusable by Trucking, Warehouse, Depot, and Forwarding.
**Migration Strategy**: Strangler Fig pattern. Existing `job_tracking` logs will be dual-written or transparently migrated to the new `timeline_events` append-only storage.
**Future Evolution**: Integration with AI Platform for predictive delay analysis and automated anomaly detection.

## 2. Business Ownership
- **Owner**: Shared Enterprise Platform.
- **Why**: Timeline is an infrastructural and audit capability. If Trucking owns it, Warehouse cannot seamlessly interleave its receiving events onto a unified Customer visibility timeline. It must be a centralized capability. 
- **Consumers**: Trucking (Driver Actions, Dispatch), Forwarding (Vessel Tracking), Warehouse (Receiving/Putaway), Audit, Customer Portal.
- **Evidence**: `docs/governance/enterprise-capability-map.md` currently lists Timeline under "Shared Enterprise Services" alongside Identity and Notification.

## 3. Timeline Purpose
The Timeline Platform records verifiable domain lifecycle events.

**Validated Capabilities**:
- Job status changes (ASSIGNED, DRIVER_ACCEPTED, IN_TRANSIT)
- Driver actions (Arrival, Departure, POD Submission)
- GPS milestones (Geofence ENTER/EXIT triggers)
- Assignment & Cancellation

**NOT VERIFIED / Future Recommendation**:
- Permission changes
- Document uploads
- Notification dispatches
- Automated AI state inferences

## 4. Timeline Entity Discovery
Based on event-sourcing and audit logging principles, Timeline structures should include:
- **`TimelineEvent`** (Entity): The core immutable record containing `type`, `timestamp`, `actor`, and `payload`.
- **`TimelineReference`** (Value Object): Polymorphic link (`reference_type`, `reference_id`) connecting the event to a JobOrder, WorkOrder, or Consolidation.
- **`TimelineActor`** (Value Object): Identifying who caused the event (Driver, System, Dispatcher).

## 5. Aggregate Boundary Analysis
**Decision**: Append-only Entity Model (No Traditional Aggregate Root).
**Reasoning**: A traditional Aggregate protects invariants (rules that govern state changes). A Timeline is a historical record. Once an event has happened, it cannot be un-happened or mutated. Therefore, enforcing complex mutation invariants on a Timeline makes no sense. The invariant is simply: *Events are immutable and append-only.*
**Ownership**: Timeline Domain.

## 6. Application Service Strategy
- **`TimelineService`**: A simple Application Service responsible for translating Domain Events (e.g., `JobOrderAccepted`, `GeofenceTriggered`) into persisted `TimelineEvent` records.
- **`TimelineQueryService`**: Dedicated to fetching chronological feeds for specific references (e.g., "Get all events for Job Order XYZ").

## 7. Read Model Strategy
**Decision**: Chronological Feed Projection.
**Reasoning**: Timelines are read-heavy. The UI frequently asks for the timeline of a specific Job Order. The underlying storage should be optimized for append-only writes, while a Read Model or materialized view can be used if cross-domain aggregation (e.g., Customer-level timeline spanning Trucking and Warehouse) is required.

## 8. Capability Maturity
| Capability | Classification |
| :--- | :--- |
| Timeline Append | Validated (via legacy `job_tracking`) |
| Cross-Domain Aggregation | Concept |
| Immutable Audit Feed | Future Recommendation |
| AI Anomaly Detection | Concept |

## 9. Risks
- **Architecture Risks**: High volume of tracking events polluting the business timeline. *Evidence*: `job_tracking` currently holds raw GPS pings alongside actual status changes. *Mitigation*: Separate high-frequency Telemetry (Tracking Platform) from discrete business events (Timeline Platform).
- **Migration Risks**: Legacy `job_tracking` relies heavily on Trucking-specific columns (`job_route_id`). *Mitigation*: Careful migration to polymorphic `TimelineReference`.

## 10. Deliverables Overview
This blueprint acts as the foundation. See related documents for specific mappings:
- `timeline-capability-map.md`: Capability interactions.
- `timeline-domain-analysis.md`: Detailed entity properties.
- `timeline-roadmap.md`: Execution plan for Phase 3D.10.
- `timeline-decision-log.md`: ADR tracking for Timeline decisions.
