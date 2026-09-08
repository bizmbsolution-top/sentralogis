# ADR-083 — Legacy Pricing Decommissioning Path

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Amended:** (Phase 5C Formal Ratification, 2026-09-06)  
**Date:** 2026-09-05  
**Depends on:** ADR-082 (Canonical Pricing Activation Strategy), ADR-088 (Multi-Mode Pricing Representation), ADR-086 (Margin / COGS Canonical Ownership), ADR-088 (Multi-Mode Pricing Representation), ADR-086 (Margin / COGS Canonical Ownership)

---

## 1. Context

Legacy pricing tables remain runtime-active with no unified migration strategy:
1. `fw_price_master` — Forwarding rate master
2. `crm_sbu_customer_rates` — CRM customer rates
3. `crm_quotation_items.nego_price` — Quote negotiated prices
4. `fw_container_items.sell_price_snapshot` — Forwarding committed price

**Note:** `md_billing_rates` is retained as operational Warehouse master data and is outside ADR-083 pricing decommissioning scope.

## 2. Decision

**Systematic retirement of legacy pricing tables via phased decommissioning.**

### 2.1 Preserved Structures

The following structures are NOT subject to decommissioning under ADR-083:

1. **`crm_quotation_items`** — Preserved under ADR-081. It is the authoritative Quote → SO price source and is not subject to decommissioning while ADR-081 depends on it.

2. **`fw_container_items.sell_price_snapshot`** — Historical commercial evidence. It represents committed prices at forwarding WO creation and is not subject to decommissioning.

3. **`md_billing_rates`** — Retained as operational Warehouse master data. It is outside ADR-083 pricing decommissioning scope.

### 2.2 Decommissioning Phases

Per table:
1. **Read-only:** Legacy table readable, all writes go to canonical
2. **Dual-write:** Both legacy and canonical receive writes
3. **Canonical-only:** Legacy table is no longer written; reads still supported
4. **Archive:** Legacy table is archived or dropped

### 2.3 Non-Boundary

New canonical pricing design is covered by ADR-057..066. COGS and cost data are outside canonical Pricing decommissioning scope and remain governed by ADR-086.

## 3. Forces / Constraints

- Each legacy table serves different SBUs
- Operational disruption must be avoided
- Client-side mutations exist for some tables
- Data migration must preserve historical accuracy

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Immediate drop | Data loss; operational disruption |
| Keep forever | Perpetuates fragmentation |
| Big-bang migration | High risk; requires coordinated downtime |

## 5. Canonical Authority

| Legacy Table | Replacement | Priority |
|--------------|-------------|----------|
| `fw_price_master` | `pricing_rates` + `pricing_rate_items` | HIGH |
| `crm_sbu_customer_rates` | `pricing_rates` + `pricing_rate_items` | HIGH |
| `crm_quotation_items.nego_price` | Preserved under ADR-081 | N/A |
| `fw_container_items.sell_price_snapshot` | Historical evidence | N/A |

## 6. Invariants

1. No legacy pricing data is deleted without archival.
2. Canonical pricing tables remain authoritative during transition.
3. Historical transactions retain their committed prices.
4. Decommissioning is per-SBU with independent timelines.
5. `crm_quotation_items` is preserved under ADR-081 and is not subject to decommissioning.
6. `fw_container_items.sell_price_snapshot` is historical commercial evidence and is not subject to decommissioning.
7. COGS and cost data are outside canonical Pricing decommissioning scope and remain governed by ADR-086.
8. No legacy pricing structure may be decommissioned until semantic equivalence with its canonical replacement is demonstrated through migration dry-run and validation evidence.
9. All migration functions must undergo dry-run validation against representative production data, including semantic comparison and rollback strategy, before any write migration is separately authorized.
10. Legacy administration interfaces may only be decommissioned after the canonical replacement UI is operational or an approved server-side compatibility bridge is implemented.

## 7. Tenant / Security Model

- RLS enforced on canonical pricing tables
- Legacy tables retain existing RLS during transition
- No cross-tenant data leakage during migration

## 8. Consequences

- Legacy pricing tables become read-only over time
- Canonical pricing becomes the single source of truth
- Reduces architectural debt and maintenance burden
- `md_billing_rates` is retained as operational Warehouse master data; no decommissioning under ADR-083
- COGS columns remain outside canonical Pricing scope; governed by ADR-086
- Decommissioning requires semantic-equivalence proof, dry-run validation, and UI/compatibility bridge

## 9. Future Revisit Conditions

Revisit if:
- Legacy table migration stalls
- New legacy pricing surfaces emerge
- Rollback from canonical to legacy becomes necessary
- Semantic-equivalence proof fails for any legacy table
- Canonical pricing UI or compatibility bridge becomes available

## 10. Amendments (Phase 5C Formal Ratification, 2026-09-06)

### Amendment A — `md_billing_rates`
Remove `md_billing_rates` from pricing decommissioning scope. Retain as operational Warehouse master data.

### Amendment B — `crm_quotation_items`
Preserve under ADR-081. Not subject to decommissioning while ADR-081 depends on it.

### Amendment C — Historical Snapshot
`fw_container_items.sell_price_snapshot` is historical commercial evidence. Not subject to decommissioning.

### Amendment D — COGS Boundary
COGS and cost data are outside canonical Pricing decommissioning scope. Governed by ADR-086.

### Amendment E — Semantic Equivalence
No legacy pricing structure may be decommissioned until semantic equivalence is proven via dry-run migration and validation evidence.

### Amendment F — Migration Validation
All migration functions must undergo dry-run validation against representative production data, including semantic comparison and rollback strategy, before any write migration is separately authorized.

### Amendment G — UI/Compatibility
Legacy administration interfaces may only be decommissioned after canonical replacement UI is operational or an approved server-side compatibility bridge is implemented.

---

**END OF ADR-083**
