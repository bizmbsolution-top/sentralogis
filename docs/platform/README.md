# SentraForge Enterprise Logistics Platform

## Purpose
The definitive foundation for all SentraForge operations (Trucking, Warehouse, Container Depot, Forwarding, Finance).

## Architecture Overview
Follows Clean Architecture, DDD, CQRS, and SOLID principles. Depends entirely on the Phase 2A Shared Kernel.

## Platform Modules
1. State Machine
2. Attachment
3. Timeline
4. Assignment
5. Tracking
6. References
7. Approval
8. Notification
9. Audit

## Folder Structure
```text
src/platform/logistics/
  ├── state-machine/
  ├── attachment/
  ├── timeline/
  ├── assignment/
  ├── tracking/
  ├── references/
  ├── approval/
  ├── notification/
  └── audit/
```

## Documentation Index
See docs/platform/ for:
- platform-overview.md
- contracts.md
- dependency-rules.md
- type-system.md
- immutability.md
- migration-guide.md
- platform-governance.md
- extensibility.md
- architecture-diagrams.md
- platform-hardening-report.md
- platform-roadmap.md

## Current Implementation Status
**IMPLEMENTED**: All 9 modules are fully scaffolded, hardened, strictly typed, and immutable.
**PLANNED**: Integration into Trucking and Warehouse domains (Phase 3).

## Roadmap
See `platform-roadmap.md`.