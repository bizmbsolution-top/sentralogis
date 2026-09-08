# SENTRALOGIS — PHASE 4B-0 APPLICATION MAPPING

## Detailed Legacy → Canonical Mapping Tables

**Date:** 2026-08-25 · Companion to `SENTRALOGIS_PHASE4B0_ARCHITECTURE_GATE.md`
Legend — **Ownership**: who owns lifecycle truth · **Adapter**: ACL component required · **Stage**: rollout wave (4B-1a…4B-5) · **Risk**: H/M/L

---

## A. COMMERCIAL ENTITIES

| Legacy entity | Canonical entity | Application concept | Ownership | Read path | Write path | Adapter required? | Stage | Risk |
|---|---|---|---|---|---|---|---|---|
| `work_orders` | `commercial_work_orders` | Operational case file shadowing an engagement | Canonical (ADR-018); legacy = operational artifact | HQ workbench browser-direct; /api/wo GET | CreateWOForm, /api/wo, forwarding API, RPCs 105/106/157 | YES — EngagementBridgeAdapter (resolve-or-create) | 4B-1b | H |
| `wo_items` (revenue fields) | `commercial_line_items` | Purchased service lines | Commercial | invoice-customer page | CreateWOForm, /api/wo, forwarding API | YES — bridge mirrors sell lines | 4B-2 | H |
| `wo_items` (slot config: max_jo_count, sbu_type, addresses) | *(stays legacy)* + future activation payload | Execution slot configuration | SBU operations | assignment modals | CreateWOForm, assignmentSave | NO (stays) | n/a | L |
| `wo_items.unit_price/total_revenue` | future `service_pricing` snapshot on activations | Agreed price snapshots | Commercial | business dashboards | WO creation flows | YES (pricing phase) | 4B-3 | M |
| CRM quotations/deals (`crm_*`) | Service Package / Activations (future) | Pre-sale configuration | Commercial/Sales | sales portal | sales flows | YES | 4B-3+ | M |
| `commercial_service_scopes` | *(retired → compat view)* | Incoterm/lane terms redistribute to engagement/package | Commercial | none today | none today | n/a | 4B-1b decision | L |

## B. CAPABILITY & ORCHESTRATION

| Legacy concept | Canonical entity | Application concept | Ownership | Read path | Write path | Adapter? | Stage | Risk |
|---|---|---|---|---|---|---|---|---|
| SBU label (`sbu_type` string on wo_items/job_orders; UI switches) | `commercial_capability_bindings.capability_type` → registry code | Organizational routing | Commercial/registry | capabilities route | binding POST (+future PATCH) | Registry validation adapter | 4B-1c | M |
| Per-SBU workflow branching (`if sbu===` sites ×8) | capability-driven dispatch via SR target_domain | Capability-driven composition | Orchestrator | execution-plan-service | adapters | YES — registry lookup replaces branches progressively | 4B-1c→4B-4 | M |
| Forwarding consolidation engine (`fw_*`) | `shp_shipments` aggregate | Two generations of the same domain | SBU Forwarding (canonical) | v1 routes + command-center projection | v1 shipment routes; legacy consol API parallel | Strangler parity checks | 4B-4 | M |
| `svc_service_requests` | itself | Cross-domain command message (NOT a job) | Orchestration layer | v1 service-requests; command-center join | dispatcher/adapters | Harden auth + lineage | 4B-1d | H |

## C. EXECUTION ENTITIES

| Legacy entity | Canonical entity | Application concept | Ownership | Read path | Write path | Adapter? | Stage | Risk |
|---|---|---|---|---|---|---|---|---|
| `job_orders` (TRUCKING) | *(domain-private trucking execution)* reached via SR | Executable operational unit (trip) | SBU Trucking (sovereign) | driver feed, SBU boards, dashboards | 55 sites incl. driver API | ExecutionLineageAdapter (creation only) | 4B-1d | H |
| `job_orders` (WAREHOUSE rows) | wh_* flow + future WH SR consumption | Warehouse task carrier | SBU Warehouse | WH portals/dashboards | portal/RPC writes | Warehouse adapter (stub today) | 4B-4 | M |
| `cus_declarations` stack | itself | Customs execution + compliance record | SBU Customs | v1 customs routes/workbench | v1 routes, customs adapter | Already canonical-shaped | deployed ✅ | L |
| `shp_shipments`(+legs/units/milestones) | itself | Multimodal shipment aggregate | SBU Forwarding (canonical) | v1 forwarding/workspace | v1 routes | Fabricated-ID fix in creator | 4B-1e | H |
| `job_routes`, `tracking_updates` | milestones/events (projection source) | Stop-level execution telemetry | SBU Trucking | tracking console/APIs | driver APIs | Event-emitting translator later | 4B-5 | L |
| GPS tables (`fleet_gps_status`, `tracking_points`) | resource telemetry | Provider/resource position feed | Ops platform | fleet-status/easygo | cron/native | none | n/a | L |

## D. RESOURCES & PARTIES

| Legacy | Canonical concept | Notes | Stage | Risk |
|---|---|---|---|---|
| `md_drivers`, `driver_profiles`, `driver_tenant_links` | Resource: Driver (multi-tenant identity) | Link model already generic; keep | n/a | L |
| `md_fleets`, `md_fleet_types`, `armada`(orphan) | Resource: Fleet/Vehicle | armada deprecated/cleanup | P3 | L |
| `md_transporters`, `md_transporter_*` | Provider: Transporter | Keep; canonical provider typing later | 4B-3+ | L |
| Vessel/terminal/port | `md_locations` nodes + leg attributes | Locations hierarchy exists; voyage/vessel fields belong on legs/bookings when needed | 4B-4 | M |
| `md_entities` (customer) | Party/Customer | Shared ✅ | n/a | L |
| `md_warehouses`, `wh_*` masters | Resource: Warehouse | Keep | n/a | L |

## E. FINANCE, DOCUMENTS, EVENTS

| Legacy | Canonical concept | Ownership | Adapter? | Stage | Risk |
|---|---|---|---|---|---|
| `invoices`/`invoice_lines` (+client-side totals from JO flags) | Finance billing read-model keyed to future activations | Finance | YES (billing eligibility translator) | 4B-5 | H |
| `extra_costs`, `vendor_invoices`, JO price columns | Cost side of capital domain (SBU-owned) | SBU/Finance | partial | 4B-5 | M |
| `fin_financial_ledger_entries` (deployed, empty) | 3-tier ledger (REVENUE/COGS/PASS_THROUGH) | Finance | producers required | 4B-5 | M |
| POD photos, assignment_documents JSONB, cus documents vault | Document associations per context (no unified vault yet) | SBU-scoped | deferred | P3 | L |
| `event_outbox` family (empty) | Canonical business events | Originating domain services | event-emitting translators | 4B-2 | M |
| SLA snapshots, monitor crons | Analytical projections | Intelligence | none | n/a | L |

---

## F. TENANT RESOLUTION MAP (write paths)

| Surface | Current resolution | Target (post-hardening) |
|---|---|---|
| HQ/SBU dashboards & forms | session profile.tenant_id in payload (browser-direct) | unchanged short-term; server actions later |
| `/api/wo`, `/api/forwarding/*` | body tenant_id under service-role ⚠ | session-resolved only (4B-1a helper) |
| `/api/v1/customs`,`/api/v1/forwarding` helpers | profiles.tenant_id assumption (broken live) | get_my_tenant_id()-equivalent resolver (4B-1a) |
| `/api/v1/service-requests` | body/query tenant ⚠ | same as above |
| Driver flows | server-resolved from JO row/links ✅ | keep |
| Cron jobs | row's own tenant_id ✅ | keep |

## G. STATUS TRANSLATION MAP

| Legacy status event | Canonical semantic | Never implies |
|---|---|---|
| JO 'PEKERJAAN SELESAI' | Execution completed (SBU-private event) | engagement fulfilled / billed / customer-notified automatically |
| wo_items all 'assigned' → work_orders 'assigned' | Capability resources committed (operational) | commercial confirmation |
| is_doc_finished && is_cost_finished → ready_for_billing | Billing eligibility candidate | revenue recognized |
| capability binding ACTIVE | SBU engaged on engagement | anything sold/priced |
| svc_request FULFILLED | Domain job delivered | engagement complete |
