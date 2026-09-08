# SENTRALOGIS — DATA-4E-R5
# TENANT-SCOPED TRANSFORMATION

**Date:** 2026-09-02  
**Phase:** DATA-4E-R5  

---

## 4/4 Tenant-SFK Updates

| # | Column | WHERE Clause |
|---|--------|--------------|
| 1 | fw_order_headers.origin_port_id | `oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id` |
| 2 | fw_order_headers.dest_port_id | `oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id` |
| 3 | fw_legs.start_location_id | `leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id` |
| 4 | fw_legs.end_location_id | `leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id` |

---

**END OF TENANT-SCOPED TRANSFORMATION**
