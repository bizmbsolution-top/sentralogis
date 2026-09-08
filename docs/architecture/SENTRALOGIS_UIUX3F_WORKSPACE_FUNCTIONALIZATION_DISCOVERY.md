# SENTRALOGIS — UI/UX-3F
# WORKSPACE FUNCTIONALIZATION DISCOVERY

**Date:** 2026-09-01  
**Status:** GREEN — READY FOR UI/UX-3G  
**Phase:** UI/UX-3F — Discovery  

---

## 1. Executive Summary

**PHASE UI/UX-3F: GREEN — READY FOR UI/UX-3G**

The existing Copilot engine (`src/platforms/copilot/`) provides a robust pipeline architecture with 4 default intents (ASSIGN_DRIVER, REPLACE_DRIVER, SHOW_TIMELINE, CANCEL_JOB). UI/UX-3E workspaces are functional but require backend integration to become fully operational. Key gaps: SO line items, engagement UI, customer/vendor backend access, Smart Tutorial engine.

---

## 2. Current State

### Workspaces Implemented (UI/UX-3E)

| Workspace | Route | Status |
|-----------|-------|--------|
| Commercial | `/commercial` | UI complete, backend partial |
| Operations | `/operations` | UI complete, backend partial |
| Finance | `/finance` | UI complete, backend partial |
| Control Tower | `/intelligence` | UI complete, backend partial |
| Customer Portal | `/portal/customer` | UI complete, backend partial |
| Vendor Portal | `/portal/partner` | UI complete, backend partial |

### Existing Copilot Capabilities

| Intent | Domain | Risk |
|--------|--------|------|
| ASSIGN_DRIVER | Trucking | MEDIUM |
| REPLACE_DRIVER | Trucking | HIGH |
| SHOW_TIMELINE | Cross-domain | LOW |
| CANCEL_JOB | Trucking | HIGH |

### Pipeline Stages

```
Intent → Context → Validation → Planning → Explainability → Response
```

---

## 3. Workspace Findings

### 3.1 Commercial Workspace

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Customer list | `md_entities` | UI exists |
| Engagements | `commercial_work_orders` | **NO engagement UI** |
| Quotes | `crm_quotations` | UI exists |
| Sales Orders | `sales_orders` | UI exists |
| SO Line Items | `sales_order_items` | **DEFERRED (5C-3)** |
| Pricing | `lib/pricing/` | UI exists |
| Overrides | `pricing_price_overrides` | UI exists |
| Fulfillment | `fulfillments` | UI exists |

**Critical Gap:** No Engagement UI exists. Engagement is the commercial root per ADR-018.

### 3.2 Operations Workspace

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Work queue | `shp_shipments`, `job_orders` | UI exists |
| Forwarding | `fw_*` tables | UI exists |
| Trucking | `job_orders`, `wo_items` | UI exists |
| Customs | `cus_declarations` | UI exists |
| Warehouse | `wh_*` tables | UI exists |

### 3.3 Finance Workspace

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Invoices | `fin_invoices`, `invoices` | UI exists |
| AR/AP | `fin_ar_ap` | UI exists |
| Payments | `fin_payments` | UI exists |
| Settlements | `fin_settlements` | UI exists |
| Reconciliation | `fin_reconciliation_records` | UI exists |

### 3.4 Control Tower

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Operational health | Aggregates | UI exists |
| Exceptions | Control Tower | UI exists |
| SLA | `shp_shipments` | UI exists |

### 3.5 Customer Portal

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Orders | `sales_orders` | **NO customer-scoped API** |
| Shipments | `shp_shipments` | **NO customer-scoped API** |
| Documents | Future | **GAP** |
| Invoices | `fin_invoices` | **NO customer-scoped API** |

### 3.6 Vendor Portal

| Screen | Existing Capability | Gap |
|--------|---------------------|-----|
| Assignments | Future | **GAP** |
| Jobs | `job_orders` | **NO vendor-scoped API** |
| Documents | Future | **GAP** |

---

## 4. Functional Gaps

### UX-Only Gaps

| Gap | Workspace | Priority |
|-----|-----------|----------|
| Engagement CRUD UI | Commercial | P0 |
| SO line item editor | Commercial | P1 |
| Customer Success workspace | CS | P1 |
| Real-time data integration | All | P1 |
| Mobile optimization | All | P2 |

### Backend Capability Gaps

| Gap | Workspace | Priority |
|-----|-----------|----------|
| Customer-scoped APIs | Customer Portal | P0 |
| Vendor-scoped APIs | Vendor Portal | P0 |
| Smart Tutorial engine | All | P2 |
| Proactive Copilot | Intelligence | P2 |

### Architectural Gaps

| Gap | Recommendation |
|-----|----------------|
| None discovered | Architecture is sound |

---

## 5. Capability Mapping

| Action | Existing Service | API | Authorization |
|--------|-----------------|-----|---------------|
| Create Engagement | `commercial_work_orders` | `/api/v1/commercial/work-orders` | `commercial:manage` |
| Create SO | `sales_orders` | `/api/v1/commercial/sales-orders` | `commercial:manage` |
| Create Fulfillment | `fulfillments` | `/api/v1/commercial/fulfillments` | `commercial:manage` |
| Create Invoice | `fin_invoices` | Future | `commercial:manage` |
| Record Payment | `fin_payments` | Future | `commercial:manage` |
| Assign Driver | `job_orders` | Future | `job_order:assign` |

---

## 6. Persona Mapping

| Persona | Workspace | Copilot Access |
|---------|-----------|----------------|
| Commercial | Commercial | Quote analysis, Customer insights |
| CS | Customer Success | Order status, Exceptions |
| Operations | Operations | Shipment tracking, Execution |
| Finance | Financial | Invoice status, Reconciliation |
| Control Tower | Intelligence | Cross-domain visibility |
| Customer | Customer Portal | Order tracking |
| Vendor | Partner Portal | Assignment status |

---

## 7. Action Classification

| Action | Type | Confirmation |
|--------|------|-------------|
| Create Engagement | EXECUTE | No |
| Create Quote | EXECUTE | No |
| Approve Quote | CONFIRM | Yes |
| Create SO | EXECUTE | No |
| Confirm SO | CONFIRM | Yes |
| Cancel SO | IRREVERSIBLE | Yes |
| Create Fulfillment | EXECUTE | No |
| Override Price | CONFIRM | Yes |
| Create Invoice | EXECUTE | No |
| Record Payment | CONFIRM | Yes |
| Reverse Payment | IRREVERSIBLE | Yes |

---

## 8. Lifecycle Mapping

| Object | States | Transitions |
|--------|--------|-------------|
| Engagement | DRAFT→ACTIVE→COMPLETED | Commercial |
| Quote | DRAFT→SENT→APPROVED/REJECTED | Commercial |
| SO | DRAFT→CONFIRMED→IN_FULFILLMENT→FULFILLED | Commercial |
| Fulfillment | PLANNED→ACTIVE→FULFILLED | Commercial |
| Shipment | DRAFT→IN_TRANSIT→DELIVERED | Operations |
| Invoice | DRAFT→SENT→ACCEPTED→PAID | Finance |
| Payment | PENDING→CONFIRMED→ALLOCATED | Finance |

---

## 9. Copilot Mapping

| Persona | Context | Intent | Capability |
|---------|---------|--------|------------|
| Commercial | Quote | EXPLAIN | Pricing analysis |
| Commercial | Customer | RECOMMEND | Follow-up actions |
| Operations | Shipment | EXPLAIN | Delay reason |
| Operations | Job | PREPARE | Assignment |
| Finance | Invoice | EXPLAIN | Payment status |
| Control Tower | Exception | RECOMMEND | Resolution |
| Customer | Order | READ | Status |
| Vendor | Job | READ | Assignment details |

---

## 10. Smart Tutorial Findings

| Question | Answer |
|----------|--------|
| Does it exist? | NO |
| Where? | N/A |
| Reusable components? | Future |
| Recommendation | Build as thin layer on Copilot WorkspaceContext |

---

## 11. Mobile Findings

| Priority | Workflow | Current State |
|----------|----------|---------------|
| HIGH | Command + Search | OK |
| HIGH | My Work | OK |
| HIGH | Shipment tracking | OK |
| MEDIUM | Order creation | POOR |
| LOW | Pricing management | POOR |

---

## 12. Legacy UX Classification

| Screen | Classification | Action |
|--------|---------------|--------|
| Old sidebar (role-based) | DEPRECATE | Replace with workspace-aware |
| `/commercial/pipeline` (deal-based) | DEPRECATE | Replace with engagement workspace |
| SBU-first menus | DEPRECATE | Replace with operations workspace |
| Mock financial pages | DEPRECATE | Replace with real financial UI |

---

## 13. Duplication Audit

| Check | Result |
|-------|--------|
| Duplicate dashboard logic | NONE |
| Duplicate pricing logic | NONE |
| Duplicate financial logic | NONE |
| Duplicate Copilot | NONE |
| Duplicate authorization | NONE |

---

## 14. Security Verification

| Check | Status |
|-------|--------|
| IdentityContext authoritative | YES |
| Tenant isolation | YES |
| No client tenant authority | YES |
| No browser-direct mutation | YES |
| Copilot authorization | YES |
| Copilot tenant isolation | YES |

---

**END OF WORKSPACE FUNCTIONALIZATION DISCOVERY**
