# UI Migration Backlog

This backlog dictates the ordered execution plan for Phase 3B. UI components are prioritized based on business criticality and dependency isolation.

## Sprint 1: Core Mutations (READY)
| Component | Target Action | Est. Effort | Priority |
|-----------|---------------|-------------|----------|
| `EditAssignmentModal.tsx` | API Route wrapper for `JobOrderService.assignDriverAndVehicle()` | 3 hours | 1 |
| `HandoverModal.tsx` | API Route wrapper for `JobOrderService.acceptJob()` | 2 hours | 2 |
| `RejectReassignModal.tsx` | API Route wrapper for `JobOrderService.cancelMission()` | 2 hours | 3 |

## Sprint 2: Complex Assignments (PARTIAL)
| Component | Target Action | Est. Effort | Priority |
|-----------|---------------|-------------|----------|
| `AssignmentModal.tsx` (Work Orders) | Legacy Adapter API Route bridging WO creation to `JobOrderService.create()` | 5 hours | 4 |
| `assignments/page.tsx` | Refactoring batch assignments to loop through Application Service | 4 hours | 5 |

## Sprint 3: Lifecycle Completions (READY)
| Component | Target Action | Est. Effort | Priority |
|-----------|---------------|-------------|----------|
| `completed/page.tsx` | Migrate status transitions to `JobOrderService.completeMission()` | 3 hours | 6 |
| `completed/components/JobDetailModal.tsx` | Refactor completion mutations | 2 hours | 7 |

## Blocked / Out of Scope
- `add-cost/page.tsx` (Requires Costing Domain)
- `finances/page.tsx` (Requires Finance Domain)
- Read-only Dashboards (Handled via CQRS direct reads)

## Recommendation
We recommend beginning execution with **Sprint 1: Core Mutations**, starting specifically with `EditAssignmentModal.tsx` to validate the API route mapping pattern.
