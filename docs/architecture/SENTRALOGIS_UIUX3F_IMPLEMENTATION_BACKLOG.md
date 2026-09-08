# SENTRALOGIS — UI/UX-3F
# IMPLEMENTATION BACKLOG

**Date:** 2026-09-01  

---

## P0 — Critical

| ID | Item | Screen | Persona | Capability | Dependency | Backend Required | ADR Required |
|----|------|--------|---------|------------|------------|-----------------|--------------|
| P0-01 | Engagement CRUD UI | Commercial | CS/Sales | `commercial_work_orders` | None | No | No |
| P0-02 | Customer-scoped APIs | Customer Portal | Customer | Customer relationship | None | **YES** | No |
| P0-03 | Vendor-scoped APIs | Vendor Portal | Vendor | Vendor relationship | None | **YES** | No |
| P0-04 | Customer role permissions | Auth | Customer | Role definitions | None | **YES** | No |
| P0-05 | Vendor role permissions | Auth | Vendor | Role definitions | None | **YES** | No |

---

## P1 — Core Experience

| ID | Item | Screen | Persona | Capability | Dependency | Backend Required | ADR Required |
|----|------|--------|---------|------------|------------|-----------------|--------------|
| P1-01 | SO line item editor | SO Detail | CS/Sales | `sales_order_items` | P0-01 | **YES** | No |
| P1-02 | Customer Success workspace | CS | CS | Aggregates | P0-02 | No | No |
| P1-03 | Real-time dashboard data | All | All | APIs | Existing | No | No |
| P1-04 | Invoice creation UI | Finance | Finance | `fin_invoices` | None | **YES** | No |
| P1-05 | Payment recording UI | Finance | Finance | `fin_payments` | None | **YES** | No |
| P1-06 | AR aging view | Finance | Finance | `fin_ar_ap` | None | **YES** | No |
| P1-07 | Reconciliation UI | Finance | Finance | `fin_reconciliation_records` | None | **YES** | No |
| P1-08 | Assignment workflow | Operations | Ops | `job_orders` | None | **YES** | No |
| P1-09 | Forwarding execution UI | Operations | Ops | `shp_shipments` | None | No | No |
| P1-10 | Customs declaration UI | Operations | Ops | `cus_declarations` | None | No | No |

---

## P2 — Enhancement

| ID | Item | Screen | Persona | Capability | Dependency | Backend Required | ADR Required |
|----|------|--------|---------|------------|------------|-----------------|--------------|
| P2-01 | Smart Tutorial engine | All | All | Contextual guidance | None | **YES** | No |
| P2-02 | Proactive Copilot | Intelligence | Mgmt | Event-driven | None | **YES** | No |
| P2-03 | Document management | All | All | Document vault | None | **YES** | No |
| P2-04 | Notification service | All | All | Real-time alerts | None | **YES** | No |
| P2-05 | Mobile optimization | All | All | Responsive | None | No | No |
| P2-06 | External accounting | Finance | Finance | Integration | None | **YES** | No |
| P2-07 | Bank integration | Finance | Finance | Integration | None | **YES** | No |
| P2-08 | Payment gateway | Finance | Finance | Integration | None | **YES** | No |
| P2-09 | Quote analytics | Commercial | CS/Sales | Reporting | None | No | No |
| P2-10 | Margin dashboard | Intelligence | Mgmt | Reporting | None | No | No |

---

## Summary

| Priority | Count | Backend Required | ADR Required |
|----------|-------|-----------------|--------------|
| P0 | 5 | 5 | 0 |
| P1 | 10 | 7 | 0 |
| P2 | 10 | 8 | 0 |
| **Total** | **25** | **20** | **0** |

---

**END OF IMPLEMENTATION BACKLOG**
