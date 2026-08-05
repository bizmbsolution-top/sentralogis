## Goal
Build SBU Forwarding Domestik (Antar Pulau) — FCL/LCL, konsolidasi, hybrid delivery, cargo owner tracking.

## Constraints & Preferences
- (none)

## Progress
### Done
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
- **[NEW] Dual GPS Source + Cross-Tenant Vendor Integration** (PRD: `docs/prd-dual-gps-vendor-integration.md`)
  - Phase 1: GPS phone → `fleet_gps_status` (update `/api/jo/[token]`)
  - Phase 2: Cross-tenant schema (`vendor_tenant_id` on entities/JOs/fleets)
  - Phase 3: API updates (`/api/fleet-status` cross-tenant query)
  - Phase 4: Frontend (GPS source badge, vendor badge, filters)
  - Estimasi: ~5-6 jam (3 hari kerja)

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
- Hasil deploy terakhir (commit `5ed1d9b`): `recorded_at` dari semua source (PWA, Android native, offline sync)
- Migration `190_add_recorded_at_to_job_tracking.sql` sudah dijalankan di Supabase dashboard
- `lib/utils/geoUtils.ts`: Haversine distance, formatDistance, formatSpeed — untuk GPS report
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
- `vercel.json`: Cron job for EasyGo GPS sync (every 5 minutes)
