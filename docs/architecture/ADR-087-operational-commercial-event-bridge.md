# ADR-087 — Operational → Commercial Event Bridge

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-084 (Financial Settlement Activation), ADR-087 (legacy numbering — Operational → Commercial Event Bridge)

---

## 1. Context

Operational completion (JO done / delivery confirmed) does not emit billable events to the commercial layer. `fin_billable_events` has zero runtime writers. Canonical `fin_*` chain exists but is dead DDL. Legacy `invoices` table is written browser-direct.

## 2. Decision

**Operational completion emits billable events to the commercial layer via a canonical event bridge.**

### 2.1 Event Flow

```text
Operational completion (JO completion / delivery confirmed)
      ↓
Event bridge emits billable event
      ↓
fin_billable_events created (commercially-gated)
      ↓
fin_invoices generated
      ↓
fin_ar_ap posted
```

### 2.2 Non-Boundary

Direct SO mutation and operational engine creation are forbidden.

## 3. Forces / Constraints

- Canonical `fin_*` chain is fully implemented but dead DDL
- No event bridge from operational completion to commercial layer
- Legacy `invoices` has browser-direct mutations
- Financial settlement must be commercially-gated (ADR-084)

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Keep operationally-gated billing | Perpetuates browser-direct mutations |
| Direct SO mutation | Violates commercial/operational boundary |
| Client-side event emission | Violates server-authoritative principle |

## 5. Canonical Authority

| Entity | Authority |
|--------|-----------|
| Billable event | `fin_billable_events` |
| Invoice | `fin_invoices` |
| AR/AP | `fin_ar_ap` |
| Event bridge | Operational domain emits; Financial domain consumes |

## 6. Invariants

1. Billable events are emitted from operational completion, not initiation.
2. Financial settlement is commercially-gated.
3. No direct `SO/FL/OH → JO` mutations occur.
4. Event bridge is idempotent and retry-safe.

## 7. Tenant / Security Model

- RLS enforced on all `fin_*` tables
- IdentityContext governs all financial access
- No client-side event emission
- Tenant isolation via `tenant_id = get_my_tenant_id()`

## 8. Consequences

- Finance becomes commercially-gated
- Legacy browser-direct mutations are eliminated
- Operational domains retain execution sovereignty
- Financial domain receives authoritative completion signals

## 9. Future Revisit Conditions

Revisit if:
- Event bridge latency exceeds SLA
- Partial completion requires partial billing
- Multi-SBU completion requires event aggregation

---

**END OF ADR-087**
