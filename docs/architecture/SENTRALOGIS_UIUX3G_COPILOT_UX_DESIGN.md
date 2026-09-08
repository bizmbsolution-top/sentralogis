# SENTRALOGIS — UI/UX-3G
# COPILOT UX DESIGN

**Date:** 2026-09-01  

---

## 1. Existing Copilot Reuse

### Canonical Engine
```
src/platforms/copilot/engine/CopilotEngine.ts
```

### Pipeline
```
Intent → Context → Validation → Planning → Explainability → Response
```

### Existing Intents
| Intent | Domain | Risk |
|--------|--------|------|
| ASSIGN_DRIVER | Trucking | MEDIUM |
| REPLACE_DRIVER | Trucking | HIGH |
| SHOW_TIMELINE | Cross-domain | LOW |
| CANCEL_JOB | Trucking | HIGH |

---

## 2. Persona → Workspace → Context → Intent

| Persona | Workspace | Context | Example Intent |
|---------|-----------|---------|----------------|
| Commercial | Commercial | Quote | "Analyze this quote margin" |
| Commercial | Commercial | Customer | "What follow-ups are needed?" |
| CS | Customer Success | Order | "Where is this shipment?" |
| Operations | Operations | Shipment | "Why is this delayed?" |
| Operations | Operations | Job | "Assign a driver" |
| Finance | Finance | Invoice | "Show overdue payments" |
| Control Tower | Intelligence | Exception | "What needs attention?" |
| Customer | Customer Portal | Order | "Where is my shipment?" |
| Vendor | Vendor Portal | Job | "What deliveries are assigned?" |

---

## 3. Copilot UX Modes

### Global Copilot
- Trigger: Command Center (�K)
- Scope: Cross-entity search + commands
- Examples: "Find shipment SHP-001", "Show pending approvals"

### Contextual Copilot
- Trigger: Inside entity workspace
- Scope: Current entity context
- Examples: "Explain this margin", "Why delayed?"

### Action Copilot
- Trigger: Workflow action
- Scope: Prepare/execute actions
- Examples: "Create fulfillment", "Assign driver"

### Explain Copilot
- Trigger: User question
- Scope: Analysis + explanation
- Examples: "Why did price change?", "What's the risk?"

---

## 4. Action Model

### States
| State | Description |
|-------|-------------|
| READ | Informational response |
| RECOMMEND | Suggestion only |
| PREPARE | Action constructed |
| CONFIRM | Explicit confirmation required |
| EXECUTE | Mutation via canonical service |
| PROHIBITED | Not exposed |

### Confirmation UI
```
┌─────────────────────────────────────────────┐
│  COPILOT ACTION PROPOSAL                    │
├─────────────────────────────────────────────┤
│  Action: [Describe proposed action]        │
│  Target: [Entity reference]                │
│  Confidence: [X%]                           │
│  Consequences:                              │
│  - [Effect 1]                               │
│  - [Effect 2]                               │
│  Authorization: [Required/Permitted]        │
│                                             │
│  [Review Details]  [Cancel]  [Confirm]      │
└─────────────────────────────────────────────┘
```

---

## 5. Explainability

### Explanation UI
```
Copilot understood:
- Intent: [What user wanted]
- Context: [Data sources used]
- Reasoning: [Logic applied]
- Confidence: [Certainty %]
```

---

## 6. Authorization

| Check | Source |
|-------|--------|
| User identity | UserContext (server) |
| Tenant | TenantContext (server) |
| Permissions | PermissionContext (server) |
| Action permissions | ActionBridge.getRequiredPermissions() |
| Risk level | ActionBridge.getRiskLevel() |

---

## 7. Audit

| Event | Logged |
|-------|--------|
| User input | YES |
| Intent recognized | YES |
| Context used | YES |
| Action proposed | YES |
| Confirmation given | YES |
| Action executed | YES |
| Result | YES |

---

## 8. Failure States

| State | UI Response |
|-------|-------------|
| Intent unclear | Ask clarifying question |
| Insufficient context | Request more info |
| Validation failed | Explain why |
| Authorization denied | Explain + offer escalation |
| Execution failed | Explain + recovery options |

---

## 9. UX Integration Points

| Point | Component |
|-------|-----------|
| Command Center | Copilot search input |
| My Work | Copilot recommendations |
| Context Workspace | Contextual Copilot panel |
| Action forms | Copilot assistance |
| Exceptions | Copilot explanation |

---

**END OF COPILOT UX DESIGN**
