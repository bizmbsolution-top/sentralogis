# SENTRALOGIS — DATA-4E-R6
# FORENSIC CLOSURE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R6  
**Nature:** FINAL FORENSIC CLOSURE  

---

## 1. R6-01: True Idempotency

### State Classification

| State | Condition | Behavior |
|-------|-----------|----------|
| A — Legacy | FK = fw_locations.location_id | Transform to md_locations.id |
| B — Canonical | FK = md_locations.id | Preserve unchanged |
| C — Mixed | Some legacy, some canonical | Migrate only legacy subset |
| D — Invalid | Unmappable | RAISE EXCEPTION |

### Rerun Safety

| Execution | Behavior |
|-----------|----------|
| First | Legacy → Canonical |
| Second | Canonical → Unchanged |
| Mixed | Only legacy subset changes |

---

## 2. R6-02: Canonical Collision Semantics

| Case | Condition | Behavior |
|------|-----------|----------|
| 1 — No record | No md_locations exists | INSERT |
| 2 — Identical | Exactly one, semantically same | REUSE |
| 3 — Conflict | Exactly one, semantically different | RAISE EXCEPTION |
| 4 — Ambiguous | Multiple candidates | RAISE EXCEPTION |

---

## 3. R6-03: Exact FK Constraint Verification

| # | Old Constraint | New Constraint | ON DELETE |
|---|----------------|----------------|-----------|
| 1 | fk_fw_order_headers_origin_port | fk_fw_order_headers_origin_location | RESTRICT |
| 2 | fk_fw_order_headers_dest_port | fk_fw_order_headers_dest_location | RESTRICT |
| 3 | fk_fw_legs_start_location | fk_fw_legs_start_location_md | RESTRICT |
| 4 | fk_fw_legs_end_location | fk_fw_legs_end_location_md | RESTRICT |

---

## 4. R6-04: ON DELETE Semantic Equivalence

| FK | Old Action | New Action | Equivalent? |
|----|------------|------------|-------------|
| origin_port_id | RESTRICT | RESTRICT | YES |
| dest_port_id | RESTRICT | RESTRICT | YES |
| start_location_id | RESTRICT | RESTRICT | YES |
| end_location_id | RESTRICT | RESTRICT | YES |

---

**END OF FORENSIC CLOSURE**
