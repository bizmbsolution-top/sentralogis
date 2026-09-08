# SENTRALOGIS — DATA-4E-R7
# DELETE/UPDATE SEMANTICS

**Date:** 2026-09-02  
**Phase:** DATA-4E-R7  

---

## ON DELETE Equivalence

| FK Column | Legacy Action | Canonical Action | Equivalent? |
|-----------|---------------|------------------|-------------|
| origin_port_id | RESTRICT | RESTRICT | YES |
| dest_port_id | RESTRICT | RESTRICT | YES |
| start_location_id | RESTRICT | RESTRICT | YES |
| end_location_id | RESTRICT | RESTRICT | YES |

## ON UPDATE Equivalence

| FK Column | Legacy Action | Canonical Action | Equivalent? |
|-----------|---------------|------------------|-------------|
| origin_port_id | NO ACTION | NO ACTION | YES |
| dest_port_id | NO ACTION | NO ACTION | YES |
| start_location_id | NO ACTION | NO ACTION | YES |
| end_location_id | NO ACTION | NO ACTION | YES |

---

**END OF DELETE/UPDATE SEMANTICS**
