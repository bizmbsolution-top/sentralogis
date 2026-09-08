# ADR-072 — Enterprise Resource Authority

**Status:** RATIFIED (DATA-4A Human Ratification, 2026-09-02)  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture), ADR-071 (External Reference Architecture)  

---

## 1. Context

DATA-4 Discovery analyzed the existing SENTRALOGIS resource landscape. Domain-specific resources (md_fleets, md_drivers) are well-governed within their operational domains. No cross-domain resource identity requirement was found.

## 2. Problem

Should SENTRALOGIS introduce a generic enterprise-wide `resources` master table?

## 3. Decision

**SENTRALOGIS SHALL NOT introduce a generic enterprise-wide `resources` master at this stage.**

Domain-specific resources remain authoritative where their domain semantics require them.

## 4. Forces / Constraints

- md_fleets is trucking-specific and well-governed
- md_drivers is trucking-specific and well-governed
- No cross-domain resource identity requirement exists
- Generic abstraction would duplicate existing authorities
- Migration cost would be prohibitive

## 5. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Generic resources table | Duplicates existing domain authorities |
| Resource registry + extensions | Over-engineering for current needs |
| Capability-oriented network | Unnecessary complexity |

## 6. Canonical Authority

| Resource | Authority |
|----------|-----------|
| Vehicle/Fleet | md_fleets |
| Driver | md_drivers |
| Container | shp_unit_containers |
| Shipment Unit | shp_units |

## 7. Invariants

1. Domain-specific resources remain canonical within their domains.
2. No generic enterprise Resource master exists.
3. New resource types require ADR justification.

## 8. Tenant / Security Model

- Domain resources inherit tenant ownership from their parent domain
- RLS enforced at domain level
- IdentityContext governs access

## 9. Consequences

- No duplication of existing domain authorities
- Clear domain ownership of resources
- Future resource types require explicit ADR

## 10. Future Revisit Conditions

Revisit if:
- Cross-domain resource identity becomes required
- Resource sharing across SBUs becomes necessary
- New business models require generic resource abstraction

---

**END OF ADR-072**
