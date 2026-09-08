# SENTRALOGIS — PHASE 4B

# U-18 — OPERATIONAL HANDOFF FOUNDATION IMPLEMENTATION REPORT

**Date:** 2026-08-28  
**Phase:** Phase 4B  
**Task:** U-18  
**Status:** COMPLETE · GREEN  
**Depends on:** U-01..U-17A GREEN  
**Governing ADRs:** ADR-018..056, especially ADR-051..056  
**Nature:** Production Foundation Implementation  
**Production Code:** AUTHORIZED (Foundation Domain, Adapters, Routes)  
**Production Migration:** AUTHORIZED (Migration `20260828_021_operational_handoff_foundation.sql`)  

---

## 1. Executive Summary

**U-18** implements the canonical **Operational Handoff Foundation** as ratified by ADR-051 through ADR-056.

The implementation formalizes the seam:
$$\text{Sales Order} \longrightarrow \text{Fulfillment} \longrightarrow \text{Fulfillment Allocation} \longrightarrow \text{Operational Handoff} \longrightarrow \text{Domain Adapter} \longrightarrow \text{Operational Domain Aggregate}$$

### Core Architectural Principle
**Operational Handoff is a formal contract seam, NOT an operational engine.**
- OperationalHandoff owns: handoff identity, allocation linkage, target domain, request payload, lifecycle transitions, atomic number authority, idempotency, retry/failure metadata, and loose polymorphic references.
- OperationalHandoff does **NOT** own: drivers, armada, GPS, route tracking, vessel/voyage, POL/POD, MBL/HBL, customs declaration calculation, or warehouse bin/rack execution. Existing SBU operational domains remain fully sovereign.

---

## 2. Implementation Inventory

### 2.1 Database Layer (Migration `20260828_021_operational_handoff_foundation.sql`)
- **Enum `com_operational_handoff_status`**:
  `ISSUED`, `ACKNOWLEDGED`, `ACCEPTED`, `EXECUTING`, `FULFILLED`, `FAILED`, `REJECTED`, `CANCELLED`.
- **Sequence `seq_operational_handoff`**: Backs atomic server-side number generation.
- **RPC `next_operational_handoff_number(p_tenant_id UUID)`**: Allocates `OH-YYYY-MM-NNNN`. Client generation strictly prohibited.
- **Table `public.operational_handoffs`**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `tenant_id UUID NOT NULL REFERENCES public.md_tenants(id)`
  - `handoff_number TEXT NOT NULL`
  - `fulfillment_id UUID NOT NULL REFERENCES public.fulfillments(id)`
  - `fulfillment_allocation_id UUID NOT NULL REFERENCES public.fulfillment_allocations(id)`
  - `target_domain TEXT NOT NULL`
  - `status com_operational_handoff_status NOT NULL DEFAULT 'ISSUED'`
  - `idempotency_key UUID`
  - `request_payload JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `assigned_domain_reference JSONB` (loose polymorphic pointer)
  - `failure_code TEXT`, `failure_reason TEXT`
  - `attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1)`
  - Timestamps: `issued_at`, `acknowledged_at`, `accepted_at`, `executing_at`, `fulfilled_at`, `failed_at`, `rejected_at`, `cancelled_at`, `created_at`, `updated_at`
  - `CONSTRAINT uq_operational_handoff_number UNIQUE (tenant_id, handoff_number)`
  - `CONSTRAINT uq_operational_handoff_idempotency UNIQUE (tenant_id, idempotency_key)`
- **RLS & Security**: Row-Level Security enabled with policy `operational_handoffs_isolation` enforcing `tenant_id = public.get_my_tenant_id()`.

### 2.2 Domain Layer (`lib/operational-handoff/`)
- `types.ts`: TypeScript enums, interfaces, error hierarchy, closed transition map `OPERATIONAL_HANDOFF_TRANSITIONS`.
- `adapters/types.ts`: `OperationalHandoffAdapter` generic interface (`canHandle`, `validate`, `createDomainReference`).
- `adapters/forwarding.ts`: `ForwardingHandoffAdapter` translating to `shp_shipments` / `shp_execution_legs`.
- `adapters/customs.ts`: `CustomsHandoffAdapter` translating to `cus_declarations` / `CustomsAttachmentService`.
- `adapters/trucking.ts`: `TruckingHandoffAdapter` translating to `svc_service_requests` $\to$ `trucking-lineage.ts` $\to$ `work_orders` $\to$ `wo_items` $\to$ `job_orders`.
- `adapters/warehouse.ts`: `WarehouseHandoffAdapter` translating to `svc_service_requests(target_domain='WAREHOUSE')`.
- `adapters/index.ts`: Adapter registry and lookup.
- `service.ts`: Domain service with `createOperationalHandoff`, `findOperationalHandoffById`, `listOperationalHandoffsByFulfillment`, `performOperationalHandoffAction`, `allocateOperationalHandoffNumber`, and PostgreSQL 23505 idempotency catch.
- `http.ts`: Stable HTTP error mapping.

### 2.3 API Gateway (`app/api/v1/commercial/operational-handoffs/`)
- `POST /api/v1/commercial/operational-handoffs`: Creates handoff or returns idempotent existing row.
- `GET /api/v1/commercial/operational-handoffs?fulfillmentId=...`: Lists handoffs for a fulfillment plan.
- `GET /api/v1/commercial/operational-handoffs/[id]`: Fetches a single handoff by ID.
- `POST /api/v1/commercial/operational-handoffs/[id]/actions`: Executes lifecycle actions (`acknowledge`, `accept`, `startExecuting`, `fulfill`, `fail`, `reject`, `cancel`).

---

## 3. Boundary & Invariant Verification

| Boundary / Guardrail | Verification Result |
|---|---|
| **Direct JO Creation** | **0** direct writes. Trucking handoffs strictly route via `svc_service_requests` $\to$ `trucking-lineage.ts`. Direct SO/FL $\to$ JO is **FORBIDDEN**. |
| **Direct Driver / Armada Creation** | **0** driver or armada fields/mutations in Operational Handoff. |
| **Direct GPS / Telemetry** | **0** GPS coordinates or tracking telemetry in Operational Handoff. |
| **Second Operational Engine** | **0** execution engines created. Handoff is a pure contract seam. |
| **Tenant Isolation** | Server-derived via `IdentityContext.tenantId` + PostgreSQL RLS + `assertPermission`. |
| **Number Authority** | Server-derived via `next_operational_handoff_number()` PostgreSQL sequence. Client generation forbidden. |
| **Idempotency** | Atomic DB uniqueness on `UNIQUE(tenant_id, idempotency_key)`. |

---

## 4. Verification Results

- **U-18 Test Assertions:** 31 / 31 PASS (`lib/__tests__/u18-operational-handoff-foundation.test.ts`)
- **Full Regression Suite:** **806 / 806 PASS** across 32 test suites (0 failures)
- **TypeScript Compiler Check:** `npx tsc --noEmit` $\longrightarrow$ **0 errors**

---

## 5. Migration Blast Radius

- **Additive Changes:** 1 new table (`operational_handoffs`), 1 new sequence (`seq_operational_handoff`), 1 new enum (`com_operational_handoff_status`), 1 new RPC (`next_operational_handoff_number`), 4 indexes, 1 RLS policy.
- **Destructive Changes:** 0. Existing tables and legacy schemas remain completely untouched.
