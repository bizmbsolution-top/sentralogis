# Timeline Domain Analysis

## 1. Timeline Entity Discovery

### Proposed Entities & Value Objects
To support a robust, cross-domain architecture, the Timeline platform should be composed of:

- **`TimelineEvent`** (Entity)
  - The core historical record. Immutable once created.
  - **Properties**: `id`, `timestamp`, `event_type`, `payload`, `correlation_id`.
- **`TimelineReference`** (Value Object)
  - Defines what the event is about (polymorphic).
  - **Properties**: `reference_type` (e.g., "JOB_ORDER", "WORK_ORDER", "VEHICLE"), `reference_id`.
- **`TimelineActor`** (Value Object)
  - Defines who or what caused the event.
  - **Properties**: `actor_type` (e.g., "USER", "DRIVER", "SYSTEM", "API"), `actor_id`, `actor_name`.
- **`TimelineMetadata`** (Value Object)
  - Extensible JSON object for UI rendering hints (e.g., `icon`, `color`, `display_title`).

## 2. Aggregate Boundary Analysis

**Recommendation**: Append-only Entity Model.
A traditional Aggregate Root is designed to protect invariants—business rules that prevent invalid state transitions (e.g., "A truck cannot be assigned if it's already in use"). 

Timeline has no complex state transitions. It is an immutable append-only ledger. Wrapping `TimelineEvent` insertions in an artificial `Timeline` Aggregate Root adds unnecessary locking and concurrency bottlenecks.

*Conclusion*: The Timeline Domain should expose a `TimelineService` that directly orchestrates the creation and persistence of `TimelineEvent` entities. There is no `Timeline` Aggregate Root that loads historical events into memory just to append a new one.

## 3. Event Integration (Domain Events)

The Timeline Platform is fundamentally an event consumer. Operational domains emit Domain Events, which the Timeline Platform translates into historical logs.

### Recommended Integration Events:
| Origin Domain | Event Name | Timeline Action |
| :--- | :--- | :--- |
| **Trucking** | `DriverAssigned` | Log: "Driver {Name} assigned to JO" |
| **Trucking** | `JobAccepted` | Log: "Job accepted by Driver" |
| **Trucking** | `ArrivalConfirmed` | Log: "Driver arrived at {Location}" |
| **Trucking** | `PODSubmitted` | Log: "POD document uploaded" |
| **Tracking** | `GeofenceTriggered` | Log: "Entered geofence at {Location}" |

**Ownership**: 
The source domains (Trucking, Tracking) own the *Domain Events*. 
The Timeline Platform owns the *TimelineEvent* entities that are persisted.

## 4. Performance Considerations

Because the Timeline Platform will ingest events from across the entire enterprise, performance and scalability are paramount.

- **Append-Only Storage**: Databases excel at append-only workloads. No updates or deletes mean no locking contention.
- **Partitioning**: As the `timeline_events` table grows, it should be partitioned by `created_at` (e.g., monthly partitions) to ensure fast query times for recent active jobs.
- **Indexing**: 
  - `idx_timeline_reference` on `(reference_type, reference_id, timestamp DESC)` for fast UI rendering.
  - `idx_timeline_correlation` on `(correlation_id)` to trace complex workflows across microservices.
- **Archiving**: Events older than 12 months for completed jobs can be moved to cold storage (e.g., AWS S3 or Snowflake) if they are no longer needed for real-time querying.
- **Pagination / Streaming**: The `TimelineQueryService` must enforce cursor-based pagination to prevent memory exhaustion when querying extremely long timelines.
