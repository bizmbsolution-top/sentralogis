# Timeline Platform Decision Log (ADRs)

This document captures the key architectural decisions made during Phase 3D.9 Timeline Platform Discovery. These decisions govern the implementation expected in Phase 3D.10.

## ADR-010: Timeline as an Append-Only Entity Model
**Status**: Accepted
**Context**: We need to record historical events across multiple domains (Trucking, Warehouse). Traditional aggregates are meant for state mutation and invariant protection. 
**Decision**: The Timeline Platform will NOT use a traditional Aggregate Root for appending events. It will rely on an append-only Entity model where `TimelineEvent` is directly persisted via a `TimelineService`. 
**Consequences**: Eliminates concurrency bottlenecks during high-volume event ingestion. Shifts the burden of aggregation to Read Models (`TimelineQueryService`).

## ADR-011: Timeline as a Shared Enterprise Platform
**Status**: Accepted
**Context**: `job_tracking` was historically deeply coupled to `job_orders` and `job_routes` (Trucking Domain). However, a customer expects a unified timeline that spans from Customs Clearance to Warehouse Putaway to Trucking Delivery.
**Decision**: Timeline will be extracted as a Level 2 Shared Enterprise Service. It will use a polymorphic `TimelineReference` (Type, ID) to associate events with any entity across any domain.
**Consequences**: The Timeline Platform cannot import Trucking entities. Operational domains must publish events that Timeline consumes, reversing the current dependency direction.

## ADR-012: Separation of Telemetry from Business Timeline
**Status**: Accepted
**Context**: The legacy `job_tracking` table mixed both continuous GPS pings (Telemetry) and discrete business status updates (Arrivals, Departures).
**Decision**: Telemetry belongs to the Tracking Platform (Phase 3D.7). The Timeline Platform will ONLY record discrete business events. Cross-boundary events like a Geofence breach will be emitted by Tracking and consumed by Timeline to log the milestone.
**Consequences**: Drastically reduces storage bloat in the Timeline platform. Ensures the UI chronological feed is meaningful rather than cluttered with thousands of GPS coordinates.

## ADR-013: Strangler Fig Migration for Timeline Data
**Status**: Accepted
**Context**: The business cannot afford downtime or data loss for historical `job_tracking` records during the migration.
**Decision**: Phase 3D.10 will implement dual-writing. The existing Application Services will be updated to write to both the legacy `job_tracking` table and the new `TimelineService`. Once data parity is validated, a background script will backfill historical data, followed by Phase 3D.11 which will point all UI reads to the new Read Model and drop the legacy table.
**Consequences**: Slightly higher write latency during the dual-write phase, but ensures zero downtime and absolute data safety.
