# SENTRALOGIS — DOMAIN BOUNDARY & OWNERSHIP MATRIX v1.0
## Bounded Context Ownership, Access Control & Mutation Rules
**Document Version:** 1.0.0-BOUNDARIES  
**Status:** APPROVED GOVERNANCE STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. THE NON-MUTATION GOVERNANCE RULE

> **Rule of Absolute Boundary Isolation**:  
> No domain may execute `INSERT`, `UPDATE`, or `DELETE` statements on tables owned by another domain.  
> Read-access (`SELECT`) is permitted for reporting or validation, but **never** implies write ownership.  
> All state mutations crossing domain boundaries must pass through a **Service Request Contract** or a **Domain Command / Event Handler**.

---

# 2. CRUD & OWNERSHIP MATRIX

```
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                DOMAIN DATA OWNERSHIP MATRIX                                                   |
+------------------------------------+------------+------------+----------+---------+-----------+----------+---------+----------+
| Data Object / Table Group          | Commercial | Forwarding | Trucking | Customs | Warehouse | Exchange | Finance | Intel/AI |
+------------------------------------+:----------:+:----------:+:--------:+:-------:+:---------:+:--------:+:-------:+:--------:+
| `com_work_orders`                  | **OWN (CUD)**|   READ     |   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `com_service_scopes`               | **OWN (CUD)**|   READ     |   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `shp_shipments`                    |    READ    | **OWN (CUD)**|   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `shp_manifest_items`               |    READ    | **OWN (CUD)**|   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `shp_units` (All subtypes)         |    READ    | **OWN (CUD)**|   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `shp_execution_legs`               |    READ    | **OWN (CUD)**|   READ   |  READ   |   READ    |   READ   |  READ   |   READ   |
| `svc_service_requests`             |    READ    | **OWN (C)**  |MUTATE(S) |MUTATE(S)| MUTATE(S) |MUTATE(S) |  READ   |   READ   |
| `trk_job_orders` & `trk_routes`    |     NO     |     NO     |**OWN(CUD)**|   NO   |    NO     |    NO    |READ(AP) |READ(GPS) |
| `cus_declarations` & `cus_lines`   |     NO     |     NO     |    NO    |**OWN(CUD)**|  NO     |    NO    |READ(TAX)|READ(STAT)|
| `wh_handling_jobs` & `wh_bins`     |     NO     |     NO     |    NO    |   NO    |**OWN(CUD)**|   NO    |READ(AP) |   READ   |
| `exc_partner_bookings`             |     NO     |     NO     |    NO    |   NO    |    NO     |**OWN(CUD)**|READ(AP)|  READ   |
| `fin_financial_ledger_entries`     |  READ(AR)  | READ(Margin)|   NO    |   NO    |    NO     |    NO    |**OWN(CUD)**|READ(P&L)|
| `int_control_tower_projections`    |    READ    |    READ    |   READ   |  READ   |   READ    |   READ   |  READ   |**OWN(CUD)**|
+------------------------------------+------------+------------+----------+---------+-----------+----------+---------+----------+
*Legend:*  
- **OWN (CUD)**: Full Create, Update, Delete ownership and schema governance.  
- **OWN (C)**: Originator / Creator.  
- **MUTATE(S)**: Permitted to transition status state machine only (e.g. `ACCEPTED`, `FULFILLED`, `REJECTED`).  
- **READ**: Read-only projection or query access.  
- **NO**: Access prohibited at domain layer.
```

---

# 3. INTER-DOMAIN COMMUNICATION PROTOCOLS

```
+----------------------------------------------------------------------------------------------------+
|                                INTER-DOMAIN COMMUNICATION PATTERNS                                 |
+----------------------------------------------------------------------------------------------------+
| Direction                  | Pattern                    | Allowed Channel                          |
+----------------------------+----------------------------+------------------------------------------+
| Commercial -> Forwarding   | Domain Command / Event     | `WorkOrderConfirmed` Domain Event        |
| Forwarding -> Trucking     | Service Request Contract   | `INSERT INTO svc_service_requests`       |
| Forwarding -> Customs      | Service Request Contract   | `INSERT INTO svc_service_requests`       |
| Forwarding -> Warehouse    | Service Request Contract   | `INSERT INTO svc_service_requests`       |
| Forwarding -> Exchange     | Service Request Contract   | `INSERT INTO svc_service_requests`       |
| Any SBU -> Forwarding      | Integration Event          | `event_outbox` (`CustomsReleased`, etc.) |
| Any SBU -> Finance         | Integration Event          | `event_outbox` (`PODUploaded`, etc.)     |
| All Domains -> Intel Tower | Event Sourcing Projection  | CQRS Event Consumer Stream               |
+----------------------------------------------------------------------------------------------------+
```

---
*Approved by Enterprise Architecture Governance Board*
