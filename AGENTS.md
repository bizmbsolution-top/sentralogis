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
