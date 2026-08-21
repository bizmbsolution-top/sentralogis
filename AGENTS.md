## Goal
Build SBU Forwarding Domestik (Antar Pulau) — FCL/LCL, konsolidasi, hybrid delivery, cargo owner tracking.

## Constraints & Preferences
- (none)

## Progress
### Done
- **[DONE] P0 GPS Forensic Fix — Auth Lifecycle + Bulk Sync + Backlog Recovery** (reports: `reports/phase_p0/P0_GPS_AUTH_BULK_FORENSIC_REPORT.md`, `reports/phase_p0/P0_GPS_AUTH_BULK_FIX_REPORT.md`)
  - Status: **PASS (16/16 Acceptance Criteria Verified)**
  - Physical device tested: Samsung Galaxy A32 (`SM-A325F`, Serial: `RR8T101AKHX`), JO `CC-RAS-0826-001-01`
  - Forensic discovery: Native Android Foreground Service & SQLite survived 13h 35m continuously (1,658 records recorded overnight with 3% battery drop); gap caused by 300s JWT TTL + suspended JS timers during screen off + sequential DB round-trips causing 15s timeout
  - P0-A (Auth Lifecycle): 24h JWT TTL (86,400s) + dynamic secret resolution in `lib/auth/gpsSession.ts` + Bearer fallback on server & `getAuthHeaders()` in driver portal/execution/order pages
  - P0-B (Bulk Sync): Batch 50 records re-engineered into 1 bulk check + 1 bulk insert + 1 telemetry update (< 1s per batch, down from > 15s)
  - Idempotency & Recovery: Unique constraint `(job_order_id, client_ping_id)` + ACK contract verified (0 duplicate DB rows on retry)
  - Backlog Recovery: 1,658 offline records safely flushed to Supabase with 0 data loss (Total verified in Supabase: 2,158 records)
  - Next.js Production Build: PASS (Code 0)
- **[DONE] P0.3.2 GPS Regression & Reliability Audit** (report: `reports/phase_p0/P0_3_2_GPS_REGRESSION_REPORT.md`)
  - Status: **PASS** — all scenarios verified with physical device testing
  - 272 rows in DB, 0 anomalies, device health ACTIVE/GOOD
  - Screen OFF: 587s gap, service survived, pings resume immediately
  - Offline queue: 7 batch uploads, up to 283s offline window, 0 data loss
  - Extended movement: 52 pings over 47 min, consistent ~60s intervals
  - Migration 186 applied (gps_status, device_health, last_device_health_ping_at)
  - Google Play readiness: GPS pipeline fully verified
- **[NEW] Unified Driver Portal (internal + vendor) + Phase 2 Cross-Tenant**
  - Portal: gating absen & inspeksi dihapus → 2 tombol opsional "Fasilitas Harian" (Absen Masuk + Cek Kendaraan)
  - Portal: order list selalu tampil, empty-state "Menunggu penugasan baru dari kantor."
  - Portal: tab Inspeksi dihapus dari semua bottom nav; step `vendor_active` + read `sentralogis_driver_type` dihapus
  - Portal: fetchFleets filter `!is_vendor` dihapus
  - Session fix: login API + useDriverAuth bawa `tenant_id`/`entity_id`; portal normalisasi `driver_id → id`
  - AssignmentModal + assignmentSave: readiness gate dihapus (readiness.ts disederhanakan → hanya cek driverStatus)
  - **Phase 2 Cross-Tenant** (PRD: `docs/prd-cross-tenant-driver-fleet.md`, Opsi B Per-Tenant Copy):
    - Migration `20260812_cross_tenant_driver_links.sql` (SUDAH Dijalankan 13-Agu-2026; backfill pakai DISTINCT ON karena raw whatsapp berformat beda): `driver_profiles` + `driver_tenant_links` + `normalize_phone()` + backfill
    - `/api/driver/login` resolve via profile/links (fallback scan md_drivers), kode error `FORBIDDEN_JO_TENANT`
    - `/api/driver/link-profile`: POST buat/aktifkan profil kanonik, GET cari profil by phone
    - Display code suffix `_{tenant_code}`: `lib/domain/tenant/displayCode.ts` + `/api/fleet-status` `display_plate`/`vendor_tenant_code`
    - Fleet Performance (HQ + SBU Trucking): vendor badge + plate suffix
    - Badge tenant di dropdown AssignmentModal/EditAssignmentModal + master driver/fleet (Vendor · {TENANT_CODE})
    - Master driver: tombol Link2 "Tautkan Profil" lintas-tenant
- JO Fulfillment breakdown di HQ ops dashboard (hitung actual JOs dari DB)
- Vendor filter spesifik (pilih nama vendor) di HQ reporting page
- Upload foto SIM/KTP/STNK di halaman master driver (`hq/master/drivers`)
- Box foto SIM/KTP/STNK diperbesar (h-20 → h-40)
- PRD SBU Forwarding dibuat (`190726.md`)
- Migration `170_add_driver_document_photos.sql`
- **[NEW] Integrasi Forwarding modal ke HQ Create WO Form** (`CreateWOForm.tsx`)
  - Import & render `AddForwardingItemModal` saat SBU FORWARDING dipilih
  - WO items list menampilkan Globe icon + indigo color untuk forwarding items
- **[NEW] AddForwardingItemModal** (`app/(dashboard)/hq/work-orders/components/AddForwardingItemModal.tsx`)
  - Form: Service Type (FCL/LCL), Delivery Type (D2D/P2P/D2P/P2D), Origin/Destination Port dari `md_locations`, Container Type, Unit Count, Rate
  - Auto-populate harga dari `fw_price_master` saat route cocok
  - **Hybrid Address**: Pickup & Delivery address — toggle Customer Location (dropdown dari `md_entity_addresses`) atau Google Maps autocomplete
- **[NEW] PWA Driver Auto-Install + Auto JO Flow**
  - PWA install detection & banner di `/jo/[token]` (driver manifest, SW registration, install prompt)
  - Hapus driver accept/reject/berangkat — JO langsung ASSIGNED + push notification
  - GPS pinging aktif sejak status ASSIGNED
  - Auto-start cron (setiap 5 menit): JO auto-start setelah 30 menit assign
  - Auto-complete cron: GPS departure dari final stop → 30 menit grace → auto-complete
  - Re-entry detection: driver kembali ke 500m → reset departure
  - Ops-side reject/reassign dengan push notification ke driver lama & baru
  - Countdown timer auto-start di SBU Trucking WO page
  - Status badge MENUNGGU SELESAI
  - Migration `185_add_assigned_at_to_job_orders.sql`
  - Fix `web-push` `isSetupDone()` bundling bug
- **[NEW] EasyGo GPS Provider Integration** (ATM tenant)
  - EasyGo API client (`src/infrastructure/external/EasyGoClient.ts`)
  - Vehicle sync: 33 armada ATM linked ke EasyGo
  - GPS sync: cron tiap 5 menit → `fleet_gps_status` + `tracking_points`
  - Fleet Performance dashboard: Live Fleet Status tab (GPS source, engine, speed, address)
  - Cleanup-fleets API untuk merge armada duplikat
  - Migration: `20260805_easygo_integration.sql`, `20260805_fleet_gps_status.sql`
  - Deploy ke Vercel Pro (cron support)

### In Progress
- (none)
- **[NEW] Cross-Tenant Driver/Fleet/Transporter** (PRD: `docs/prd-cross-tenant-driver-fleet.md`)
  - Phase A (done): migration driver_profiles/driver_tenant_links + login resolve via profile/links
  - Phase B (done): displayCode helper + fleet-status display_plate/vendor_tenant_code + vendor badge + badge tenant di dropdown & master pages
  - Phase C (done): `/api/driver/link-profile` + UI tombol link di master driver
  - Phase D (done): migration dijalankan di Supabase + deploy Vercel (`sentralogis.com`)
- **[NEW] Dual GPS Source + Cross-Tenant Vendor Integration** (PRD: `docs/prd-dual-gps-vendor-integration.md`)
  - Phase 1: GPS phone → `fleet_gps_status` (update `/api/jo/[token]`)
  - Phase 2: Cross-tenant schema (`vendor_tenant_id` on entities/JOs/fleets)
  - Phase 3: API updates (`/api/fleet-status` cross-tenant query)
  - Phase 4: Frontend (GPS source badge, vendor badge, filters)
  - Estimasi: ~5-6 jam (3 hari kerja)
- **[NEW] GPS Ping Strengthening** (HP Driver sebagai primary GPS source)
  - Fix GPS interval: 10s/30s/60s adaptive → 1 menit fixed (reduce DB write amplification)
  - Fix native Android GPS restart loop (useCallback + useRef pattern di portal & tracking pages)
  - Hapus dual API call: Java direct only, bukan Java + Capacitor bridge
  - Tambah `source` ke job_tracking INSERT (sebelumnya selalu NULL)
  - Native Android Home screen: GPS status indicator + "Buka Driver Portal" button
  - PWA Web Worker GPS: background ping via `/gps-worker.js` (survives tab visibility changes)
  - GPS Quality Scoring: `calc_gps_quality()` + `calc_tenant_gps_quality()` functions
  - Stale GPS Detection: `detect_stale_gps()` + `v_gps_status_overview` view
  - Migrations: `20260807_gps_quality_scoring.sql`, `20260807_stale_gps_detection.sql`
- **[NEW] Smart APK Distribution** (Vendor driver → native app adoption)
  - Auto-detect native app via User Agent (`SentraLogis_AndroidApp`)
  - WA message: conditional APK link untuk driver belum install
  - Download page: `/driver/install-apk` (fitur, instruksi install)
  - APK hosted di Vercel: `/sentralogis-driver.apk` (8.1 MB)
  - Tracking: `has_native_app`, `last_app_version`, `last_app_open_at` di `md_drivers`
  - Migration: `20260807_add_native_app_tracking.sql`

### Blocked
- (none)

## Key Decisions
- 1 WO = 1 Customer (forwarder/pemilik barang)
- FCL/LCL dalam 1 konsolidasi (per vessel/voyage)
- 3 tabel baru: `fw_consolidations`, `fw_container_assignments`, `fw_container_items`
- Cargo owner tracking via `/track/fwd/[token]` public page
- Driver coin reward: 1 koin = Rp 5.000 per job completed
- Vendor driver cek koin via WA inquiry keyword "KOIN"
- Origin/Destination Port dropdown ambil dari `md_locations` (master public), bukan `fw_locations`
- Hybrid Address: Customer Location (`md_entity_addresses`) + Google Maps autocomplete
- 1 WO item = 1 set pickup/delivery address (untuk LCL tahap awal)
- GPS ping timestamps pakai `recorded_at` (jam HP driver), fallback `created_at` (server)
- Telemetry Playback: raw ping table dengan geofence matching (500m threshold) ke nearest stop
- GPS provider: EasyGo (hardware) + PWA/Android (phone) → `fleet_gps_status`
- Fleet code format: `EG-{nopol}` untuk EasyGo-synced fleets
- GPS sync interval: 5 menit (Vercel Pro cron)
- Cross-tenant vendor: `vendor_tenant_id` on entities/JOs/fleets (PRD ready)

## Next Steps
- **SBU Forwarding**: Implementasi sesuai `190726.md` (7 task, estimasi ~8.5 jam)
  - Migration 3 tabel forwarding
  - WO Create/List/Detail untuk FCL & LCL
  - Consol Detail + Stuffing Manager
  - Deconsol + auto-create delivery JO
  - Cargo owner tracking public page
- **Driver Coin Reward + WA Inquiry** (lihat section di `190726.md`):
  - Migration `driver_coins` table
  - Award coin di `/api/jo/[token]` saat completed
  - Update webhook WA untuk keyword "KOIN"
  - Animasi coin di `/jo/[token]` page
  - Tampilkan saldo di driver portal
  - Set Twilio credentials di Vercel env

## Critical Context
- P0.3.2 GPS audit **DONE — ALL PASS** (report: `reports/phase_p0/P0_3_2_GPS_REGRESSION_REPORT.md`)
- Migration 186 applied: `gps_status`, `device_health`, `last_device_health_ping_at` columns active on `job_orders`
- Physical device test results: 272 rows total, 52 new since baseline, 7 batch uploads (offline queue evidence), 0 anomalies
- Screen OFF: 587s gap explained by still-detection throttle (device stationary), service survived
- `lib/utils/geoUtils.ts`: Haversine distance, formatDistance, formatSpeed — for GPS report
- GPS Tracking Report (`gps-tracking/page.tsx`): distance/speed per stop, trip summary, Telemetry Playback tab
- `190726.md` berisi PRD lengkap SBU Forwarding + Driver Coin plan
- Infrastructure WA: `lib/twilio/clients.ts` + `app/api/whatsapp/webhook/route.ts`
- Driver complete flow: `app/jo/[token]/page.tsx` → PATCH `/api/jo/[token]`
- Driver portal: `app/driver/portal/page.tsx`
- Forwarding shell UI: `app/sbu/forwarding/` (mock only, belum connect DB)
- Native Android: `android/app/src/main/java/com/sentralogis/driver/GpsForegroundService.java` + `OfflineGpsDbHelper.java`

## Relevant Files
- `/190726.md`: PRD SBU Forwarding + Driver Coin plan
- `docs/prd-dual-gps-vendor-integration.md`: PRD Dual GPS + Cross-Tenant Vendor
- `lib/utils/geoUtils.ts`: Haversine distance, formatDistance, formatSpeed
- `lib/utils/dateUtils.ts`: parseUTC utility
- `lib/hooks/useDriverGpsPing.ts`: GPS ping engine (PWA + Capacitor bridge)
- `lib/offline/offlineSyncEngine.ts`: Offline GPS queue + sync
- `android/app/src/main/java/com/sentralogis/driver/GpsForegroundService.java`: Android native foreground service
- `android/app/src/main/java/com/sentralogis/driver/OfflineGpsDbHelper.java`: Offline SQLite storage
- `app/(dashboard)/sbu/trucking/reporting/gps-tracking/page.tsx`: GPS Tracking Report + Telemetry Playback
- `app/api/jo/[token]/route.ts`: JO API (geofence, ping handler, recorded_at support)
- `supabase/migrations/190_add_recorded_at_to_job_tracking.sql`: Add recorded_at column
- `supabase/migrations/180_add_geofence_columns_to_job_routes.sql`: Geofence columns
- `src/infrastructure/external/EasyGoClient.ts`: EasyGo API client (getVehicles, getLastPosition, getHistoryData)
- `src/application/gps/EasyGoSyncService.ts`: Orchestrates vehicle + GPS sync with dedup logic
- `app/api/easygo/sync-vehicles/route.ts`: POST - trigger vehicle sync from EasyGo
- `app/api/easygo/sync-gps/route.ts`: POST/GET - sync GPS positions (GET handles cron)
- `app/api/easygo/config/route.ts`: GET/POST - manage EasyGo provider config per tenant
- `app/api/easygo/test-connection/route.ts`: POST - test EasyGo API connectivity
- `app/api/fleet-status/route.ts`: GET - fleet live status (GPS + engine + DB status)
- `app/(dashboard)/hq/fleet-performance/page.tsx`: Fleet Performance with Live Fleet Status tab
- `app/(dashboard)/sbu/trucking/fleet-performance/page.tsx`: SBU Trucking Fleet Performance
- `supabase/migrations/20260805_easygo_integration.sql`: GPS provider config + EasyGo columns
- `supabase/migrations/20260805_fleet_gps_status.sql`: fleet_gps_status table
- `supabase/migrations/20260807_gps_quality_scoring.sql`: GPS quality scoring functions
- `supabase/migrations/20260807_stale_gps_detection.sql`: Stale GPS detection + overview view
- `supabase/migrations/20260807_add_native_app_tracking.sql`: Native app detection columns
- `public/gps-worker.js`: PWA Web Worker for background GPS ping
- `public/sentralogis-driver.apk`: APK file for vendor drivers (8.1 MB)
- `app/driver/install-apk/page.tsx`: Download page APK
- `lib/domain/phone.ts`: WA message templates (conditional APK link)
- `vercel.json`: Cron job for EasyGo GPS sync (every 5 minutes)
