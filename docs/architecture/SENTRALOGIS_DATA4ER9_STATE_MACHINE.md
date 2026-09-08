# SENTRALOGIS — DATA-4E-R9
# STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R9  

---

## FK Value States

| State | Legacy Match | Canonical Match | Action |
|-------|--------------|-----------------|--------|
| LEGACY ONLY | YES | NO | Transform |
| CANONICAL ONLY | NO | YES | Preserve |
| BOTH + EQUIVALENT | YES | YES | Preserve |
| BOTH + CONFLICT | YES | YES (different) | FAIL |
| NEITHER | NO | NO | FAIL |

## FK Constraint States

| State | Detection | Action |
|-------|-----------|--------|
| LEGACY FK ONLY | Old constraint exists | Migrate |
| CANONICAL FK ONLY | New constraint exists | NO-OP |
| BOTH | Both exist | FAIL |
| NEITHER | Neither exists | FAIL |

---

**END OF STATE MACHINE**
