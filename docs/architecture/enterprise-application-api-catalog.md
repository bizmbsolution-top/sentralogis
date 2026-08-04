# Enterprise Application & API Catalog v1.0

## 1. Purpose
This document defines the responsibilities, boundaries, ownership, and governance of the Application Layer and API Layer within the SentraForge Enterprise Logistics Platform. 

It formally documents:
- Application Services
- Commands
- Queries
- APIs
- Request Context
- Authorization Flow
- Repository orchestration
- Application ownership

This catalog governs every interaction between UI components and the core Domain, serving as the single source of truth for application contracts.

## 2. Application Layer Principles
The SentraForge platform adheres to the following constitutional principles regarding the Application Layer:
- **Application Services coordinate work.** They manage transactions and dependencies but do not contain core business logic.
- **Aggregates execute business rules.** All state invariants are protected inside the domain boundaries.
- **Repositories persist aggregates.** They translate domain entities to storage infrastructure.
- **Commands express intent.** They represent requests to mutate state.
- **Queries never mutate state.** They read data efficiently without passing through domain aggregates.
- **APIs expose Application Services.** REST or RPC endpoints act solely as delivery mechanisms.
- **Business rules never execute inside API routes.** Controllers contain no workflow or validation logic.
- **Permission validation occurs before aggregate mutation.** Authorization is orchestrated first.
- **Infrastructure remains behind interfaces.** 
- **Application Services never know Supabase details.** They operate against generic repository abstractions.
- **Controllers never contain workflow logic.**

## 3. Application Service Inventory
| Application Service | Owner Domain | Purpose | Repository | Aggregate | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `JobOrderService` | Trucking | Orchestrates Trucking Job Order lifecycle | `IJobOrderRepository` | `JobOrder` | Production Validation Pending | `JobOrderService.ts` |
| `DriverService` | Trucking | Manages driver profiles and readiness | `IDriverRepository` | `Driver` | Concept | NOT VERIFIED |
| `VehicleService` | Trucking | Manages vehicle state | `IVehicleRepository` | `Vehicle` | Concept | NOT VERIFIED |
| `TrackingService` | Tracking Platform | Manages telemetry | `ITrackingRepository` | N/A | Future Recommendation | Blueprint |
| `AttachmentService` | Attachment Platform | Manages PODs/Docs | `IAttachmentRepository` | N/A | Future Recommendation | Blueprint |
| `TimelineService` | Timeline Platform | Manages operational audit | `ITimelineRepository` | N/A | Future Recommendation | Blueprint |
| `NotificationService`| Notification Platform | Manages messaging | `INotificationRepo` | N/A | Concept | NOT VERIFIED |
| `WarehouseService` | Warehouse | Manages fulfillment | `IWarehouseRepository` | `Inventory` | Concept | NOT VERIFIED |
| `ForwardingService` | Forwarding | Manages multi-modal | `IForwardingRepo` | `Shipment` | Concept | NOT VERIFIED |
| `DepotService` | Depot | Manages containers | `IDepotRepository` | `Container` | Concept | NOT VERIFIED |

## 4. Command Catalog
| Command | Purpose | Owner Domain | Application Service | Aggregate | Permission | Repository | Events Produced | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AssignDriverCommand` | Allocate assets to job | Trucking | `JobOrderService` | `JobOrder` | `assign_job` | `IJobOrderRepository` | `DriverAssigned` | Production Validation Pending | Source code |
| `AcceptJobCommand` | Driver accepts | Trucking | `JobOrderService` | `JobOrder` | `accept_job` | `IJobOrderRepository` | `DriverAccepted` | Production Validation Pending | Source code |
| `StartMissionCommand` | Driver begins transit | Trucking | `JobOrderService` | `JobOrder` | `start_mission` | `IJobOrderRepository` | `MissionStarted` | Production Validation Pending | Source code |
| `SubmitArrivalCommand`| Driver arrives at dest | Trucking | `JobOrderService` | `JobOrder` | `submit_arrival`| `IJobOrderRepository` | `ArrivalConfirmed`| Production Validation Pending | Source code |
| `SubmitPODCommand` | POD uploaded | Trucking | `JobOrderService` | `JobOrder` | `submit_pod` | `IJobOrderRepository` | `PODSubmitted` | Production Validation Pending | Source code |
| `CompleteMissionCommand`| End Job Order | Trucking | `JobOrderService` | `JobOrder` | `complete_mission`| `IJobOrderRepository` | `MissionCompleted`| Production Validation Pending | Source code |
| `CancelMissionCommand`| Abort Job Order | Trucking | `JobOrderService` | `JobOrder` | `cancel_job` | `IJobOrderRepository` | `MissionCancelled`| Production Validation Pending | Source code |

## 5. Query Catalog
Queries are optimized read operations that bypass the Domain Aggregates. 
- **Read Models**: Flattened Data Transfer Objects (DTOs) specifically tailored for UI consumption.
- **Dashboard Projections**: Aggregated statistics for operational views.
- **Search, Filtering, Reporting**: Handled exclusively by read repositories.

*Current Status:* Most explicit queries are currently mixed within UI hooks or Supabase client calls. A dedicated Query layer mapped to Application Services is largely a **Concept** and **Future Recommendation**, pending the completion of the UI migration.

## 6. API Catalog
| Endpoint | HTTP Method | Application Service | Command | Authentication | Authorization | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/trucking/job-orders/{id}/assign` | `POST` | `JobOrderService` | `AssignDriverCommand` | Supabase JWT | `assign_job` | Production Validation Pending | `route.ts` |
| `/api/trucking/job-orders/{id}/cancel` | `POST` | `JobOrderService` | `CancelMissionCommand` | Supabase JWT | `cancel_job` | Production Validation Pending | `route.ts` |
| `/api/trucking/job-orders/{id}/start` | `POST` | `JobOrderService` | `StartMissionCommand` | PWA Token | `start_mission` | Concept | Planned API |
| `/api/trucking/job-orders/{id}/arrive` | `POST` | `JobOrderService` | `SubmitArrivalCommand`| PWA Token | `submit_arrival`| Concept | Planned API |
| `/api/trucking/job-orders/{id}/pod` | `POST` | `JobOrderService` | `SubmitPODCommand` | PWA Token | `submit_pod` | Concept | Planned API |
| `/api/trucking/job-orders/{id}/complete` | `POST` | `JobOrderService` | `CompleteMissionCommand`| PWA Token | `complete_mission`| Concept | Planned API |

## 7. Request Context
All Application Services consume an `IRequestContext` to enforce isolation and tracing.
- **tenantId**: Determines data boundary (RLS).
- **userId**: Tracks actor identity.
- **role**: Defines broad system capabilities.
- **permissions**: Fine-grained access control list.

**Zero Trust Principle**: `RequestContext` is strictly server-derived (built from authenticated JWTs). It is **never** accepted from or trusted by a client payload.

## 8. Authorization Flow
Permission enforcement strictly precedes aggregate mutation:
`UI` → `API` → `Application Service` → `PermissionEngine` → `Repository` → `Aggregate` → `Save`

The `PermissionEngine` acts as the gatekeeper; if authorization fails, the Aggregate is never restored or invoked.

## 9. Error Propagation
The system utilizes the Result Pattern to manage business failures:
- Domain methods return `Result.ok()` or `Result.fail('Reason')`.
- The Application Service receives the Result, logging errors if necessary, and translates failures into appropriate HTTP responses.
- Repositories never throw business exceptions; exceptions are reserved strictly for catastrophic infrastructure failures.

## 10. Dependency Rules
Architectural constraints governing the codebase:
- **Application depends on interfaces only.**
- **Repositories depend on infrastructure.**
- **UI depends on APIs.**
- **Aggregates know nothing about API** or transport mechanisms.
- **No API imports Supabase directly** (except for authentication/session bootstrapping).
- **No Repository contains business rules.**
- **No Aggregate imports infrastructure.**

## 11. Repository Interaction
The orchestration flow within an Application Service method:
`Application` → `Repository` (Fetch data) → `Aggregate.restore()` (Rehydrate domain object) → `Mutation` (Call domain method) → `Repository.save()` (Persist state).

No direct SQL or `.update()` calls occur inside the Application Service.

## 12. Traceability Matrix
| Application | Aggregate | Repository | API | ADR | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `JobOrderService` | `JobOrder` | `SupabaseJobOrderRepository` | `/api/trucking/job-orders/{id}/assign` | ADR-008 | Repository code verified |
| `JobOrderService` | `JobOrder` | `SupabaseJobOrderRepository` | `/api/trucking/job-orders/{id}/cancel` | ADR-008 | Repository code verified |

## 13. Maturity Assessment
| Application | Status | Reason |
| :--- | :--- | :--- |
| `JobOrderService` | Production Validation Pending | Structurally sound and functionally verified; awaiting full production UI migration. |
| `WarehouseService` | Concept | Theoretical business need; NOT VERIFIED. |
| `TrackingService` | Future Recommendation | Pending platform extraction. |

## 14. Engineering Rules
- **Commands mutate.**
- **Queries read.**
- **Controllers deliver.**
- **Aggregates validate.**
- **Repositories persist.**
- **Permission first.**
- **No workflow inside controllers.**
- **No infrastructure inside domain.**

## 15. Executive Summary
The Enterprise Application & API Catalog defines the verified boundaries of the SentraForge Application Layer. Currently, the `JobOrderService` is the sole structurally validated Application Service, possessing mature orchestration, repository interaction, and error propagation. Its operational readiness is classified as Production Validation Pending.

The API maturity is currently evolving; legacy UI components are being actively strangulated and replaced with strict API contracts governed by the Result pattern and explicit commands. Tracking Platform, Timeline Platform, Attachment Platform, and Workflow Platform are explicitly classified as Future Recommendations and remain entirely outside the verified scope. There are no architectural blockers impeding the validated scope.

## 16. Certification Status

### Certification Status
- Architecture Certification: Validated (Phase 3B Scope)
- Application Layer: Validated
- API Layer: Validated
- Operational Readiness: Production Validation Pending
- Recommended Next Phase: Phase 3D – Tracking Platform
