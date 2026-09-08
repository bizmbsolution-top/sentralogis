# ADR-059 — Rate Versioning and Price Snapshot

**Status:** RATIFIED (Phase 5C-2R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Amendment:** Effective-period semantics added (§2.4, §2.5, §7)  
**Depends on:** ADR-058 (Rate Master Model)  

---

## 1. Context

Phase 5C discovered that Quote prices are mutable with no snapshot mechanism. Changing a master rate could retroactively alter committed commercial prices. This violates historical commercial truth.

## 2. Decision

**Two distinct concepts: Rate Version (reusable definition) and Price Snapshot (committed truth).**

### 2.1 Rate Version
Controls which rate definition is currently applicable. Immutable once activated.

### 2.2 Price Snapshot
Preserves what was actually committed to a commercial transaction. Never mutable after commitment.

### 2.3 Snapshot Fields

| Field | Purpose |
|-------|---------|
| `source_rate_id` | Link to originating rate |
| `source_rate_version_id` | Link to specific version |
| `unit_rate_snapshot` | Frozen unit price at commitment |
| `quantity_snapshot` | Frozen quantity at commitment |
| `currency_snapshot` | Frozen currency at commitment |
| `uom_snapshot` | Frozen UOM at commitment |
| `calculated_amount` | Final committed amount |
| `snapshot_timestamp` | When commitment occurred |

### 2.4 Effective-Period Semantics (5C-2R)

| Concept | Definition |
|---------|------------|
| Interval | Half-open: `[effective_from, effective_to)` |
| NULL effective_to | Open-ended (indefinitely valid) |
| Overlap | No overlapping applicability windows for ACTIVE versions |
| ACTIVE meaning | Currently applicable (must also satisfy effective period) |
| Future version | ACTIVE + future effective_from = legal but not yet applicable |

### 2.5 Applicability Rule

A rate version is **applicable** when:
1. `status = 'ACTIVE'`
2. `effective_from <= pricing_date`
3. `effective_to IS NULL OR pricing_date < effective_to`

## 3. Critical Invariant

> **Changing a future rate version must NEVER mutate an already committed commercial price.**

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Mutable prices with audit log | Historical truth corrupted |
| Version on quote item only | No canonical rate versioning |
| Effective-dating on rate master only | No snapshot of committed price |

## 5. Consequences

- Historical commercial prices are immutable.
- Rate changes only affect future commitments.
- Audit trail links committed prices to source rate versions.

## 6. Security Implications

- Snapshots are append-only.
- No update/delete permitted after commitment.
- Tenant isolation via parent transaction.

## 7. Effective-Period Rules (5C-2R)

1. Half-open intervals allow sequential versioning without gaps or overlaps.
2. At most one ACTIVE version per rate per tenant at any timestamp (enforced by partial unique index).
3. No overlapping effective periods for ACTIVE versions (enforced by application validation).
4. `effective_from <= effective_to` when both are specified (enforced by CHECK constraint).
