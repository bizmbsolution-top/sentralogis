# SENTRALOGIS — UI/UX-4 DESIGN
# COMMAND CENTER DESIGN

**Date:** 2026-09-02  

---

## 1. Attention Model

The Command Center answers: **"What requires my attention right now?"**

Priority order:
1. **Critical** — Immediate action required
2. **Needs Action** — Pending tasks, approvals
3. **At Risk** — SLA risks, delays
4. **Operational Pulse** — Current state

---

## 2. Information Hierarchy

### Level 1: Critical (Red)
- Shipments delayed > 24h
- Customs holds
- Execution failures
- Critical exceptions

### Level 2: Needs Action (Amber)
- Pending assignments
- Pending approvals
- Missing documents
- Awaiting execution

### Level 3: At Risk (Blue)
- SLA approaching
- Partial fulfillment
- Customer-impacting delays

### Level 4: Operational Pulse (Slate)
- Active shipments
- Today's completions
- Current execution load

---

## 3. Layout

```
┌─────────────────────────────────────────────────────────┐
│  COMMAND CENTER                                         │
├─────────────────────────────────────────────────────────┤
│  CRITICAL                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚨 Shipment SHP-001 delayed 26h                 │   │
│  │    Customer: BYD | Owner: Ops | [View] [Act]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  NEEDS ACTION                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚡ 7 assignments pending                         │   │
│  │    3 approvals | 2 documents | 2 exceptions     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  AT RISK                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ 4 SLA risks | 3 customer-impacting          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  OPERATIONAL PULSE                                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Active    │ │ Today's   │ │ Execution │            │
│  │ Shipments │ │ Completions│ │ Load      │            │
│  │ 24        │ │ 8         │ │ 67%       │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  COPILOT RECOMMENDATIONS                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 "3 shipments at risk. View recommended       │   │
│  │    actions."                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Card Design

### Attention Card

```
┌─────────────────────────────────────────────────────────┐
│ 🚨 Shipment SHP-001 delayed 26h                         │
│ Customer: BYD Indonesia | Owner: Ops                    │
│ Impact: Customer delivery at risk                       │
│ [View Shipment] [Assign Owner] [Mark Resolved]          │
└─────────────────────────────────────────────────────────┘
```

### Metric Card

```
┌─────────────────────────────────────────────────────────┐
│ Active Shipments                                        │
│ 24                                                      │
│ ↑ 3 from yesterday                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Interactions

| Action | Result |
|--------|--------|
| Click attention item | Navigate to detail |
| Click metric | Navigate to filtered list |
| Click recommendation | Execute Copilot action |
| Dismiss item | Temporarily hide (session) |

---

## 6. Role Personalization

| Role | Primary View |
|------|-------------|
| Executive | Financial exposure, customer risk, SLA |
| Central Ops | Cross-SBU work queue, exceptions |
| SBU Operator | Assigned work, execution queue |
| Finance | AR/AP, payments, settlements |
| Customer | Own orders, shipments, documents |
| Vendor | Assignments, jobs, POD |

---

**END OF COMMAND CENTER DESIGN**
