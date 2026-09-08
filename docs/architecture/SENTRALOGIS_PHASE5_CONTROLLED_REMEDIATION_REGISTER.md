# SENTRALOGIS — PHASE 5
# CONTROLLED REMEDIATION REGISTER

**Date:** 2026-08-31  
**Baseline:** U-26R-P1 YELLOW  
**Purpose:** Track all remaining U-26 findings through Phase 5

---

## SUMMARY

| Classification | Count |
| -------------- | ----: |
| GAP | 6 |
| RISK | 10 |
| DEBT | 7 |
| OBSERVATION | 5 |
| BLOCKER | 0 |
| **TOTAL** | **28** |

---

## REGISTER

| ID | Classification | Severity | Description | Phase-5 Impact | Control | Remediation Phase | Status | Evidence |
| -- | -------------- | -------- | ----------- | -------------- | ------- | ----------------- | ------ | -------- |
| GAP-02 | GAP | HIGH | Invoice number has no server-side authority | None — invoice infrastructure incomplete | NON-BLOCKING DEBT | Phase 5B or later | OPEN | No `next_invoice_number()` function exists |
| GAP-03 | GAP | MEDIUM | No canonical domain service for Warehouse | None — warehouse adapter exists | NON-BLOCKING DEBT | Phase 5D or later | OPEN | `lib/warehouse/service.ts` does not exist |
| GAP-04 | GAP | MEDIUM | `replanFulfillment` not implemented | None — versioned revisions suffice | NON-BLOCKING DEBT | Phase 5C or later | OPEN | Control Tower references but does not call `replanFulfillment` |
| GAP-05 | GAP | LOW | Handoff `expires_at` / timeout not implemented | None — handoff state machine works | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `operational_handoffs` table has no `expires_at` column |
| GAP-06 | GAP | MEDIUM | Customer view requires auth; no public tracking page | None — customer view exists with auth | NON-BLOCKING DEBT | Phase 5A or later | OPEN | `/track/cargo/[token]` shows mock data |
| GAP-07 | GAP | MEDIUM | No margin/capacity/customer risk scoring | None — Control Tower has 9-state status | NON-BLOCKING DEBT | Phase 5D or later | OPEN | `lib/control-tower/service.ts` has no risk scoring |
| RISK-04 | RISK | HIGH | Client-side WO/JO/Shipment number generation | None — DB unique constraints provide safety net | CONTROLLED REMEDIATION | Phase 5A (hardening sprint) | OPEN | `lib/utils/woNumber.ts`, `trucking-adapter.ts`, `shipment-factory.ts` use `Math.random()` |
| RISK-05 | RISK | HIGH | Legacy forwarding domain browser client | None — canonical domain is clean | CONTROLLED REMEDIATION | Phase 5A (hardening sprint) | OPEN | `lib/domain/forwarding/pricing.ts`, `repository.ts` import `supabase/client` |
| RISK-06 | RISK | HIGH | Customs adapter bypasses canonical service | None — canonical customs service exists | CONTROLLED REMEDIATION | Phase 5A (hardening sprint) | OPEN | `customs-adapter.ts:53-98` writes directly to `cus_declarations` |
| RISK-07 | RISK | MEDIUM | No webhook signature verification | None — not Phase-5-required | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `app/api/webhooks/whatsapp/route.ts` has no signature check |
| RISK-08 | RISK | MEDIUM | Twilio mock fallback returns success without sending | None — not Phase-5-required | NON-BLOCKING DEBT | Phase 5B or later | OPEN | `app/api/whatsapp/send-template/route.ts:42` |
| RISK-09 | RISK | LOW | EasyGo token in plaintext in migration | None — not Phase-5-required | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `20260805_easygo_integration.sql:10` |
| RISK-10 | RISK | MEDIUM | Forwarding command-center broken read | None — route not in critical path | NON-BLOCKING DEBT | Phase 5A or later | OPEN | `correlation_id` column does not exist |
| RISK-11 | RISK | MEDIUM | Legacy role system active | None — normalization works | NON-BLOCKING DEBT | Phase 5D or later | OPEN | `lib/application/identity/roles.ts:102-204` |
| RISK-12 | RISK | MEDIUM | Legacy engagement bridge public resolution | None — backward compatibility preserved | NON-BLOCKING DEBT | Phase 5D or later | OPEN | `engagement-bridge.ts:368-440` |
| RISK-13 | RISK | P2 | 165+ TODOs in production code | None — tracked in backlog | NON-BLOCKING DEBT | Phase 5E or later | OPEN | Multiple files |
| DEBT-01 | DEBT | HIGH | Forwarding shell (`app/sbu/forwarding/`) mock-only | None — real forwarding pages exist | CONTROLLED REMEDIATION | Phase 5A (hardening sprint) | OPEN | Hardcoded stats `ACTIVE CONSOL: 12` etc. |
| DEBT-02 | DEBT | P1 | 5 stubbed event dispatchers | None — events are stubbed, not broken | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `SupabaseDomainEventDispatcher`, `RabbitMQDomainEventDispatcher`, etc. |
| DEBT-03 | DEBT | P2 | 20+ TODO migration markers | None — cosmetic | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `src/components/ui/`, `src/components/shared/`, `src/lib/` |
| DEBT-04 | DEBT | P2 | Unused DB sequences | None — cosmetic | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `seq_wo_number`, `seq_jo_number` exist but never wired |
| DEBT-05 | DEBT | P3 | Duplicate CeisaPreparationService | None — one is dead code | NON-BLOCKING DEBT | Phase 5E or later | OPEN | Root-level vs subfolder duplicate |
| DEBT-06 | DEBT | P3 | Legacy status mappers | None — backward compatibility | NON-BLOCKING DEBT | Phase 5E or later | OPEN | `StatusMappers.ts` bidirectional mapping |
| DEBT-07 | DEBT | P2 | CreateWOForm direct table mutations | None — UI writes, not domain | NON-BLOCKING DEBT | Phase 5A or later | OPEN | 9+ direct mutations in form component |
| OBS-01 | OBSERVATION | — | Import FCL end-to-end gap | None — future scope | OBSERVATION | Future | OPEN | No integrated FCL import-to-delivery orchestration |
| OBS-02 | OBSERVATION | — | CKD EV special handling gap | None — future scope | OBSERVATION | Future | OPEN | No CKD-specific workflows |
| OBS-03 | OBSERVATION | — | Commercial amendment workflow gap | None — ADR-044 unbuilt | OBSERVATION | Future | OPEN | No formal amendment workflow |
| OBS-04 | OBSERVATION | — | Zero real DB execution in tests | Partial — P1 test added | CONTROLLED REMEDIATION | Phase 5 (hardening sprint) | OPEN | 0% of tests execute SQL against PostgreSQL |
| OBS-05 | OBSERVATION | — | Zero E2E/UI test coverage | None — future scope | OBSERVATION | Future | OPEN | No Playwright browser tests configured |
| FWD-GAP-01 | GAP | HIGH | `fw_order_headers` missing `tenant_id`, RLS, references non-existent enums | None — schema repaired | **CLOSED** | Phase 5A-2 | CLOSED | Migration 024 creates with tenant_id, RLS, TEXT status |
| FWD-GAP-02 | GAP | HIGH | `fw_legs` missing `tenant_id`, RLS, has SQL syntax error, references non-existent enums | None — schema repaired | **CLOSED** | Phase 5A-2 | CLOSED | Migration 024 creates with tenant_id, RLS, TEXT enums, no syntax error |
| FWD-GAP-03 | GAP | MEDIUM | `fw_locations` missing `tenant_id`, RLS | None — schema repaired | **CLOSED** | Phase 5A-2 | CLOSED | Migration 024 adds tenant_id + RLS + index |
| FWD-GAP-04 | GAP | MEDIUM | No integration between canonical `shp_shipments` and legacy `fw_*` tables | None — coexistence supported | CONTROLLED | Phase 5A-3 | OPEN | `shp_shipments` and `fw_consolidations` are independent |
| FWD-GAP-05 | GAP | LOW | `fw_price_master` queries non-existent columns | None — schema aligned | **CLOSED** | Phase 5A-2 | CLOSED | Migration 024 adds missing columns; `pricing.ts` queries corrected |
| FWD-RISK-01 | RISK | HIGH | Legacy forwarding domain uses browser `supabase/client` | None — coexists with server API | CONTROLLED | Phase 5A-3 | OPEN | `pricing.ts`, `repository.ts` import browser client |
| FWD-RISK-02 | RISK | MEDIUM | `fw_container_items.tracking_token` backfilled with non-deterministic tokens | None — backfill is in DB | CONTROLLED | Phase 5A-3 | OPEN | Migration 172 uses `md5(random()::text || id::text)` |
| FWD-DEBT-01 | DEBT | MEDIUM | Forwarding shell dashboard mock data | None — real pages exist | DEFERRED | Phase 5A-4 | OPEN | `/sbu/forwarding/page.tsx` hardcoded stats |
| FWD-DEBT-02 | DEBT | LOW | Legacy compatibility views duplicate canonical data | None — backward compatibility | DEFERRED | Phase 5E | OPEN | `v_legacy_fw_consolidations`, `v_legacy_fw_containers` |

---

## STATUS LEGEND

| Status | Meaning |
| ------ | ------- |
| OPEN | Not yet addressed |
| IN PROGRESS | Actively being remediated |
| CONTROLLED | Being tracked, not blocking Phase 5 |
| CLOSED | Remediated with evidence |
| DEFERRED | Intentionally postponed with owner/control |

---

## ESCALATION RULE

Any finding that becomes a genuine Phase-5 blocker must be immediately promoted to **PHASE 5 BLOCKER** and feature progression must stop until remediated.

**END OF REGISTER**
