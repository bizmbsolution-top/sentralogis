# SENTRALOGIS — SERVICE CONTRACT SPECIFICATION v1.0
## Cross-Domain Delegation & Capability Invocation Standard
**Document Version:** 1.0.0-CONTRACTS  
**Status:** APPROVED INTEGRATION STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. CORE PHILOSOPHY

The `svc_service_requests` mechanism is the sole authorized protocol for inter-domain capability invocation in Sentralogis. 

### Invariants:
1. Forwarding **never inserts** directly into `trk_job_orders`, `cus_declarations`, or `wh_handling_jobs`.
2. Forwarding creates an immutable request contract specifying **what** needs to be achieved, **where**, **when**, and under what **SLA**.
3. The executing SBU evaluates capacity, resources, and readiness, accepts the contract, and creates its private execution job.

---

# 2. CONTRACT LIFECYCLE & STATE MACHINE

```
+----------------------------------------------------------------------------------------------------+
|                                SERVICE REQUEST STATE TRANSITIONS                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|            [ISSUED] (Forwarding publishes contract)                                                |
|               │                                                                                    |
|               ▼                                                                                    |
|       [ACKNOWLEDGED] (Target SBU validates schema & parameters)                                    |
|          /         \                                                                               |
|         /           \                                                                              |
|  (Capacity OK)   (No Capacity / Resource Conflict)                                                 |
|       /               \                                                                            |
|      v                 v                                                                           |
|  [ACCEPTED]        [REJECTED] ──► [REROUTING] ──► Forwarding selects backup vendor/SBU             |
|      │                                                                                             |
|      ▼                                                                                             |
|  [EXECUTING] (Target SBU starts physical/regulatory task)                                          |
|      │                                                                                             |
|      ▼                                                                                             |
|  [FULFILLED] (Target SBU uploads e-POD / SPPB, emits Completion Event)                             |
|                                                                                                    |
|  * [CANCELLED] can be invoked by Forwarding only prior to EXECUTING state.                         |
+----------------------------------------------------------------------------------------------------+
```

---

# 3. CANONICAL CONTRACT SCHEMAS

### A. Trucking Transport Request Contract (`TRK_CONTAINER_HAULAGE`)
```json
{
  "$schema": "https://json-schema.sentralogis.com/v1/service-request/trucking.json",
  "request_header": {
    "request_number": "REQ-TRK-202608-0091",
    "correlation_id": "corr-shp-202608-0012",
    "idempotency_key": "idem-leg-04-haulage-v1",
    "source_domain": "FORWARDING",
    "target_domain": "TRUCKING",
    "service_sku_code": "TRK_CONTAINER_HAULAGE_40FT"
  },
  "route_specification": {
    "pickup": {
      "location_id": "loc-patimban-gate-3",
      "location_name": "Patimban Port CY Gate 3",
      "coordinates": { "latitude": -6.2411, "longitude": 107.9012 },
      "window_start": "2026-08-27T08:00:00Z",
      "window_end": "2026-08-27T10:00:00Z",
      "contact_person": "Terminal Dispatcher",
      "contact_phone": "+628112345678"
    },
    "dropoff": {
      "location_id": "loc-byd-subang-dock-a",
      "location_name": "BYD Manufacturing Plant Dock A",
      "coordinates": { "latitude": -6.5512, "longitude": 107.7611 },
      "target_delivery_time": "2026-08-27T15:00:00Z",
      "contact_person": "Budi Santoso (Receiving)",
      "contact_phone": "+628129876543"
    }
  },
  "cargo_units": [
    {
      "unit_id": "unit-cont-40-001",
      "unit_type": "CONTAINER",
      "container_number": "TGHU9081231",
      "iso_type": "40HC",
      "seal_number": "ML-INA-091238",
      "gross_weight_kg": 24500,
      "is_hazardous": false
    }
  ],
  "sla_contract": {
    "max_transit_duration_minutes": 240,
    "gps_telemetry_interval_seconds": 60,
    "electronic_pod_required": true,
    "physical_surat_jalan_return_required": true
  }
}
```

### B. Customs Clearance Request Contract (`CUS_PIB_IMPORT`)
```json
{
  "$schema": "https://json-schema.sentralogis.com/v1/service-request/customs.json",
  "request_header": {
    "request_number": "REQ-CUS-202608-0044",
    "correlation_id": "corr-shp-202608-0012",
    "idempotency_key": "idem-leg-02-customs-v1",
    "source_domain": "FORWARDING",
    "target_domain": "CUSTOMS",
    "service_sku_code": "CUS_IMPORT_PIB_STANDARD"
  },
  "declaration_parameters": {
    "declaration_type": "PIB_IMPORT",
    "customs_office_code": "040300",
    "importer_entity_id": "ent-byd-indonesia",
    "ppjk_entity_id": "ent-sentralogis-ppjk",
    "supporting_documents": [
      { "doc_type": "BILL_OF_LADING", "doc_number": "MAEU9821039", "doc_date": "2026-08-20" },
      { "doc_type": "COMMERCIAL_INVOICE", "doc_number": "INV-BYD-2026-881", "doc_date": "2026-08-18" },
      { "doc_type": "PACKING_LIST", "doc_number": "PL-BYD-2026-881", "doc_date": "2026-08-18" },
      { "doc_type": "COO_FORM_E", "doc_number": "COO-CN-2026-0091", "doc_date": "2026-08-19" }
    ]
  },
  "manifest_summary": {
    "total_packages": 500,
    "package_type": "WOODEN_CASE",
    "total_gross_weight_kg": 24500,
    "declared_cif_usd": 125000.00
  },
  "sla_contract": {
    "target_sppb_duration_hours": 24,
    "auto_notify_billing_simponi": true
  }
}
```

### C. Warehouse Handling Request Contract (`WH_CROSSDOCK_STAGING`)
```json
{
  "$schema": "https://json-schema.sentralogis.com/v1/service-request/warehouse.json",
  "request_header": {
    "request_number": "REQ-WH-202608-0019",
    "correlation_id": "corr-shp-202608-0055",
    "idempotency_key": "idem-leg-02-wh-staging",
    "source_domain": "FORWARDING",
    "target_domain": "WAREHOUSE",
    "service_sku_code": "WH_CONSOL_CROSSDOCK"
  },
  "handling_specification": {
    "warehouse_location_id": "loc-cfs-perak-hub",
    "operation_type": "CROSSDOCK_SORT_AND_STAGING",
    "inbound_carrier": { "mode": "TRUCK", "reference": "B-9123-UXX" },
    "outbound_carrier": { "mode": "CONTAINER_STUFFING", "reference": "MRTU112901" },
    "manifest_items": [
      { "commodity": "Spare Parts", "quantity": 120, "uom": "CARTON", "gross_weight_kg": 1800, "volume_cbm": 4.5 }
    ]
  }
}
```

---

# 4. CAPABILITY MATCHING ALGORITHM

When dispatching a `svc_service_requests`, the Forwarding Orchestrator executes:
1. **Capability Filter**: Queries `md_entities` with matching `vendor_type` and active tenant service authorization.
2. **SLA & Geofence Check**: Verifies that the provider's active fleet/depot coverage overlaps with the request's origin and destination geocodes.
3. **Idempotency Gate**: Rejects duplicate dispatches using `(tenant_id, idempotency_key)` uniqueness constraint.

---
*Approved by Domain Integration Architecture Group*
