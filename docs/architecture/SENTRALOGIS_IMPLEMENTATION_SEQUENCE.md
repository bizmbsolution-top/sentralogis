# SENTRALOGIS — IMPLEMENTATION SEQUENCE & ROADMAP v1.0
## Phased Zero-Downtime Execution Order & Guardrails
**Document Version:** 1.0.0-SEQUENCE  
**Status:** APPROVED IMPLEMENTATION ROADMAP  
**Classification:** Internal Technical Standard  

---

# 1. IMPLEMENTATION PHASES OVERVIEW

```
+----------------------------------------------------------------------------------------------------+
|                               PHASED IMPLEMENTATION TIMELINE                                       |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [PHASE 0: PREPARATION & MIGRATION CLEANUP]                                                        |
|      │ ── Quarantine broken files (176/178), drop redundant `fw_locations`.                        |
|      ▼                                                                                             |
|  [PHASE 1: CANONICAL DDL DEPLOYMENT]                                                               |
|      │ ── Deploy `commercial_*`, `shp_*`, `svc_*`, `cus_*`, `fin_*` tables + RLS.                  |
|      ▼                                                                                             |
|  [PHASE 2: DATABASE COMPATIBILITY ADAPTERS]                                                        |
|      │ ── Deploy SQL views (`v_legacy_fw_consolidations`) so active dashboards don't break.        |
|      ▼                                                                                             |
|  [PHASE 3: SERVICE REQUEST CONTRACT ADAPTERS]                                                      |
|      │ ── Build TypeScript contract dispatcher; eliminate Ghost Trucking WO generation.           |
|      ▼                                                                                             |
|  [PHASE 4: STANDALONE SBU CUSTOMS CLEARANCE]                                                       |
|      │ ── Build `/api/v1/customs/*` and the Standalone Customs Clearance UI Workspace.            |
|      ▼                                                                                             |
|  [PHASE 5: COMPOSABLE SHIPMENT ORCHESTRATOR UI]                                                    |
|      │ ── Build Composable Create WO Form in HQ & Modern Forwarding Workspace.                     |
|      ▼                                                                                             |
|  [PHASE 6: HISTORICAL DATA BACKFILL & DUAL-RUN]                                                    |
|      │ ── Backfill legacy `fw_*` data into `shp_*`; verify 100% data parity under load.            |
|      ▼                                                                                             |
|  [PHASE 7: CONTROL TOWER & DEMURRAGE WATCHDOG]                                                     |
|      │ ── Deploy CQRS Projections & AI Copilot risk evaluation engine.                             |
|      ▼                                                                                             |
|  [PHASE 8: LEGACY CODE & TABLE REMOVAL]                                                            |
|      │ ── Drop legacy `fw_*` tables after 60 days of verified production stability.                |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

# 2. PHASE 0 & 1: EXACT FIRST CODING STEPS

### Exact Files to Modify in Phase 1 (First Implementation Phase):
1. `supabase/migrations/20260826_001_canonical_enums_and_extensions.sql` (New canonical enums).
2. `supabase/migrations/20260826_002_commercial_and_service_scopes.sql` (`commercial_*`).
3. `supabase/migrations/20260826_003_canonical_shipments_and_units.sql` (`shp_*`).
4. `supabase/migrations/20260826_004_service_requests_and_contracts.sql` (`svc_*`).
5. `supabase/migrations/20260826_005_customs_declarations_schema.sql` (`cus_*`).
6. `supabase/migrations/20260826_006_event_outbox_and_auditing.sql` (`event_outbox`).
7. `supabase/migrations/20260826_007_legacy_compatibility_views.sql` (`v_legacy_*`).
8. `lib/domain/service-contracts/types.ts` (TypeScript interfaces for Service Requests).
9. `lib/domain/shipment/types.ts` (TypeScript interfaces for Canonical Shipments).

### Exact Files That MUST NOT Be Modified in Phase 1:
- `android/app/src/main/java/com/sentralogis/driver/*` (Native Android GPS Service).
- `app/jo/[token]/page.tsx` (Driver Execution PWA).
- `app/api/jo/*` (Active Driver GPS pings and telemetry handlers).
- `lib/hooks/useDriverGpsPing.ts` (Driver telemetry hook).
- `src/domains/trucking/*` (Mature Trucking Aggregates).
- `supabase/migrations/180_add_geofence_columns_to_job_routes.sql` (Trucking geofences).
- `supabase/migrations/20260812_cross_tenant_driver_links.sql` (Driver cross-tenant links).

---

# 3. ROLLBACK & RISK MITIGATION PROTOCOL

- **DDL Rollback:** Every migration has a corresponding `.down.sql` script dropping only new `shp_*`, `cus_*`, and `svc_*` tables.
- **Trucking Immunity:** Because `trk_job_orders` is untouched, any rollback in Forwarding or Customs leaves Trucking fleet operations 100% operational.
- **View Isolation:** If the new API encounters unexpected edge cases, the frontend can be switched back to query legacy views with zero data loss.

---
*Approved by Principal Architecture Board & Release Engineering*
