# Implementation Plan v2 — Warehouse Inbound dengan Damage Control & Overage

> **Revisi**: Flow TRUCK_ARRIVED → Admin validasi data + scan POD → Ready to Unloading.
> Flow UNLOADING → timer-based dengan START/STOP(break)/SELESAI, kalkulasi waktu untuk KPI.

---

## 1. State Machine (Lengkap)

```
                    [JO Allocation by Admin]
                              │
                         EXPECTED
                              │ [Security: Konfirmasi Truck]
                              ▼
                      TRUCK_ARRIVED
                              │ [Admin: Input Transporter/Fleet/Driver + Scan POD + Validasi Dokumen]
                              │ [Admin: Klik "Ready to Unloading"]
                              ▼
                          UNLOADING
                              │ [Tally: START → timer running]
                              │ [Tally: STOP (optional) → isi alasan break → bisa START lagi]
                              │ [Tally: SELESAI → kalkulasi total waktu unloading]
                              ▼
                           CHECKING
                              │ [Tally: Input Good Qty + Damage Records + Foto, Submit]
                              ▼
                        CHECKING_DONE
                              │ [Admin: Review per item → Decision]
                              ├── Good/Overage ACCEPT → stock bagus
                              ├── Damage ACCEPT → stock QUARANTINE
                              └── REJECT → tidak masuk stock
                              ▼
                    PUTAWAY_IN_PROGRESS
                              │ [Putaway: Scan Rak Good + Scan Rak Quarantine]
                              ▼
                          COMPLETED
                              │ [System: Update wh_inventory final + movement log]
                              ▼
                            [DONE]
```

---

## 2. Perubahan Data Model

### 2a. Tabel Baru: `wh_unloading_sessions`

Untuk tracking start/stop/resume — data utama KPI unloading.

```sql
CREATE TABLE wh_unloading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  session_number  INT NOT NULL,               -- urutan ke-1, ke-2, dst
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,                -- NULL jika masih running
  pause_reason    TEXT,                        -- NULL = normal segment, isi = break
  duration_minutes NUMERIC(10,2) GENERATED ALWAYS AS
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique per receipt: session_number
CREATE UNIQUE INDEX idx_unloading_sessions_receipt_session
  ON wh_unloading_sessions(receipt_id, session_number);
```

**Cara hitung KPI**: `SUM(duration_minutes)` dari semua session di 1 receipt = total waktu unloading.
Bisa dikelompokkan per tipe truck via JOIN ke `wh_inbound_receipts.fleet_id` → `md_fleets(vehicle_type)`.

### 2b. Tabel Baru: `wh_inbound_damage_records`

1 record = 1 kejadian damage untuk 1 SKU.

```sql
CREATE TABLE wh_inbound_damage_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id          UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  receipt_item_id     UUID NOT NULL REFERENCES wh_inbound_receipt_items(id) ON DELETE CASCADE,
  qty                 NUMERIC(15,2) NOT NULL,

  -- Statement 1: WHY DAMAGE? (Kenapa?)
  damage_source       TEXT NOT NULL CHECK (damage_source IN ('TRANSPORTER', 'WAREHOUSE_STAFF')),
  source_notes        TEXT,
  source_photo_url    TEXT,                   -- foto dari kamera HP

  -- Statement 2: WHAT IS DAMAGE? (Apa yang rusak?)
  damage_condition    TEXT NOT NULL CHECK (damage_condition IN ('PACKAGE_DAMAGED_INTACT', 'PACKAGE_DAMAGED_MISSING')),
  condition_notes     TEXT,
  condition_photo_url TEXT,                   -- foto dari kamera HP

  -- Decision (diisi Admin nanti)
  decision            TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'ACCEPT_QUARANTINE', 'REJECT_RETURN')),
  decision_by         UUID REFERENCES profiles(id),
  decision_at         TIMESTAMPTZ,
  decision_notes      TEXT,
  quarantine_location_id UUID REFERENCES md_warehouse_locations(id),

  -- Metadata
  reported_by         UUID NOT NULL REFERENCES md_warehouse_staff(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 2c. Kolom Baru di `wh_inbound_receipt_items`

```sql
ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN over_decision  TEXT DEFAULT 'PENDING'
    CHECK (over_decision IN ('PENDING', 'ACCEPT_GOOD', 'REJECT')),
  ADD COLUMN over_notes     TEXT;
```

### 2d. Kolom Baru di `wh_inbound_receipts`

```sql
ALTER TABLE wh_inbound_receipts
  ADD COLUMN total_unloading_minutes NUMERIC(10,2);  -- kalkulasi dari sessions
```

### 2e. Update Status Constraint

```sql
ALTER TABLE wh_inbound_receipts
  DROP CONSTRAINT IF EXISTS wh_inbound_receipts_status_check;

ALTER TABLE wh_inbound_receipts
  ADD CONSTRAINT wh_inbound_receipts_status_check
  CHECK (status IN (
    'EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING',
    'CHECKING_DONE',
    'PUTAWAY_IN_PROGRESS',
    'COMPLETED'
  ));
```

---

## 3. Anti-Fraud & Data Integrity

| Lapisan | Implementasi | Efek |
|---------|-------------|------|
| **Foto Wajib** | Kamera HP langsung (`capture="environment"`), simpan ke Supabase Storage + timestamp | Staff tidak bisa pakai foto lama/gallery |
| **Separation of Duty** | Tally input ≠ Admin decision. Admin approve baru lanjut putaway | Manipulasi perlu kolusi 2 orang |
| **PIN Konfirmasi** | Setiap submit TALLY minta PIN ulang staff yg bersangkutan | Mencegah orang lain pakai device |
| **Lock After Approve** | Begitu Admin ambil keputusan, damage record tidak bisa diedit | Data final |
| **Audit Trail** | Semua perubahan tercatat di `wh_milestone_logs` + `wh_inventory_movements` | Traceable |

---

## 4. Detail UI/UX per Role

### 4a. ADMIN — Dashboard Saat `TRUCK_ARRIVED` (Validasi Data)

Di modal `ReceiptDetailModal.tsx`, setelah status `TRUCK_ARRIVED`:

```
┌──────────────────────────────────────────────┐
│  Receipt #INB-xxxx — TRUCK ARRIVED           │
│                                               │
│  ┌─ Validasi Data Transporter ──────────────┐│
│  │ Transporter: [__________]                ││
│  │ Fleet/No. Polisi: [__________]           ││
│  │ Driver Name: [__________]                ││
│  │ Driver Phone: [__________]               ││
│  └──────────────────────────────────────────┘│
│                                               │
│  ┌─ Dokumen ────────────────────────────────┐│
│  │ 📄 Scan POD: [Upload / Lihat]            ││
│  │ 📄 Dokumen Lain: [Upload / Lihat]        ││
│  └──────────────────────────────────────────┘│
│                                               │
│  [✔ READY TO UNLOADING]                      │
└──────────────────────────────────────────────┘
```

**Behavior**:
- Admin WAJIB isi transporter & driver sebelum bisa klik "Ready to Unloading"
- Scan POD upload ke Supabase Storage → `pod_document_url`
- Tombol "Ready to Unloading" → status `UNLOADING`

---

### 4b. TALLY — Portal PWA (Unloading Timer + Checking)

#### Mode UNLOADING (timer)

Setelah Admin set status ke UNLOADING, Tally lihat di portal:

```
┌──────────────────────────────────────────────┐
│  UNLOADING — Receipt #INB-xxxx              │
│                                               │
│  ┌─ Timer Bongkar ─────────────────────────┐ │
│  │  🕐 00:32:15      [RUNNING]             │ │
│  │                                          │ │
│  │  [⏸ STOP]               [✔ SELESAI]     │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ┌─ LOG Sesi Hari Ini ─────────────────────┐ │
│  │ #1: 08:00 - 08:32 .. 32 menit           │ │
│  │ #2: 09:00 - sekarang .. 32 menit        │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Saat STOP diklik → modal**:

```
┌─────────────────────────────────┐
│  ALASAN BERHENTI (STOP)        │
│                                 │
│  Timer sedang berjalan: 32 menit│
│                                 │
│  Kenapa berhenti?               │
│  ○ Istirahat Shift              │
│  ○ Mesin Forklift Rusak         │
│  ○ Menunggu Dokumen             │
│  ○ Lainnya: [___________]       │
│  Catatan: [...................]  │
│                                 │
│  [✔ STOP TIMER]                 │
└─────────────────────────────────┘
```

Setelah STOP: timer pause. Tally bisa klik **START** lagi kapan saja.
Setelah SELESAI: hitung total durasi → simpan ke `total_unloading_minutes` → status `CHECKING`.

#### Mode CHECKING (hitung fisik)

Sama seperti plan sebelumnya — form Good Qty + Damage Records dengan 2 statements + foto + PIN submit.

---

### 4c. ADMIN — Dashboard Saat `CHECKING_DONE` (Review Approve)

Sama seperti plan sebelumnya — review damage records (foto + detail) + overage, decision per item.

---

### 4d. PUTAWAY — Portal PWA (Multi-zone)

Sama seperti plan sebelumnya — split view good rack + quarantine zone.

---

## 5. WA Notification Triggers (Placeholder)

```typescript
// lib/notifications/warehouseWA.ts
// [AI] placeholder — WA Business API not yet integrated

export async function WAPushDamageNotification(receiptId: string): Promise<void> {
  console.log('[WA] Damage notification for:', receiptId);
}

export async function WAPushOverageNotification(receiptId: string, itemId: string, overageQty: number): Promise<void> {
  console.log('[WA] Overage notification:', receiptId, itemId, overageQty);
}

export async function WAPushDecisionNotification(receiptId: string): Promise<void> {
  console.log('[WA] Decision notification:', receiptId);
}
```

---

## 6. Urutan Eksekusi (7 PR)

| # | Task | Key Files | Dependencies |
|---|------|-----------|-------------|
| **PR 1** | **Migration**: `wh_unloading_sessions` + `wh_inbound_damage_records` + kolom baru + status update | Migration SQL | - |
| **PR 2** | **ADMIN — Validasi Transporter**: Form input data di `ReceiptDetailModal` saat TRUCK_ARRIVED + upload POD + tombol "Ready to Unloading" → UNLOADING | `ReceiptDetailModal.tsx` | #1 |
| **PR 3** | **TALLY — Unloading Timer**: START/STOP(modal reason)/SELESAI + session tracking + kalkulasi durasi → CHECKING | `portal/task/[id]/page.tsx` | #1, #2 |
| **PR 4** | **TALLY — Checking + Damage**: Form hitung fisik + Damage Records (2 statements + foto kamera + PIN) → CHECKING_DONE | `portal/task/[id]/page.tsx` + komponen baru | #1 |
| **PR 5** | **ADMIN — Review CHECKING_DONE**: Damage records viewer + decision (accept/reject) + overage decision | `ReceiptDetailModal.tsx` + `DamageReviewCard.tsx` | #1, #4 |
| **PR 6** | **PUTAWAY — Multi-zone**: Good rack + quarantine zone + scan lokasi + COMPLETED | `portal/task/[id]/page.tsx` | #4, #5 |
| **PR 7** | **Auto Inventory & BATB Update**: Insert `wh_inventory` + `wh_inventory_movements` (COMPLETED) + update BATB template | Backend trigger + `BATBGenerator.tsx` | #6 |

---

## 7. Pertanyaan untuk Approve

1. **Foto kamera HP**: Setuju pakai `capture="environment"` (langsung buka kamera, tanpa pilih gallery)?
2. **Multiple damage per SKU**: Boleh (contoh: 2 box rusak transporter + 1 box rusak staff)?
3. **Overage decision di level item**: Setuju per SKU, bukan per shipment?
4. **KPI Unloading**: `total_unloading_minutes` disimpan di `wh_inbound_receipts` — nanti untuk report perlu join dgn `md_fleets(vehicle_type)`?

---

**Ada revisi lagi atau approve?**
