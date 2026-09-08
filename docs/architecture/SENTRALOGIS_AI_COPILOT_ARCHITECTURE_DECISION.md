# SENTRALOGIS — AI COPILOT ARCHITECTURE DECISION & ADR PACKAGE

**Date:** 2026-09-07  
**Status:** ADR PACKAGE READY FOR RATIFICATION  
**Mode:** ARCHITECTURE DECISION ONLY — NO IMPLEMENTATION AUTHORIZED

---

## 1. CONTEXT

The SENTRALOGIS platform contains an existing AI Copilot prototype spanning two implementations:

1. **Platform-level** (`src/platforms/copilot/`) — 80+ files providing intent resolution, pipeline execution, context enrichment, planning, validation, explainability, and response generation. Wired to production API routes (`/api/copilot`, `/api/copilot/execute`, `/api/copilot/inbox`) but relies on hardcoded mock data, hardcoded tenant/user/permission context, and zero authentication/authorization enforcement.

2. **Application-level** (`src/application/copilot/`) — sophisticated entity lookup, business context engine, planning, and validation architecture using `IRequestContext` with `tenantId`/`userId`. NOT wired to any production API route. Used only in tests and standalone test runners.

Existing canonical infrastructure:
- IdentityContext-derived tenant isolation (U-01)
- assertPermission authorization (U-02)
- Canonical domain services for Job Orders, Work Orders, Drivers, Vehicles, Customers, Forwarding, Customs, Financial, etc.
- Read-only Control Tower projection
- Operational Handoff seam
- Existing `/api/copilot` routes with production traffic

The platform needs a formal architecture decision to safely ground the Copilot prototype in canonical authorities without bypassing security, tenant isolation, or domain sovereignty.

---

## 2. PROBLEM

The current AI Copilot implementation cannot safely operate in production because:

1. **Zero authentication** — `/api/copilot`, `/api/copilot/execute`, and `/api/copilot/inbox` have no session/auth checks.
2. **Hardcoded identity** — tenant is hardcoded to `tenant-1`, user is hardcoded to `user-1` with `DISPATCHER` role, permissions are hardcoded to `['JobOrder.Update', 'Driver.Update']`.
3. **Mock data in production paths** — operational summary returns fabricated numbers; context enrichment uses mock timeline events; execution returns fabricated success; inbox returns 12 hardcoded items.
4. **Direct database access** — entity lookup providers query tables directly via Supabase client, bypassing canonical services and RLS.
5. **No canonical grounding** — Copilot does not consume existing canonical APIs or domain services; it operates as an independent data authority.
6. **No audit trail** — no logging of Copilot interactions, proposed actions, or executed mutations.
7. **No human confirmation** — execute path has no confirmation gate.

---

## 3. EXISTING EVIDENCE

| Artifact | Finding |
|----------|---------|
| `app/api/copilot/route.ts` | Hardcoded `TenantContext.create({ id: 'tenant-1' })`, `UserContext.create({ id: 'user-1', roles: ['DISPATCHER'] })`, `PermissionContext.create(['JobOrder.Update', 'Driver.Update'])`. No auth. |
| `app/api/copilot/execute/route.ts` | Mock execution result. No auth. No service invocation. |
| `app/api/copilot/inbox/route.ts` | 12 hardcoded inbox items. No auth. |
| `src/platforms/copilot/engine/CopilotEngine.ts` | `generateOperationalSummary` returns hardcoded values. |
| `src/platforms/copilot/engine/ContextEnricher.ts` | `enrichFromDatabase` uses mock events array. |
| `src/application/copilot/` | Better architecture with `IRequestContext`, entity lookup, planning, validation — but NOT wired to production routes. |
| `src/application/copilot/providers/BaseSupabaseProvider.ts` | Direct table queries via Supabase client. |
| `src/application/whatsapp/WhatsAppContextBuilder.ts` | Uses `createAdminClient()` to query `md_drivers`, bypassing RLS. |
| `docs/architecture/SENTRALOGIS_POST_5D_ROADMAP_DECISION.md` | AI Copilot classified as DISCOVERY / ARCHITECTURE REQUIRED BEFORE IMPLEMENTATION. |

---

## 4. DECISION

### 4.1 Canonical Grounding Model

**Decision: Copilot is a canonical consumer, not an independent authority.**

Copilot must obtain all operational and commercial information exclusively through:

1. **Existing canonical domain services** (e.g., `JobOrderService`, `CustomsService`, `ForwardingService`, `FinancialService`)
2. **Existing canonical API routes** under `/api/v1/commercial/`, `/api/v1/customs/`, `/api/v1/forwarding/`, `/api/v1/trucking/`, `/api/v1/warehouse/`
3. **New read-only query APIs** where no existing canonical authority exists:
   - `TimelineQueryService` — operational timeline aggregation
   - `OperationalSummaryQuery` — aggregated operational status
   - `EntitySearchAPI` — tenant-scoped entity lookup with canonical authority
   - `NotificationInboxQuery` — canonical event/notification source

**Database access hierarchy:**

```
Actor Identity
→ Tenant Context
→ Authorization
→ Copilot
→ Canonical Domain Service / Query Contract / Approved API
→ Persistence Authority
```

**Persistence authority** means database tables are the storage layer, but they are **NOT** approved Copilot access interfaces. Even when RLS exists, Copilot production code must not directly query canonical domain tables. RLS is defense-in-depth, not a substitute for domain/service boundaries.

Copilot must **never**:
- Query domain tables directly via Supabase client
- Bypass canonical services
- Establish an independent data authority
- Use compatibility/legacy authorities as primary data sources
- Become coupled directly to persistence schema

### 4.2 Security / Tenant Boundary

**Decision: Copilot inherits the platform's canonical identity and authorization model.**

| Aspect | Decision |
|--------|----------|
| **Identity** | Server-derived from `IdentityContext` (U-01). No client-supplied tenant/user. |
| **Tenant** | Derived from authenticated session via `resolveApiAuthContext` / `resolveSessionIdentity`. |
| **Authorization** | `assertPermission` (U-02) enforced on all Copilot API routes. |
| **RBAC** | Copilot capabilities inherit actor permissions. PROPOSE/EXECUTE requires domain-specific permissions. |
| **Cross-tenant** | Strictly prohibited. All queries filtered by `tenant_id = get_my_tenant_id()`. |
| **Audit** | All Copilot interactions logged: tenant, user, timestamp, intent, entities, action, outcome. |
| **Mutation boundary** | EXECUTE requires explicit human confirmation unless explicitly pre-authorized by ADR. |

### 4.3 Read / Propose / Execute Model

| Mode | Meaning | Authorization | Human Confirmation |
|------|---------|---------------|-------------------|
| **READ** | Retrieve/summarize canonical information | Normal read authorization (`commercial:read`, `job_order:read`, etc.) | No |
| **PROPOSE** | Recommend/draft an action | Read + capability eligibility | Yes — user must approve proposal |
| **EXECUTE** | Perform mutation/workflow | Explicit domain authorization (`commercial:manage`, `job_order:update`, etc.) | Required where defined by ADR |

**Default rule:** EXECUTE is opt-in per capability and requires both authorization AND human confirmation unless a future ADR explicitly waives confirmation for a specific safe action class.

### 4.4 Action Boundary

| Action Class | Copilot Authority | Authorization | Confirmation |
|--------------|-------------------|---------------|--------------|
| **Informational** | READ only | Read permission | No |
| **Operational** | PROPOSE only by default | Domain read + manage | Required |
| **Commercial** | PROPOSE only by default | `commercial:manage` | Required |
| **Financial** | NOT AUTHORIZED in this phase | Future ADR required | Future ADR required |
| **Accounting** | NOT AUTHORIZED in this phase | Future ADR required | Future ADR required |
| **Administrative/Security** | NOT AUTHORIZED | Future ADR required | Future ADR required |

### 4.5 Mock Data Decision

| Mock Dependency | Classification | Replacement Strategy |
|-----------------|----------------|----------------------|
| `CopilotEngine.generateOperationalSummary` hardcoded values | PROHIBITED in production | Replace with `OperationalSummaryQuery` canonical API |
| `ContextEnricher.mockEvents` | PROHIBITED in production | Replace with `TimelineQueryService` canonical API |
| `/api/copilot/execute` mock execution result | PROHIBITED in production | Wire to canonical domain services with confirmation gate |
| `/api/copilot/inbox` hardcoded items | PROHIBITED in production | Replace with `NotificationInboxQuery` canonical API |
| `MockVisionAdapter` | Intentionally demo-only | Replace with real OCR service in future phase |
| `MockGeminiClient` | Intentionally demo-only | Replace with real LLM inference in future phase |

**Rule:** Production Copilot paths must not depend on mock/static/demo data. Demo/test-only mocks are permitted only in non-production environments.

### 4.6 API / Query Contract Minimum

The following future canonical query contracts are required. Each must be designed and authorized separately before implementation.

#### 4.6.1 TimelineQueryService

| Field | Requirement |
|-------|-------------|
| **Capability** | Operational timeline aggregation |
| **Owning domain** | Trucking / Forwarding / Customs (cross-domain) |
| **Purpose** | Provide Copilot with a unified chronological view of operational events for a given entity (JO, WO, Shipment, Declaration) |
| **Input/context** | `tenantId`, entity reference(s), optional time range, optional event categories |
| **Output** | Chronological event list with entity type, status, location, actor, timestamp, and correlation links |
| **READ/WRITE** | READ only |
| **Tenant requirement** | Mandatory — tenant-scoped from server-derived `tenantId` |
| **Authorization** | Read permission on the underlying domain(s) |
| **Data authority** | Canonical operational tables via existing domain services; no direct table access |
| **Freshness semantics** | Near-real-time; reads from canonical event outbox / operational tables with minimal transformation |
| **Error semantics** | Empty timeline for valid entity; `PERMISSION_DENIED` for unauthorized access; non-leaking for cross-tenant attempts |
| **Audit requirement** | Query logged: tenant, user, entity, time range |
| **Pagination/limits** | Required — bounded page size, cursor-based pagination |
| **Existing service reusable?** | Partial — Control Tower has projection logic; this service must aggregate across domains |
| **New contract required?** | YES |

#### 4.6.2 OperationalSummaryQuery

| Field | Requirement |
|-------|-------------|
| **Capability** | Aggregated operational status |
| **Owning domain** | Control Tower / Fulfillment |
| **Purpose** | Provide Copilot with aggregated operational health metrics (active JOs, delayed deliveries, exception counts, fulfillment progress) |
| **Input/context** | `tenantId`, optional filters (SBU, date range, status) |
| **Output** | Aggregated metrics with breakdown by domain/status/risk |
| **READ/WRITE** | READ only |
| **Tenant requirement** | Mandatory — tenant-scoped from server-derived `tenantId` |
| **Authorization** | `commercial:read` or equivalent |
| **Data authority** | Control Tower projection + Fulfillment allocations; no direct operational table writes |
| **Freshness semantics** | Near-real-time; derived from canonical projections |
| **Error semantics** | Zero-metric result for valid tenant with no activity; `PERMISSION_DENIED` for unauthorized access |
| **Audit requirement** | Query logged: tenant, user, filters |
| **Pagination/limits** | Not applicable — single aggregated result set |
| **Existing service reusable?** | Partial — Control Tower `getInternalOperatorWorkspace` provides similar aggregation |
| **New contract required?** | YES (or extend Control Tower) |

#### 4.6.3 EntitySearchAPI

| Field | Requirement |
|-------|-------------|
| **Capability** | Tenant-scoped entity lookup |
| **Owning domain** | Multiple domains (Party/Entity, Trucking, Forwarding, Customs) |
| **Purpose** | Provide Copilot with type-ahead / search across customers, drivers, vehicles, shipments, declarations, etc. |
| **Input/context** | `tenantId`, search query, entity type filter, optional active-status filter |
| **Output** | Ranked entity results with display name, entity type, and canonical identifier |
| **READ/WRITE** | READ only |
| **Tenant requirement** | Mandatory — tenant-scoped from server-derived `tenantId` |
| **Authorization** | Read permission on each entity type |
| **Data authority** | Canonical party/entity services and domain-specific search/query services |
| **Freshness semantics** | Near-real-time; reads from canonical indexes/views |
| **Error semantics** | Empty result for valid query; `PERMISSION_DENIED` for unauthorized entity types |
| **Audit requirement** | Query logged: tenant, user, query string, entity types |
| **Pagination/limits** | Required — max results cap, cursor-based pagination |
| **Existing service reusable?** | Partial — some domains have search; unified cross-domain search is new |
| **New contract required?** | YES |

#### 4.6.4 NotificationInboxQuery

| Field | Requirement |
|-------|-------------|
| **Capability** | Canonical event/notification source |
| **Owning domain** | Event Outbox / Operational Handoff |
| **Purpose** | Provide Copilot with a unified inbox of operational notifications, handoff status changes, and exceptions relevant to the actor |
| **Input/context** | `tenantId`, `userId`, optional filters (read/unread, category, date range) |
| **Output** | Notification list with category, priority, entity reference, timestamp, read status |
| **READ/WRITE** | READ only (mark-as-read is a separate mutation contract) |
| **Tenant requirement** | Mandatory — tenant-scoped from server-derived `tenantId` |
| **Authorization** | Read permission on event/handoff domains |
| **Data authority** | Canonical event outbox + domain event sources; no direct table access |
| **Freshness semantics** | Eventual consistency — notifications appear after domain event emission |
| **Error semantics** | Empty inbox for valid actor; `PERMISSION_DENIED` for unauthorized access |
| **Audit requirement** | Query logged: tenant, user, filters |
| **Pagination/limits** | Required — bounded page size, cursor-based pagination |
| **Existing service reusable?** | No — no unified notification inbox exists |
| **New contract required?** | YES |

### 4.7 WhatsApp Gateway Decision

**Decision: WhatsApp Copilot Gateway must use user-scoped identity, not admin client.**

Current: `WhatsAppContextBuilder` uses `createAdminClient()` to query `md_drivers`, bypassing RLS.

Required: Resolve WhatsApp number to a canonical driver/entity identity, then construct `OperationalContext` from that identity's tenant and permissions. No admin-client data access in the request path.

### 4.8 Existing ADR Compatibility

| ADR | Subject | Classification | Rationale |
|-----|---------|----------------|-----------|
| ADR-018 | Engagement Root | ALREADY GOVERNS | Copilot must not create parallel engagement authority |
| ADR-020 | Capability Binding | ALREADY GOVERNS | Copilot reads capability vocabulary from registry |
| ADR-031 | Anti-Corruption Boundary | ALREADY GOVERNS | Copilot is part of the application layer; must not bypass canonical foundation |
| ADR-033 | Service Request Command | ALREADY GOVERNS | Copilot PROPOSE/EXECUTE for dispatch must use SR command envelope |
| ADR-034–050 | Commercial/Fulfillment lineage | ALREADY GOVERNS | Copilot must respect SO→WO cardinality, fulfillment composition, handoff boundaries |
| ADR-051–056 | Operational Handoff | ALREADY GOVERNS | Copilot execution must route through handoff adapters, not direct JO writes |
| ADR-064 | Financial Settlement Interface | ALREADY GOVERNS | Copilot financial reads use this boundary; no Copilot financial mutations |
| ADR-066 | Price Snapshot Commitment | ALREADY GOVERNS | Copilot must not propose price overrides that violate committed-price invariants |
| ADR-070/071/072 | Party/Entity/Resource | ALREADY GOVERNS | Copilot identity, tenant, and entity resolution must use canonical party architecture |
| ADR-087 | Operational → Commercial Event Bridge | ALREADY GOVERNS | Copilot event consumption must use canonical event bridge, not direct table reads |

**Conclusion:** No existing ADR requires extension for Copilot. No new ADR is required beyond this package.

---

## 5. CANONICAL AUTHORITY

| Domain | Canonical Authority | Copilot Access Mode |
|--------|---------------------|---------------------|
| Job Orders | `JobOrderService` / `/api/v1/trucking/job-orders` | READ via canonical service/API |
| Work Orders | `commercial_work_orders` + capability bindings | READ via canonical API |
| Sales Orders | `sales_orders` + `SalesOrderService` | READ via `/api/v1/commercial/sales-orders` |
| Fulfillments | `fulfillments` + `fulfillment_allocations` | READ via `/api/v1/commercial/fulfillments` |
| Forwarding | `ForwardingService` / canonical forwarding APIs | READ via canonical forwarding service/API |
| Customs | `CustomsService` / `CustomsAttachmentService` | READ via canonical customs service/API |
| Financial | `FinancialService` / `/lib/financial/` | READ via canonical financial service/API |
| Accounting | `AccountingService` / `/lib/accounting/` | READ via canonical accounting service/API |
| Customer/Entity | `PartyRoleService` / canonical party/entity services | READ via canonical party/entity service/API |
| Timeline/Events | `TimelineQueryService` (new) | READ via new canonical query service |
| Notifications | `NotificationInboxQuery` (new) | READ via new canonical query service |

---

## 6. SECURITY BOUNDARY

### 6.1 Identity Resolution
```
User Request → /api/copilot → resolveApiAuthContext → IdentityContext
```
Copilot must receive `IdentityContext` (tenantId, userId, permissions, role) from the platform's canonical auth pipeline. No client-supplied identity.

### 6.2 Tenant Isolation

**Canonical tenant enforcement model:**

```
Authenticated Session
→ resolveApiAuthContext / resolveSessionIdentity
→ server-derived tenantId
→ canonical service/query boundary
→ tenant-scoped operation
→ RLS as defense-in-depth where applicable
```

**Rules:**
- Tenant identity is server-derived; client-supplied tenant identity is untrusted.
- Canonical services/queries enforce tenant scope; Copilot does not manually inject SQL tenant predicates.
- RLS remains an independent defense layer where applicable.
- Copilot cannot override tenant context.
- Cross-tenant entity resolution must return `PERMISSION_DENIED` or equivalent non-leaking failure.

### 6.3 Authorization
- All PROPOSE actions require `assertPermission(context, capabilityPermission)`.
- All EXECUTE actions require `assertPermission(context, domainActionPermission)`.
- Copilot must not bypass or weaken existing authorization gates.
### 6.4 Audit / Idempotency

Every Copilot interaction must record:
- `tenant_id`
- `user_id`
- `timestamp`
- `intent` / `action`
- `entities` resolved
- `proposal` or `execution` payload
- `outcome` (success/failure/denied)
- `actor_confirmation` flag
- `correlation_id` — stable identifier for the Copilot request cycle
- `idempotency_key` — deterministic key for retry/replay protection on EXECUTE actions

Replay risk handling:
- EXECUTE actions must be idempotent by design.
- Duplicate `idempotency_key` submissions must return the original outcome without re-executing the domain operation.
- Canonical domain services already enforce idempotency where applicable; Copilot must propagate the same key.

---

## 7. IMPLEMENTATION CONSTRAINTS

1. **No parallel data authority** — Copilot must not create competing read/write paths.
2. **No schema pollution** — Copilot must not add columns to canonical domain tables.
3. **No bypass of domain services** — All mutations must route through existing canonical services.
4. **No client-side authority** — All number generation, tenant derivation, and authorization must be server-side.
5. **No direct DB access in production paths** — All queries must use canonical services or approved APIs.
6. **No autonomous financial/accounting mutations** — These require separate ADR and authorization.
7. **Human confirmation required for EXECUTE** — No unattended mutations without explicit user approval.
8. **Preserve existing prototype** — Existing `src/platforms/copilot/` and `src/application/copilot/` code is preserved as implementation substrate; this ADR governs how it must be wired.

---

## 8. ALTERNATIVES CONSIDERED

| Alternative | Classification | Reason Rejected |
|-------------|----------------|-----------------|
| **A1: Copilot with independent data authority** | REJECTED | Violates canonical authority principle; creates parallel data source; bypasses RLS and tenant isolation. |
| **A2: Copilot as read-only, no actions** | DEFERRED | Too restrictive for operational use cases; PROPOSE/EXECUTE model with confirmation provides better UX while preserving safety. |
| **A3: Copilot with direct DB access but RLS** | REJECTED | Bypasses canonical services; couples Copilot to schema; violates domain sovereignty. |
| **A4: Copilot as separate microservice** | REJECTED | Unnecessary complexity; platform is monolith with clear domain boundaries; adds operational overhead without security benefit. |
| **A5: Status quo — prototype only** | ACCEPTED AS BASELINE | Current state; must be upgraded to production via this ADR. |

---

## 9. CONSEQUENCES

### Positive
- Clear canonical grounding model for AI Copilot.
- Security and tenant isolation aligned with platform standards.
- Reuse of existing canonical services and APIs.
- Human confirmation preserves operational safety.
- Audit trail enables compliance and debugging.

### Negative
- Requires new read APIs (`TimelineQueryService`, `OperationalSummaryQuery`, `EntitySearchAPI`, `NotificationInboxQuery`).
- Requires refactoring existing Copilot prototype to use canonical services.
- Requires replacing all mock data in production paths.
- Requires authentication/authorization enforcement on existing `/api/copilot` routes.
- WhatsApp gateway requires identity resolution redesign.

### Risk
- **MEDIUM**: Copilot execution capabilities could be misused if authorization/confirmation boundaries are not rigorously enforced.
- **LOW**: New read APIs could expose data if not properly tenant-filtered.
- **LOW**: Refactoring Copilot to use canonical services may introduce performance overhead.

---

## 10. FUTURE IMPLEMENTATION PHASE

**PROPOSED — NOT AUTHORIZED**

### Foundation

**Purpose:** Design and authorize canonical Copilot query/service contracts and authentication integration.

**Prerequisites:**
- Ratification of this ADR package.
- Authorization of `TimelineQueryService`, `OperationalSummaryQuery`, `EntitySearchAPI`, `NotificationInboxQuery` contracts.

**Non-Scope:**
- No production code changes.
- No mock replacement.
- No `/api/copilot` route modifications.

**Acceptance Gates:**
- Four query/service contracts documented and authorized.
- Authentication integration pattern approved.
- No implementation begins without separate explicit authorization.

---

### Stage 1 — READ

**Purpose:** Replace prohibited production mocks with canonical authorities. Wire Copilot READ paths to canonical domain services and new query contracts.

**Prerequisites:**
- Foundation complete.
- Canonical query contracts implemented and tested.
- `/api/copilot` routes enforce `resolveApiAuthContext` + `assertPermission`.

**Non-Scope:**
- No PROPOSE/EXECUTE capabilities.
- No financial/accounting mutations.
- No WhatsApp gateway changes.

**Acceptance Gates:**
- G1 — Canonical Grounding: 100% of production Copilot READ operations use approved canonical authorities.
- G2 — Tenant Isolation: 0 cross-tenant access violations.
- G7 — Mock Elimination: 0 prohibited mock/static dependencies remain on production READ paths.

---

### Stage 2 — PROPOSE

**Purpose:** Introduce proposal generation using canonical authorization and human confirmation. Copilot can recommend/draft actions but cannot execute them.

**Prerequisites:**
- Stage 1 complete and accepted.
- PROPOSE authorization model approved per ADR.
- Human confirmation UI/flow implemented.

**Non-Scope:**
- No EXECUTE capabilities.
- No financial/accounting proposals.
- No autonomous mutations.

**Acceptance Gates:**
- G3 — Authorization: 0 proposals generated beyond actor/domain authorization.
- G5 — Human Confirmation: 100% of proposals require explicit user approval before becoming actions.
- G6 — Auditability: 100% of proposals produce audit record.

---

### Stage 3 — EXECUTE

**Purpose:** Introduce only explicitly approved operational/commercial mutations using canonical domain services, authorization, confirmation, audit, and idempotency.

**Prerequisites:**
- Stage 2 complete and accepted.
- Domain-specific EXECUTE capabilities individually authorized by ADR.
- Idempotency infrastructure implemented.
- Audit logging implemented.

**Non-Scope:**
- No financial/accounting mutations (requires separate ADR).
- No autonomous execution.
- No unattended mutations.

**Acceptance Gates:**
- G3 — Authorization: 0 capabilities executed beyond actor/domain authorization.
- G4 — Mutation Boundary: 0 unauthorized direct domain/database mutations.
- G5 — Human Confirmation: 100% of defined EXECUTE action classes require explicit confirmation.
- G6 — Auditability: 100% of executed actions produce required audit/correlation record.

---

### Stage 4 — WhatsApp

**Purpose:** Integrate WhatsApp through canonical user/entity identity resolution. Replace admin-client data access with user-scoped identity.

**Prerequisites:**
- Stage 1 complete (canonical identity resolution available).
- WhatsApp gateway redesign approved.

**Non-Scope:**
- No new WhatsApp-specific PROPOSE/EXECUTE capabilities beyond what is authorized in Stages 2 and 3.

**Acceptance Gates:**
- G2 — Tenant Isolation: 0 cross-tenant access violations via WhatsApp gateway.
- G6 — Auditability: 100% of WhatsApp-originated Copilot interactions produce audit record.
- No admin-client data access in production request paths.

---

### Implementation Constraints (All Stages)

1. **No parallel data authority** — Copilot must not create competing read/write paths.
2. **No schema pollution** — Copilot must not add columns to canonical domain tables.
3. **No bypass of domain services** — All mutations must route through existing canonical services.
4. **No client-side authority** — All number generation, tenant derivation, and authorization must be server-side.
5. **No direct DB access in production paths** — All queries must use canonical services or approved APIs.
6. **No autonomous financial/accounting mutations** — These require separate ADR and authorization.
7. **Human confirmation required for EXECUTE** — No unattended mutations without explicit user approval.
8. **Preserve existing prototype** — Existing `src/platforms/copilot/` and `src/application/copilot/` code is preserved as implementation substrate; this ADR governs how it must be wired.

---

## 11. ACCEPTANCE GATES

### G1 — Canonical Grounding
All production Copilot READ operations use approved canonical authorities. Zero direct database queries in production paths.

### G2 — Tenant Isolation
No cross-tenant data access. All queries filtered by `tenant_id = get_my_tenant_id()`. RLS enforced.

### G3 — Authorization
Copilot cannot exceed actor permissions. All PROPOSE/EXECUTE actions validated via `assertPermission`.

### G4 — Mutation Boundary
No unauthorized domain mutations. EXECUTE requires explicit human confirmation unless ADR-exempt.

### G5 — Human Confirmation
Confirmation gate exists for all defined EXECUTE action classes. Audit trail records `actor_confirmation` flag.

### G6 — Auditability
All Copilot interactions logged with tenant, user, timestamp, intent, entities, action, outcome.

### G7 — Mock Elimination
Production paths no longer depend on prohibited mock/static data. Only environment-gated test/demo mocks remain.

### G8 — Regression
Future implementation must preserve the established baseline and introduce zero new failures attributable to the authorized Copilot implementation. Known pre-existing baseline failures remain unchanged; all newly added Copilot tests pass; all applicable targeted gates pass.

---

## 12. AUTHORIZATION BOUNDARY

This ADR does **not** authorize implementation.

Future implementation requires:

1. Ratification of this ADR package.
2. Design and authorization of required canonical APIs (`TimelineQueryService`, `OperationalSummaryQuery`, `EntitySearchAPI`, `NotificationInboxQuery`).
3. Explicit implementation authorization with defined phase scope and acceptance criteria.

**Prepared authorization string (NOT AUTHORIZATION):**
```
I AUTHORIZE SENTRALOGIS AI COPILOT PRODUCTION INTEGRATION IMPLEMENTATION ONLY.
```

---

## 13. STATUS

**PROPOSED — AWAITING RATIFICATION**

This ADR package is prepared for review and ratification.

Ratification converts it from PROPOSED to RATIFIED and establishes the architecture boundary for future implementation.

---

## 14. DATE

2026-09-07

---

**END OF AI COPILOT ARCHITECTURE DECISION & ADR PACKAGE**
