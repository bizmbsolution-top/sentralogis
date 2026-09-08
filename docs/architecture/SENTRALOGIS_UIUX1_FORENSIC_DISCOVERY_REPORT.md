# SENTRALOGIS — PHASE UI/UX-1
# FORENSIC DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** COMPLETE  
**Phase:** UI/UX-1 — Discovery  

---

## 1. Current UI Inventory

### 1.1 Commercial Routes (`/commercial/`)

| Route | Status | Data |
|-------|--------|------|
| `/commercial/pipeline` | ACTIVE (mixed) | crm_deals + mock fallback |
| `/commercial/leads` | ACTIVE | Real (md_entities, crm_activities) |
| `/commercial/rates` | ACTIVE | Real (crm_sbu_customer_rates) |
| `/commercial/calendar` | ACTIVE | Real (crm_activities) |
| `/commercial/quotations/[id]` | ACTIVE | Real (crm_quotations) |
| `/commercial/sales-orders` | ACTIVE | Real (REST API) |
| `/commercial/sales-orders/create` | ACTIVE | Real (REST API) |
| `/commercial/sales-orders/[id]` | ACTIVE | Real (REST API) |
| `/commercial/sales-orders/[id]/fulfillment` | ACTIVE | Real (REST API) |
| `/commercial/control-tower` | ACTIVE | Real (REST API) |
| `/commercial/control-tower/[id]` | ACTIVE | Real (REST API) |

### 1.2 Operations/SBU Routes

| SBU | Routes | Status |
|-----|--------|--------|
| Forwarding | 14 routes | 11 ACTIVE, 3 MOCK |
| Trucking | 22 routes | 19 ACTIVE, 3 MOCK |
| Customs | 3 routes | 3 ACTIVE |
| Warehouse | 24 routes | 22 ACTIVE, 2 MOCK |

### 1.3 Financial Routes

| Area | Status |
|------|--------|
| HQ Finance (Summary, Cost Audit, Ledger, Payroll, Tax, COA) | PRODUCTION |
| Customer Invoice | PRODUCTION |
| Vendor Invoice | PRODUCTION |
| Trucking Finances | PRODUCTION |
| Forwarding Finances | MOCK |
| Warehouse Finances | MOCK |
| Forwarding Price Master | PRODUCTION |
| Warehouse Billing/Contracts | PRODUCTION |

---

## 2. Domain Mapping

| Existing UI | Current Concept | Canonical Concept | Status |
|-------------|----------------|-------------------|--------|
| `/commercial/pipeline` | Sales pipeline (deals) | Engagement workspace | COMPATIBLE |
| `/commercial/quotations` | Quote builder | Quote (optional) | CANONICAL |
| `/commercial/sales-orders` | SO list/detail | Sales Order | CANONICAL |
| `/sbu/forwarding/wo` | Forwarding WO list | Operational execution | LEGACY |
| `/sbu/forwarding/work-queue` | Forwarding work queue | Operational execution | COMPATIBLE |
| `/sbu/trucking/work-orders` | Trucking WO list | Operational execution | LEGACY |
| `/sbu/trucking/assignments` | JO assignments | Operational execution | LEGACY |
| `/hq/work-orders` | HQ WO creation | Operational execution | LEGACY |
| `/hq/finance/cost-audit` | Cost audit hub | Financial | CANONICAL |

---

## 3. Legacy UX Anti-Patterns

| Anti-Pattern | Location | Severity |
|--------------|----------|----------|
| SBU-first navigation | Root nav | HIGH |
| Browser-direct mutations | Trucking, Warehouse, Forwarding WO | HIGH |
| WO as commercial root | HQ/SBU WO pages | MEDIUM |
| JO as customer-facing | Driver portal, tracking | MEDIUM |
| No engagement UI | Commercial section | HIGH |
| No SO line items | SO detail | MEDIUM |
| Two UI shells | `/app/(dashboard)/sbu/` + `/app/sbu/` | MEDIUM |
| Mock financial pages | Forwarding/Warehouse finances | LOW |

---

## 4. Security/Authority Findings

| Finding | Severity |
|---------|----------|
| Browser-direct `supabase.from()` writes in Trucking/Warehouse/Forwarding WO | HIGH |
| No engagement creation UI | MEDIUM |
| SO line items not editable | MEDIUM |

---

## 5. Workflow Findings

| Flow | Status |
|------|--------|
| Quote → SO | PARTIAL (no price copy) |
| Direct Order → SO | MISSING |
| Regular Order → SO | MISSING |
| Multi-SBU Order | PARTIAL (capability selection exists) |
| Fulfillment → Shipment | OPERATIONAL |
| Financial → Payment | PARTIAL |

---

## 6. Mobile Findings

| Workflow | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Create order | YES | PARTIAL | POOR |
| Review SO | YES | YES | POOR |
| Approve override | YES | YES | POOR |
| Fulfillment status | YES | YES | POOR |

---

## 7. Reuse Candidates

| Component | Reusable |
|-----------|----------|
| `ControlTowerWorkspace` | YES |
| `ExecutionHealthBar` | YES |
| `FulfillmentPlanCard` | YES |
| `ExceptionsPanel` | YES |
| `OperationalTimeline` | YES |
| `CustomerProjectionView` | YES |
| Sidebar navigation | PARTIAL |
| Status badges | YES |

---

## 8. Retirement Candidates

| Screen | Reason |
|--------|--------|
| `/commercial/pipeline` (deal-based) | Replace with engagement workspace |
| SBU-first root navigation | Replace with commercial-first |
| `/sbu/forwarding/wo` (WO list) | Replace with work queue |

---

## 9. UX Risks

| Risk | Impact |
|------|--------|
| No engagement concept visible | Users don't understand commercial root |
| SBU-first navigation | Violates commercial-first principle |
| Browser-direct writes | Security risk |
| Fragmented financial UI | Inconsistent experience |

---

## 10. Architecture Implications

1. **Engagement UI must be created** — No engagement workspace exists
2. **SO line items UI needed** — Current SO has no line items
3. **Commercial-first navigation required** — Current is SBU-first
4. **Browser writes must move server-side** — Security risk
5. **Regular order flow needed** — Recurring business not supported

---

**END OF FORENSIC DISCOVERY REPORT**
