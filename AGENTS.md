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

### In Progress
- (none)

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
- `190726.md` berisi PRD lengkap SBU Forwarding + Driver Coin plan
- Infrastructure WA: `lib/twilio/clients.ts` + `app/api/whatsapp/webhook/route.ts`
- Driver complete flow: `app/jo/[token]/page.tsx` → PATCH `/api/jo/[token]`
- Driver portal: `app/driver/portal/page.tsx`
- Forwarding shell UI: `app/sbu/forwarding/` (mock only, belum connect DB)

## Relevant Files
- `/190726.md`: PRD SBU Forwarding + Driver Coin plan
- `supabase/migrations/170_add_driver_document_photos.sql`: Migration terakhir
- `app/(dashboard)/hq/master/drivers/page.tsx`: Driver master (sudah +upload SIM/KTP/STNK)
- `app/(dashboard)/hq/reporting/page.tsx`: Reporting (sudah +vendor filter)
- `app/(dashboard)/hq/ops-dashboard/page.tsx`: Ops dashboard (JO fulfillment fixed)
- `app/(dashboard)/hq/work-orders/components/AddForwardingItemModal.tsx`: Modal forwarding HQ (FCL/LCL, hybrid address)
- `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx`: WO form (sudah integrasi forwarding)

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
- `190726.md` berisi PRD lengkap SBU Forwarding + Driver Coin plan
- Infrastructure WA: `lib/twilio/clients.ts` + `app/api/whatsapp/webhook/route.ts`
- Driver complete flow: `app/jo/[token]/page.tsx` → PATCH `/api/jo/[token]`
- Driver portal: `app/driver/portal/page.tsx`
- Forwarding shell UI: `app/sbu/forwarding/` (mock only, belum connect DB)

## Relevant Files
- `/190726.md`: PRD SBU Forwarding + Driver Coin plan
- `supabase/migrations/170_add_driver_document_photos.sql`: Migration terakhir
- `app/(dashboard)/hq/master/drivers/page.tsx`: Driver master (sudah +upload SIM/KTP/STNK)
- `app/(dashboard)/hq/reporting/page.tsx`: Reporting (sudah +vendor filter)
- `app/(dashboard)/hq/ops-dashboard/page.tsx`: Ops dashboard (JO fulfillment fixed)
- `app/(dashboard)/hq/work-orders/components/AddForwardingItemModal.tsx`: Modal forwarding HQ (FCL/LCL, hybrid address)
- `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx`: WO form (sudah integrasi forwarding)
