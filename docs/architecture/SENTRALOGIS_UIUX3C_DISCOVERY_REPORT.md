# SENTRALOGIS — UI/UX-3C
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** GREEN — UI/UX-3C READY FOR DESIGN  
**Phase:** UI/UX-3C — Discovery  

---

## 1. Executive Decision

**PHASE UI/UX-3C: GREEN — UI/UX-3C READY FOR DESIGN**

The existing Copilot implementation is substantial and production-ready. Persona workspaces can be built on top of it without duplicating intelligence authority. External visibility (customer/vendor) requires careful boundary enforcement.

---

## 2. Persona Model

| Persona | Primary Workspace | Copilot Capability |
|---------|-------------------|--------------------|
| Commercial / Sales | Commercial | Quote analysis, Customer insights, Pricing recommendations |
| Customer Success | Customer Success | Order status, Exception management, SLA tracking |
| Operations | Operations | Shipment tracking, Execution status, Resource assignment |
| Finance | Financial | Invoice status, Payment matching, Reconciliation |
| Control Tower | Intelligence | Cross-domain visibility, Exception prioritization |
| Customer | Customer Portal | Order tracking, Document access, Support |
| Vendor / Partner | Partner Portal | Assignment status, POD submission, Performance |
| Admin | Administration | User management, Configuration |

---

## 3. Commercial Workspace

| Feature | Existing Backend | Status |
|---------|-----------------|--------|
| Customer list | `md_entities` | EXISTS |
| Engagements | `commercial_work_orders` | EXISTS |
| Quotes | `crm_quotations` | EXISTS |
| Sales Orders | `sales_orders` | EXISTS |
| SO Line Items | `sales_order_items` | DEFERRED (5C-3) |
| Pricing | `lib/pricing/` | EXISTS |

**UX Entry Modes:**
- New Quote (optional)
- Direct Order → SO
- Regular Order → SO
- From Existing Quote → SO

---

## 4. Customer Success Workspace

| Feature | Existing Backend | Status |
|---------|-----------------|--------|
| Customer portfolio | `md_entities` | EXISTS |
| Active orders | `sales_orders` | EXISTS |
| Shipments | `shp_shipments` | EXISTS |
| Exceptions | Control Tower | EXISTS |
| Documents | Future | GAP |

---

## 5. Operations Workspace

| Feature | Existing Backend | Status |
|---------|-----------------|--------|
| Work queue | `shp_shipments`, `job_orders` | EXISTS |
| Forwarding | `fw_*` tables | EXISTS |
| Trucking | `job_orders`, `wo_items` | EXISTS |
| Customs | `cus_declarations` | EXISTS |
| Warehouse | `wh_*` tables | EXISTS |

**SBU appears contextually within Operations, not as separate root.**

---

## 6. Finance Workspace

| Feature | Existing Backend | Status |
|---------|-----------------|--------|
| Invoices | `fin_invoices`, `invoices` | EXISTS |
| AR/AP | `fin_ar_ap` | EXISTS |
| Payments | `fin_payments` | EXISTS |
| Settlements | `fin_settlements` | EXISTS |
| Reconciliation | `fin_reconciliation_records` | EXISTS |
| Adjustments | `fin_adjustments` | EXISTS |

---

## 7. Control Tower / Intelligence

| Feature | Existing Backend | Status |
|---------|-----------------|--------|
| Operational health | Aggregates | EXISTS |
| Exceptions | Control Tower | EXISTS |
| SLA tracking | `shp_shipments` | EXISTS |
| Margin | `lib/pricing/` + `lib/financial/` | EXISTS |

---

## 8. Customer Visibility

| Data | Visible? | Boundary |
|------|----------|----------|
| Own orders | YES | Customer ID match |
| Own shipments | YES | Customer ID match |
| Tracking | YES | Token-based public |
| Documents | YES | Customer-scoped |
| Invoices | YES | Customer-scoped |
| Internal pricing | NEVER | Margin hidden |
| Internal notes | NEVER | Staff-only |
| Other customers' data | NEVER | RLS enforced |

---

## 9. Vendor / Partner Visibility

| Data | Visible? | Boundary |
|------|----------|----------|
| Assignments | YES | Vendor ID match |
| Jobs | YES | Vendor ID match |
| Shipments | YES | Vendor ID match |
| Documents | YES | Vendor-scoped |
| POD submission | YES | Operational |
| Performance | YES | Vendor-scoped |
| Internal costs | NEVER | Margin hidden |
| Other vendors' data | NEVER | RLS enforced |

---

## 10. Multi-Persona Model

| Concept | Implementation |
|---------|----------------|
| Persona | UX presentation layer |
| Workspace | Navigation context |
| Role | Backend authorization |
| Tenant | IdentityContext |
| SBU | Capability dimension |

**ONE shell, MULTIPLE persona experiences.**

---

## 11. Mobile Priorities

| Priority | Workflow |
|----------|----------|
| HIGH | Command, My Work, Notifications |
| HIGH | Shipment tracking |
| HIGH | Exception handling |
| MEDIUM | Approve override |
| LOW | Pricing management |

---

## 12. Legacy UX Classification

| Screen | Classification | Action |
|--------|---------------|--------|
| Old sidebar (role-based) | LEGACY | REPLACE with workspace-aware |
| `/commercial/pipeline` (deal-based) | LEGACY | REPLACE with engagement workspace |
| SBU-first menus | ANTI-PATTERN | REPLACE with operations workspace |
| `/sbu/forwarding/wo` | LEGACY | REPLACE with work queue |
| `/sbu/trucking/work-orders` | LEGACY | REPLACE with operations workspace |
| `/hq/work-orders` | LEGACY | REPLACE with operations workspace |
| Mock financial pages | MOCK | REPLACE with real financial UI |

---

## 13. Security Findings

| Check | Status |
|-------|--------|
| IdentityContext authoritative | PASS |
| Tenant isolation | PASS |
| No client tenant authority | PASS |
| No browser-direct privileged mutation | PASS |
| Copilot authorization | PASS |
| Copilot tenant isolation | PASS |

---

## 14. Architecture Invariants

| Invariant | Status |
|-----------|--------|
| ONE application shell | PASS (UI/UX-3A) |
| ONE Copilot engine | PASS (`src/platforms/copilot/`) |
| ONE identity authority | PASS |
| ONE authorization authority | PASS |
| No duplicate business authority | PASS |

---

**END OF UI/UX-3C DISCOVERY REPORT**
