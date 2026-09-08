# SENTRALOGIS — PHASE UI/UX-3K
# REMEDIATION PLAN

**Date:** 2026-09-01  

---

## Gap Registry

| ID | Persona | Severity | Current State | Root Cause | Canonical Authority | Required Change | Frontend Dep | Backend Dep | Auth Dep | Data Dep | Security Risk | Phase |
|----|---------|----------|---------------|------------|---------------------|-----------------|--------------|-------------|----------|----------|---------------|-------|
| GAP-C01 | Customer | P0 | Portal UI with static data | No customer-scoped API | sales_orders | Customer order API | YES | YES | YES | YES | IDOR | 3L |
| GAP-C02 | Customer | P0 | Portal UI with static data | No customer-scoped API | shp_shipments | Customer shipment API | YES | YES | YES | YES | IDOR | 3L |
| GAP-C03 | Customer | P1 | No document visibility | No customer-scoped API | cus_declaration_documents | Customer document API | YES | YES | YES | YES | Leakage | 3L |
| GAP-C04 | Customer | P1 | No financial visibility | No customer-scoped API | fin_invoices | Customer financial API | YES | YES | YES | YES | Leakage | 3L |
| GAP-C05 | Customer | P0 | No role permissions | Customer role undefined | IdentityContext | Add customer role + permissions | NO | NO | YES | NO | Escalation | 3L |
| GAP-V01 | Vendor | P0 | Portal UI with static data | No vendor-scoped API | job_orders | Vendor assignment API | YES | YES | YES | YES | IDOR | 3L |
| GAP-V02 | Vendor | P0 | Portal UI with static data | No vendor-scoped API | shp_shipments | Vendor shipment API | YES | YES | YES | YES | IDOR | 3L |
| GAP-V03 | Vendor | P1 | No POD upload | No upload API | job_orders | POD upload API | YES | YES | YES | YES | Integrity | 3L |
| GAP-V04 | Vendor | P0 | No role permissions | Vendor role undefined | IdentityContext | Add vendor role + permissions | NO | NO | YES | NO | Escalation | 3L |

---

## Remediation Summary

| Category | Count | Items |
|----------|-------|-------|
| P0 | 6 | Customer/Vendor APIs + Roles |
| P1 | 3 | Document, Financial, POD |
| Backend Required | 9 | All gaps |
| Authorization Required | 9 | All gaps |
| New ADR Required | 0 | — |

---

**END OF REMEDIATION PLAN**
