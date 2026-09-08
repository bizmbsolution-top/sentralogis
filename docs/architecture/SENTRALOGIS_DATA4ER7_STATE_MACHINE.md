# SENTRALOGIS — DATA-4E-R7
# STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R7  

---

## Migration State Machine

```
START
  │
  ▼
PRE-FLIGHT VALIDATION
  │ (fail → RAISE EXCEPTION)
  ▼
CANONICAL RECORD RESOLUTION
  │ (collision → RAISE EXCEPTION)
  ▼
PRE-TRANSFORMATION COVERAGE
  │ (unmapped → RAISE EXCEPTION)
  ▼
FK VALUE TRANSFORMATION
  │ (tenant-scoped, state-aware)
  ▼
POST-TRANSFORMATION VALIDATION
  │ (orphan/tenant violation → RAISE EXCEPTION)
  ▼
FK CONSTRAINT CONVERGENCE
  │
  ▼
END
```

## State Classification for FK Values

| State | Detection | Action |
|-------|-----------|--------|
| Legacy Only | Matches fw_locations, not md_locations | Transform |
| Canonical Only | Matches md_locations, not fw_locations | Preserve |
| Both (equivalent) | Matches both, same entity | Transform |
| Neither | Matches neither | FAIL |

---

**END OF STATE MACHINE**
