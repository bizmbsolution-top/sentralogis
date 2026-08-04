# Enterprise Logistics Platform Architecture

## Dependency Graph
```mermaid
graph TD
    App[Application Use Cases] --> Platform[Logistics Platform]
    Domain[Business Domains] --> Platform
    Platform --> Kernel[Phase 2A Kernel]
```

## Migration Roadmap
- `pod_documents` → `Attachment Platform`
- `job_tracking` → `Tracking Platform`
- `wh_inventory_movements` → `Timeline Platform`
- `AssignmentModal.tsx` → `Assignment Platform`

## Debt Reduction
This platform eliminates over a dozen fragmented implementations of statuses, histories, and attachments scattered across React components and SQL triggers.