# Use Case Classification (Legacy vs Clean Architecture)

This document categorizes the operational flows found in the legacy codebase into strict Clean Architecture layers (Application, Domain, Infrastructure). 
*Note: We are not rewriting these use cases yet. This is an architectural mapping.*

## 1. Trucking Operations

| Legacy Operation | Target Application Layer | Target Domain Layer | Target Infrastructure |
|-----------------|--------------------------|----------------------|----------------------|
| **Create Job Order** | `CreateTruckingJobUseCase` | `TruckingJobOrder.create()` | `ITruckingJobRepository` |
| **Assign Driver** | `AssignDriverUseCase` | `DriverAssignment.accept()` | `IFleetRepository` |
| **Dispatch / Start Delivery** | `StartDeliveryUseCase` | `TruckingJobOrder.dispatch()` | `NotificationAdapter` |
| **GPS Tracking (Ping)** | `RecordGpsPingUseCase` | `TripTelemetry.recordPing()` | `ITelemetryRepository` |
| **Complete Delivery** | `CompleteDeliveryUseCase` | `TruckingJobOrder.complete()` | `EventPlatform` (`JobOrderCompleted`) |

## 2. Warehouse Operations

| Legacy Operation | Target Application Layer | Target Domain Layer | Target Infrastructure |
|-----------------|--------------------------|----------------------|----------------------|
| **Receive Goods** | `ReceiveGoodsUseCase` | `Receiving.registerReceipt()` | `IWarehouseOrderRepository` |
| **Put Away** | `PutAwayUseCase` | `Bin.allocate()` | `IInventoryRepository` |
| **Move Inventory** | `MoveInventoryUseCase` | `InventoryMovement.execute()`| `IInventoryRepository` |
| **Pick & Pack** | `PickGoodsUseCase` | `Picking.fulfill()` | `IWarehouseOrderRepository` |
| **Dispatch Shipment** | `DispatchShipmentUseCase`| `Shipment.dispatch()` | `EventPlatform` (`ShipmentDispatched`) |

## 3. Shared Logistics Operations

| Legacy Operation | Target Application Layer | Target Domain Layer | Target Infrastructure |
|-----------------|--------------------------|----------------------|----------------------|
| **Upload POD / Photos** | `UploadDocumentUseCase` | `DocumentReference.attach()` | `BlobStorageAdapter` |
| **Update Status Notes** | `UpdateTimelineUseCase` | `Activity.log()` | `ILogisticsRepository` |
| **Multi-Tenancy Check**| `TenantIsolationService`| `Organization.verify()` | `IdentityAdapter` |

## Conclusion
The current system predominantly executes Application logic directly inside the Infrastructure layer (Supabase RPCs) or Presentation layer (React Server Components). The extraction roadmap will sever these ties by shifting the verbs into the **Application Layer Use Cases**, which will then strictly orchestrate the nouns located in the **Domain Layer Aggregates**.
