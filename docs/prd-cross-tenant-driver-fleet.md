# PRD: Cross-Tenant Driver, Fleet & Transporter (Opsi B — Per-Tenant Copy)
**Date:** 2026-08-12
**Status:** Draft
**Target:** Unified Driver Portal + Multi-Tenant Vendor Driver/Fleet/Transporter

---

## 1. Problem Statement

### 1.1 Current Gap
Portal driver sudah diseragamkan untuk internal & vendor (Phase 1 selesai). Namun:

- 1 driver/vendor yang bekerja di **beberapa tenant** harus punya akun terpisah per tenant
  — login dengan nomor WA yang sama melempar `AMBIGUOUS_DRIVER` (lihat `app/api/driver/login/route.ts`).
- Driver yang login dari **link JO tenant lain** tidak bisa masuk karena driver di-scope
  ke tenant yang berbeda dari JO.
- Belum ada model untuk **driver lintas-tenant** — satu orang, satu nomor, banyak perusahaan.
- Transporters (vendor) harus bisa di-assign & dilihat dari tenant operator, tanpa
  menyentuh row tenant vendor.

### 1.2 Business Need
- Satu driver (misal supir PT ATM) bekerja untuk **2+ tenant** dengan **1 akun** (1 nomor WA + 1 PIN).
- Ops tenant operator bisa assign driver/fleet/transporter vendor lintas-tenant.
- Setiap tenant tetap punya **master data sendiri** (Opsi B — Per-Tenant Copy) sehingga
  RLS, constraint UNIQUE(tenant_id, code), dan keamanan tetap utuh.
- Identitas kanonik driver (phone/PIN) terpusat → login konsisten di semua tenant.

---

## 2. Goals

| # | Goal | Metric |
|---|---|---|
| 1 | 1 nomor WA + PIN → akses semua tenant tempat driver terdaftar | 0 `AMBIGUOUS_DRIVER` saat ada JO token |
| 2 | Driver bisa login lintas-tenant via link JO | Login driver resolves ke tenant JO |
| 3 | Tenant operator assign fleet/driver/transporter vendor lintas-tenant | Assign vendor dari tenant lain |
| 4 | Master data per-tenant tetap terisolasi (Opsi B) | RLS + UNIQUE(tenant_id, code) terjaga |
| 5 | Display code lintas-tenant tidak ambigu | Suffix `_{tenant_code}` |

---

## 3. Keputusan Arsitektur (dikonfirmasi)

### 3.1 Model: **Opsi B — Per-Tenant Copy**

Setiap tenant punya **row sendiri** di `md_fleets`, `md_drivers`, `md_entities` dengan
UUID berbeda. Tidak ada tabel master vendor terpisah untuk fleets/drivers.

```
Tenant Operator (ef7031de)                     Tenant Vendor ATM (c0611a0a)
├── md_fleets:  id=<uuid_ops>,                 ├── md_fleets:  id=<uuid_atm>
│   plate="B123ABC", tenant_id=ef7031de,       │   plate="B123ABC", tenant_id=c0611a0a,
│   vendor_tenant_id=c0611a0a  ← link source   │   vendor_tenant_id=null
├── md_drivers: id=<uuid_driver_ops>,          ├── md_drivers: id=<uuid_driver_atm>,
│   name="ANTONIO", tenant_id=ef7031de         │   name="ANTONIO", tenant_id=c0611a0a
└── job_orders: fleet_id=<uuid_ops>,           └── GPS: fleet_gps_status (tenant ATM)
    driver_id=<uuid_driver_ops>,
    vendor_tenant_id=c0611a0a
```

- `vendor_tenant_id` (sudah ada di migrasi `20260806_dual_gps_vendor_integration.sql`)
  menghubungkan row tenant operator ke tenant asal vendor.
- GPS armada dibaca cross-tenant dari `fleet_gps_status` tenant vendor
  (sudah diimplementasi di `app/api/fleet-status/route.ts`).

### 3.2 Display Code — Suffix `_{tenant_code}`

Constraint `UNIQUE(tenant_id, code)` (migrasi `093`, `168`, `094`) membolehkan
`plate_number`/`driver_code`/`entity_code` yang sama di tenant berbeda. Untuk
menghindari ambiguitas di UI lintas-tenant, display code diberi suffix:

```
B123ABC_{TENANT_CODE}      (armada milik tenant lain)
ANTONIO_{TENANT_CODE}      (driver milik tenant lain)
```

- Code **internal** (disimpan di DB) tetap `B123ABC` / `ANTONIO` — tanpa suffix.
- Suffix **hanya untuk display** (frontend), dihitung dari `vendor_tenant_id` → `tenants.tenant_code`.

### 3.3 Identitas Driver Kanonik: `driver_profiles` + `driver_tenant_links`

Login lintas-tenant menggunakan 2 tabel baru:

```
driver_profiles  (kanonik, 1 per orang)
├── id UUID
├── phone  (normalized: 628xx...)
├── pin    (hashed)
├── full_name
└── created_at

driver_tenant_links  (1 profile → banyak tenant)
├── id UUID
├── profile_id  → driver_profiles.id
├── tenant_id   → tenants.id
├── driver_id   → md_drivers.id (row per-tenant)
└── is_active   boolean
```

**Alur login:**
1. Driver input nomor WA + PIN.
2. API resolve `driver_profiles` by phone → verifikasi PIN.
3. Ambil semua `driver_tenant_links` milik profile.
4. Jika ada `joToken`: scope ke tenant JO → pilih link tenant tsb.
5. Jika tanpa token: jika link hanya 1 → login; jika >1 → tetap perlu JO token
   (`AMBIGUOUS_DRIVER` — safe, tanpa spekulasi).
6. Generate virtual auth user per `md_drivers.id` (model yang sudah ada).

---

## 4. Database Changes

### 4.1 Migration: `20260812_cross_tenant_driver_links.sql`

```sql
-- 1. driver_profiles — identitas kanonik driver
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  pin_hash TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- canonical phone unique (format 628xx...)
CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_profiles_phone
  ON public.driver_profiles (phone);

-- 2. driver_tenant_links — profile → md_drivers per tenant
CREATE TABLE IF NOT EXISTS public.driver_tenant_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.md_drivers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_tenant_links_driver_id
  ON public.driver_tenant_links (driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_tenant_links_profile_id
  ON public.driver_tenant_links (profile_id);

-- 3. RLS: service-role only untuk saat ini (diakses via server API)
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_tenant_links ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
```

### 4.2 Backfill (optional, dilakukan saat onboarding)

```
INSERT driver_profiles (phone, pin_hash, full_name)
SELECT DISTINCT normalize_phone(whatsapp), NULL, name FROM md_drivers WHERE whatsapp IS NOT NULL;

INSERT driver_tenant_links (profile_id, tenant_id, driver_id)
SELECT p.id, d.tenant_id, d.id
FROM md_drivers d
JOIN driver_profiles p ON p.phone = normalize_phone(d.whatsapp);
```

> PIN backfill: PIN tetap hidup di `md_drivers.pin`. `driver_profiles.pin_hash`
> diisi bertahap; login cek `pin_hash` dulu, fallback ke `md_drivers.pin`.

---

## 5. API Changes

### 5.1 Update: `/api/driver/login/route.ts`

**Sekarang:** scan semua `md_drivers` → normalizePhone → scope tenant JO → ambigu → error.

**Baru:** resolve via `driver_profiles`/`driver_tenant_links`:

```
POST /api/driver/login { whatsapp, pin, joToken? }

1. normalizePhone(whatsapp)
2. SELECT driver_profiles WHERE phone = normalized
3. Verifikasi PIN: driver_profiles.pin_hash ATAU (fallback) md_drivers.pin
4. SELECT driver_tenant_links JOIN md_drivers
   WHERE profile_id = <p.id> AND is_active = true
5. Jika joToken: filter link.tenant_id = JO.tenant_id (via job_orders lookup)
   → jika tidak ada link untuk tenant JO → 403 FORBIDDEN_JO_TENANT
6. Jika tanpa joToken:
   - 1 link  → login (tenant = link.tenant_id)
   - >1 link → 403 AMBIGUOUS_DRIVER (butuh link JO)
7. Buat auth user (virtual email `driver_<md_drivers.id>@...`) — model yang sama
8. Return safeDriver (id = md_drivers.id, tenant_id, entity_id, driver_type)
```

### 5.2 New (opsional): `/api/driver/link-profile/route.ts`

Digunakan master driver page untuk menghubungkan 2 `md_drivers` (tenant berbeda)
ke 1 `driver_profiles` — saat vendor menginput driver yang sama di tenant lain.

```
POST /api/driver/link-profile { source_driver_id, target_driver_id }
→ insert/merge driver_profiles + driver_tenant_links
```

### 5.3 Tidak berubah
- `/api/jo/[token]` — tetap memakai `driver_id` langsung dari session (md_drivers.id).
- `/api/fleet-status` — sudah cross-tenant via `vendor_tenant_id`.

---

## 6. Frontend Changes

### 6.1 Driver Portal — display tenant badge
- Profil driver menampilkan badge tenant aktif: `{tenant_name}` ({tenant_code}).
- Jika driver login lintas-tenant: halaman login menampilkan pilihan tenant
  **hanya saat** `requiresToken` (dari link JO).

### 6.2 Master Driver / Fleet / Transporter (ops-side)
- Dropdown driver & fleet lintas-tenant menampilkan suffix `_{tenant_code}`
  untuk row milik tenant lain.
- `AssignmentModal` & `EditAssignmentModal` memakai `vendor_tenant_id`
  untuk menandai & mensuffix display.

### 6.3 Display code helper
```
lib/domain/tenant/displayCode.ts
displayCode(code, ownerTenantId, currentTenantId, tenantCodeMap)
→ ownerTenantId === currentTenantId ? code : `${code}_${tenantCode}`
```

---

## 7. Implementation Plan

### Phase A: DB + Identitas (Hari 1)
| Task | File | Estimasi |
|---|---|---|
| Migration driver_profiles + driver_tenant_links | `20260812_cross_tenant_driver_links.sql` | 20 min |
| Run migration di Supabase | SQL Editor | 5 min |
| Update login route → resolve profile/links | `app/api/driver/login/route.ts` | 45 min |

### Phase B: Ops-side display (Hari 1–2)
| Task | File | Estimasi |
|---|---|---|
| Helper displayCode + tenant code cache | `lib/domain/tenant/displayCode.ts` | 20 min |
| Badge tenant di dropdown driver/fleet | `AssignmentModal.tsx`, `EditAssignmentModal.tsx` | 30 min |
| Badge tenant di master driver/fleet | `hq/master/drivers`, `hq/master/fleets` | 20 min |

### Phase C: Link profile (Hari 2)
| Task | File | Estimasi |
|---|---|---|
| API link-profile | `app/api/driver/link-profile/route.ts` | 30 min |
| UI tombol link di master driver | `hq/master/drivers/page.tsx` | 30 min |

### Phase D: Verifikasi & Deploy (Hari 2)
| Task | File | Estimasi |
|---|---|---|
| Typecheck + lint | — | 15 min |
| Uji login lintas-tenant manual | — | 20 min |
| Deploy Vercel | — | 10 min |

**Total Estimasi: ~5-6 jam (2 hari kerja)**

---

## 8. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| PIN berbeda per tenant md_drivers | Login salah tenant | `pin_hash` kanonik + validasi per-link |
| Duplikat phone (row ganda) | Profile ganda | Backfill dedup + unique index phone |
| RLS profile exposure | Data bocor | Service-role only, no client access |
| Ambigu tenant tanpa JO token | Login gagal | Tetap `AMBIGUOUS_DRIVER` (safe) |
| Display suffix berantakan | UI bingung | Helper sentral + tenant_code cache |

---

## 9. Success Criteria

- [ ] Driver dengan 1 nomor login dari link JO tenant mana pun
- [ ] Driver tanpa JO token & 1 tenant → login langsung
- [ ] Driver tanpa JO token & >1 tenant → pesan butuh link JO
- [ ] Display armada/driver vendor punya suffix `_{tenant_code}`
- [ ] RLS + UNIQUE(tenant_id, code) tetap aktif (Opsi B)
- [ ] Typecheck & lint bersih (0 error baru)

---

## 10. Future Enhancements

1. **PIN terpusat** — migrasi penuh ke `driver_profiles.pin_hash`, hapus `md_drivers.pin`
2. **Switcher tenant di portal** — driver pilih tenant saat login via dropdown
3. **Transporter master lintas-tenant** — `md_entities` link via `vendor_tenant_id` di UI
4. **Audit log** — track login & assign lintas-tenant
5. **Auto-link** — saat vendor input driver yang sama nomornya di tenant lain, otomatis merge
