# Catatan Perkembangan - Sentralogis

## Overview
Build Driver Operational Portal (Mobile First) dengan attendance, fleet inspection, job order management, dan performance tracking. Juga maintain master drivers page dengan PIN management.

## Constraints & Preferences
- Mobile-first, light background design dengan colorful widgets
- Driver harus di-track dengan tenant_id di semua records
- Fleet selection hanya show Internal/OWN fleets berdasarkan driver's entity_id
- PIN required untuk new drivers, editable untuk existing drivers (untuk reset)

---

## Yang Sudah Selesai

### 1. Database Schema
- Created tables:
  - `driver_attendance` - Pencatatan log masuk/keluar shift
  - `fleet_inspections` - Pencatatan hasil scoring dan bukti foto
  - `driver_performance_logs` - Pencatatan KM dan insiden
  - `driver_kpi_history` - Riwayat KPI driver

- Added columns ke `md_drivers`:
  - `photo_url`, `pin`, `trust_score`
  - `total_jobs_completed`, `total_km_driven`, `incident_count`
  - `is_working`, `last_check_in`, `total_absensi`
  - `avg_inspection_score`, `total_inscriptions`, `status`

- Added `is_own` column ke `md_entities` untuk identifikasi transporter internal/OWN

### 2. Driver Portal (`/driver/portal`)
- PIN Login dengan WhatsApp number + 4-digit PIN
- Start Shift untuk mencatat kehadiran
- Fleet Inspection dengan checklist points (Rem, Lampu, Ban, Wiper, Kemudi)
- Job Order list dengan clickable cards
- Job detail view menunjukkan: route, deal price, driver share, payment status

### 3. Master Drivers Page (`/hq/master/drivers`)
- Photo upload functionality
- PIN field (mandatory untuk new driver, editable untuk reset)
- Bank details fields
- Driver stats display (jobs completed, KM driven, incident count, trust score)

### 4. Triggers & Automation
- `notify_driver_payment` - Kirim notifikasi ke driver saat advance_status atau driver_payment_status berubah ke 'paid'
- Reset driver dan fleet status ke 'available' setelah job completion

### 5. Route Validation (`/api/jo/[token]`)
- Mencegah driver skip stops - wajib complete stops dalam order

### 6. AssignmentModal Fixes (`app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx`)
- Uses `is_own` flag properly untuk fleet filtering
- Editable driver share percentage
- Properly stores advance vs final payment
- Fixed distance calculation: job_routes gets est_distance_km from work_order_items during assignment

### 7. Job Order Pages - Status Categories
Updated both HQ dan SBU job order pages menggunakan 4 kategori:
- **NEW**: status = 'pending', tanpa driver_id/fleet_id
- **ASSIGNED**: ada driver_id/fleet_id, belum done, bukan on journey
- **ON JOURNEY**: status IN ('IN_PROGRESS', 'DALAM PERJALANAN', dll) ATAU driver_response = 'accepted'
- **DONE**: status IN ('COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'DONE', 'INVOICED', 'PAID')

### 8. Finance Integration
- SBUFinanceHybridModal.tsx: Added "Mark Paid" button untuk driver payments

---

## Sedang Berlangsung

### Debug HQ vs SBU Job Order Status Discrepancy
- HQ shows: New 7, Assigned 0
- SBU shows: Benar (1 WO dengan 2 JO belum assign)
- Root cause: Ada 5 JO "orphan" dari WO yang sudah COMPLETED/handover_rejected tapi JO masih 'pending' tanpa driver
- Solution: Added filter di HQ job-orders page untuk exclude JO dari WO dengan status COMPLETED atau handover_rejected

---

## Yang Perlu Ditambah (Next Steps)

1. **Vendor Invoice Upload Feature**
   - AP flow untuk SBU
   - Upload invoice dari vendor/transporter
   - Tracking payment ke vendor

2. **Complete Flow Testing**
   - Driver login → Start Shift → Fleet Selection → Inspection → Job Status Updates → Completion → Status Reset → Payment Notifications

3. **Data Cleanup**
   - Fix 5 JO orphan yang statusnya masih 'pending' padahal WO sudah completed

---

## Critical Context
- Supabase: nsvkewvmzivudkcczhnk.supabase.co
- Tenant ID: 78846049-fb63-45a9-93da-3af3fea5b587
- Example completed job: SL-TOP-0526-001/TR01/OWN-001 (Driver: UBANAN)
- SL-TOP payment: advance_amount = 1000000 (paid), driver_payment_amount = 240000 (pending)

---

## Relevant Files
- `app/driver/portal/page.tsx` - Main driver operational portal
- `app/(dashboard)/hq/master/drivers/page.tsx` - Master drivers dengan PIN management
- `app/(dashboard)/hq/job-orders/page.tsx` - HQ job orders (updated with filter)
- `app/(dashboard)/sbu/trucking/assignments/page.tsx` - SBU job orders
- `app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx` - Fixed is_own, driver share, distance
- `app/api/jo/[token]/route.ts` - Added stop order validation
- `supabase/migrations/011-013_*.sql` - Database schema dan triggers
- `components/sbu/SBUFinanceHybridModal.tsx` - Added Mark Paid button

---

*Last Updated: 14 Mei 2026*