# SENTRALOGIS — DATA-4E-R10
# VALUE STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R10  

---

## FK Value States

| State | Legacy Match | Canonical Match | Action |
|-------|--------------|-----------------|--------|
| LEGACY ONLY | YES | NO | Transform |
| CANONICAL ONLY | NO | YES | Preserve |
| BOTH + EQUIVALENT | YES | YES | Preserve |
| BOTH + CONFLICT | YES | YES (different) | FAIL |
| NEITHER | NO | NO | FAIL |

## UUID Collision Handling

| Case | Same UUID | Same Tenant | Same Entity | Action |
|------|-----------|-------------|-------------|--------|
| 1 | YES | YES | YES | Safe equivalent |
| 2 | YES | NO | — | Cross-tenant FAIL |
| 3 | YES | YES | NO | Conflict FAIL |
| 4 | NO | — | — | Deterministic mapping |

---

**END OF VALUE STATE MACHINE**
