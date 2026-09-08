# ADR-085 — Customer Success Aggregate

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-070 (Canonical Party Role Architecture), ADR-075 (fw_locations Migration — historical), ADR-077 (Operational → Commercial Event Bridge)

---

## 1. Context

No canonical Customer Success domain exists. Zero `customer_success`, `customer_health`, `customer_activity`, `complaint`, `ticket`, or `support_case` tables exist. Only customer-facing surface is `/track/fwd/[token]` public tracking. Design documents defer CS features to future phase.

## 2. Decision

**Canonical Customer Success domain composes existing canonical data; no new master data is created.**

### 2.1 Composition Model

Customer Success derives from:
- `party_roles` — customer identity
- `sales_orders` / `fulfillments` — transaction history
- `operational_handoffs` — execution status
- Public tracking — customer-facing visibility

### 2.2 Non-Boundary

Operational execution, driver management, and statutory filing remain in their sovereign domains.

## 3. Forces / Constraints

- Customer master data already exists in `md_entities` + `party_roles`
- No new master data tables should be created
- Customer Success is post-sales, not pre-sales
- SLA monitoring exists operationally (`sla_daily_snapshots`)

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| New Customer Success tables | Creates parallel master data |
| Standalone CS portal | Duplicates existing tracking |
| CRM-only approach | Loses operational context |

## 5. Canonical Authority

| Concept | Authority |
|---------|-----------|
| Customer identity | `party_roles` + `md_entities` |
| Transaction history | `sales_orders` + `fulfillments` |
| Execution status | `operational_handoffs` |
| Tracking | `/track/fwd/[token]` |
| SLA | `sla_daily_snapshots` |

## 6. Invariants

1. Customer Success composes existing canonical data.
2. No new customer master data tables are created.
3. Customer Success is read-only projection, not write authority.
4. Customer-facing surfaces remain token-gated for security.

## 7. Tenant / Security Model

- Customer Success projection respects tenant isolation
- Customer PII is never exposed in aggregate views
- Tracking tokens remain the customer-facing access mechanism

## 8. Consequences

- Customer Success can be implemented without schema changes
- Leverages existing canonical data investments
- Avoids master data duplication

## 9. Future Revisit Conditions

Revisit if:
- Complaint/CSAT/NPS tracking requires dedicated tables
- Customer onboarding workflow requires state machines
- Retention modeling requires additional signals

---

**END OF ADR-085**
