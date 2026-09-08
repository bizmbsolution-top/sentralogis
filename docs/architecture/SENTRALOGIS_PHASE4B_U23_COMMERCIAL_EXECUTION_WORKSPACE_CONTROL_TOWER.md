# SENTRALOGIS — PHASE 4B

# U-23 — COMMERCIAL EXECUTION WORKSPACE & CONTROL-TOWER READ MODEL ARCHITECTURE REPORT

**Date:** 2026-08-28  
**Phase:** 4B  
**Gate:** U-23  
**Mode:** WORKSPACE ARCHITECTURE & CONTROL-TOWER READ MODEL  
**Status:** **GREEN — COMPLETE (29/29 U-23 CHECKS PASS, 1068/1068 FULL REGRESSION PASS, 0 TypeScript Errors)**  
**Governing ADRs:** ADR-018 through ADR-056 (RATIFIED)  

---

## 1. EXECUTIVE SUMMARY

Phase 4B U-23 establishes the canonical **Commercial Execution Workspace & Control-Tower Read Model Architecture** for Sentralogis.

Building on the verified foundation from U-01 through U-22, U-23 defines how operators and customers interact with the complete commercial-to-operational lifecycle:
$$\text{Commercial Intent} \longrightarrow \text{Sales Order} \longrightarrow \text{Fulfillment Plan} \longrightarrow \text{Fulfillment Allocation} \longrightarrow \text{Operational Handoff} \longrightarrow \text{Domain Execution} \longrightarrow \text{Progress} \longrightarrow \text{Exceptions} \longrightarrow \text{Completion}$$

### Core Architectural Invariants:
1. **Workspace Before Menu:** Operators navigate through contextual workspaces (Account $\to$ Engagement $\to$ Sales Order $\to$ Fulfillment $\to$ Allocation $\to$ Operational Handoff $\to$ Sovereign Domain), not fragmented CRUD menus.
2. **Pure Composed Read Model:** Control Tower visibility is constructed via pure, read-only composition over canonical services (`lib/control-tower/service.ts`). Zero duplicated operational state is persisted in commercial tables.
3. **Strict Separation of Projections:**
   - **Internal Operator Workspace:** Full commercial context, all capability allocations, operational handoff states, sovereign domain references, failure diagnostics, and available commands.
   - **Customer Workspace Projection:** Clean milestone progress, delivery progression, and customer-appropriate notices (strictly omitting internal revenue margins, staff PII, driver metadata, and CEISA technical diagnostics).
4. **Zero Engine Duplication:** The UI and Control Tower contain ZERO operational execution logic, ZERO driver/GPS mutations, ZERO warehouse inventory adjustments, ZERO direct CEISA transmissions, and ZERO client-side number generation.

---

## 2. EXISTING UI INVENTORY & CLASSIFICATION

| UI Area | Route / Component | Architectural Classification | Evaluation & Action |
| :--- | :--- | :---: | :--- |
| **Commercial Pipeline** | `app/(dashboard)/commercial/pipeline/page.tsx` | **CANONICAL (CRM)** | Preserved. Manages Leads and Quotes; generates Quote numbers via server authority `next_quote_number()`. |
| **Commercial Quotations** | `app/(dashboard)/commercial/quotations/[id]/page.tsx` | **CANONICAL (CRM)** | Preserved. Previews quotes and manages customer acceptance. |
| **Work Orders (Legacy)** | `app/(dashboard)/hq/work-orders/page.tsx` | **LEGACY (Operations)** | Protected & Contained. Coexists with canonical engagement bridge (ADR-031/032). |
| **Job Orders (Legacy)** | `app/(dashboard)/hq/job-orders/page.tsx` | **LEGACY (Execution)** | Protected & Contained. Receives dispatch from `svc_service_requests` via `trucking-lineage.ts`. |
| **Customs SBU** | `app/(dashboard)/sbu/clearance/page.tsx` | **CANONICAL (PPJK)** | Preserved. Sovereign customs workbench managing 18-step statutory declaration lifecycle. |
| **Warehouse SBU** | `app/(dashboard)/sbu/warehouse/work-orders/page.tsx` | **CANONICAL (WMS)** | Preserved. Sovereign warehouse orders and customer stock ledgers. |
| **Control Tower Read Model** | `lib/control-tower/service.ts` | **CANONICAL (U-23)** | **NEW — COMPOSITION SERVICE.** Provides unified cross-domain visibility. |
| **Control Tower API** | `app/api/v1/commercial/control-tower/[salesOrderId]/route.ts` | **CANONICAL (U-23)** | **NEW — READ ROUTE.** Thin route serving operator and customer projections. |

---

## 3. CANONICAL WORKSPACE HIERARCHY

$$\begin{matrix}
\textbf{Level 1: Customer / Account} & \text{Commercial relationship \& credit agreement} \\
\downarrow & \\
\textbf{Level 2: Engagement Root} & \text{Root business contract (\texttt{commercial\_work\_orders})} \\
\downarrow & \\
\textbf{Level 3: Sales Order} & \text{Authoritative customer commitment (\texttt{sales\_orders})} \\
\downarrow & \\
\textbf{Level 4: Fulfillment Plan} & \text{Multi-capability composition (\texttt{fulfillments}, revisions $1..N$)} \\
\downarrow & \\
\textbf{Level 5: Fulfillment Allocation} & \text{Per-capability quantity scoping (\texttt{fulfillment\_allocations})} \\
\downarrow & \\
\textbf{Level 6: Operational Handoff} & \text{Formal dispatch contract (\texttt{operational\_handoffs})} \\
\downarrow & \\
\textbf{Level 7: Sovereign Domain} & \text{Forwarding (\texttt{shp\_shipments}), Customs (\texttt{cus\_declarations}), Trucking (\texttt{job\_orders}), Warehouse}
\end{matrix}$$

---

## 4. CONTROL-TOWER STATUS DERIVATION MATRIX

The Control Tower derives aggregate display labels on the fly from canonical states without persisting second-order state flags:

| Sales Order Status | Fulfillment Status | Handoff Conditions | Allocation Progress | Derived Projection Label |
| :--- | :--- | :--- | :--- | :---: |
| `DRAFT` | *any* | *any* | *any* | **`COMMERCIAL`** |
| `CONFIRMED` | *none* | *none* | *none* | **`COMMERCIAL`** |
| `CONFIRMED` | `PLANNED` | *none* | Delivered = 0 | **`PLANNING`** |
| `CONFIRMED` | `ACTIVE` | `ISSUED` / `ACKNOWLEDGED` only | Delivered = 0 | **`HANDOFF_PENDING`** |
| `CONFIRMED` | `ACTIVE` | $\ge 1$ `ACCEPTED` or `EXECUTING` | Delivered = 0 | **`EXECUTING`** |
| `CONFIRMED` | `ACTIVE` | $\ge 1$ `EXECUTING` | $0 < \text{Delivered} < \text{Planned}$ | **`PARTIALLY_FULFILLED`** |
| `CONFIRMED` | `ACTIVE` | $\ge 1$ `FAILED` or `REJECTED` (with others active) | *any* | **`AT_RISK`** |
| `CONFIRMED` | `ACTIVE` | All handoffs `FAILED` or `REJECTED` | *any* | **`BLOCKED`** |
| `CONFIRMED` | `ACTIVE` | All handoffs `FULFILLED` | $\text{Delivered} \ge \text{Planned}$ | **`FULFILLED`** |
| `CANCELLED` | `CLOSED` | *any* | *any* | **`CLOSED`** |

---

## 5. AVAILABLE COMMAND SURFACE PER LIFECYCLE STATE

| Lifecycle Condition | Available Commands | Authorized Role |
| :--- | :--- | :--- |
| **Sales Order `DRAFT`** | `confirmSalesOrder`, `cancelSalesOrder` | Commercial Manager (`commercial:manage`) |
| **Sales Order `CONFIRMED` (no FL)** | `createFulfillment`, `cancelSalesOrder` | Commercial Manager (`commercial:manage`) |
| **Fulfillment `PLANNED`** | `activateFulfillment`, `cancelFulfillment`, `addFulfillmentAllocation` | Logistics Planner (`commercial:manage`) |
| **Fulfillment `ACTIVE`** | `createOperationalHandoff`, `replanFulfillment`, `cancelFulfillment` | Operations Officer (`commercial:manage`) |
| **Operational Handoff `ISSUED`** | `acknowledge`, `accept`, `reject`, `cancel` | Operational SBU Validator |
| **Operational Handoff `ACCEPTED`** | `startExecuting`, `fulfill`, `fail`, `cancel` | Operational SBU Dispatcher / Field Officer |

---

## 6. ACTIONABLE EXCEPTION CLASSIFICATION

The Control Tower automatically extracts actionable exceptions from operational handoffs:

| Trigger Condition | Category | Severity | Recommended Operator Action |
| :--- | :--- | :---: | :--- |
| Handoff status = `REJECTED` | `HANDOFF_REJECTED` | **WARNING** | Verify payload references or reassign execution parameters to another carrier/depot. |
| Handoff status = `FAILED` | `OPERATIONAL_FAILURE` | **CRITICAL** | Inspect domain failure diagnostics, retry dispatch, or initiate Fulfillment replanning. |
| All active handoffs stalled | `DELIVERY_STALLED` | **BLOCKING** | Immediate human intervention required; evaluate operational route or initiate commercial escalation. |

---

## 7. SANITIZED CUSTOMER VIEW PROJECTION

The customer workspace projection provides transparency while enforcing strict corporate privacy:

| Data Field | Internal Operator Workspace | Customer Workspace Projection |
| :--- | :---: | :---: |
| **Sales Order Number** (`SO-YYYY-MM-NNNN`) | **Visible** | **Visible** |
| **Order & Target Dates** | **Visible** | **Visible** |
| **Total Agreed Revenue & Currency** | **Visible** | **Hidden** (Billing/invoicing handled separately) |
| **Internal Margin / Cost Breakdown** | **Visible** | **Hidden** |
| **Overall Milestone Journey** | **Visible** | **Visible** (Order Confirmed $\to$ Planned $\to$ Active $\to$ Fulfilled) |
| **Capability Delivery Progress** | **Visible** | **Visible** (Quantity Delivered / Planned) |
| **Operational Handoff Number** (`OH-...`) | **Visible** | **Hidden** |
| **Carrier / Driver Private Information** | **Visible** | **Hidden** |
| **CEISA XML / Statutory Filing Error Logs**| **Visible** | **Hidden** |
| **Customer Operational Delay Notice** | **Visible** | **Visible** (Rendered automatically if status is `AT_RISK` or `BLOCKED`) |

---

## 8. REGRESSION & BENCHMARK SUMMARY

- **Total Test Suites:** 40
- **Total Test Assertions:** **1068 / 1068 PASS (0 failures)**
- **U-23 Suite Assertions:** **29 / 29 PASS (100% Passing)**
- **TypeScript Static Verification:** **0 errors (`tsc --noEmit` CLEAN)**
- **Production Migrations Added in U-23:** 0
- **Production Code Changes in U-23:** Composed read model service (`lib/control-tower/service.ts`, `lib/control-tower/types.ts`) & read API route (`app/api/v1/commercial/control-tower/[salesOrderId]/route.ts`).
- **P0..P4 Defects:** 0
