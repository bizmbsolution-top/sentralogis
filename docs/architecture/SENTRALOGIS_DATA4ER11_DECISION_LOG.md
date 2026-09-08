# SENTRALOGIS — DATA-4E-R11
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

## 1. Forensic Decisions

| Decision | Rationale |
|----------|-----------|
| R10 rejected | Critical defects found |
| FK constraint names wrong | Original migrations didn't name constraints |
| Second-run not NO-OP | R10 drops/re-adds constraints |
| Value state machine missing | R10 doesn't detect BOTH+CONFLICT or NEITHER |
| Application dependency safe | No production code references fw_locations |

## 2. Verdict

**YELLOW — R10 MUST NOT BE AUTHORIZED. R11 REPAIR REQUIRED.**

---

**END OF DECISION LOG**
