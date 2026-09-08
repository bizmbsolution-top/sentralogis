# SENTRALOGIS — API ARCHITECTURE & SPECIFICATION v1.0
## Enterprise RESTful & Event-Driven API Standard
**Document Version:** 1.0.0-API-SPEC  
**Status:** APPROVED ARCHITECTURAL STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. API DESIGN PRINCIPLES

1. **Strict Domain URL Prefixing**: All endpoints reflect the bounded context: `/api/v1/{domain}/{resource}`.
2. **Mandatory Idempotency**: All mutating state requests (`POST`, `PUT`, `PATCH`) support an `Idempotency-Key` HTTP header.
3. **Tenant & Role Security**: Every endpoint validates JWT claims (`tenant_id`, `user_id`, `role`) before invoking domain services.
4. **Zero-Cost Public Projections**: Public tracking APIs return strictly whitelisted projection models that physically omit all internal cost fields.

---

# 2. CANONICAL API ENDPOINT CATALOG

```
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                CANONICAL API ENDPOINT CATALOG                                                 |
+--------+------------------------------------------+------------+-------------------------+------------------------------------+
| Method | Path                                     | Owner      | Auth / Role Requirement | Canonical Event Produced           |
+--------+------------------------------------------+------------+-------------------------+------------------------------------+
| POST   | `/api/v1/commercial/work-orders`         | Commercial | `commercial_manager`    | `WorkOrderCreated`                 |
| PATCH  | `/api/v1/commercial/work-orders/{id}/confirm` | Commercial | `commercial_director` | `WorkOrderConfirmed`               |
| POST   | `/api/v1/forwarding/shipments`           | Forwarding | `forwarding_ops`        | `ShipmentCreated`                  |
| POST   | `/api/v1/forwarding/shipments/{id}/plan` | Forwarding | `forwarding_ops`        | `ExecutionPlanActivated`           |
| POST   | `/api/v1/forwarding/shipments/{id}/units`| Forwarding | `forwarding_ops`        | `ShipmentUnitAllocated`            |
| POST   | `/api/v1/service-requests`               | Forwarding | `forwarding_ops`        | `ServiceRequestDispatched`         |
| PATCH  | `/api/v1/service-requests/{id}/accept`   | Target SBU | `sbu_ops_manager`       | `ServiceRequestAccepted`           |
| PATCH  | `/api/v1/service-requests/{id}/reject`   | Target SBU | `sbu_ops_manager`       | `ServiceRequestRejected`           |
| POST   | `/api/v1/customs/declarations`           | Customs    | `customs_broker_ppjk`   | `CustomsDeclarationSubmitted`      |
| PATCH  | `/api/v1/customs/declarations/{id}/sppb` | Customs    | `customs_broker_ppjk`   | `CustomsReleased`                  |
| POST   | `/api/v1/trucking/jobs/{id}/dispatch`    | Trucking   | `trucking_dispatcher`   | `TruckDispatched`                  |
| POST   | `/api/v1/trucking/jobs/{id}/pod`         | Trucking   | `driver_app` / `ops`    | `CargoDelivered`, `PODUploaded`    |
| GET    | `/api/v1/tracking/{token}`               | Tracking   | `Public (No Auth)`      | None (Read Projection)             |
| GET    | `/api/v1/control-tower/live-operations`  | Intel      | `hq_ops_director`       | None (CQRS Read View)              |
+--------+------------------------------------------+------------+-------------------------+------------------------------------+
```

---

# 3. ENDPOINT SPECIFICATIONS & PAYLOAD SAMPLES

### A. Create Shipment (`POST /api/v1/forwarding/shipments`)
- **Headers:** `Authorization: Bearer <JWT>`, `Idempotency-Key: <UUID>`
- **Request Body:**
  ```json
  {
    "work_order_id": "8f9a2b10-1234-4567-8901-abcdef123456",
    "service_scope_id": "11223344-5566-7788-99aa-bbccddeeff00",
    "customer_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "origin_location_id": "loc-shanghai-port",
    "destination_location_id": "loc-byd-subang",
    "master_bl_number": "MAEU9821039",
    "etd": "2026-08-20T00:00:00Z",
    "eta": "2026-08-27T00:00:00Z",
    "manifest_items": [
      {
        "commodity_name": "EV CKD Sub-Assemblies",
        "hs_code": "8708.29.90",
        "package_quantity": 500,
        "package_type": "WOODEN_CASE",
        "gross_weight_kg": 24500,
        "volume_cbm": 68.5,
        "declared_customs_value": 125000.00
      }
    ],
    "units": [
      {
        "unit_type": "CONTAINER",
        "unit_identifier": "TGHU9081231",
        "container_details": { "iso_type": "40HC", "seal_number": "ML-INA-091238" },
        "gross_weight_kg": 24500
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "shipment_id": "shp-01918a20-b49b-7d12-8921-992182910281",
      "shipment_number": "SHP-202608-0012",
      "tracking_token": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "global_status": "PLANNED"
    }
  }
  ```

### B. Public Tracking (`GET /api/v1/tracking/{token}`)
- **Security:** Public endpoint with database-level column whitelist (No cost/margin data).
- **Response (200 OK):**
  ```json
  {
    "shipment_number": "SHP-202608-0012",
    "status": "CUSTOMS_RELEASED",
    "origin": "Shanghai Port, China",
    "destination": "Subang, Indonesia",
    "current_milestone": "Customs Release (SPPB) Granted at Patimban Port",
    "estimated_delivery_at": "2026-08-27T15:00:00Z",
    "milestones": [
      { "code": "DEPARTED_ORIGIN", "label": "Vessel Departed Shanghai", "time": "2026-08-20T10:00:00Z", "completed": true },
      { "code": "ARRIVED_PORT", "label": "Vessel Berthed at Patimban", "time": "2026-08-25T04:00:00Z", "completed": true },
      { "code": "CUSTOMS_CLEARED", "label": "Customs SPPB Released", "time": "2026-08-25T08:15:00Z", "completed": true },
      { "code": "FINAL_DELIVERY", "label": "Delivered to Factory", "time": null, "completed": false }
    ],
    "documents": [
      { "name": "Bill of Lading Draft", "url": "https://storage.sentralogis.com/public/bl-draft.pdf" }
    ]
  }
  ```

---
*Approved by API & Integration Architecture Group*
