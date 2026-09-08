# SENTRALOGIS — CANONICAL FORWARDING SHIPMENT API CONTRACT (v1.0)
## REST API Specification for Canonical Shipment Orchestrator
**Document Version:** 1.0.0-CONTRACT  
**Date:** 26 August 2026  
**Status:** FROZEN & ACTIVE  
**Base URL:** `/api/v1/forwarding`  

---

# 1. AUTHENTICATION & MULTI-TENANCY CONTEXT

All API routes require authentication. Tenant isolation is enforced server-side:
- **Web App / SSR Session:** Authenticated via Supabase auth cookies $\rightarrow$ `profiles.tenant_id`.
- **API Clients / Machine Integrations:** Authenticated via `Authorization: Bearer <token>` or `x-tenant-id` header.
- **Security Rule:** Any `tenant_id` supplied in the request body or query string is **ignored** or must match the authenticated tenant context. Cross-tenant access returns **403 Forbidden** or **404 Not Found**.

---

# 2. ENDPOINTS INVENTORY & SPECIFICATION

### 1. Create Shipment
- **Route:** `POST /api/v1/forwarding/shipments`
- **Request Headers:**
  - `Content-Type: application/json`
  - `Idempotency-Key: <string>` (optional, recommended)
  - `x-correlation-id: <string>` (optional)
- **Request Body:**
  ```json
  {
    "work_order_id": "uuid",
    "service_scope_id": "uuid",
    "customer_id": "uuid",
    "shipper_id": "uuid (optional)",
    "consignee_id": "uuid (optional)",
    "origin_location_id": "CNSHA",
    "destination_location_id": "IDBYD",
    "etd": "2026-09-01T00:00:00Z",
    "eta": "2026-09-15T00:00:00Z",
    "master_bl_number": "MBL-998877",
    "house_bl_number": "HBL-112233",
    "manifest_items": [
      {
        "commodity_name": "BYD EV Battery Packs",
        "hs_code": "8507.60.00",
        "package_quantity": 50,
        "package_type": "PALLET",
        "gross_weight_kg": 25000,
        "volume_cbm": 45.0,
        "declared_customs_value": 150000,
        "declared_currency": "USD"
      }
    ],
    "units": [
      {
        "unit_type": "CONTAINER",
        "unit_identifier": "CONT-TEMU-1234567",
        "container_number": "TEMU1234567",
        "iso_type": "40HC",
        "seal_number": "SEAL-8899",
        "tare_weight_kg": 3800,
        "total_gross_weight_kg": 28800
      }
    ],
    "execution_legs": [
      {
        "leg_sequence": 1,
        "leg_code": "LEG-01-OCEAN",
        "transport_mode": "OCEAN_VESSEL",
        "origin_location_id": "CNSHA",
        "destination_location_id": "IDPTB"
      },
      {
        "leg_sequence": 2,
        "leg_code": "LEG-02-ROAD",
        "transport_mode": "ROAD_TRUCK",
        "origin_location_id": "IDPTB",
        "destination_location_id": "IDBYD"
      }
    ]
  }
  ```
- **Responses:**
  - `201 Created`: Returns canonical `ShipmentAggregate`.
  - `400 Bad Request`: Missing mandatory fields.
  - `401 Unauthorized`: Missing or invalid session.

---

### 2. List Shipments
- **Route:** `GET /api/v1/forwarding/shipments`
- **Query Parameters:**
  - `status`: Filter by `ShipmentGlobalStatus` (`DRAFT`, `PLANNED`, `IN_TRANSIT`, `DELIVERED`, etc.)
  - `work_order_id`: Filter by Commercial Work Order UUID
  - `customer_id`: Filter by Customer UUID
  - `limit`: Number of records (default: 50)
- **Response:** `200 OK` (Array of shipments for authenticated tenant).

---

### 3. Get Shipment Detail
- **Route:** `GET /api/v1/forwarding/shipments/:id`
- **Response:** `200 OK` (Full composite aggregate: `shipment`, `manifest_items`, `units`, `execution_plan`, `execution_legs`, `milestones`, `exceptions`).
- **Error:** `404 Not Found` if shipment does not exist or belongs to another tenant.

---

### 4. Transition Shipment Status / Update
- **Route:** `PATCH /api/v1/forwarding/shipments/:id`
- **Request Body:**
  ```json
  {
    "status": "IN_TRANSIT",
    "notes": "Vessel departed Shanghai port on schedule."
  }
  ```
- **Responses:**
  - `200 OK`: Returns updated shipment aggregate.
  - `409 Conflict`: Invalid state machine transition.
  - `412 Precondition Failed`: Active blocking exceptions prevent transition to `COMPLETED`.

---

### 5. Polymorphic Handling Units Management
- **List Units:** `GET /api/v1/forwarding/shipments/:id/units`
- **Add Units:** `POST /api/v1/forwarding/shipments/:id/units`
  - Supports: `CONTAINER`, `BULK_MT`, `PALLET`, `BOX`, `BREAKBULK`, `VEHICLE`.

---

### 6. Execution Plan & Multi-Modal Legs
- **Get Plan:** `GET /api/v1/forwarding/shipments/:id/execution-plan`
- **Create/Replace Plan:** `POST /api/v1/forwarding/shipments/:id/execution-plan`
- **Add Leg:** `POST /api/v1/forwarding/shipments/:id/legs`
- **Update Leg:** `PATCH /api/v1/forwarding/shipments/:id/legs/:legId`
- **Delete Leg:** `DELETE /api/v1/forwarding/shipments/:id/legs/:legId`

---

### 7. Leg Unit Assignment
- **Assign Units to Leg:** `POST /api/v1/forwarding/shipments/:id/legs/:legId/units`
  - Body: `{ "unit_ids": ["unit-uuid-1", "unit-uuid-2"] }`
- **Remove Unit from Leg:** `DELETE /api/v1/forwarding/shipments/:id/legs/:legId/units/:unitId`

---

### 8. Milestone Timeline & Exceptions Watchdog
- **List Milestones:** `GET /api/v1/forwarding/shipments/:id/milestones`
- **Append Milestone:** `POST /api/v1/forwarding/shipments/:id/milestones`
- **List Exceptions:** `GET /api/v1/forwarding/shipments/:id/exceptions`
- **Log Exception:** `POST /api/v1/forwarding/shipments/:id/exceptions`
- **Resolve Exception:** `PATCH /api/v1/forwarding/shipments/:id/exceptions/:exceptionId`
- **Unified Timeline:** `GET /api/v1/forwarding/shipments/:id/timeline`

---

# 3. ERROR MAPPING CONTRACT

| Domain Error | HTTP Status | Error Code | Description |
| :--- | :---: | :--- | :--- |
| `ShipmentNotFoundError` | **404** | `SHIPMENT_NOT_FOUND` | Shipment does not exist or foreign tenant. |
| `InvalidShipmentStatusError` | **409** | `INVALID_SHIPMENT_STATUS_TRANSITION` | Illegal transition in state machine graph. |
| `InvalidShipmentDataError` | **400** | `INVALID_SHIPMENT_DATA` | Validation error on input payload. |
| `ExecutionLegDependencyError` | **422** | `EXECUTION_LEG_DEPENDENCY_ERROR` | Sequence violation (e.g. road before customs release). |
| `UnresolvedExceptionsError` | **412** | `UNRESOLVED_EXCEPTIONS_HOLD` | Active critical exceptions block completion. |
| `PodRequiredError` | **412** | `POD_REQUIRED_FOR_COMPLETION` | Proof of Delivery required. |
| `ShipmentTenantIsolationViolationError` | **403** | `TENANT_ISOLATION_VIOLATION` | Cross-tenant access forbidden. |
| `Internal Error` | **500** | `INTERNAL_SERVER_ERROR` | Sanitized server error. |
