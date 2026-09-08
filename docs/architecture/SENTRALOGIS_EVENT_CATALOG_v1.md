# SENTRALOGIS — CANONICAL EVENT CATALOG v1.0
## Enterprise Logistics Event-Driven Architecture (EDA) Standard
**Document Version:** 1.0.0-EVENTS  
**Status:** APPROVED ARCHITECTURAL STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. CANONICAL EVENT ENVELOPE SCHEMA

All Sentralogis events conform to the CloudEvents v1.0 standard with enterprise logistics extensions:

```json
{
  "$schema": "https://json-schema.sentralogis.com/v1/event-envelope.json",
  "event_id": "evt-01918a20-b49b-7d12-8921-992182910281",
  "event_name": "CargoDelivered",
  "event_version": "1.0.0",
  "event_category": "INTEGRATION_EVENT",
  "occurred_at": "2026-08-25T08:30:00.000Z",
  "tenant_id": "ten-sentra-hq-01",
  "aggregate_type": "TruckingJobOrder",
  "aggregate_id": "jo-trk-202608-0091",
  "producer_domain": "TRUCKING",
  "correlation_id": "corr-shp-202608-0012",
  "causation_id": "evt-driver-arrived-9921",
  "idempotency_key": "idem-pod-jo-trk-202608-0091-drop1",
  "payload": {
    "shipment_id": "shp-202608-0012",
    "service_request_id": "req-trk-202608-0091",
    "execution_leg_id": "leg-04-haulage",
    "delivery_location_id": "loc-byd-subang-dock-a",
    "recipient_name": "Budi Santoso",
    "recipient_title": "Receiving Supervisor",
    "delivered_units": ["unit-cont-40-001"],
    "epod_signature_url": "https://storage.sentralogis.com/pod/sig-0091.png",
    "epod_photo_urls": ["https://storage.sentralogis.com/pod/cargo-0091.jpg"],
    "received_at": "2026-08-25T08:29:45.000Z"
  }
}
```

---

# 2. EVENT TAXONOMY & CLASSIFICATION

Sentralogis classifies events into 3 discrete scopes:
1. **Domain Events**: Internal occurrences mutating an aggregate within its private bounded context (e.g. `DriverAssigned`, `BinPutawayCompleted`).
2. **Integration Events**: Boundary-crossing events published to `event_outbox` for cross-SBU coordination (e.g. `CustomsReleased`, `CargoDelivered`).
3. **Projection Events**: Sanitized event streams consumed by CQRS materialized views and Control Tower caches.

---

# 3. COMPLETE CANONICAL EVENT CATALOG

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                           CANONICAL LOGISTICS EVENT CATALOG                                           |
+-----------------------------------------------------------------------------------------------------------------------+
| Event Name                    | Category    | Producer   | Key Consumers           | Business Trigger                 |
+-------------------------------+-------------+------------+-------------------------+----------------------------------+
| `WorkOrderCreated`            | Domain      | Commercial | Commercial Audit        | Draft WO initialized             |
| `WorkOrderConfirmed`          | Integration | Commercial | Forwarding, Finance     | Customer approves quote/contract |
| `ServiceScopeBound`           | Integration | Commercial | Forwarding Orchestrator | Incoterms & boundaries locked    |
| `ShipmentCreated`             | Integration | Forwarding | Control Tower, Finance  | Operational shipment generated   |
| `ShipmentUnitAllocated`       | Domain      | Forwarding | Control Tower           | Handling unit bound to manifest  |
| `ExecutionPlanActivated`      | Domain      | Forwarding | Control Tower           | Multi-modal routing committed    |
| `ServiceRequestDispatched`    | Integration | Forwarding | Target SBU (Trk/Cus/WH) | Leg delegated to executor        |
| `ServiceRequestAccepted`      | Integration | SBU Exec   | Forwarding Orchestrator | Target SBU confirms capacity     |
| `ServiceRequestRejected`      | Integration | SBU Exec   | Forwarding Orchestrator | Target SBU rejects; triggers reroute |
| `TruckDispatched`             | Integration | Trucking   | Forwarding, Ctrl Tower  | Prime mover starts journey       |
| `CargoPickedUp`               | Integration | Trucking/WH| Forwarding, Ctrl Tower  | Cargo loaded and signed at origin|
| `VesselArrivedAtPort`         | Integration | Exchange   | SBU Customs, Ctrl Tower | Ocean carrier berths at port     |
| `CustomsDeclarationSubmitted` | Integration | Customs    | Forwarding, Ctrl Tower  | PIB/PEB EDI transmitted to CEISA |
| `CustomsBillingGenerated`     | Integration | Customs    | Finance, Customer Tower | Kode Billing Simponi issued      |
| `CustomsPaymentCompleted`     | Integration | Finance/Cus| Customs, Forwarding     | NTPN receipt verified in bank    |
| `CustomsReleased`             | Integration | Customs    | Forwarding, SBU Trucking| SPPB released by customs system  |
| `WarehouseReceived`           | Integration | Warehouse  | Forwarding, Ctrl Tower  | Inbound CFS cargo tallied        |
| `WarehouseStuffed`            | Integration | Warehouse  | Forwarding, Marine      | Cargo packed & container sealed  |
| `WarehouseStripped`           | Integration | Warehouse  | Forwarding, Trucking    | Container deconsolidated         |
| `CargoDelivered`              | Integration | Trucking   | Forwarding, Ctrl Tower  | Physical dropoff & e-POD signed  |
| `PODUploaded`                 | Integration | Trucking   | Finance, Customer Tower | Proof of Delivery verified       |
| `EmptyContainerReturned`      | Integration | Trucking   | Forwarding, Finance     | Empty container returned to depo |
| `ShipmentCompleted`           | Integration | Forwarding | Finance, Control Tower  | All legs done; P&L reconciled    |
| `DemurrageRiskDetected`       | Projection  | Intel/AI   | Internal Ops, Customer  | Free time expiry < 24 hours      |
| `ShipmentExceptionRaised`     | Integration | All SBUs   | Control Tower, AI Copilot| Cargo damage, breakdown, delay   |
| `CustomsItemImported`         | Domain      | Customs    | Customs Audit, Validation| Bulk items ingested into declaration |
| `CustomsDocumentVerified`     | Domain      | Customs    | Customs Audit, Lartas    | Document verified in vault       |
| `CustomsExceptionWaived`      | Domain      | Customs    | Customs Audit, Compliance| Warning exception waived with justification |
| `CustomsDecisionRecorded`     | Domain      | Customs    | Customs Audit, CEISA     | Formal specialist decision locked|
| `CustomsCeisaPrepared`        | Domain      | Customs    | Customs Audit, Gate      | Versioned CEISA artifact generated|
+-----------------------------------------------------------------------------------------------------------------------+
```

---

# 4. EVENT IDEMPOTENCY & DEDUPLICATION

To guarantee *At-Least-Once Delivery* without duplicate execution:
1. Every consumer maintains a persistent log in `event_consumption_log` keyed by `(event_id, consumer_name)`.
2. Financial ledger entries verify `(tenant_id, causation_id)` before applying journal lines.

---
*Approved by Event-Driven Architecture Group*
