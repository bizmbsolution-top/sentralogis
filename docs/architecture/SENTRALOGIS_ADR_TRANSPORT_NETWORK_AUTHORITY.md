# ADR-074 — Transport Network / Location Authority

**Status:** RATIFIED (DATA-4A Human Ratification, 2026-09-02)  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture, Location component)  

---

## 1. Context

DATA-4 Discovery analyzed transport network representation. Location hierarchy (Port→Terminal→Berth) covers all network node concepts.

## 2. Decision

**Transport network participation is represented by md_locations hierarchy + type.**

No separate network node master table is created.

## 3. Rationale

- md_locations.parent_id supports hierarchy
- location_type classifies network participation
- Port→Terminal→Berth covers all network concepts
- Separate master would duplicate location authority

## 4. Alternatives Rejected

| Alternative | Rejected Because |
|-------------|------------------|
| Network node master | Duplicates md_locations |
| Location + network roles | Over-engineering |

## 5. Invariants

1. Location hierarchy = network hierarchy
2. No separate network node master exists
3. Network participation derived from location type + hierarchy

## 6. Consequences

- Clear network representation through location hierarchy
- No duplication of location authority

---

**END OF ADR-074**
