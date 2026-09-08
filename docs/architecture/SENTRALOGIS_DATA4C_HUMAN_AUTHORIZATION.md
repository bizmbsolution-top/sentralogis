# SENTRALOGIS — DATA-4C
# HUMAN AUTHORIZATION

**Date:** 2026-09-02  
**Phase:** DATA-4C Human Authorization  
**Status:** RATIFIED  

---

## A. Authorization Identity

| Field | Value |
|-------|-------|
| Phase | DATA-4C Human Authorization |
| Date | 2026-09-02 |
| Status | RATIFIED |
| Scope | Execution design for fw_locations and is_vendor migration tracks |
| Governing ADRs | ADR-072, ADR-073, ADR-074, ADR-075, ADR-076 |
| Governing DATA phases | DATA-4, DATA-4A, DATA-4B, DATA-4C |

---

## B. Human Decision

> **RATIFIED**

The DATA-4C execution design is approved as the frozen baseline for future DATA-4E execution.

---

## C. Ratified Scope

### Track A — fw_locations → md_locations

| Item | Status |
|------|--------|
| Dependency inventory | 4 FKs identified |
| Deterministic mapping | 3 types → 3 canonical types |
| FK migration design | 4-step rewiring plan |
| Historical reference treatment | Preserved via mapping |
| Zero-consumer proof | Designed |
| Rollback strategy | Documented |
| Retirement boundary | Defined |

### Track B — is_vendor → party_roles.VENDOR

| Item | Status |
|------|--------|
| Consumer inventory | ~131 consumers classified |
| Semantic classification | 8 categories, 0 divergences |
| Migration batches | 8 semantic batches |
| Per-batch verification | Defined |
| Compatibility strategy | No dual-write needed |
| Zero-consumer proof | Designed |
| Rollback strategy | Documented |

---

## D. Explicit Non-Authorized Actions

This authorization does NOT permit:

- Executing SQL migrations
- Changing database schema
- Changing production code
- Changing application queries
- Changing RLS
- Dropping fw_locations
- Dropping is_vendor
- Changing existing migration files
- Adding new migration files for execution
- Rewriting consumers
- Running data mutation
- Backfilling additional data
- Rewiring FKs
- Modifying production configuration
- Modifying fw_order_headers

---

## E. DATA-4E Boundary

> **DATA-4E is a separate controlled execution phase.**

DATA-4E may only begin after:
1. DATA-4C is ratified (DONE)
2. A separate human execution authorization is granted
3. The DATA-4C plan is treated as frozen
4. DATA-4E performs fresh execution-time preflight
5. All mandatory execution gates pass

---

## F. Architecture Baseline

| Domain | Canonical Authority |
|--------|---------------------|
| Party | md_entities |
| Party Role | party_roles |
| Vendor | md_entities + party_roles.VENDOR |
| Location | md_locations |
| Carrier | md_entities + CARRIER role |
| Fleet | Existing domain-specific model |
| Driver | Existing domain-specific model |
| Container | Shipment Unit |
| Network | md_locations hierarchy |

---

## G. Legacy Transition

| Legacy | Target | Authorization |
|--------|--------|---------------|
| fw_locations | md_locations | Plan ratified; execution NOT authorized |
| is_vendor | party_roles.VENDOR | Plan ratified; execution NOT authorized |
| fw_order_headers | — | DEFERRED |

---

## H. Frozen Execution Baseline

| Document | Purpose |
|----------|---------|
| SENTRALOGIS_DATA4C_MIGRATION_EXECUTION_DESIGN.md | Master execution design |
| SENTRALOGIS_DATA4C_FW_LOCATIONS_EXECUTION_PLAN.md | Track A exact plan |
| SENTRALOGIS_DATA4C_IS_VENDOR_EXECUTION_PLAN.md | Track B exact plan |
| SENTRALOGIS_DATA4C_PREFLIGHT_GATES.md | All preflight gates |
| SENTRALOGIS_DATA4C_ROLLBACK_PLAN.md | Rollback strategy |
| SENTRALOGIS_DATA4C_DECISION_LOG.md | All decisions |
| SENTRALOGIS_DATA4C_AUTHORIZATION_REQUEST.md | Authorization scope |

---

## I. Required DATA-4E Gates

| # | Gate |
|---|------|
| 1 | Repository state revalidation |
| 2 | Migration numbering verification |
| 3 | Current schema verification |
| 4 | Current FK state verification |
| 5 | Current fw_locations consumer verification |
| 6 | Current is_vendor consumer verification |
| 7 | Data quality verification |
| 8 | Tenant isolation verification |
| 9 | RLS verification |
| 10 | Test baseline verification |
| 11 | TypeScript baseline verification |
| 12 | Rollback readiness verification |

---

## J. Human Authorization Statement

> This record authorizes the **PLAN only**, not migration execution.

> DATA-4E execution requires separate human authorization.

---

**END OF HUMAN AUTHORIZATION**
