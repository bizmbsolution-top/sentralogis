# SENTRALOGIS — PHASE UI/UX-3J
# COPILOT AND TUTORIAL ROADMAP

**Date:** 2026-09-01  

---

## 1. Existing Copilot Capabilities

### 1.1 Engine
```
src/platforms/copilot/engine/CopilotEngine.ts
```

### 1.2 Pipeline
```
Intent → Context → Validation → Planning → Explainability → Response
```

### 1.3 Default Intents
| Intent | Domain | Risk |
|--------|--------|------|
| ASSIGN_DRIVER | Trucking | MEDIUM |
| REPLACE_DRIVER | Trucking | HIGH |
| SHOW_TIMELINE | Cross-domain | LOW |
| CANCEL_JOB | Trucking | HIGH |

### 1.4 Reusable Components
| Component | Purpose |
|-----------|---------|
| `CopilotEngine.processCommand()` | Main entry point |
| `IntentRegistry` | Intent definitions |
| `ActionBridge` | Permissions + risk |
| `EntityExtractionEngine` | Entity extraction |
| `NextBestActionEngine` | Recommendations |
| `ExplainabilityBuilder` | Explanations |

---

## 2. UI Integration Opportunities

| Opportunity | Current State | Required |
|-------------|---------------|----------|
| Global Copilot | Panel exists | Context propagation |
| Contextual Copilot | Not implemented | Entity context |
| Action Copilot | Not implemented | Action confirmation |
| Explainability UI | Not implemented | Explanation display |

---

## 3. Persona-Specific Copilot

| Persona | Context | Example Request |
|---------|--------|-----------------|
| Commercial | Quote/Customer | "Analyze this quote margin" |
| Operations | Shipment/Job | "Why is this delayed?" |
| Finance | Invoice/Payment | "Show overdue AR" |
| Control Tower | Exceptions | "What needs attention?" |
| Customer | Own orders | "Where is my shipment?" |
| Vendor | Own jobs | "What deliveries today?" |

---

## 4. Backend Requirements

| Requirement | Status |
|-------------|--------|
| Intent registry extension | Future |
| Persona context adapter | Future |
| Proactive event detection | Future |
| Commercial intents | Future |
| Financial intents | Future |

---

## 5. Smart Tutorial

### 5.1 Current State
**No production Smart Tutorial engine exists.**

### 5.2 Future Architecture
```
Persona + Context + Screen + User State → Contextual Guidance
```

### 5.3 Integration Points
| Point | Trigger |
|-------|---------|
| First Engagement creation | First-time user |
| First Direct Order | First-time user |
| First SO composition | First-time user |
| First SBU assignment | First-time user |
| First reconciliation | First-time user |
| First customer shipment tracking | First-time user |

### 5.4 Recommended Future Phase
**Smart Tutorial Engine** — Separate discovery/design/implementation phases.

---

## 6. Security Boundaries

| Rule | Implementation |
|------|----------------|
| One Copilot engine | `src/platforms/copilot/` |
| No duplicate engines | Enforced |
| IdentityContext authoritative | Server-side |
| Tenant isolation | Enforced |
| Human confirmation | For mutations |
| Audit logging | Existing |

---

**END OF COPILOT AND TUTORIAL ROADMAP**
