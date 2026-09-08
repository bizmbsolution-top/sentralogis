# SENTRALOGIS — DATA-4E-R6
# DELETE SEMANTICS

**Date:** 2026-09-02  
**Phase:** DATA-4E-R6  

---

## ON DELETE Equivalence

| FK Column | Legacy Action | Canonical Action | Equivalent? |
|-----------|---------------|------------------|-------------|
| fw_order_headers.origin_port_id | RESTRICT | RESTRICT | YES |
| fw_order_headers.dest_port_id | RESTRICT | RESTRICT | YES |
| fw_legs.start_location_id | RESTRICT | RESTRICT | YES |
| fw_legs.end_location_id | RESTRICT | RESTRICT | YES |

## ON UPDATE Equivalence

Legacy constraints had no explicit ON UPDATE (defaults to NO ACTION).
New constraints have no explicit ON UPDATE (defaults to NO ACTION).
**Equivalent: YES**

---

**END OF DELETE SEMANTICS**
