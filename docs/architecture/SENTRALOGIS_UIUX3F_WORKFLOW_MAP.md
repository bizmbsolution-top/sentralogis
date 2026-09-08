# SENTRALOGIS — UI/UX-3F
# WORKFLOW MAP

**Date:** 2026-09-01  

---

## 1. Quote-Based Order Workflow

```
Customer → Engagement → Quote → Approval → SO → Fulfillment → Operations
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | CS | Create Engagement | `commercial_work_orders` |
| 2 | CS | Create Quote | `crm_quotations` |
| 3 | CS | Add line items | `crm_quotation_items` |
| 4 | CS | Set pricing | `lib/pricing/` |
| 5 | Customer | Approve/Reject | Public quote page |
| 6 | CS | Convert to SO | `sales_orders` |
| 7 | CS | Confirm SO | Status transition |
| 8 | CS | Create Fulfillment | `fulfillments` |
| 9 | System | Allocate capabilities | `fulfillment_allocations` |
| 10 | SBU | Execute | Domain-specific |

---

## 2. Direct Order Workflow

```
Customer → Engagement → Direct SO → Fulfillment → Operations
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | CS | Create Engagement | `commercial_work_orders` |
| 2 | CS | Create Direct SO | `sales_orders` |
| 3 | CS | Add SO lines | `sales_order_items` (future) |
| 4 | CS | Set pricing | `lib/pricing/` |
| 5 | CS | Confirm SO | Status transition |
| 6 | CS | Create Fulfillment | `fulfillments` |
| 7 | System | Allocate capabilities | `fulfillment_allocations` |
| 8 | SBU | Execute | Domain-specific |

---

## 3. Regular SBU Order Workflow

```
Customer → Engagement → Regular Order → SO → Fulfillment → SBU
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | CS | Create Engagement | `commercial_work_orders` |
| 2 | CS | Create Regular Order | Template-based |
| 3 | CS | Create SO | `sales_orders` |
| 4 | CS | Confirm SO | Status transition |
| 5 | System | Auto-fulfill | `fulfillments` |
| 6 | SBU | Execute | Domain-specific |

---

## 4. Multi-Capability Order Workflow

```
Customer → Engagement → SO → Multiple Fulfillment Allocations → Multiple SBU
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | CS | Create SO | `sales_orders` |
| 2 | CS | Add multiple lines | `sales_order_items` (future) |
| 3 | CS | Create Fulfillment | `fulfillments` |
| 4 | CS | Add allocations | `fulfillment_allocations` |
| 5 | System | Create handoffs | `operational_handoffs` |
| 6 | SBU | Execute forwarding | `shp_shipments` |
| 7 | SBU | Execute customs | `cus_declarations` |
| 8 | SBU | Execute trucking | `job_orders` |

---

## 5. Fulfillment Workflow

```
SO → Fulfillment → Allocations → Handoffs → Execution
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | CS | Create Fulfillment | `fulfillments` |
| 2 | CS | Add allocations | `fulfillment_allocations` |
| 3 | System | Create handoffs | `operational_handoffs` |
| 4 | SBU | Accept handoff | Status transition |
| 5 | SBU | Execute | Domain-specific |
| 6 | System | Update progress | `fulfillment_allocations` |

---

## 6. Shipment Workflow

```
Allocation → Shipment → Legs → Completion
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | System | Create Shipment | `shp_shipments` |
| 2 | Ops | Add units | `shp_units` |
| 3 | Ops | Add legs | `shp_execution_legs` |
| 4 | System | Track progress | Status updates |
| 5 | Ops | Complete | Status → COMPLETED |

---

## 7. Operations Workflow

```
Handoff → WO → JO → Execution → Completion
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | System | Create Handoff | `operational_handoffs` |
| 2 | Ops | Accept | Status transition |
| 3 | Ops | Create WO | `work_orders` |
| 4 | Ops | Create JO | `job_orders` |
| 5 | Ops | Assign driver | `job_orders.driver_id` |
| 6 | Driver | Execute | GPS tracking |
| 7 | System | Complete | Status → COMPLETED |

---

## 8. Customer Visibility Workflow

```
Customer Login → Portal → Orders → Shipments → Tracking
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | Customer | Login | Auth |
| 2 | Customer | View orders | Customer-scoped query |
| 3 | Customer | View shipments | Customer-scoped query |
| 4 | Customer | Track shipment | Token-based public |
| 5 | Customer | Download documents | Customer-scoped |

---

## 9. Vendor Visibility Workflow

```
Vendor Login → Portal → Assignments → Jobs → POD
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | Vendor | Login | Auth |
| 2 | Vendor | View assignments | Vendor-scoped query |
| 3 | Vendor | View jobs | Vendor-scoped query |
| 4 | Vendor | Update status | Operational |
| 5 | Vendor | Upload POD | Document upload |

---

## 10. Financial Workflow

```
SO → Billable Event → Invoice → AR → Payment → Settlement → Accounting
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | System | Create billable event | Financial lines |
| 2 | Finance | Create invoice | `fin_invoices` |
| 3 | Finance | Send invoice | Status → SENT |
| 4 | Customer | Pay | External |
| 5 | Finance | Record payment | `fin_payments` |
| 6 | Finance | Allocate to invoice | `fin_payment_allocations` |
| 7 | Finance | Settle | `fin_settlements` |
| 8 | System | Export to accounting | Event outbox |

---

## 11. Payment Workflow

```
Payment → Allocation → Settlement → Reconciliation
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | Finance | Record payment | `fin_payments` |
| 2 | Finance | Allocate to invoices | `fin_payment_allocations` |
| 3 | System | Update AR balance | `fin_ar_ap` |
| 4 | Finance | Settle | `fin_settlements` |
| 5 | Finance | Reconcile | `fin_reconciliation_records` |

---

## 12. Reconciliation Workflow

```
External Statement → Match → Reconcile → Exception
```

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | System | Receive external event | Webhook/API |
| 2 | System | Create reconciliation record | `fin_reconciliation_records` |
| 3 | System | Match to payment | Matching engine |
| 4 | Finance | Confirm match | Status → MATCHED |
| 5 | Finance | Handle exception | Status → EXCEPTION |

---

## 13. Copilot-Assisted Workflow

```
User Intent → Context → Validation → Plan → Explain → Confirm → Execute → Audit
```

| Step | System | Component |
|------|--------|-----------|
| 1 | Intent recognition | `IntentStage` |
| 2 | Context enrichment | `ContextStage` |
| 3 | Validation | `ValidationStage` |
| 4 | Planning | `PlanningStage` |
| 5 | Explainability | `ExplainabilityStage` |
| 6 | Response | `ResponseStage` |
| 7 | Confirmation | UI |
| 8 | Execution | Canonical domain service |
| 9 | Audit | `CopilotTelemetry` |

---

**END OF WORKFLOW MAP**
