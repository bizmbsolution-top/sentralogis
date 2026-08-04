# UI Migration Discovery

This document details the discovery audit of the Trucking UI to identify direct database access and legacy architectural patterns that must be migrated to the new Application Layer.

## Audit Findings

### 1. `app/(dashboard)/sbu/trucking/assignments/page.tsx`
- **Current Responsibility**: Lists assignments, creates `job_orders` via direct Supabase client, queries `md_drivers` and `md_fleets`.
- **Legacy Access Method**: `supabase.from('job_orders').insert()`, `supabase.from('job_orders').select()`
- **Target Application Service**: `JobOrderService` (Commands: AssignDriver, ListJobOrders - note: queries might still hit read-models, but mutations must use JobOrderService).
- **Migration Priority**: HIGH
- **Estimated Complexity**: High
- **Backward Compatibility Risk**: High (critical operational page)

### 2. `app/(dashboard)/sbu/trucking/assignments/components/EditAssignmentModal.tsx`
- **Current Responsibility**: Edits existing driver/vehicle assignments on a job order.
- **Legacy Access Method**: `supabase.from('job_orders').update()`
- **Target Application Service**: `JobOrderService.assignDriverAndVehicle()`
- **Migration Priority**: HIGH
- **Estimated Complexity**: Medium
- **Backward Compatibility Risk**: Medium

### 3. `app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx`
- **Current Responsibility**: Creates new job order assignments from a work order.
- **Legacy Access Method**: `supabase.from('job_orders').insert()`
- **Target Application Service**: `JobOrderService.create()` and `JobOrderService.assignDriverAndVehicle()`
- **Migration Priority**: HIGH
- **Estimated Complexity**: High
- **Backward Compatibility Risk**: High

### 4. `app/(dashboard)/sbu/trucking/completed/page.tsx`
- **Current Responsibility**: Marks job orders as ready for billing.
- **Legacy Access Method**: `supabase.from('job_orders').update({ status: 'ready_for_billing' })`
- **Target Application Service**: `JobOrderService.completeMission()` or similar billing status command.
- **Migration Priority**: MEDIUM
- **Estimated Complexity**: Low
- **Backward Compatibility Risk**: Low

### 5. `app/(dashboard)/sbu/trucking/components/HandoverModal.tsx`
- **Current Responsibility**: Handles driver handover approvals.
- **Legacy Access Method**: `supabase.from('job_orders').update()`
- **Target Application Service**: `JobOrderService.acceptJob()` / `JobOrderService.assignDriverAndVehicle()`
- **Migration Priority**: HIGH
- **Estimated Complexity**: Medium
- **Backward Compatibility Risk**: Medium

### 6. `app/(dashboard)/sbu/trucking/add-cost/page.tsx`
- **Current Responsibility**: Mutates extra costs and updates job orders.
- **Legacy Access Method**: `supabase.from('extra_costs').delete()`, `supabase.from('notifications').insert()`
- **Target Application Service**: Needs Costing Domain Service (out of scope for JobOrderService?). Might need Legacy Adapter.
- **Migration Priority**: LOW
- **Estimated Complexity**: Medium
- **Backward Compatibility Risk**: Low

### 7. Other Read-Heavy Pages (Reporting, GPS Tracking, Dashboards)
- **Files**: `reporting/page.tsx`, `fleet-performance/page.tsx`, `reporting/gps-tracking/page.tsx`
- **Current Responsibility**: Dashboards and analytics.
- **Legacy Access Method**: `supabase.from(...).select()`
- **Target Application Service**: CQRS Read Models (Can remain direct Supabase reads for now as they are not mutating aggregates, as per CQRS principles, unless explicitly required to migrate).
- **Migration Priority**: LOW
- **Estimated Complexity**: Low
- **Backward Compatibility Risk**: Low
