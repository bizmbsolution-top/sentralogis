# PRD: Dual GPS Source + Cross-Tenant Vendor Integration
**Date:** 2026-08-05  
**Status:** Draft  
**Target:** SBU Trucking Fleet Performance + Multi-Tenant Vendor GPS

---

## 1. Problem Statement

### 1.1 Current Gap
Fleet Performance page (`/hq/fleet-performance`) hanya menampilkan GPS dari **EasyGo hardware**. Armada tanpa GPS provider (mengandalkan GPS HP driver) menampilkan **NO_SIGNAL** — padahal driver sudah mengirim GPS ping saat menjalankan JO.

### 1.2 Business Need
- Vendor (seperti PT ATM) beroperasi di beberapa tenant sekaligus
- Tenant operator perlu melihat status GPS armada vendor secara real-time
- Semua armada harus tampil di Fleet Performance, terlepas dari sumber GPS

---

## 2. Goals

| # | Goal | Metric |
|---|---|---|
| 1 | Semua armada tampil di Fleet Performance | 0 armada NO_SIGNAL (saat GPS aktif) |
| 2 | GPS HP driver populate `fleet_gps_status` | GPS ping → fleet_gps_status updated |
| 3 | Operator bisa lihat GPS armada vendor | Cross-tenant GPS visibility |
| 4 | Vendor bisa beroperasi di multiple tenant | 1 armada → multi-tenant assignment |

---

## 3. Architecture Design

### 3.1 GPS Source Priority

```
┌─────────────────────────────────────────────────────────┐
│              GPS Source Priority Chain                    │
│                                                          │
│  Priority 1: EasyGo Hardware (provider = 'easygo')      │
│    → Cron sync tiap 5 menit                             │
│    → Update fleet_gps_status + job_tracking              │
│    → Highest accuracy, always-on                         │
│                                                          │
│  Priority 2: Driver Phone Native (provider = 'native')  │
│    → GpsForegroundService (Android)                      │
│    → Real-time HTTP ke API                               │
│    → High accuracy when app running                      │
│                                                          │
│  Priority 3: Driver Phone PWA (provider = 'pwa')        │
│    → Browser geolocation                                 │
│    → Adaptive interval (10s-60s)                         │
│    → Lower accuracy, battery-dependent                   │
│                                                          │
│  Fallback: NO_SIGNAL                                     │
│    → Tidak ada GPS dalam 30 menit                        │
│    → Tampil di Fleet Performance sebagai "No Signal"     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow — GPS Ping → Fleet Performance

```
[Driver Phone / EasyGo Hardware]
            │
            ▼
   GPS Ping Received
   (POST /api/jo/[token] atau EasyGo sync)
            │
            ├─→ job_tracking (source = pwa/native/easygo)
            │
            ├─→ fleet_gps_status (provider = pwa/native/easygo)
            │   └── UPSERT on fleet_id (latest position wins)
            │
            └─→ tracking_points (via tracking_sessions)
            
   Fleet Performance Page
            │
            ▼
   GET /api/fleet-status?tenant_id=xxx
            │
            ├─→ md_fleets (all active fleets)
            ├─→ fleet_gps_status (latest GPS per fleet)
            └─→ job_orders (active JOs per fleet)
            
   Hasil: Semua armada dengan status GPS real-time
```

### 3.3 Cross-Tenant Vendor Model

```
┌──────────────────────────────────────────────────────────┐
│                Cross-Tenant Vendor Architecture           │
│                                                           │
│  Tenant Operator (ef7031de)                               │
│  ├── md_entities: {                                       │
│  │     name: "PT ATM",                                    │
│  │     is_vendor: true,                                   │
│  │     vendor_tenant_id: "c0611a0a"  ← NEW FIELD         │
│  │   }                                                    │
│  ├── work_orders: { tenant_id: ef7031de }                 │
│  ├── job_orders: {                                        │
│  │     tenant_id: ef7031de,                               │
│  │     vendor_tenant_id: "c0611a0a",  ← NEW FIELD        │
│  │     fleet_id: <fleet_di_tenant_atm>, ← CROSS-TENANT   │
│  │     driver_id: <driver_di_tenant_atm> ← CROSS-TENANT  │
│  │   }                                                    │
│  └── Fleet Performance: query GPS dari tenant ATM         │
│                                                           │
│  Tenant Vendor / ATM (c0611a0a)                           │
│  ├── md_fleets: { id: <fleet_id>, ... }                   │
│  ├── md_drivers: { id: <driver_id>, ... }                 │
│  ├── GPS sync: EasyGo + Phone → fleet_gps_status          │
│  └── fleet_gps_status tersedia untuk cross-tenant query   │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Database Changes

### 4.1 New Migration: `20260806_dual_gps_vendor_integration.sql`

```sql
-- 1. Add vendor_tenant_id to md_entities
ALTER TABLE public.md_entities 
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 2. Add vendor_tenant_id to job_orders  
ALTER TABLE public.job_orders
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 3. Add vendor_tenant_id to md_fleets (optional, for direct fleet reference)
ALTER TABLE public.md_fleets
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 4. Index for cross-tenant queries
CREATE INDEX IF NOT EXISTS idx_fleet_gps_status_vendor_tenant 
ON public.fleet_gps_status(tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_orders_vendor_tenant 
ON public.job_orders(vendor_tenant_id);

-- 5. Update fleet_gps_status RLS for cross-tenant vendor access
-- (Service role only, no change needed for RLS)

-- 6. Add provider column default tracking
COMMENT ON COLUMN public.fleet_gps_status.provider IS 
'GPS source: easygo, pwa, native_android, native_android_offline';
```

### 4.2 Schema Changes Summary

| Table | Column | Type | Description |
|---|---|---|---|
| `md_entities` | `vendor_tenant_id` | UUID FK | Tenant where vendor's fleets live |
| `job_orders` | `vendor_tenant_id` | UUID FK | Tenant of assigned vendor's fleet |
| `md_fleets` | `vendor_tenant_id` | UUID FK | Original tenant of fleet (for cross-tenant ref) |
| `fleet_gps_status` | `provider` | VARCHAR(50) | Already exists — now also written by phone GPS |

---

## 5. API Changes

### 5.1 Update: `/api/jo/[token]` GPS Ping Handler

**Current behavior:** GPS ping writes to `job_tracking` only.

**New behavior:** GPS ping also upserts `fleet_gps_status`.

```
PATCH /api/jo/[token]
Body: { action: "gps_ping", lat, lng, source, ... }

Changes:
1. After inserting job_tracking, also:
   await supabase.from('fleet_gps_status').upsert({
     fleet_id: job.fleet_id,
     tenant_id: job.tenant_id,
     latitude: lat,
     longitude: lng,
     gps_time: recorded_at,
     status_vehicle: speed > 5 ? 2 : speed > 0 ? 1 : 0,
     engine_on: true,
     provider: source,  -- 'pwa' or 'native_android'
     updated_at: new Date().toISOString()
   }, { onConflict: 'fleet_id' });
```

### 5.2 Update: `/api/fleet-status` Route

**Current:** Queries `fleet_gps_status` for tenant's fleets.

**New:** Also queries vendor tenant's `fleet_gps_status` for cross-tenant fleets.

```
GET /api/fleet-status?tenant_id=xxx

Changes:
1. First, get all fleets for tenant (including vendor fleets)
2. For each fleet with vendor_tenant_id, also query that tenant's fleet_gps_status
3. Merge results — prioritize vendor_tenant's GPS if fleet is cross-tenant
4. Return combined status
```

### 5.3 New: `/api/vendor-gps-proxy` Route (Optional)

For secure cross-tenant GPS access:

```
GET /api/vendor-gps-proxy?vendor_tenant_id=xxx&fleet_ids=yyy,zzz

Purpose: Operator tenant can query GPS status of vendor's fleets
Auth: Must be authenticated operator tenant
Returns: fleet_gps_status for specified fleets from vendor tenant
```

---

## 6. Frontend Changes

### 6.1 Fleet Performance Page Updates

**File:** `app/(dashboard)/hq/fleet-performance/page.tsx`

Changes:
1. Add GPS source indicator per fleet (icon/badge showing EasyGo vs Phone)
2. Show "Last GPS Source" in fleet card
3. Add filter by GPS source (All / EasyGo / Phone)
4. For cross-tenant fleets, show vendor name badge

**New UI Elements:**
```
┌─────────────────────────────────────────────────────┐
│ B 9086 UEY  [EasyGo]  [Parking]  [Mesin OFF]       │
│ 📍 Jalan Salira Indah, PLTU Suralaya               │
│ ⏱️ 5j lalu  |  🏢 PT ATM (Vendor)                   │
├─────────────────────────────────────────────────────┤
│ B 9948 UWY  [Phone]   [Driving]  [Mesin ON]        │
│ 📍 Jalan Tol Jakarta-Merak                          │
│ ⏱️ 2m lalu  |  🚀 65 km/h  |  🔋 78%               │
└─────────────────────────────────────────────────────┘
```

### 6.2 New Filter Options

```typescript
// GPS Source Filter
const gpsSourceFilter = [
  { key: 'ALL', label: 'Semua Sumber' },
  { key: 'easygo', label: 'EasyGo Hardware' },
  { key: 'pwa', label: 'GPS HP (PWA)' },
  { key: 'native', label: 'GPS HP (App)' },
];

// Vendor Filter (for cross-tenant)
const vendorFilter = [
  { key: 'ALL', label: 'Semua Vendor' },
  { key: 'OWN', label: 'Armada Sendiri' },
  { key: 'VENDOR', label: 'Armada Vendor' },
];
```

---

## 7. Implementation Plan

### Phase 1: GPS Phone → fleet_gps_status (Hari 1)
| Task | File | Estimasi |
|---|---|---|
| Update `/api/jo/[token]` GPS handler | `app/api/jo/[token]/route.ts` | 30 min |
| Test GPS ping populates fleet_gps_status | Manual test | 15 min |
| Verify Fleet Performance shows phone GPS | `fleet-performance/page.tsx` | 15 min |

### Phase 2: Cross-Tenant Schema (Hari 1)
| Task | File | Estimasi |
|---|---|---|
| Create migration | `supabase/migrations/20260806_*.sql` | 20 min |
| Run migration in Supabase | SQL Editor | 5 min |
| Update EasyGoSyncService for cross-tenant | `EasyGoSyncService.ts` | 30 min |

### Phase 3: API Updates (Hari 2)
| Task | File | Estimasi |
|---|---|---|
| Update `/api/fleet-status` for cross-tenant | `app/api/fleet-status/route.ts` | 45 min |
| Create `/api/vendor-gps-proxy` (optional) | `app/api/vendor-gps-proxy/route.ts` | 30 min |
| Test cross-tenant GPS query | Manual test | 20 min |

### Phase 4: Frontend (Hari 2)
| Task | File | Estimasi |
|---|---|---|
| Add GPS source badge to fleet cards | `fleet-performance/page.tsx` | 30 min |
| Add GPS source filter | `fleet-performance/page.tsx` | 20 min |
| Add vendor badge for cross-tenant fleets | `fleet-performance/page.tsx` | 15 min |
| Deploy & verify | Vercel | 10 min |

### Phase 5: Cleanup & Documentation (Hari 3)
| Task | File | Estimasi |
|---|---|---|
| Remove debug endpoints | `app/api/easygo/debug/` | 5 min |
| Update AGENTS.md | `AGENTS.md` | 10 min |
| Test full flow end-to-end | Manual test | 30 min |

**Total Estimasi: ~5-6 jam (3 hari kerja)**

---

## 8. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| GPS ping frequency too high | DB write amplification | Debounce 60s + 50m already exists |
| Cross-tenant RLS conflict | Data leak | Service role only for cross-tenant queries |
| Phone GPS accuracy varies | Incorrect status | Use speed threshold for driving detection |
| EasyGo + Phone both active | Conflicting positions | Use timestamp — latest wins |
| Vendor tenant offline | GPS data lost | Fallback to last known position + stale indicator |

---

## 9. Success Criteria

- [ ] Semua armada tampil di Fleet Performance (0 NO_SIGNAL saat GPS aktif)
- [ ] GPS HP driver populate `fleet_gps_status` dalam < 60 detik
- [ ] GPS source badge tampil di fleet card (EasyGo / Phone)
- [ ] Operator bisa lihat GPS armada vendor cross-tenant
- [ ] Filter by GPS source berfungsi
- [ ] Tidak ada performance degradation (query < 500ms)

---

## 10. Future Enhancements

1. **GPS Provider Abstraction Layer** — Support multiple providers (Wialon, Flespi, etc.)
2. **Vendor GPS Billing** — Track GPS usage per vendor for billing
3. **Real-time GPS Streaming** — WebSocket for sub-second updates
4. **GPS Analytics Dashboard** — Usage statistics per provider/vendor
5. **Fleet Assignment Rules** — Auto-assign vendor fleet based on GPS proximity
