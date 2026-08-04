# Platform Overview

The Enterprise Logistics Platform centralizes 9 capabilities:
1. **State Machine**: FSM engine
2. **Attachment**: Polymorphic files
3. **Timeline**: Audit and history
4. **Assignment**: Allocation logic
5. **Tracking**: Geofencing and Telemetry
6. **References**: Immutable master data proxies
7. **Approval**: Workflows
8. **Notification**: Channel dispatching
9. **Audit**: Application events

## Why Shared Platform vs Business Domain?
These 9 capabilities represent horizontal, non-differentiating primitives. By extracting them from domains (Trucking, Warehouse), we enforce consistency, eliminate duplication, and guarantee a unified system audit trail.

## Deep Dive (Maturity: IMPLEMENTED)
For each module (State Machine, Attachment, Timeline, Assignment, Tracking, References, Approval, Notification, Audit):
- **Purpose**: Horizontal capability encapsulation.
- **Current implementation**: Fully hardened in `src/platform/logistics/`.
- **Dependencies**: Shared Kernel only.
- **Future consumers**: Trucking, Warehouse, Finance.
- **Current maturity**: Production-ready.