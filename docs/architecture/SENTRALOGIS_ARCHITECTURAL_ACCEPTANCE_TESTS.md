# SENTRALOGIS — ARCHITECTURAL ACCEPTANCE TESTS v1.0
## 20 Executable Enterprise Architecture Validation Scenarios
**Document Version:** 1.0.0-ACCEPTANCE-TESTS  
**Status:** APPROVED VALIDATION STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. TEST HARNESS & CRITERIA

The following 20 architectural test scenarios validate the compliance of the canonical implementation against **Target Architecture v1.0**. Every scenario defines strict **Preconditions**, **Execution Steps**, **Invariants**, and **Assertions**.

```
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                ARCHITECTURAL TEST MATRIX                                                      |
+----+-----------------------------------------------------+-----------------------------+----------------------------------+
| #  | Scenario Title                                      | Primary Domain Validated    | Critical Assertion               |
+----+-----------------------------------------------------+-----------------------------+----------------------------------+
| 01 | 1 WorkOrder $\rightarrow$ 1,000 Shipments           | Commercial / Forwarding     | Zero foreign key performance deg |
| 02 | 1 Shipment $\rightarrow$ 20 Execution Legs          | Forwarding / Orchestration  | Correct sequential activation    |
| 03 | 1 ShipmentUnit $\rightarrow$ Multi-Leg Inheritance  | Forwarding / Unit Lifecycle | State follows active leg         |
| 04 | Customs Clearance Standalone Order                  | Customs Clearance           | Zero Shipment / Zero Transport   |
| 05 | Trucking Haulage Standalone Order                   | Trucking                    | Zero Forwarding Shipment required|
| 06 | Full Multimodal (Truck + Sea + Customs + WH)        | Multi-SBU Orchestration     | Seamless contract delegation     |
| 07 | Bulk Aluminium 5,000 MT (No Container)             | Cargo Agnosticism (Bulk MT) | Zero container dependency        |
| 08 | Vehicle Logistics (CBU Carrier)                     | Cargo Agnosticism (Vehicle) | VIN tracking supported           |
| 09 | LCL Package Groupage & Deconsol                     | Warehouse & Freight Consol  | Correct multi-consignee split    |
| 10 | External 3PL Transporter Execution                  | Partner Exchange            | Vendor AP logged; driver hidden  |
| 11 | Shipping Line Ocean Carrier Booking                 | Partner Exchange            | Slot reservation logged          |
| 12 | Customer Zero-Cost Visibility Gate                  | Security & Control Tower    | Internal COGS returns 403/null   |
| 13 | Multi-Dimensional Shipment P&L Reconciliation       | Finance                     | Revenue - COGS = Exact Margin    |
| 14 | Pass-Through Tax Isolation (Pajak Impor Simponi)    | Finance / Customs           | Tax excluded from Revenue ledger |
| 15 | Prevention of Ghost Work Order Generation           | Cross-Domain Decoupling     | Forwarding creates 0 trucking WO |
| 16 | Target SBU Service Request Rejection & Rerouting    | Cross-Domain Contracts      | Request rejects without crash    |
| 17 | Service Request Idempotency Guarantee               | Integration & Idempotency   | Duplicate request yields 1 job   |
| 18 | Event Outbox Deduplication & Exactly-Once Accrual   | Event Architecture          | Replay event does not duplicate  |
| 19 | Multi-Tenant Data Isolation Enforcement             | Security / RLS              | Tenant A cannot query Tenant B   |
| 20 | Demurrage Risk Automated Escalation                 | Intelligence & Control Tower| Free time < 24h triggers alert   |
+----+-----------------------------------------------------+-----------------------------+----------------------------------+
```

---

# 2. DETAILED TEST SCENARIO SPECIFICATIONS

### Scenario 01: 1 WorkOrder $\rightarrow$ 1,000 Shipments
- **Precondition:** 1 commercial annual framework contract in `commercial_work_orders` ($1,000\times 40\text{ft}$ containers per year).
- **Execution:** Insert 1,000 distinct `shp_shipments` records referencing the same `work_order_id`.
- **Assertions:**
  1. `SELECT count(*) FROM shp_shipments WHERE work_order_id = :wo_id` returns exactly `1000`.
  2. The parent `commercial_work_orders` maintains its single contract revenue without row duplication.
  3. No execution data leaks into `commercial_work_orders`.

### Scenario 04: Customs Clearance Standalone Order
- **Precondition:** Customer purchases only Import Customs Clearance.
- **Execution:** Operator creates `commercial_work_orders` with `service_scope = 'CUSTOMS_ONLY'`. System issues `svc_service_requests` to target domain `CUSTOMS`.
- **Assertions:**
  1. Exactly 1 `cus_declarations` row is created.
  2. Exactly 0 `shp_shipments` rows are created.
  3. Exactly 0 `trk_job_orders` rows are created.

### Scenario 07: Bulk Aluminium 5,000 MT (No Container)
- **Precondition:** Commercial contract for transport of 5,000 MT Aluminium Ingot from Jetty to Mother Vessel.
- **Execution:** Create `shp_shipments` with 1 `shp_units` of type `BULK_MT` and `shp_unit_bulk.metric_tonnage = 5000`. Create 3 legs: *Barging $\rightarrow$ STS Transshipment $\rightarrow$ Vessel Loading*.
- **Assertions:**
  1. System accepts kargo without prompting for ISO container numbers or container size.
  2. Draft survey report number is successfully attached to `shp_unit_bulk`.

### Scenario 12: Customer Zero-Cost Visibility Gate
- **Precondition:** Shipment has Revenue = Rp 45.000.000, Vendor COGS = Rp 32.000.000, Driver Wage = Rp 3.500.000.
- **Execution:** Call `GET /api/v1/tracking/{token}` using anonymous public token.
- **Assertions:**
  1. Response JSON contains `shipment_number`, `global_status`, `milestones`, and `eta`.
  2. Response JSON **physically omits** keys `vendor_cost`, `cogs`, `margin`, `driver_wage`, and `profit`.
  3. Direct SQL query via anon role on `fin_financial_ledger_entries` returns 0 rows (RLS blocked).

### Scenario 14: Pass-Through Tax Isolation (Pajak Impor Simponi)
- **Precondition:** PIB Declaration with Bea Masuk = Rp 50.000.000, PPN Impor = Rp 110.000.000, PPh 22 = Rp 25.000.000.
- **Execution:** Emit `CustomsPaymentCompleted` event and run financial ledger sync.
- **Assertions:**
  1. Total tax of Rp 185.000.000 is credited to Balance Sheet Account `2-10120 (Hutang Titipan Pajak)`.
  2. Revenue Account `4-10010 (Pendapatan Freight)` increases by **Rp 0.00** from this tax transaction.

### Scenario 15: Prevention of Ghost Work Order Generation
- **Precondition:** Forwarding order created with Door-to-Door delivery type.
- **Execution:** Forwarding creates shipment and dispatches pickup leg to Trucking.
- **Assertions:**
  1. System creates 1 `svc_service_requests` record.
  2. SBU Trucking creates 1 `trk_job_orders` record.
  3. The table `commercial_work_orders` count increases by **0** (No ghost trucking work order created).

---
*Approved by Architectural Quality Assurance Group*
