# SENTRALOGIS — DATA-4E-R7
# FORENSIC REPAIR

**Date:** 2026-09-02  
**Phase:** DATA-4E-R7  

---

## 1. Schema Evidence

### Actual Column Types

| Column | Table | Type | Nullable |
|--------|-------|------|----------|
| location_id | fw_locations | UUID | NO (PK) |
| tenant_id | fw_locations | UUID | NO (added by migration 024) |
| type | fw_locations | location_type (ENUM) | NO |
| origin_port_id | fw_order_headers | UUID | NO |
| dest_port_id | fw_order_headers | UUID | NO |
| start_location_id | fw_legs | UUID | NO |
| end_location_id | fw_legs | UUID | NO |
| id | md_locations | UUID | NO (PK) |
| tenant_id | md_locations | UUID | YES |
| external_code | md_locations | TEXT | YES |

### Actual FK Constraints (from migrations 175, 176)

| # | Constraint | Source | Target | ON DELETE | ON UPDATE |
|---|------------|--------|--------|-----------|-----------|
| 1 | fk_fw_order_headers_origin_port | fw_order_headers.origin_port_id | fw_locations.location_id | RESTRICT | (default NO ACTION) |
| 2 | fk_fw_order_headers_dest_port | fw_order_headers.dest_port_id | fw_locations.location_id | RESTRICT | (default NO ACTION) |
| 3 | fk_fw_legs_start_location | fw_legs.start_location_id | fw_locations.location_id | RESTRICT | (default NO ACTION) |
| 4 | fk_fw_legs_end_location | fw_legs.end_location_id | fw_locations.location_id | RESTRICT | (default NO ACTION) |

### Unique Constraint on md_locations

**FINDING: NO unique constraint on (tenant_id, external_code)**

This is a schema prerequisite that must be addressed. The migration uses explicit preflight collision detection instead of ON CONFLICT.

---

## 2. R7 Blockers Repaired

| Blocker | Status |
|---------|--------|
| R7-01: True Idempotency | REPAIRED — state classification |
| R7-02: Canonical Collision Semantics | REPAIRED — explicit CASE classification |
| R7-03: Old FK Catalog Verification | REPAIRED — exact metadata from migrations |
| R7-04: New FK Catalog Verification | REPAIRED — exact metadata defined |
| R7-05: ON DELETE equivalence | REPAIRED — preserve RESTRICT |
| R7-06: ON UPDATE equivalence | REPAIRED — preserve NO ACTION |

---

**END OF FORENSIC REPAIR**
