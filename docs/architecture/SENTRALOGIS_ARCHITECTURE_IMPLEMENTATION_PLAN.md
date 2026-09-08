# SENTRALOGIS — ARCHITECTURE IMPLEMENTATION PLAN

## P0–P3 Prioritized Roadmap · Post Architecture Gate (🟡 GO WITH CONDITIONS)

**Date:** 2026-08-25 · Companion to: Forensic Audit + Phase 4B-0 Gate + Application Mapping + Implementation Backlog

---

## PREREQUISITE GATE CONDITIONS (from Gate decision)

🟡 GO WITH CONDITIONS — implementation begins only after the first three P0 units land:
1. Hardened identity resolver (U-01) — no body/header/query tenant authority on canonical APIs.
2. Engagement resolve-or-create path (U-03/U-04) — canonical root becomes writable.
3. ACL skeleton with import-boundary gates (U-10).

---

## P0 — CRITICAL (blocks canonical adoption; do first)

| Unit | Content | Primary risk | Rollback |
|---|---|---|---|
| U-01 Identity resolver + role model plumbing | Session→membership→role value object; forged header/query rejection | Low (additive) | delete files |
| U-02 Role gates (`commercial:read/manage`) | Live role vocabulary mapping; audit lines | Low | remove gate call sites |
| U-03 Engagement resolve-or-create service (+bridge mapping table) | Deterministic idempotency; tenant/customer association | Medium (new write surface → gated by tests) | unused-until-routed |
| U-04 `/api/v1/commercial/work-orders` POST/GET/list | Canonical entry point ships | Medium | route removal |
| U-07 ExecutionLineageAdapter (trucking adapter repair) | Lineage-complete JO creation; FK-trap closure joint release with U-08 | High importance, contained blast radius | revert adapter commit |
| U-08 Forwarding writer guard | Same release train as U-07 | Low-Med | flag off guard |
| U-09 Fabricated-ID elimination in shipment creator | Creator requires real session + engagement | Low-Med | revert page changes |
| U-10 Static architecture gates | Import-boundary + no-fabrication lint assertions wired to test runner | None | remove asserts |

Exit criteria P0: canonical root creatable at runtime; zero fabricated identifiers; SR dispatch lineage-complete; all new code behind hardened resolver; regression ≥543+new.

## P1 — STRUCTURAL (scalable architecture)

| Unit | Content |
|---|---|
| U-05 Capability registry foundation (+seed 4 capabilities, extensibility proof) |
| U-06 Binding lifecycle PATCH surface + outbox emission of CAPABILITY_* events |
| Vocabulary normalization CLEARANCE→CUSTOMS (data fix + compat views) |
| `/api/jo/[token]` handler decomposition (GPS ingest / lifecycle / payments separation) |
| Response-contract standardization for v1 routes (Result envelope, error codes) |
| Type boundary pass: domain→DTO→ViewModel separation for canonical-consuming surfaces |

## P2 — CAPABILITY (business capability expansion)

| Unit | Content |
|---|---|
| Service activation engine (`commercial_engagement_services`) + package templates |
| Service catalog + pricing consolidation (service_pricing; retire fragmentation gradually) |
| Event producers v1 for operational domains (JO_ASSIGNED/COMPLETED, CUSTOMS_SUBMITTED/RELEASED…) via outbox |
| Ledger producers keyed to activations (REVENUE/COGS/PASS_THROUGH into fin_financial_ledger_entries) |
| Billing eligibility derived from service state (retire is_doc/is_cost gating) |
| Warehouse adapter implementation (WH SR consumption) |

## P3 — OPTIMIZATION (maintainability/cleanup)

| Unit | Content |
|---|---|
| Legacy vocabulary cleanup (CLEARANCE remnants), compat-view retirement after stability window |
| Orphan `armada` table removal; `exec_sql_manual` hardening/removal |
| Browser-direct legacy readers migration to read APIs/views where justified |
| ADR global index ratification; doc family de-duplication |
| Test-suite network-dependence hardening (Shipment API scenarios) |

---

## EXECUTION DISCIPLINE (applies to every unit)

1. Baseline before: `tsc --noEmit` + `npx tsx scratch/run-tests.ts` (≥543 PASS).
2. Implement smallest safe change; halt-on-failure; no drive-by refactors.
3. After each unit: targeted suite + full regression + `git diff --check`.
4. Protected systems untouched unless an owner-approved exception exists in writing.
5. Every production deployment: fresh backup → BACKUP_OK → verification block → smoke tests.

## DEPENDENCY GRAPH

```
U-01 ─ U-02 ─ U-03 ─ U-04
              │
              ├─ U-07 ⇄ U-08   (joint release)
              └─ U-09
U-05 ─ U-06 ─ U-11
P1 items after P0 exit criteria; P2 after activations exist; P3 continuous.
```
