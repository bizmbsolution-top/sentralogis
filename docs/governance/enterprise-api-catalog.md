# Enterprise Application & API Catalog v1.0

## 1. Application Layer Principles
- **Application Services coordinate work**: They orchestrate transactions, dependencies, and aggregates but do not contain core business rules.
- **Aggregates execute business rules**: All domain logic and invariant protection occurs inside the domain aggregate.
- **Repositories persist aggregates**: They translate domain entities to storage but do not leak infrastructure details upward.
- **Commands express intent**: They are explicit requests to mutate state and can fail.
- **Queries never mutate state**: They return Read Models optimized for UI/Clients and bypass domain aggregates when necessary.
- **APIs expose Application Services**: Transport layers (REST, GraphQL, RPC) simply deliver the command to the Application Service.
- **Business rules never execute inside API routes**: Controllers act exclusively as delivery mechanisms.
- **Permission validation occurs before aggregate mutation**: Authorization is orchestrated by the Application Service using the `PermissionEngine` before the Aggregate is invoked.
- **Infrastructure remains behind interfaces**: The application layer only knows about abstract `IRepository` interfaces.

## 2. Application Service Inventory
| Application Service | Status | Reason |
| :--- | :--- | :--- |
| `JobOrderService` | Production Validation Pending | Functionally verified; awaiting production traffic data. |
| `DriverService` | Concept | Planned extraction. |
| `VehicleService` | Concept | Planned extraction. |
| `TrackingService` | Future Recommendation | Blueprint approved; implementation NOT VERIFIED. |
| `AttachmentService` | Future Recommendation | Blueprint approved; implementation NOT VERIFIED. |
| `TimelineService` | Future Recommendation | Blueprint approved; implementation NOT VERIFIED. |
| `NotificationService` | Concept | NOT VERIFIED. |
| `ReportingService` | Concept | NOT VERIFIED. |
| `WarehouseService` | Concept | NOT VERIFIED. |
| `ForwardingService` | Concept | NOT VERIFIED. |
| `DepotService` | Concept | NOT VERIFIED. |

## 3. Command Catalog
| Command Name | Purpose | Owner Domain | Application Service | Aggregate | Required Permission | Repository | Events Produced | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AssignDriverCommand` | Allocate driver/vehicle | Trucking | `JobOrderService` | `JobOrder` | `assign_job` | `IJobOrderRepository` | `DriverAssigned` | Production Validation Pending | `JobOrderService.ts` |
| `AcceptJobCommand` | Driver accepts job | Trucking | `JobOrderService` | `JobOrder` | `accept_job` | `IJobOrderRepository` | `DriverAccepted` | Production Validation Pending | `JobOrderService.ts` |
| `StartMissionCommand` | Driver begins transit | Trucking | `JobOrderService` | `JobOrder` | `start_mission` | `IJobOrderRepository` | `MissionStarted` | Production Validation Pending | `JobOrderService.ts` |
| `SubmitArrivalCommand` | Driver reaches dest | Trucking | `JobOrderService` | `JobOrder` | `submit_arrival` | `IJobOrderRepository` | `ArrivalConfirmed`| Production Validation Pending | `JobOrderService.ts` |
| `SubmitPODCommand` | POD uploaded | Trucking | `JobOrderService` | `JobOrder` | `submit_pod` | `IJobOrderRepository` | `PODSubmitted` | Production Validation Pending | `JobOrderService.ts` |
| `CompleteMissionCommand`| End Job Order | Trucking | `JobOrderService` | `JobOrder` | `complete_mission`| `IJobOrderRepository` | `MissionCompleted`| Production Validation Pending | `JobOrderService.ts` |
| `CancelMissionCommand` | Abort Job Order | Trucking | `JobOrderService` | `JobOrder` | `cancel_job` | `IJobOrderRepository` | `MissionCancelled`| Production Validation Pending | `JobOrderService.ts` |

*(Future commands such as `UploadAttachmentCommand`, `CreateTimelineEntryCommand`, and `UpdateTrackingCommand` remain Concepts).*

## 4. Query Catalog
| Query Name | Purpose | Owner Domain | Read Model | Repository | Consumers | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GetJobOrder` | Retrieve single JO details | Trucking | `JobOrderReadModel` | `JobOrderQueryRepo` | UI / Ops | Validated |
| `ListJobOrders` | Paginated JO table | Trucking | `JobOrderListModel` | `JobOrderQueryRepo` | UI / Ops | Validated |
| `GetDriver` | Fetch Driver details | Trucking | `DriverReadModel` | `DriverQueryRepo` | UI | Concept |
| `GetVehicle` | Fetch Vehicle details | Trucking | `VehicleReadModel` | `VehicleQueryRepo` | UI | Concept |
| `TrackingHistory` | Geospatial ping trail | Tracking | `TrackingReadModel` | `TrackingRepo` | Ops | Future Recommendation |

## 5. REST Endpoint Mapping
Current endpoint mappings serving the Application Layer.

**POST `/api/trucking/job-orders/{id}/assign`**
- **Application Service**: `JobOrderService`
- **Command**: `AssignDriverCommand`
- **Permission**: `assign_job`
- **Aggregate**: `JobOrder`
- **Repository**: `IJobOrderRepository`
- **Events Produced**: `DriverAssigned`, `VehicleAssigned`
- **UI Consumer**: `EditAssignmentModal`
- **Current Status**: Production Validation Pending

## 6. Application Dependency Matrix
| Application Service | Aggregate | Repositories | Permission Engine | Shared Platforms | Events Produced | UI | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `JobOrderService` | `JobOrder` | `IJobOrderRepo` | `PermissionEngine` | N/A | `JobOrderCreated`, etc. | Ops Dashboard, Mobile PWA | Source code verified |

## 7. Permission Matrix
| Permission | Application Service | Command | Aggregate | Repository | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `assign_job` | `JobOrderService` | `AssignDriverCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `accept_job` | `JobOrderService` | `AcceptJobCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `start_mission` | `JobOrderService` | `StartMissionCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `submit_arrival` | `JobOrderService` | `SubmitArrivalCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `submit_pod` | `JobOrderService` | `SubmitPODCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `complete_mission`| `JobOrderService` | `CompleteMissionCommand`| `JobOrder` | `IJobOrderRepository` | Production Validation Pending |
| `cancel_job` | `JobOrderService` | `CancelMissionCommand` | `JobOrder` | `IJobOrderRepository` | Production Validation Pending |

## 8. Repository Dependency Matrix
| Application Service | Repository Interface | Infrastructure Adapter | Database Table | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| `JobOrderService` | `IJobOrderRepository` | `SupabaseJobOrderRepository` | `job_orders` | Validated in `src/infrastructure` |
| `JobOrderService` | `ILegacyJobOrderSync` | `LegacyJobOrderSyncService`| `job_orders` (legacy fields) | Validated in `src/infrastructure` |

## 9. UI Integration Matrix
| UI Component | API Endpoint | Application Service | Aggregate | Repository | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EditAssignmentModal` | `/api/trucking/job-orders/{id}/assign` | `JobOrderService` | `JobOrder` | `SupabaseJobOrderRepo` | Production Validation Pending |
| `RejectReassignModal` | `/api/trucking/job-orders/{id}/cancel` | `JobOrderService` | `JobOrder` | `SupabaseJobOrderRepo` | Production Validation Pending |
| Driver Mobile PWA | `/api/jo/[token]/route.ts` | `JobOrderService` | `JobOrder` | `SupabaseJobOrderRepo` | Production Validation Pending |
| Warehouse Dashboard | N/A | `WarehouseService` | `Inventory` | N/A | Concept |

## 10. External Integration Matrix
| Integration | Purpose | Consumers | Status |
| :--- | :--- | :--- | :--- |
| **WhatsApp** | Notification delivery | Notification Platform | Planned |
| **GPS Provider** | Geospatial tracking | Tracking Platform | Concept |
| **Supabase Auth** | JWT Authentication | Identity Platform | Validated |
| **Storage** | Object store for POD | Attachment Platform | Planned |
| **ERP** | Financial Sync | Billing Domain | NOT VERIFIED |

## 11. Architecture Compliance
The current application architecture has been verified against the Constitution:
- ✓ **Application Services contain orchestration only**.
- ✓ **Aggregates contain business rules**.
- ✓ **Repositories contain persistence only**.
- ✓ **API routes contain delivery only**.
- ✓ **Permission checks occur before mutation**.
- ✓ **Result<T> propagates failures** explicitly.
- ✓ **No direct UI database mutation** observed in validated scope.
- ✓ **No infrastructure leakage** into the domain.
- ✓ **Domain boundaries preserved**.
- ✓ **Cross-domain interaction uses contracts only**.

## 12. Application Maturity Assessment
| Application Service | Classification | Reason |
| :--- | :--- | :--- |
| `JobOrderService` | Production Validation Pending | Implemented securely behind interfaces; pending production load telemetry. |
| `WarehouseService`| Concept | Requirements noted, implementation NOT VERIFIED. |
| `TrackingService` | Future Recommendation | Structurally planned for Phase 3D. |

## 13. Repository Traceability
| Application Service | Command | Aggregate | Repository | Infrastructure | Endpoint | UI | ADR | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `JobOrderService` | `AssignDriverCommand` | `JobOrder` | `IJobOrderRepository` | `SupabaseJobOrderRepo` | `/api/.../assign` | `EditAssignmentModal`| ADR-008| Verified Source |

## 14. Executive Summary
The Enterprise Application & API Catalog defines the business contracts coordinating the SentraForge platform.

Currently, the `JobOrderService` within the Trucking domain is the only structurally Validated service. It possesses validated Commands, strict Permission mapping, and clear Repository isolation. It is classified as Production Validation Pending as the Phase 3B UI migration continues.

All REST endpoints successfully isolate delivery logic from business rules, operating entirely as delegates to the Application Services. Future expansions, including `WarehouseService` and Shared Platforms (e.g., `TrackingService`, `AttachmentService`), are strictly categorized as Concepts or Future Recommendations. 

There are no architectural blockers within the validated scope. This document establishes the definitive application contracts that must be adhered to as new endpoints, mobile clients, and third-party integrations are developed.
