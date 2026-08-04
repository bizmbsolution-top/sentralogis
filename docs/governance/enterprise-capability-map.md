# Enterprise Capability Map v1.0

## 1. Purpose
A capability is a stable business ability. Capabilities change far slower than technologies. Implementations may evolve, code may be rewritten, and frameworks may be replaced, while the underlying business capabilities remain stable. This document defines the business capabilities owned by the SentraForge Enterprise Logistics Platform, independent of the underlying technology stack.

## 2. Capability Hierarchy
The capabilities of the SentraForge platform are organized into the following hierarchy:

- **Level 1**
  - Enterprise Logistics Platform
- **Level 2**
  - Shared Enterprise Services
  - Operational Domains
  - Business Intelligence
  - AI Services

## 3. Shared Enterprise Services
Shared enterprise services provide foundational, reusable capabilities required across all operational domains:
- Identity
- Authentication
- Authorization
- Tenant Management
- Organization
- User Management
- Master Data
- Configuration
- Audit
- Timeline
- Attachment
- Notification
- Workflow
- Tracking
- Reporting
- AI Platform
- Document Management
- Search
- File Storage

## 4. Operational Domains
Operational domains define the core logistics and business execution capabilities:
- Trucking
- Warehouse
- Depot
- Forwarding
- Customs
- Distribution
- Cold Chain
- Fleet
- Driver
- Container
- Inventory
- Scheduling

## 5. Capability Ownership
For every capability, explicit ownership and lifecycle phases must be defined. Example mapping:

| Capability | Business Owner | Technology Owner | Current Status | Consumers | Current Phase | Future Phase |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Trucking JobOrder | Trucking Operations | SentraForge Engineering | Validated | Driver App, Ops Dashboard | Phase 3B | Phase 3D |
| Identity & Auth | IT Security | Platform Engineering | Validated | All Domains | Phase 1A | Phase 3 |
| Tracking | Operations Control | SentraForge Engineering | NOT VERIFIED | Trucking, Forwarding | None | Phase 3D |

*(Comprehensive tracking matrices will be maintained continuously as the platform evolves.)*

## 6. Capability Dependencies
Capabilities are rarely isolated and frequently interact. A core operational capability depends on shared services.

**Example: Trucking JobOrder**
The `JobOrder` capability depends on:
- `Driver`
- `Vehicle`
- `Permission`
- `Timeline` *(Future Recommendation)*
- `Tracking` *(Future Recommendation)*
- `Notification` *(Future Recommendation)*
- `Attachment` *(Future Recommendation)*

## 7. Capability Maturity
The maturity of any capability within the repository is classified into the following lifecycle states:
- **Concept**: Theoretical business need; NOT VERIFIED.
- **Scaffolded**: Initial structural setup without verifiable business execution.
- **Validated**: Passes architectural constraints and fulfills requirements within current scope.
- **Production Validation Pending**: Functionally complete and deployed, awaiting empirical operational evidence.
- **Operational**: Operating successfully in production with verified metrics.
- **Shared Enterprise Platform**: Extracted and reused successfully across multiple autonomous domains based on objective evidence.

## 8. Current Repository Mapping
Mapping the current implementation against defined capabilities using only validated repository evidence:

| Capability | Current Folder | ADR Reference | Current Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| Trucking JobOrder | `src/domains/trucking` | ADR-008 | Validated | Explicit Aggregates, passing unit tests |
| Permissions | `src/domains/security` | Architecture Constitution | Validated | `PermissionEngine`, integration tests |
| UI Workflow | `app/(dashboard)/sbu/trucking` | ADR-008 | Production Validation Pending | `JobOrderService` orchestrated endpoints |

## 9. Planned Capability Evolution
The expected roadmap for capability evolution is as follows:
- **Phase 3B**: UI Migration
- **Phase 3D**: Tracking Platform, Timeline Platform
- **Phase 3E**: POD Platform, Attachment Platform
- **Phase 4**: Workflow Platform, Warehouse Domain
- **Phase 5**: Forwarding, Depot, AI Platform

## 10. Capability Principles
- **Capabilities own business behaviour.** They define what the system does.
- **Platforms own reusable infrastructure.** They abstract how the system accomplishes common technical tasks.
- **Domains remain autonomous.** Each domain must operate independently without tight coupling.
- **Capabilities evolve through validated business reuse.**
- **No capability shall be extracted without objective evidence.** Shared platforms emerge only from proven duplication, not speculative engineering.

## 11. Success Metrics
The success of capability extraction and mapping is measured by:
- Capability reuse across domains
- Reduced duplication
- Stable APIs governing inter-capability communication
- Stable Domain Boundaries preventing logic pollution
- Operational simplicity
- Business adoption and empirical validation

## 12. Governance
Every future implementation, ADR, and architecture review shall explicitly identify:
- Which capability it belongs to.
- Which capability it consumes.
- Whether it introduces a new capability.
- Whether an existing capability can be reused.

This document serves as the official business capability reference for the Enterprise Logistics Platform. Future architecture reviews shall reference this document before approving new platforms or domains.
