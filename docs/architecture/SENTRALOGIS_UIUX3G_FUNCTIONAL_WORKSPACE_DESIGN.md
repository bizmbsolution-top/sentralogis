# SENTRALOGIS — UI/UX-3G
# FUNCTIONAL WORKSPACE DESIGN

**Date:** 2026-09-01  

---

## 1. UX Architecture

### Core Principle

> **PERSONA → WORK → CONTEXT → CAPABILITY → ACTION**

The application is an **operating environment**, not a collection of CRUD modules.

### Experience Layers

```
INTELLIGENCE → COMMERCIAL → FULFILLMENT → EXECUTION → FINANCIAL
```

### Workspace Model

| Workspace | Entry Question |
|----------|---------------|
| Commercial | What commercial commitments need attention? |
| Customer Success | Which customers need my attention? |
| Operations | What must be executed, monitored, or escalated? |
| Finance | What financial work requires action? |
| Control Tower | What is happening across the operation? |
| Customer Portal | Where is my shipment? |
| Vendor Portal | What work is assigned to me? |

---

## 2. Persona Model

| Persona | Primary Workspace | Secondary |
|---------|-------------------|-----------|
| Commercial / Sales | Commercial | Customer Success |
| Customer Success | Customer Success | Control Tower |
| Operations | Operations | — |
| SBU Trucking | Operations → Trucking | — |
| SBU Forwarding | Operations → Forwarding | — |
| Finance | Finance | Control Tower |
| Control Tower | Intelligence | — |
| Customer | Customer Portal | — |
| Vendor | Vendor Portal | — |

---

## 3. Global Experience Model

| Layer | Elements |
|-------|----------|
| Global | Command Center, Search, Copilot, Notifications, Workspace Switcher, Account |
| Workspace | My Work, KPIs, Attention, Recent |
| Contextual | Entity header, Tabs, Actions |
| Command | Command Center intents |

---

## 4. Multi-Persona Model

```
ONE APPLICATION
    ↓
IdentityContext
    ↓
Authorized Roles + Permissions
    ↓
Persona Resolution
    ↓
Workspace Context
    ↓
Authorized Capabilities
```

Workspace switching NEVER elevates privileges.

---

## 5. Entity-Centric Experience

Every major entity opens a **Context Workspace**:

```
Entity
├── Header (identity, status, key metrics)
├── Tabs (overview, lines, fulfillment, financial, documents, timeline, activity)
└── Actions (context-sensitive)
```

---

## 6. Copilot Experience Modes

| Mode | Trigger | Example |
|------|---------|---------|
| Global | Command Center | "Show delayed shipments" |
| Contextual | Inside entity | "Explain this margin" |
| Action | Workflow | "Create fulfillment" |
| Explain | Analysis | "Why was this delayed?" |

---

## 7. Action Safety Model

| State | Description |
|-------|-------------|
| READ | No mutation |
| RECOMMEND | Suggestion only |
| PREPARE | Draft action |
| CONFIRM | Explicit confirmation required |
| EXECUTE | Mutation via canonical service |
| IRREVERSIBLE | Strong confirmation + clear consequences |
| PROHIBITED | Not exposed |

---

**END OF FUNCTIONAL WORKSPACE DESIGN**
