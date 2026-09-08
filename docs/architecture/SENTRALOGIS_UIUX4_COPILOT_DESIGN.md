# SENTRALOGIS — UI/UX-4 DESIGN
# COPILOT DESIGN

**Date:** 2026-09-02  

---

## 1. Design Philosophy

**Copilot = Contextual Intelligence**

- Proactive, not reactive
- Actionable, not just informative
- Embedded, not separate
- Learning, not static

---

## 2. Copilot Modes

### 2.1 Command Center Copilot

```
┌─────────────────────────────────────────────────────────┐
│  COPILOT RECOMMENDATIONS                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 "3 shipments at risk. View recommended       │   │
│  │    actions."                                     │   │
│  │    [View] [Dismiss]                              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 "Customer BYD has 2 overdue invoices.        │   │
│  │    Send reminder?"                               │   │
│  │    [Send] [Dismiss]                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Workspace Copilot

```
┌─────────────────────────────────────────────────────────┐
│  COPILOT                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 "This shipment is delayed 26h. Common        │   │
│  │    causes: port congestion, customs hold.        │   │
│  │    Would you like to:                            │   │
│  │    • Notify customer                             │   │
│  │    • Escalate to operations                      │   │
│  │    • View alternative routes"                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Global Copilot Panel

```
┌─────────────────────────────────────────────────────────┐
│  COPILOT                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ You: "Show me all shipments at risk"             │   │
│  │ Copilot: "Found 3 shipments at risk:             │   │
│  │    • SHP-001: Delayed 26h (BYD)                  │   │
│  │    • SHP-003: Customs hold (Tesla)               │   │
│  │    • SHP-005: SLA approaching (NIO)              │   │
│  │    Would you like to take action?"               │   │
│  └─────────────────────────────────────────────────┘   │
│  [Type a message...]                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Copilot Capabilities

### 3.1 Proactive Recommendations

| Trigger | Recommendation |
|---------|---------------|
| Shipment delayed | Notify customer, escalate, view alternatives |
| SLA approaching | Prioritize, reassign, expedite |
| Exception created | Suggest resolution, assign owner |
| Document missing | Request from customer, set reminder |
| Payment overdue | Send reminder, escalate to finance |

### 3.2 Natural Language Queries

| Query | Response |
|-------|----------|
| "Show me all shipments at risk" | Filtered list with risk indicators |
| "What's the status of SO-001?" | Order summary with fulfillment progress |
| "Who owns this exception?" | Owner with contact info |
| "How many jobs are pending?" | Count with breakdown by type |

### 3.3 Action Execution

| Action | Copilot Role |
|--------|-------------|
| Create fulfillment | Guide through creation flow |
| Assign exception | Suggest owner based on workload |
| Send notification | Draft message, confirm before send |
| Generate report | Compile data, format output |

---

## 4. Copilot UI Components

### 4.1 Recommendation Card

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Recommendation                                       │
│ 3 shipments at risk                                     │
│ [View] [Dismiss]                                        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Context Panel

```
┌─────────────────────────────────────────────────────────┐
│ COPILOT                                                 │
│                                                         │
│ Context: Shipment SHP-001                               │
│ Customer: BYD Indonesia                                 │
│ Status: IN_TRANSIT                                      │
│ Risk: Delayed 26h                                       │
│                                                         │
│ Suggested Actions:                                      │
│ • Notify customer                                       │
│ • Escalate to operations                                │
│ • View alternative routes                               │
│                                                         │
│ [Ask Copilot...]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Copilot Integration Points

| Location | Integration |
|----------|-------------|
| Command Center | Proactive recommendations |
| Order Workspace | Contextual insights |
| Shipment Workspace | Risk analysis |
| Exception Workspace | Resolution suggestions |
| Global | Chat panel, search |

---

## 6. Copilot Constraints

- Copilot NEVER executes actions without user confirmation
- Copilot NEVER reveals data beyond user's permissions
- Copilot NEVER modifies commercial terms
- Copilot NEVER accesses protected systems directly

---

**END OF COPILOT DESIGN**
