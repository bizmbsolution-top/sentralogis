# ADR-075 — fw_locations Migration & Deprecation

**Status:** RATIFIED — STRATEGY ONLY (DATA-4A Human Ratification, 2026-09-02)  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture, Location component)  

---

## 1. Context

fw_locations is a legacy location authority that duplicates md_locations. DATA-3R flagged it as MEDIUM risk (duplicate authority).

## 2. Problem

fw_locations duplicates md_locations with separate type enum. Consumers (fw_order_headers, fw_legs) reference it via FK.

## 3. Decision

**fw_locations SHALL be migrated to md_locations via controlled migration.**

Migration requires:
1. Complete reader inventory
2. Complete writer inventory
3. FK inventory
4. Semantic mapping (type → location_type)
5. Deterministic migration
6. Consumer migration
7. Zero-consumer proof
8. Deprecation
9. Removal

## 4. Prohibited Actions

- **DROP fw_locations** before zero-consumer proof
- **Blind type mapping** without semantic validation
- **FK migration** without consumer impact analysis

## 5. Mapping Rules

| fw_locations.type | md_locations.location_type |
|-------------------|---------------------------|
| PORT | PORT |
| WAREHOUSE | WAREHOUSE |
| DELIVERY_POINT | DELIVERY_POINT |

## 6. Invariants

1. fw_locations is legacy, md_locations is canonical
2. Migration is deterministic and repeatable
3. Zero-consumer proof required before removal

## 7. Consequences

- Single canonical location authority (md_locations)
- No duplicate location masters
- Migration complexity: MEDIUM

---

**END OF ADR-075**
