# Enterprise Domain Catalog v1.0

## 1. Domain Catalog Principles
A Domain represents a stable business responsibility. Domains are structurally and behaviorally independent. Domains own business rules, while Shared Platforms provide reusable capabilities but never own business behavior. Domains expose behavior (methods, events), not persistence (database tables, columns). Domain boundaries are determined by business responsibility and bounded context rather than technical implementation details. 

## 2. Enterprise Domain Landscape
The following outlines every current and planned operational domain within SentraForge.

**Current Domains**
- **Trucking**: Production Validation Pending

**Planned Domains**
- **Warehouse**: Concept
- **Depot Container**: Concept
- **Forwarding**: Concept
- **Customs**: Concept
- **Distribution**: Concept
- **Cold Chain**: Concept
- **Billing**: Concept
- **Customer Portal**: Concept
- **Vendor Portal**: Concept
- **Analytics**: Concept

## 3. Domain Definition Template
*Every documented domain follows this standardized definition template to ensure uniformity.*

**Domain Name** | **Business Purpose**
**Business Owner** | **Technology Owner**
**Current Repository Status** | **Current Phase**
**Architecture Status** | **Repository Location**
**Architecture References** | **Current Evidence**

**Responsibilities**
- **Owns**: (Business entities and rules)
- **Consumes**: (Shared capabilities or external data)
- **Produces**: (Domain events or outcomes)
- **Depends On**: (Other capabilities)

**Business Capabilities**
- Primary Aggregates
- Entities
- Value Objects
- Repository Interfaces
- Application Services

**Business Processes**
- Typical Lifecycle
- Business Workflow
- Primary State Changes

**Shared Platform Usage**
*(Identity, Permission, Timeline, Tracking, Attachment, Notification, Workflow, Reporting, AI Platform)*

**Future Evolution**
*(Known Constraints, NOT VERIFIED features, Production Validation Pending)*

## 4. Trucking Domain
**Domain Name**: Trucking
**Business Purpose**: End-to-end management of fleet routing, driver assignment, and physical cargo transport.
**Business Owner**: Trucking Operations
**Technology Owner**: SentraForge Engineering
**Current Repository Status**: Production Validation Pending
**Current Phase**: Phase 3B
**Architecture Status**: Validated (Phase 3A)
**Repository Location**: `src/domains/trucking`
**Architecture References**: ADR-008
**Current Evidence**: Explicit `JobOrder`, `Driver`, `Vehicle` aggregates implemented and covered by unit tests.

**Responsibilities**
- **Owns**: Driver readiness, vehicle dispatch, job order workflow state.
- **Consumes**: Identity (for tenant/auth), WorkOrder data.
- **Produces**: JobOrder state transitions.
- **Depends On**: PermissionEngine.

**Business Capabilities**
- **Primary Aggregates**: `JobOrder`, `Driver`, `Vehicle`
- **Entities/Value Objects**: `JobOrderStatus`
- **Repository Interfaces**: `IJobOrderRepository`, `IDriverRepository`, `IVehicleRepository`
- **Application Services**: `JobOrderService`

**Business Processes**
- **Typical Lifecycle**: `PENDING_ASSIGNMENT` → `ASSIGNED` → `DRIVER_ACCEPTED` → `IN_PROGRESS` → `DELIVERED` → `POD_SUBMITTED` → `COMPLETED`
- **Primary State Changes**: Driver allocation, geofence arrivals/departures, POD submission.

**Shared Platform Usage**
- **Identity / Permission**: Validated consumption.
- **Tracking / Timeline / Attachment**: Planned (Future Recommendation).

**Future Evolution**
- **Current Limitations**: Workflow is hardcoded to Trucking lifecycle; POD processing lacks an abstract Attachment Platform.
- **Future Roadmap**: Integration with Tracking Platform and Attachment Platform (Phases 3D/3E).

## 5. Planned Domains
*The following are preliminary catalog entries for planned domains. All features are currently classified as NOT VERIFIED Concepts.*

- **Warehouse**: Responsible for Inventory, Putaway, Picking, and Dispatch. (Status: Concept)
- **Depot Container**: Responsible for Container Lifecycle, Stacking, and Gate Operations. (Status: Concept)
- **Forwarding**: Responsible for inter-modal Shipments, Booking, and Manifests. (Status: Concept)
- **Customs**: Responsible for Declarations, HS Classification, and Compliance checks. (Status: Concept)
- **Distribution**: Responsible for last-mile routing and micro-fulfillment. (Status: Concept)
- **Cold Chain**: Responsible for temperature-controlled tracking and specialized fleet allocation. (Status: Concept)

## 6. Cross-Domain Relationships
Business entities flow across domain boundaries through well-defined interactions.

```mermaid
graph TD
    WorkOrder[WorkOrder (External/Sales)]
    JobOrder[JobOrder (Trucking Domain)]
    Tracking[Tracking Platform]
    POD[Attachment Platform]
    Inventory[Inventory (Warehouse Domain)]

    WorkOrder -->|Triggers| JobOrder
    JobOrder -->|Requires| Tracking
    JobOrder -->|Requires| POD
    Warehouse[Warehouse Domain] --> Inventory
    Inventory -->|Fulfills| WorkOrder
```
*Note: Interactions represent business relationships rather than hard technical coupling.*

## 7. Domain Ownership Matrix
| Domain | Business Owner | Technology Owner | Primary Capabilities | Primary Aggregates | Current Phase | Architecture Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trucking** | Trucking Ops | Engineering | Job Assignment | `JobOrder`, `Driver`, `Vehicle` | Phase 3B | Validated | Codebase implemented |
| **Warehouse** | Warehouse Ops | Engineering | Storage, Fulfillment | `Inventory` *(Concept)* | Future | Planned | NOT VERIFIED |
| **Forwarding** | Forwarding Ops | Engineering | Multi-modal transport | `Shipment` *(Concept)* | Future | Planned | NOT VERIFIED |

## 8. Shared Platform Consumption Matrix
| Domain | Identity | Permission | Timeline | Tracking | Attachment | Notification | Workflow | Reporting | AI Platform |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Trucking** | Validated | Validated | Planned | Planned | Planned | Planned | NOT VERIFIED | Validated | NOT VERIFIED |
| **Warehouse** | Planned | Planned | Planned | NOT VERIFIED | Planned | Planned | Planned | Planned | NOT VERIFIED |
| **Forwarding**| Planned | Planned | Planned | Planned | Planned | Planned | Planned | Planned | NOT VERIFIED |

## 9. Domain Event Overview
| Domain | Business Events Produced | Business Events Consumed | Current Evidence | Future Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Trucking** | `JobOrderAssigned`, `DriverAccepted`, `MissionStarted`, `MissionCompleted`, `PODSubmitted` | `WorkOrderCreated`, `AssignmentRequested` | Implicit via `JobOrderService` state changes | Implement abstract Event Bus for cross-domain decoupling |

## 10. Domain Dependency Rules
To maintain autonomy, all implementations must follow these architectural constraints:
1. Domains communicate through well-defined contracts (interfaces, events, or application services).
2. Domains do not directly mutate another domain's aggregates or tables.
3. Shared Platforms remain domain agnostic and cannot contain business rules.
4. Repositories never cross domain boundaries (a repository exclusively hydrates its own Aggregate).
5. Business terminology always follows domain language (Ubiquitous Language).

## 11. Repository Traceability
| Domain | Aggregate | Repository Location | Application | Infrastructure | UI | ADR | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trucking** | `JobOrder` | `src/domains/trucking/job-order` | `src/application/trucking` | `src/infrastructure/repositories` | `app/(dashboard)/sbu/trucking` | ADR-008 | Source code verified |
| **Trucking** | `Driver` | `src/domains/trucking/driver` | `src/application/trucking` | `src/infrastructure/repositories` | `app/(dashboard)/sbu/trucking` | ADR-008 | Source code verified |
| **Trucking** | `Vehicle` | `src/domains/trucking/vehicle` | `src/application/trucking` | `src/infrastructure/repositories` | `app/(dashboard)/sbu/trucking` | ADR-008 | Source code verified |

## 12. Domain Maturity Assessment
| Domain | Status | Reason |
| :--- | :--- | :--- |
| **Trucking** | Production Validation Pending | Implemented and validated structurally, awaiting operational metrics to verify stability. |
| **Warehouse** | Concept | Requirements exist, but architectural implementation is NOT VERIFIED. |
| **Forwarding** | Concept | Planned for Phase 5; no verified structure. |
| **Permissions** | Operational / Validated | Used currently to gate access; abstract `PermissionEngine` verified. |

## 13. Executive Summary
The Enterprise Domain Catalog documents the current business layout of the SentraForge platform. 

Currently, only the **Trucking** domain holds a Validated architectural status (operating as Production Validation Pending). Its boundaries, aggregates, and application services serve as the baseline for all subsequent development.

Planned domains—such as **Warehouse**, **Depot Container**, and **Forwarding**—are mapped as Concepts. Migration planning indicates future extraction of shared platforms (Timeline, Tracking, Attachment) to support these domains.

Presently, there are no architectural blockers within the validated scope. The Trucking implementation is structurally sound and strictly separated from shared platform concerns, providing an objective blueprint for the continued expansion of the Enterprise Logistics Platform.
