# Sentralogis Copilot MVP - Repository Reuse

## 1. Application Services to Reuse
Copilot MUST NOT duplicate business logic. It will exclusively invoke existing methods.

| Copilot Intent | Reused Application Service | Method |
| :--- | :--- | :--- |
| `AssignJobIntent` | `JobOrderService` | `assignDriver(ctx, cmd)` |
| `CancelJobIntent` | `JobOrderService` | `cancelMission(ctx, cmd)` |
| `UpdateJobDataIntent` | `DriverPortalCommandRepository` / `JobOrderService` | `updateContainer(...)` |
| `CreateWorkOrderIntent` | `WorkOrderService` (Future Phase) | N/A (UI Draft only for MVP) |

## 2. Infrastructure Query Services to Reuse
Copilot needs read-models for entity validation and status queries.

| Copilot Intent | Reused Query Service | Method |
| :--- | :--- | :--- |
| Entity Validation | `DriverPortalQuery` / Repositories | `findById()`, `getJobOrderData()` |
| Status Query | `DriverPortalQuery` | `getJobOrderData()` filtered by status. |

## 3. Justification
By reusing these specific classes, Copilot inherits:
- SentraForge Constitution compliance (ADR-006 Result Pattern, ADR-007 Aggregates).
- Database migrations and table schemas without modifications.
- Permission enforcement.
