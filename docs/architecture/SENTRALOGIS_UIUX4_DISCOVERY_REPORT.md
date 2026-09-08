# SENTRALOGIS — PHASE UI/UX-4
# DISCOVERY REPORT

**Date:** 2026-09-02  
**Status:** GREEN — DISCOVERY COMPLETE  
**Phase:** UI/UX-4 — Forensic Discovery  

---

## 1. Executive Summary

**UI/UX-4 STATUS: GREEN**

The current SENTRALOGIS UI is **module-centric** (organized by SBU: Trucking, Forwarding, Customs, Warehouse). The redesign must shift to **business-object + lifecycle-centric** UX where users think in terms of Orders → Fulfillment → Shipment → Execution → Completion rather than SBU modules.

**Key Finding:** The existing UI structure reflects the legacy organizational model. The canonical backend architecture (Phase 5A-5D, TOKEN-1-4) supports the target model. The UX must now catch up.

---

## 2. Current-State UX

### 2.1 Application Shell

| Component | Purpose |
|-----------|---------|
| `AppShell.tsx` | Main shell with workspace context |
| `Sidebar.tsx` | Workspace-aware navigation |
| `TopBar.tsx` | Top navigation with workspace switcher |
| `TopNavbar.tsx` | Alternative top navigation |
| `CommandCenter.tsx` | Global search + command surface |
| `AppLauncher.tsx` | Workspace app grid |
| `MyWork.tsx` | Personalized work aggregation |
| `CopilotPanel.tsx` | AI assistant panel |
| `ProfileDropdown.tsx` | User menu |

### 2.2 Dashboard Sections (Current)

| Section | Route | Purpose |
|---------|-------|---------|
| Commercial | `/commercial` | Customers, Engagements, Quotes, Sales Orders, Fulfillments |
| Operations | `/operations` | Cross-SBU operational view |
| SBU Trucking | `/sbu/trucking` | Trucking-specific UI |
| SBU Forwarding | `/sbu/forwarding` | Forwarding-specific UI |
| SBU Clearance | `/sbu/clearance` | Customs-specific UI |
| SBU Warehouse | `/sbu/warehouse` | Warehouse-specific UI |
| HQ | `/hq` | Headquarters master data, work orders |
| Finance | `/finance` | Financial management |
| Intelligence | `/intelligence` | Analytics and visibility |
| Reporting | `/reporting` | Reports |
| Driver | `/driver` | Driver portal |
| Portal | `/portal` | External portals |
| Admin | `/admin` | Administration |
| Owner | `/owner` | Owner dashboard |
| Director | `/director` | Director dashboard |
| Tenant | `/tenant` | Tenant management |
| Governance | `/governance` | Governance |
| Copilot | `/copilot` | Copilot interface |

### 2.3 Navigation Model

**Current:** Module-centric sidebar with SBU sections
**Target:** Business-object + lifecycle-centric navigation

---

## 3. Architectural Alignment

### 3.1 Canonical Backend (Source of Truth)

| Domain | Canonical Model |
|--------|-----------------|
| Commercial | Engagement → Sales Order → Fulfillment |
| Operations | Shipment → Execution → Completion |
| Finance | Receivable → Payment → Settlement → Accounting |
| Intelligence | Visibility → Risk → Exception → Analytics |
| Token | Service consumption → Token ledger |

### 3.2 UX Must Reflect Backend

The UX must organize around:
1. **Work** (what needs to be done)
2. **Orders** (commercial commitments)
3. **Fulfillment** (composition)
4. **Shipments** (operational movements)
5. **Execution** (operational work)
6. **Exceptions** (what needs attention)
7. **Customers** (relationships)
8. **Finance** (monetary)
9. **Intelligence** (visibility)
10. **Copilot** (AI assistance)

---

## 4. Persona Findings

| Persona | Current Experience | Target Experience |
|---------|-------------------|-------------------|
| Executive | Scattered dashboards | Unified Command Center with business health |
| Central Operations | Module switching | Cross-SBU work queue + exceptions |
| SBU Operator | SBU-specific silos | Assigned work + execution context |
| Customer | Limited portal | Order → Fulfillment → Shipment → Milestones |
| Vendor | Basic portal | Assignments → Execution → Evidence → Completion |
| Super Admin | Admin sections | Tenant governance + platform health |

---

## 5. Business-Object Model

| Object | Lifecycle | Key States |
|--------|-----------|------------|
| Engagement | ACTIVE → COMPLETED | Draft, Active, Completed |
| Sales Order | DRAFT → FULFILLED | Draft, Confirmed, In Fulfillment, Fulfilled, Closed |
| Fulfillment | PLANNED → FULFILLED | Planned, Active, Partially Fulfilled, Fulfilled |
| Shipment | DRAFT → COMPLETED | Draft, Planned, Booked, In Transit, Delivered, Completed |
| Execution | PENDING → COMPLETED | Pending, Assigned, In Progress, Completed |
| Exception | OPEN → RESOLVED | Open, Acknowledged, Resolved, Waived |

---

## 6. Lifecycle Model

```
Order → Fulfillment → Shipment → Execution → Completion
   ↓         ↓           ↓          ↓           ↓
Commercial  Compose    Move        Do          Done
```

---

## 7. Navigation Findings

**Current:** SBU-first (Trucking, Forwarding, Customs, Warehouse)
**Target:** Business-object first (Work, Orders, Fulfillment, Shipments, Exceptions)

Capabilities appear contextually inside the lifecycle.

---

## 8. Command Center Findings

**Current:** Search + commands + app launcher
**Target:** Attention-centric (what needs my attention now)

---

## 9. Fulfillment UX

**Current:** Separate from commercial orders
**Target:** Central composition experience bridging commercial and operations

---

## 10. Shipment UX

**Current:** Fragmented across forwarding/trucking
**Target:** Unified shipment workspace with service scope, execution legs, milestones

---

## 11. Exception UX

**Current:** Discovered by opening modules
**Target:** First-class exception experience with impact, owner, SLA, resolution

---

## 12. Copilot UX

**Current:** Chat panel
**Target:** Operational decision layer (intent → context → validation → planning → explainability → response)

---

## 13. Customer UX

**Current:** Limited portal
**Target:** Order → Fulfillment → Shipment → Milestones → Documents → Exceptions

---

## 14. Vendor/Partner UX

**Current:** Basic portal
**Target:** Assignments → Execute → Evidence → Complete

---

## 15. ERP Integration UX

**Current:** Not supported
**Target:** ERP reference visible without duplicating ERP workflows

---

## 16. Mobile UX

**Current:** Desktop-first
**Target:** Mobile-first for operations (assignment, execution, evidence, exception, approval)

---

## 17. Design System Findings

| Element | Current | Recommendation |
|---------|---------|----------------|
| Typography | Tailwind defaults | Keep, minor refinements |
| Spacing | Tailwind defaults | Keep |
| Color | Status-based | Keep, extend for lifecycle states |
| Cards | Consistent | Keep |
| Tables | Sortable, filterable | Keep |
| Dialogs | Modal/drawer | Keep |
| Command bars | Existing | Keep |
| Status badges | Color-coded | Keep, extend |
| Empty states | Present | Keep |
| Loading states | Spinner | Keep |
| Error states | Alert | Keep |

---

## 18. Current Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Module-centric navigation | Users think in SBUs, not business objects | HIGH |
| No unified work queue | Operators miss cross-SBU work | HIGH |
| No exception aggregation | Exceptions discovered too late | HIGH |
| Limited customer visibility | Customers call for status | MEDIUM |
| Limited vendor visibility | Vendor inefficiency | MEDIUM |
| No ERP integration | ERP-led enterprises cannot adopt | MEDIUM |
| Desktop-first mobile | Field operations impaired | MEDIUM |

---

## 19. Contradictions

None discovered. The current UI is consistent with the legacy model but misaligned with the canonical backend architecture.

---

## 20. Recommendations

| # | Recommendation | Priority |
|---|----------------|----------|
| 1 | Redesign navigation around business objects | HIGH |
| 2 | Create unified Command Center (attention-centric) | HIGH |
| 3 | Build cross-SBU work queue | HIGH |
| 4 | Aggregate exceptions across domains | HIGH |
| 5 | Unify shipment workspace | MEDIUM |
| 6 | Build customer portal | MEDIUM |
| 7 | Build vendor portal | MEDIUM |
| 8 | Add ERP integration references | MEDIUM |
| 9 | Mobile-first operational workflows | MEDIUM |
| 10 | Evolve Copilot to operational decision layer | LOW |

---

**END OF DISCOVERY REPORT**
