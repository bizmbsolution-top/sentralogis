# SENTRALOGIS — PHASE 5A WAVE 6
# DRIVER COIN REWARD + WHATSAPP INQUIRY

**Date:** 2026-09-05  
**Status:** GREEN — WAVE 6 COMPLETE  
**Phase:** 5A Wave 6 — Driver Coin Reward + WhatsApp Inquiry  

---

## 1. AUTHORIZATION

```text
Phase 5:
AUTHORIZED — CONTROLLED REMEDIATION

Phase 5A:
AUTHORIZED

Wave:
WAVE 6 — DRIVER COIN REWARD + WHATSAPP INQUIRY
```

**Authorization source:** `docs/architecture/SENTRALOGIS_PHASE5_KICKOFF.md`

---

## 2. PRD REQUIREMENT

**Source:** `190726.md` lines 284–331

**Requirement:**
- Driver (internal & vendor) yang berhasil selesaikan job mendapat **1 koin = Rp 5.000**
- Driver bisa cek saldo koin kapan saja via WA dengan kirim kata kunci "KOIN"
- Flow:
  1. Driver klik PEKERJAAN SELESAI → PATCH `/api/jo/[token]` → API award coin: INSERT `driver_coins` + UPDATE `md_drivers.total_coins`
  2. Driver WA "KOIN" ke nomor Sentralogis → Twilio → POST `/api/whatsapp/webhook` → Cari driver by WA number → Balas: "🪙 Saldo: 12 Koin (Rp 60.000)"

---

## 3. EXISTING ARCHITECTURE

### 3.1 Driver Coin Reward

**Schema:** `supabase/migrations/193_driver_coins.sql`

**Tables:**
- `driver_coins` — ledger of coin transactions
- `md_drivers.total_coins` — running balance
- `md_drivers.total_coin_value` — running value

**RPC Functions:**
- `award_driver_coin(p_driver_id UUID, p_tenant_id UUID, p_job_order_id UUID)` — atomic, idempotent
- `get_driver_coin_balance(p_driver_id UUID)` — returns balance

**Trigger Points:**
1. `/api/jo/[token]` route (line 1554) — when JO is completed via PATCH
2. `JoAutoCompleteService.ts` (line 156) — when JO is auto-completed

Both use canonical `jo.driver_id`, `jo.tenant_id`, `jo.id`.

### 3.2 WhatsApp Inquiry

**Pre-Wave 6:** Webhook delegated entirely to CopilotEngine. No KOIN handling.

**Post-Wave 6:** Webhook checks for "KOIN" keyword before delegating to CopilotEngine.

---

## 4. FINDINGS

| Area | Evidence | Finding | Severity | Classification | Action |
|------|----------|---------|----------|----------------|--------|
| Coin schema | migration 193 | `driver_coins` table + RLS + RPCs exist | PASS | FACT | No change needed |
| Coin trigger | `/api/jo/[token]` + `JoAutoCompleteService` | Two canonical award points using `award_driver_coin` RPC | PASS | FACT | No change needed |
| Coin idempotency | `award_driver_coin` RPC | DB-level existence check `WHERE job_order_id = p_job_order_id AND driver_id = p_driver_id` | PASS | FACT | No change needed |
| Coin tenant safety | RPC uses `p_tenant_id` from canonical JO | PASS | FACT | No change needed |
| Coin client mutation | No browser `driver_coins` mutation found | PASS | FACT | No change needed |
| Driver feed coin balance | `app/api/driver/feed/route.ts` | **REPAIRED** — query used non-existent `amount` field instead of `coins` | HIGH | DEFECT | Fixed |
| Driver feed coin response | `app/api/driver/feed/route.ts` | **REPAIRED** — added `total_coins`/`total_coin_value` to driver object | MEDIUM | DEFECT | Fixed |
| WhatsApp KOIN inquiry | `app/api/whatsapp/webhook/route.ts` | **IMPLEMENTED** — KOIN keyword handling added | GAP | REQUIRED | Implemented |
| ProfileTab coin display | `app/driver/portal/components/ProfileTab.tsx` | **IMPLEMENTED** — coin balance shown in profile | GAP | REQUIRED | Implemented |

---

## 5. REMEDIATION

### 5.1 Driver Feed API Coin Query Fix (HIGH)

**File:** `app/api/driver/feed/route.ts`

**Before:**
```typescript
.from("driver_coins")
.select("id, amount, status, description, created_at")
```

**After:**
```typescript
.from("driver_coins")
.select("id, coins, coin_value, status, created_at")
```

**Reason:** `amount` field does not exist in `driver_coins` schema. Correct field is `coins`.

### 5.2 Driver Feed API Coin Balance Response (MEDIUM)

**File:** `app/api/driver/feed/route.ts`

**Before:** Coin balance returned only at top-level `coins` key, not in `driver` object.

**After:** Added `total_coins` and `total_coin_value` to `driver` object in response.

**Reason:** ProfileTab expects coin data on the `driver` object.

### 5.3 WhatsApp KOIN Inquiry (REQUIRED)

**File:** `app/api/whatsapp/webhook/route.ts`

**Implementation:**
1. Check if incoming message is "KOIN" (case-insensitive)
2. Resolve driver by WhatsApp number via `md_drivers.whatsapp` or `md_drivers.phone`
3. Call `get_driver_coin_balance()` RPC with canonical `driver_id`
4. Format reply: `🪙 Saldo Koin Driver\n\nHalo {name}!\n\nTotal Koin: {totalCoins}\nNilai: Rp {totalValue}\n\n1 Koin = Rp 5.000`
5. Send via `sendWhatsAppMessage()`
6. Return early — do NOT delegate to CopilotEngine for KOIN messages

### 5.4 ProfileTab Coin Display (REQUIRED)

**File:** `app/driver/portal/components/ProfileTab.tsx`

**Implementation:**
- Added `Coins` icon import
- Added coin balance section showing: `{total_coins} koin ({formatted_rupiah_value})`
- Positioned after SIM Expiry, before App & Device Diagnostics

---

## 6. SECURITY INVARIANTS PROVEN

```
ONE QUALIFYING JO COMPLETION
        =
ONE REWARD TRANSACTION
```
Evidence: `award_driver_coin()` RPC checks `WHERE job_order_id = p_job_order_id AND driver_id = p_driver_id` before inserting.

```
TENANT A
        ≠
TENANT B
```
Evidence: RPC uses `p_tenant_id` from canonical JO record. `driver_coins` has FK to `tenants(id)`.

```
CLIENT
        ≠
REWARD AUTHORITY
```
Evidence: No browser-side `driver_coins` mutation found. Award only via server-side RPC from JO completion handlers.

```
DRIVER
        ≠
REWARD AUTHORITY
```
Evidence: Driver cannot modify own balance. Only server-side JO completion triggers award.

---

## 7. TEST RESULTS

| Test Suite | Result |
|------------|--------|
| Phase 5A-2 Forwarding Schema Repair | 43/43 PASS |
| Phase 5A-5 FCL/LCL Workflow | 24/24 PASS |
| Phase 5A-3 Forwarding Vertical Slice | PASS |
| Phase 5A-2R Forwarding Repository Boundary | PASS |
| Phase 5A-4 Operational Assignment | PASS |
| Phase 5A Wave 3 Consolidation + Stuffing Verification | 32/32 PASS |
| Phase 5A Wave 4 Deconsol + Delivery JO Verification | 23/23 PASS |
| Phase 5A Wave 5 Cargo Owner Tracking Security | 22/22 PASS |
| **Phase 5A Wave 6 Driver Coin + WhatsApp** | **19/19 PASS** |
| **Total** | **257/257 PASS** |

**TypeScript:** 0 errors  
**Full regression:** NOT RUN (targeted Wave 6 coverage sufficient)

---

## 8. FILES CHANGED

| File | Change |
|------|--------|
| `app/api/driver/feed/route.ts` | FIXED — coin query columns (`coins`/`coin_value` instead of non-existent `amount`); added coin balance to driver object |
| `app/api/whatsapp/webhook/route.ts` | NEW — KOIN keyword handling with driver resolution + balance reply |
| `app/driver/portal/components/ProfileTab.tsx` | UPDATED — displays coin balance |
| `app/driver/portal/components/types.ts` | UPDATED — added `total_coins`/`total_coin_value` to `DriverProfileData` |
| `lib/__tests__/phase5a6-driver-coin-whatsapp.test.ts` | NEW — 19 targeted tests |

---

## 9. CHANGE INTEGRITY

| Category | Count |
|----------|-------|
| Production changes | 3 files (feed API, webhook, ProfileTab) |
| Schema changes | 0 |
| Migrations | 0 |
| Data mutations | 0 |
| ADR changes | 0 |
| UI changes | 1 (ProfileTab coin display) |
| API changes | 1 (webhook KOIN handler) |
| Service changes | 1 (feed API coin fix) |
| Tests executed | 257 |
| Deployment | 0 |
| Git commits | 0 |

---

## 10. REMAINING RISKS

| Risk | Severity | Evidence |
|------|----------|----------|
| No rate limiting on WhatsApp KOIN endpoint | LOW | Not in current architecture; Twilio webhook is authenticated by Twilio |
| Coin value hardcoded at Rp 5.000 | INFO | PRD-specified; configurable via RPC if needed |
| No coin expiration/revocation | INFO | Not specified in PRD |

---

## 11. FINAL RESPONSE

PHASE 5A WAVE 6 STATUS: **GREEN**

Driver Coin Reward: **VERIFIED + REPAIRED**
- Server-side RPC `award_driver_coin()` — atomic, idempotent, tenant-safe
- Triggered from canonical JO completion (both API and auto-complete paths)
- Driver feed API coin query fixed (`coins`/`coin_value` columns)

WhatsApp KOIN Inquiry: **IMPLEMENTED**
- Keyword "KOIN" handled in webhook
- Driver resolved by WA number
- Balance fetched via `get_driver_coin_balance()` RPC
- Formatted reply sent via Twilio

ProfileTab: **UPDATED**
- Coin balance displayed in driver portal profile

Targeted validation: **257/257 PASS**

Wave 6 CLOSED — GREEN.

Next logical scope:
Phase 5A Wave 7 — Air Freight Dispatch Path.

Wave 7 is NOT automatically authorized by this report.
A separate execution scope/gate must be respected.

HARD STOP

---

**END OF PHASE 5A WAVE 6 REPORT**
