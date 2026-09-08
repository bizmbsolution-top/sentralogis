# SENTRALOGIS — UI/UX-2
# IMPLEMENTATION ROADMAP

**Date:** 2026-09-01  

---

## Phase UI/UX-1: DISCOVERY (COMPLETE)

All deliverables produced.

---

## Phase UI/UX-2: DESIGN (COMPLETE)

All 9 deliverables produced.

---

## Phase UI/UX-3: IMPLEMENTATION (FUTURE)

### Sprint 1: Foundation

| Task | Description | Priority |
|------|-------------|----------|
| App shell | Global nav, top bar, workspace shell | CRITICAL |
| Routing | New route structure | CRITICAL |
| Foundation components | Button, Input, Table, Card, Badge | HIGH |
| Empty/loading states | Skeleton, Spinner, EmptyState | HIGH |

### Sprint 2: Commercial Core

| Task | Description | Priority |
|------|-------------|----------|
| Engagement workspace | List, detail, create | CRITICAL |
| SO workspace | Detail with line items | CRITICAL |
| SO line items | Line item editor | HIGH |
| Quote conversion | Quote → SO flow | HIGH |

### Sprint 3: Commercial Flows

| Task | Description | Priority |
|------|-------------|----------|
| Direct order | Direct order wizard | HIGH |
| Regular order | Regular order wizard | MEDIUM |
| Multi-capability | Multi-line SO editor | HIGH |

### Sprint 4: Fulfillment & Operations

| Task | Description | Priority |
|------|-------------|----------|
| Fulfillment workspace | Composition + progress | HIGH |
| Shipment tracking | Unified tracking view | HIGH |
| Operations work queue | Cross-SBU queue | MEDIUM |

### Sprint 5: Financial

| Task | Description | Priority |
|------|-------------|----------|
| Invoice workspace | Create, send, track | HIGH |
| Payment workspace | Record, allocate | HIGH |
| AR/AP views | Receivables/payables | MEDIUM |

### Sprint 6: Intelligence & Polish

| Task | Description | Priority |
|------|-------------|----------|
| Control tower | Cross-domain visibility | MEDIUM |
| Margin dashboard | Profitability views | MEDIUM |
| Mobile responsive | Tablet + mobile | MEDIUM |
| Design system polish | Standardization | LOW |

---

## Phase UI/UX-4: TEST (FUTURE)

| Layer | Coverage |
|-------|----------|
| Unit | Component behavior |
| Integration | UI → API → domain |
| Workflow | End-to-end flows |
| Regression | 1255/1255 baseline |

---

## Phase UI/UX-5: FORENSIC GATE (FUTURE)

| Gate | Criteria |
|------|----------|
| Architecture alignment | All screens match canonical |
| Security | Zero browser-direct writes |
| Regression | 1255/1255 PASS |
| Mobile | Key workflows work |

---

## Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | HIGH | Follow canonical architecture |
| Legacy resistance | MEDIUM | Clear deprecation timeline |
| Mobile complexity | MEDIUM | Prioritize key workflows |

---

## Explicit Non-Goals

```
Pricing engine changes — FORBIDDEN
Payment engine changes — FORBIDDEN
Financial engine changes — FORBIDDEN
New domain creation — FORBIDDEN
Legacy decommissioning — FORBIDDEN
```

---

**END OF IMPLEMENTATION ROADMAP**
