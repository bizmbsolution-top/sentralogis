# ADR-073 — Carrier / Transport Provider Authority

**Status:** RATIFIED (DATA-4A Human Ratification, 2026-09-02)  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture)  

---

## 1. Context

DATA-4 Discovery analyzed carrier representation. Carrier identity is currently represented by md_entities with party_roles.CARRIER (post-DATA-3).

## 2. Decision

**Carrier is represented by md_entities + party_roles.CARRIER.**

No separate carrier master table is created.

## 3. Rationale

- Party identity is canonical (md_entities)
- Carrier role is established (party_roles.CARRIER)
- Mode capability can be derived from shp_execution_legs.transport_mode history
- Separate master would duplicate party authority

## 4. Alternatives Rejected

| Alternative | Rejected Because |
|-------------|------------------|
| md_carriers table | Duplicates md_entities |
| Carrier as resource | Carrier is a role, not a resource |
| Mode-specific masters | Mode derived from execution history |

## 5. Invariants

1. Carrier = Party + CARRIER role
2. No competing carrier master exists
3. Transport mode capability is derived, not mastered

## 6. Consequences

- Clear carrier identity through party + role
- No duplication of party authority
- Mode capability can be added later if needed

---

**END OF ADR-073**
