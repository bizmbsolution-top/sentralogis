# UI Migration Matrix

| Current UI | Current Supabase Call | Target Application Service | Repository Used | Aggregate Used | Permission Required | Migration Status | Risk |
|------------|-----------------------|----------------------------|-----------------|----------------|---------------------|------------------|------|
| `AssignmentModal.tsx` | `insert('job_orders')` | `JobOrderService.create()` & `assignDriverAndVehicle()` | `IJobOrderRepository` | `JobOrder`, `Driver`, `Vehicle` | `job_order.create` | Pending | High |
| `EditAssignmentModal.tsx` | `update('job_orders')` | `JobOrderService.assignDriverAndVehicle()` | `IJobOrderRepository` | `JobOrder` | `job_order.update` | Pending | Medium |
| `HandoverModal.tsx` | `update('job_orders')` | `JobOrderService.acceptJob()` | `IJobOrderRepository` | `JobOrder` | `job_order.update` | Pending | Medium |
| `completed/page.tsx` | `update('job_orders')` | `JobOrderService.completeMission()` | `IJobOrderRepository` | `JobOrder` | `job_order.update` | Pending | Low |
| `work-orders/components/RejectReassignModal.tsx` | `update('job_orders')` | `JobOrderService.cancelMission()` / Re-assign | `IJobOrderRepository` | `JobOrder` | `job_order.update` | Pending | Medium |
