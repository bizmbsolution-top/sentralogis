# SENTRALOGIS — PHASE UI/UX-3J
# AUTHORIZATION MATRIX

**Date:** 2026-09-01  

---

| Persona | Resource | Read | Create | Update | Approve | Execute | Financial Visibility | Current State |
| ------- | -------- | ---- | ------ | ------ | ------- | ------- | -------------------- | ------------- |
| Commercial | Engagement | YES | YES | YES | NO | NO | NO | UI exists |
| Commercial | Quote | YES | YES | YES | NO | NO | NO | UI exists |
| Commercial | Sales Order | YES | YES | YES | NO | NO | NO | UI exists |
| Commercial | Fulfillment | YES | YES | NO | NO | NO | NO | UI exists |
| Customer Success | Customer portfolio | YES | NO | NO | NO | NO | NO | Scoped API needed |
| Customer Success | Orders | YES | NO | NO | NO | NO | NO | Scoped API needed |
| Customer Success | Shipments | YES | NO | NO | NO | NO | NO | Scoped API needed |
| Customer Success | Exceptions | YES | NO | NO | NO | NO | NO | Backend needed |
| Operations | Work queue | YES | NO | YES | NO | NO | NO | UI exists |
| Operations | WO | YES | YES | YES | NO | NO | NO | UI exists |
| Operations | JO | YES | YES | YES | NO | YES | NO | UI exists |
| Operations | Shipment | YES | YES | YES | NO | NO | NO | UI exists |
| Finance | Invoice | YES | YES | YES | YES | NO | YES | Backend needed |
| Finance | AR | YES | NO | NO | NO | NO | YES | Backend needed |
| Finance | AP | YES | NO | NO | NO | NO | YES | Backend needed |
| Finance | Payment | YES | YES | YES | YES | NO | YES | Backend needed |
| Finance | Settlement | YES | YES | NO | NO | NO | YES | Backend needed |
| Control Tower | All domains | YES | NO | NO | NO | NO | YES | UI exists |
| Customer | Own orders | YES | NO | NO | NO | NO | PARTIAL | Scoped API needed |
| Customer | Own shipments | YES | NO | NO | NO | NO | NO | Scoped API needed |
| Customer | Own documents | YES | NO | NO | NO | NO | NO | Scoped API needed |
| Customer | Own invoices | YES | NO | NO | NO | NO | PARTIAL | Scoped API needed |
| Vendor | Own assignments | YES | NO | YES | NO | YES | NO | Scoped API needed |
| Vendor | Own jobs | YES | NO | YES | NO | YES | NO | Scoped API needed |
| Vendor | Own documents | YES | NO | NO | NO | NO | NO | Scoped API needed |

---

**Key Gaps:**

| Gap | Persona | Required Change |
|-----|---------|-----------------|
| Customer-scoped queries | Customer | New API + permissions |
| Vendor-scoped queries | Vendor | New API + permissions |
| Financial visibility | Customer/Vendor | Scoped financial APIs |

---

**END OF AUTHORIZATION MATRIX**
