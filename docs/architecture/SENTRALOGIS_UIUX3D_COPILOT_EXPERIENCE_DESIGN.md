# SENTRALOGIS — UI/UX-3D
# COPILOT EXPERIENCE DESIGN

**Date:** 2026-09-01  

---

## 1. Existing Copilot Capabilities

### 1.1 Engine

| Capability | Status |
|------------|--------|
| `processCommand()` | SUPPORTED |
| `generateDashboardGreeting()` | SUPPORTED |
| Intent recognition | SUPPORTED |
| Context enrichment | SUPPORTED |
| Action validation | SUPPORTED |
| Action planning | SUPPORTED |
| Explainability generation | SUPPORTED |
| Response formatting | SUPPORTED |

### 1.2 Pipeline

| Stage | Purpose |
|-------|---------|
| IntentStage | Recognize user intent |
| ContextStage | Enrich with operational data |
| ValidationStage | Validate proposed actions |
| PlanningStage | Plan action execution |
| ExplainabilityStage | Generate explanations |
| ResponseStage | Format response |

### 1.3 Intelligence

| Component | Purpose |
|-----------|---------|
| IntentRegistry | Registered intent definitions |
| EntityExtractionEngine | Extract entities from input |
| NextBestActionEngine | Recommend next actions |
| DecisionAdvisoryEngine | Decision recommendations |
| OperationalInsightEngine | Operational insights |
| SLARiskAnalyzer | SLA risk analysis |

---

## 2. Reusable Capabilities

| Capability | UI Integration |
|------------|----------------|
| Natural language search | Command Center |
| Entity explanation | Context Workspace |
| Next best action | My Work recommendations |
| Exception explanation | Exceptions Panel |
| Navigation assistance | Global Copilot |
| Dashboard greeting | Home/Dashboard |

---

## 3. Contextual Copilot Model

### 3.1 Global Copilot

Accessible from Command Center (⌘K).

**Examples:**
- "Show delayed shipments"
- "Which customers need follow-up?"
- "Find open quotes expiring this week"

### 3.2 Contextual Copilot

When inside an entity.

**Sales Order:**
- "Explain why this margin dropped"
- "What's the fulfillment status?"

**Shipment:**
- "Why is this delayed?"
- "What's the ETA?"

**Invoice:**
- "Which payments are unmatched?"

### 3.3 Action Copilot

**Examples:**
- "Create fulfillment from this SO"
- "Request price override"
- "Prepare amendment"

**Action Safety:**
| Type | Confirmation |
|------|-------------|
| Informational | None |
| Suggestion | Review |
| Prepared Action | Explicit confirm |
| Consequential | Authorization + confirm |

---

## 4. Action Model

### 4.1 Action States

| State | Description |
|-------|-------------|
| INFORMATIONAL | Read-only response |
| SUGGESTION | User reviews recommendation |
| PREPARED | Action constructed, not executed |
| CONFIRMATION_REQUIRED | User must confirm |
| AUTHORIZATION_REQUIRED | User lacks permission |
| EXECUTED | Action completed |
| FAILED | Action failed |

### 4.2 Action Lifecycle

```
User Input
    ↓
Intent Recognition
    ↓
Context Enrichment
    ↓
Validation
    ↓
Planning
    ↓
Explainability
    ↓
Response
    ↓
Human Confirmation (if consequential)
    ↓
Canonical Domain Service
    ↓
Audit
    ↓
Result
```

---

## 5. Confirmation Model

### 5.1 Confirmation UI

```
┌─────────────────────────────────────────────┐
│  COPILOT ACTION PROPOSAL                    │
├─────────────────────────────────────────────┤
│                                             │
│  Action: Assign Truck TRK-102               │
│  Target: Shipment SHP-2026-00125            │
│  Confidence: 94%                            │
│                                             │
│  Consequences:                              │
│  - Truck will be marked as assigned         │
│  - Driver will be notified                  │
│  - Shipment status will update              │
│                                             │
│  [Review Details]  [Cancel]  [Confirm]      │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.2 Authorization UI

```
┌─────────────────────────────────────────────┐
│  AUTHORIZATION REQUIRED                     │
├─────────────────────────────────────────────┤
│                                             │
│  You do not have permission to assign        │
│  trucks. This action requires               │
│  'job_order:assign' permission.             │
│                                             │
│  Would you like to request approval?         │
│                                             │
│  [Cancel]  [Request Approval]               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. Explainability

### 6.1 Explanation UI

| Element | Purpose |
|---------|---------|
| What was understood | Intent + entities |
| Context used | Data sources |
| Reasoning | Logic applied |
| Confidence | Certainty level |
| Consequences | Expected outcome |

### 6.2 Explanation Example

```
Copilot understood:
- Intent: Find delayed shipments
- Filters: Status = IN_TRANSIT, ETA < today

Context used:
- 156 active shipments
- 12 delayed
- 3 critical

Reasoning:
- Comparing ETA vs current date
- Flagging SLA risk

Confidence: 98%
```

---

## 7. Authorization

| Check | Implementation |
|-------|---------------|
| IdentityContext | UserContext from session |
| Tenant isolation | TenantContext from session |
| Permissions | PermissionContext from session |
| Action permissions | ActionBridge.getRequiredPermissions() |
| Risk level | ActionBridge.getRiskLevel() |

---

## 8. Audit

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

## 9. Failure States

| State | UI Response |
|-------|-------------|
| Intent unclear | Ask clarifying question |
| Insufficient context | Request more info |
| Validation failed | Explain why |
| Authorization denied | Explain + offer escalation |
| Execution failed | Explain + recovery options |
| Network error | Retry option |

---

## 10. UX Integration Points

| Point | Component |
|-------|-----------|
| Command Center | Copilot search input |
| My Work | Copilot recommendations |
| Context Workspace | Contextual Copilot panel |
| Exceptions | Copilot explanation |
| Action forms | Copilot assistance |

---

**END OF COPILOT EXPERIENCE DESIGN**
