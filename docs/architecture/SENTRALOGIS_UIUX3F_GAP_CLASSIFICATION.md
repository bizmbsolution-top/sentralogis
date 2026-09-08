# SENTRALOGIS — UI/UX-3F
# GAP CLASSIFICATION

**Date:** 2026-09-01  

---

## 1. UX-Only Gaps

| ID | Gap | Workspace | Priority | Description |
|----|-----|-----------|----------|-------------|
| UX-01 | Engagement CRUD UI | Commercial | P0 | No engagement list/detail/create pages exist |
| UX-02 | SO line item editor | Commercial | P1 | `sales_order_items` table deferred per U-13 |
| UX-03 | Customer Success workspace | CS | P1 | No dedicated CS workspace |
| UX-04 | Real-time data integration | All | P1 | Dashboard stats are static |
| UX-05 | Mobile optimization | All | P2 | Desktop-first layouts |
| UX-06 | Smart Tutorial | All | P2 | No tutorial engine exists |

---

## 2. Existing Backend Capability (Not Exposed in UI)

| ID | Capability | Workspace | UI Gap |
|----|-----------|-----------|--------|
| EB-01 | `commercial_work_orders` API | Commercial | Engagement UI |
| EB-02 | `sales_orders` API | Commercial | SO line items |
| EB-03 | `fulfillments` API | Commercial | Fulfillment detail |
| EB-04 | `shp_shipments` API | Operations | Real-time tracking |
| EB-05 | `job_orders` API | Operations | Assignment workflow |
| EB-06 | `fin_invoices` API | Finance | Invoice creation |
| EB-07 | `fin_payments` API | Finance | Payment recording |
| EB-08 | `pricing_rates` API | Commercial | Rate selection |
| EB-09 | `pricing_price_overrides` API | Commercial | Override workflow |

---

## 3. Missing Backend Capability

| ID | Capability | Workspace | Priority | Description |
|----|-----------|-----------|----------|-------------|
| MB-01 | Customer-scoped APIs | Customer Portal | P0 | APIs filtered by customer relationship |
| MB-02 | Vendor-scoped APIs | Vendor Portal | P0 | APIs filtered by vendor relationship |
| MB-03 | Smart Tutorial engine | All | P2 | Contextual guidance system |
| MB-04 | Proactive Copilot | Intelligence | P2 | Event-driven intelligence |
| MB-05 | Document management | All | P2 | Document vault + workflow |
| MB-06 | Notification service | All | P2 | Real-time notifications |

---

## 4. Authorization Gaps

| ID | Gap | Workspace | Priority |
|----|-----|-----------|----------|
| AG-01 | Customer role permissions | Customer Portal | P0 |
| AG-02 | Vendor role permissions | Vendor Portal | P0 |
| AG-03 | Driver role permissions | Driver Portal | P1 |

---

## 5. Data Gaps

| ID | Gap | Workspace | Priority |
|----|-----|-----------|----------|
| DG-01 | Customer-scoped queries | Customer Portal | P0 |
| DG-02 | Vendor-scoped queries | Vendor Portal | P0 |
| DG-03 | Real-time aggregates | Intelligence | P1 |

---

## 6. Integration Gaps

| ID | Gap | Workspace | Priority |
|----|-----|-----------|----------|
| IG-01 | External accounting | Finance | P2 |
| IG-02 | Bank integration | Finance | P2 |
| IG-03 | Payment gateway | Finance | P2 |

---

## 7. Architectural Gaps

**None discovered.** The existing architecture is sound and supports the required functionality.

---

## 8. New ADRs Required

**None required.** Existing ADRs (018-069) govern all needed architecture.

---

**END OF GAP CLASSIFICATION**
