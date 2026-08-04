# Architecture Debt Register

This document tracks identified architectural debt, missing patterns, and unverified assumptions discovered during the Trucking Domain migration.

| ID | Issue | Status | Risk | Priority | Recommended Phase |
|---|---|---|---|---|---|
| **AD-001** | Transaction Boundary | Implementation Pending | High | Critical | Phase 4 |
| | *Description:* Aggregate saves are currently performed sequentially (e.g., save Driver, save Vehicle, save JobOrder). A failure midway causes partial data persistence. A UnitOfWork or equivalent transaction boundary must be implemented across Supabase calls. |
| **AD-002** | Domain Events | Implementation Pending | Medium | High | Phase 4 |
| | *Description:* Aggregates mutate state but do not yet emit Domain Events (e.g., `DriverAssignedEvent`). This limits reactive workflows and audit logging capabilities. |
| **AD-003** | Event Dispatcher | Implementation Pending | Medium | High | Phase 4 |
| | *Description:* An event dispatcher infrastructure is needed to reliably route emitted Domain Events to corresponding Application Event Handlers. |
| **AD-004** | Integration Tests | Implementation Pending | High | Critical | Phase 3B |
| | *Description:* Application services are only tested against in-memory repository mocks. End-to-end integration tests hitting a test Supabase instance are required before production release. |
| **AD-005** | Observability | Implementation Pending | Medium | Medium | Phase 5 |
| | *Description:* Structured logging, correlation IDs, and telemetry are not yet integrated into the `JobOrderService` layer. |
| **AD-006** | Transporter Domain | NOT VERIFIED | Low | Low | TBD |
| | *Description:* `job_orders.transporter_id` exists in the legacy database but is not modeled in the domain. Its integration with vendor/3PL logic is pending. |
| **AD-007** | Canonical Legacy Status | NOT VERIFIED | Medium | Medium | Phase 3B |
| | *Description:* Legacy DB utilizes both `on_road` and `on_duty`. The adapter safely maps both but defaults to writing `on_duty`. Business validation is required to ensure legacy systems don't depend strictly on `on_road`. |
| **AD-008** | Capacity Nullability | NOT VERIFIED | Low | Low | Phase 3B |
| | *Description:* Legacy `md_fleets.capacity_kg` can be NULL. The repository adapter coerces this to `0` and emits a warning log. True business intent for NULL capacities needs clarification. |
