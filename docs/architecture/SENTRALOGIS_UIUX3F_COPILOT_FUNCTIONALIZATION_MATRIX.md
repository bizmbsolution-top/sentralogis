# SENTRALOGIS — UI/UX-3F
# COPILOT FUNCTIONALIZATION MATRIX

**Date:** 2026-09-01  

---

| Persona | Context | Intent | Capability | Authorization | Confirmation | Audit | UI Surface | Missing? |
| ------- | ------- | ------ | --------- | ------------- | ------------ | ----- | ---------- | -------- |
| Commercial | Quote | EXPLAIN | Pricing analysis | `commercial:read` | No | Yes | Quote detail | No |
| Commercial | Quote | RECOMMEND | Follow-up actions | `commercial:read` | No | Yes | Quote list | No |
| Commercial | Customer | RECOMMEND | Next best action | `commercial:read` | No | Yes | Customer 360 | **YES (UI)** |
| Commercial | SO | EXPLAIN | Margin analysis | `commercial:read` | No | Yes | SO detail | No |
| Commercial | Pricing | PREPARE | Override request | `pricing:override` | Yes | Yes | Pricing page | No |
| Operations | Shipment | EXPLAIN | Delay reason | `job_order:read` | No | Yes | Shipment detail | No |
| Operations | Job | PREPARE | Driver assignment | `job_order:assign` | Yes | Yes | Assignment modal | No |
| Operations | Job | EXECUTE | Cancel job | `job_order:delete` | Yes | Yes | Job detail | No |
| Operations | Timeline | READ | Show timeline | `job_order:read` | No | Yes | Any entity | No |
| Finance | Invoice | EXPLAIN | Payment status | `commercial:read` | No | Yes | Invoice detail | No |
| Finance | Payment | PREPARE | Allocation | `commercial:manage` | Yes | Yes | Payment page | **YES (backend)** |
| Finance | Reconciliation | RECOMMEND | Matching | `commercial:read` | No | Yes | Reconciliation | **YES (backend)** |
| Control Tower | Exception | RECOMMEND | Resolution | `commercial:read` | No | Yes | Exceptions panel | No |
| Control Tower | Health | EXPLAIN | Risk analysis | `commercial:read` | No | Yes | Dashboard | No |
| Customer | Order | READ | Status | Customer scope | No | Yes | Customer portal | **YES (backend)** |
| Customer | Shipment | READ | Tracking | Token | No | Yes | Tracking page | No |
| Vendor | Job | READ | Assignment | Vendor scope | No | Yes | Vendor portal | **YES (backend)** |
| Vendor | Shipment | READ | Execution | Vendor scope | No | Yes | Vendor portal | **YES (backend)** |

---

## Existing Copilot Intents

| Intent | Domain | Risk | Required Permissions |
|--------|--------|------|---------------------|
| ASSIGN_DRIVER | Trucking | MEDIUM | `JobOrder.Update` |
| REPLACE_DRIVER | Trucking | HIGH | `JobOrder.Update` |
| SHOW_TIMELINE | Cross-domain | LOW | `JobOrder.Read` |
| CANCEL_JOB | Trucking | HIGH | `JobOrder.Delete` |

---

## Copilot Pipeline Reuse

| Stage | Component | Reusable |
|-------|-----------|----------|
| Intent | `IntentStage` | YES |
| Context | `ContextStage` | YES |
| Validation | `ValidationStage` | YES |
| Planning | `PlanningStage` | YES |
| Explainability | `ExplainabilityStage` | YES |
| Response | `ResponseStage` | YES |

---

## Persona-Specific Copilot Context

| Persona | WorkspaceContext | Available Intents |
|---------|-----------------|-------------------|
| Commercial | Commercial workspace | SHOW_TIMELINE, RECOMMEND |
| Operations | Operations workspace | ASSIGN_DRIVER, REPLACE_DRIVER, SHOW_TIMELINE, CANCEL_JOB |
| Finance | Financial workspace | SHOW_TIMELINE, RECOMMEND |
| Control Tower | Intelligence workspace | SHOW_TIMELINE, RECOMMEND |
| Customer | Customer portal | READ, EXPLAIN |
| Vendor | Partner portal | READ, EXPLAIN |

---

**END OF COPILOT FUNCTIONALIZATION MATRIX**
