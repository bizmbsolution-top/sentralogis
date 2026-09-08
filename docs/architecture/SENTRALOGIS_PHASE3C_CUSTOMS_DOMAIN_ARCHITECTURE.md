# SENTRALOGIS — SBU CUSTOMS CLEARANCE DOMAIN ARCHITECTURE (v1.0)
## Standalone PPJK & Customs Declaration Bounded Context
**Document Version:** 1.0.0-CUSTOMS-ARCH  
**Date:** 26 August 2026  
**Status:** ARCHITECTURE FROZEN & ACTIVE  
**Classification:** Internal Technical Architecture  
**Author:** Senior Domain Architect + Principal Backend Engineer  

---

# 1. BOUNDED CONTEXT & DOMAIN BOUNDARIES

In **Sentralogis Target Architecture v1.0**, **SBU Customs Clearance** is an independent Bounded Context:
- **Customs Declaration is NOT a Work Order:** WorkOrder belongs to the Commercial domain.
- **Customs Declaration is NOT a Shipment:** Shipment belongs to Forwarding/Journey Orchestration.
- **Customs owns its own Aggregate Root:** `cus_declarations` and its child entity `cus_classification_lines`.
- **Zero Direct Mutations:** Customs never directly mutates `job_orders`, `work_orders`, or `shp_*` tables.
- **Service Request Consumption:** Customs receives work from Forwarding or standalone Commercial scopes via `svc_service_requests` $\rightarrow$ `CustomsServiceRequestAdapter`.

```
Commercial Work Order (commercial_work_orders)
        │
        ▼ (Optional Forwarding Scope)
Forwarding Shipment (shp_shipments)
        │
        ▼ (ExecutionLeg: CUSTOMS_CLEARANCE)
Service Request (svc_service_requests: CUS_IMPORT_PIB_STANDARD)
        │
        ▼
Customs Adapter (lib/domain/service-contracts/adapters/customs-adapter.ts)
        │
        ▼
[CUSTOMS BOUNDED CONTEXT]
  └── Customs Declaration Aggregate Root (cus_declarations)
        ├── Classification Lines (cus_classification_lines)
        ├── Deterministic Tax Engine (Nilai Pabean, BM, PPN, PPh 22)
        ├── Channel Management (GREEN, YELLOW, RED)
        └── SPPB Release Engine
```

---

# 2. LIFECYCLE STATE MACHINE

Customs declaration transitions are server-enforced via `CustomsStateMachine`:
$$\mathbf{DRAFT} \longrightarrow \mathbf{DOCUMENTS\_PENDING} \longrightarrow \mathbf{READY\_FOR\_CLASSIFICATION} \longrightarrow \mathbf{CLASSIFIED} \longrightarrow \mathbf{READY\_FOR\_SUBMISSION} \longrightarrow \mathbf{SUBMITTED} \longrightarrow \mathbf{CHANNEL\_ASSIGNED}$$

### Channel-Driven Pathways:
1. **GREEN Channel (Fast Track / AEO Priority):** $\rightarrow \mathbf{APPROVED} \rightarrow \mathbf{SPPB\_PENDING} \rightarrow \mathbf{RELEASED} \rightarrow \mathbf{COMPLETED}$.
2. **YELLOW Channel (Document Review):** $\rightarrow \mathbf{DOCUMENT\_REVIEW} \rightarrow \mathbf{APPROVED} \rightarrow \mathbf{RELEASED}$.
3. **RED Channel (Physical Inspection):** $\rightarrow \mathbf{INSPECTION\_REQUIRED} \rightarrow \mathbf{APPROVED} \rightarrow \mathbf{RELEASED}$.
4. **Exceptions / Rejections:** Any active state can transition to $\mathbf{ON\_HOLD}$ or $\mathbf{REJECTED}$.

---

# 3. DETERMINISTIC INDONESIAN CUSTOMS TAX CALCULATION ENGINE

The `CustomsTaxCalculator` provides deterministic, testable calculation formulas:
$$\text{Nilai Pabean (IDR)} = \text{round}(\text{CIF Value (USD)} \times \text{Kurs Pajak})$$
$$\text{Bea Masuk (IDR)} = \text{round}(\text{Nilai Pabean} \times \text{BM Rate \%})$$
$$\text{Nilai Impor (IDR)} = \text{Nilai Pabean} + \text{Bea Masuk}$$
$$\text{PPN (IDR)} = \text{round}(\text{Nilai Impor} \times \text{PPN Rate \%})$$
$$\text{PPh Pasal 22 (IDR)} = \text{round}(\text{Nilai Impor} \times \text{PPh Rate \%})$$
$$\text{Total Pajak (IDR)} = \text{Bea Masuk} + \text{PPN} + \text{PPh 22}$$

---

# 4. EVENT OUTBOX INTEGRATION

Customs operations publish CloudEvents to `event_outbox`:
- `customs.declaration.created`
- `customs.declaration.status_changed`
- `customs.channel.assigned`
- `customs.sppb.issued`
- `customs.declaration.released`

---
*Approved by Senior Domain Architect — 26 August 2026*
