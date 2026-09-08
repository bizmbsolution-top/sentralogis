# ADR-084 — Financial Settlement Activation

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-064 (Financial Settlement Interface), ADR-087 (Operational → Commercial Event Bridge)

---

## 1. Context

Canonical financial settlement domain (`lib/financial/`) is fully implemented with RLS, idempotency, and service layer. `fin_billable_events`, `fin_invoices`, `fin_invoice_lines`, `fin_ar_ap`, and `fin_adjustments` tables exist. Zero runtime writers. Legacy `invoices` table is written browser-direct from `hq/invoice-customer/page.tsx`.

## 2. Decision

**Commercially-gated financial settlement replacing operationally-gated legacy billing.**

### 2.1 Activation Boundary

```text
Operational completion (JO done / delivery confirmed)
      ↓
Event bridge emits billable event
      ↓
fin_billable_events created
      ↓
fin_invoices generated
      ↓
fin_ar_ap posted
      ↓
fin_adjustments applied (if needed)
```

### 2.2 Non-Boundary

Legacy `invoices` table replacement timeline is covered by ADR-083.

## 3. Forces / Constraints

- Canonical `fin_*` chain is fully implemented but dead DDL
- Legacy `invoices` has browser-direct mutations (HIGH risk)
- No event bridge from operational completion to commercial layer
- Finance is currently operationally-gated, not commercially-gated

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Keep legacy billing | Perpetuates HIGH risk browser-direct mutations |
| Immediate replacement | Requires operational event bridge (ADR-087) |
| Hybrid dual-write | Creates reconciliation burden |

## 5. Canonical Authority

| Entity | Authority |
|--------|-----------|
| Billable event | `fin_billable_events` |
| Invoice | `fin_invoices` |
| Invoice line | `fin_invoice_lines` |
| AR/AP | `fin_ar_ap` |
| Adjustment | `fin_adjustments` |
| Legacy | `invoices` / `invoice_lines` (to be decommissioned) |

## 6. Invariants

1. Financial settlement is commercially-gated, not operationally-gated.
2. Billable events are created from operational completion, not from operational initiation.
3. Legacy `invoices` browser-direct mutations are eliminated.
4. Idempotency is enforced at the billable event level.

## 7. Tenant / Security Model

- RLS enforced on all `fin_*` tables
- IdentityContext governs all financial access
- No client-side financial mutations
- Tenant isolation via `tenant_id = get_my_tenant_id()`

## 8. Consequences

- Finance becomes commercially-gated
- Legacy browser-direct mutations are eliminated
- Audit trail is canonical and tamper-evident
- Requires operational event bridge (ADR-087)

## 9. Future Revisit Conditions

Revisit if:
- Event bridge latency exceeds SLA
- Legacy invoice data requires extended retention
- Multi-currency settlement requires additional fields

---

**END OF ADR-084**
