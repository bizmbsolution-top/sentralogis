# 🛡️ Implementation Plan — System Integrity & Debugging Module

> **Tanggal Kerja:** Selasa, 25 Agustus 2026
> **Tujuan:** Membangun modul auto-detect bug/error berlapis di stack GitHub + Vercel + Supabase,
> agar masalah **terdeteksi sebelum pengguna komplain**.
> **Status:** ⬜ Belum Mulai

---

## 📋 Latar Belakang

- Korupsi massal `wo_items.status = 'handover_rejected'` (94 baris, 27 Juli 2026) baru ketikaan lewat query manual — tidak ada sistem yang menangkapnya.
- Governance CLI (`/governance`) hanya static analysis (baca snapshot kode), tidak melihat runtime & data.
- Strategi: *defense in depth* — bug disadap di lapisan termurah dulu.

```
L1 GITHUB ──► L2 VERCEL BUILD ──► L3 RUNTIME CAPTURE ──► L4 DATA AUDIT ──► L5 SYNTHETIC
 (saat PR)     (saat deploy)       (saat user pakai)     (data berkala)   (denyut sistem)
```

---

## ✅ Task List — Fase 1: Runtime Error Capture (P1)

### 1.1 Database — Tabel Error Log
- [ ] Buat migration `supabase/migrations/191_system_error_log.sql`:
  - [ ] Tabel `system_error_log`:
    - `id UUID PK`, `tenant_id UUID NULL`, `user_id UUID NULL`
    - `fingerprint TEXT NOT NULL` (hash dari type + route + top-frame stack)
    - `severity TEXT` (`error` | `warning`)
    - `source TEXT` (`client` | `server` | `api`)
    - `route TEXT`, `method TEXT`
    - `message TEXT`, `stack TEXT`
    - `context JSONB` (breadcrumb, component, extra)
    - `deployment_id TEXT` (VERCEL_DEPLOYMENT_ID / release marker)
    - `occurrences INT DEFAULT 1`, `first_seen TIMESTAMPTZ`, `last_seen TIMESTAMPTZ`
    - `resolved BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT NOW()`
  - [ ] Unique index pada `(fingerprint, deployment_id)` untuk dedup
  - [ ] Index `last_seen DESC`, `resolved`
  - [ ] RLS: service-role only untuk insert; select via API server-side
- [ ] Jalankan migration di Supabase

### 1.2 API — Endpoint Capture
- [ ] `app/api/integrity/log-error/route.ts` (POST):
  - Terima payload error dari client (rate-limit sederhana per IP)
  - Hitung fingerprint (SHA-256 dari message + route + frame pertama stack)
  - Upsert: jika fingerprint sudah ada → `occurrences++`, update `last_seen`
  - Simpan deployment id dari env Vercel
- [ ] Wrapper `lib/integrity/captureServer.ts`:
  - Helper `withErrorCapture(handler)` untuk API routes → try/catch → log ke tabel → rethrow
  - Pasang minimal pada API kritikal: `/api/jo/[token]`, `/api/driver/login`, `/api/fleet-status`

### 1.3 Client — Global Capture
- [ ] `components/integrity/GlobalErrorBoundary.tsx` — class boundary, kirim ke `/api/integrity/log-error`, tampilkan fallback UI ramah
- [ ] Hook `components/integrity/GlobalRuntimeListener.tsx`:
  - `window.addEventListener('error')` + `'unhandledrejection'` → POST capture (fire-and-forget)
  - Include: pathname, tenant_id & user_id dari useAuth, breadcrumb ringkas (5 navigasi terakhir via sessionStorage)
- [ ] Mount keduanya di root layout `app/layout.tsx` (non-blocking, jangan sampai listener bikin crash)

### 1.4 Acceptance — Fase 1
- [ ] Simulasi: lempar error manual di client & API → muncul 1 baris di `system_error_log`
- [ ] Trigger error sama 5× → tetap 1 baris, `occurrences = 5`
- [ ] Build production PASS

**Status Fase 1:** ⬜

---

## ✅ Task List — Fase 2: Data Integrity Auditor (P2)

### 2.1 Database — Tabel Hasil Audit
- [ ] Migration `supabase/migrations/192_integrity_findings.sql`:
  - [ ] Tabel `integrity_findings`:
    - `id UUID PK`, `rule_id TEXT NOT NULL`, `severity TEXT` (`critical|warning`)
    - `title TEXT`, `evidence JSONB` (baris data anomali), `affected_count INT`
    - `status TEXT DEFAULT 'open'` (`open|acknowledged|resolved`)
    - `run_at TIMESTAMPTZ DEFAULT NOW()`, `resolved_at TIMESTAMPTZ NULL`
  - [ ] Index `status, run_at DESC`
- [ ] Jalankan migration

### 2.2 Aturan Invariant (SQL Checks) — `lib/integrity/rules.ts`
Implementasikan sebagai fungsi query + definisi rule (id, severity, title):
- [ ] `WO_ITEM_STATUS_CONTRADICTION`: item `handover_rejected` tapi WO induk completed/handover_rejected-tidak → kasus korupsi 27 Juli
- [ ] `JO_ORPHAN`: job_orders tanpa wo_item valid
- [ ] `JO_COMPLETED_ITEM_NOT`: semua JO completed tapi wo_item masih pending/in_progress
- [ ] `NEGATIVE_INVENTORY`: `wh_inventory.quantity < 0` atau available < 0
- [ ] `STOCK_UNKNOWN_LOCATION`: inventory dengan location_id yang tidak ada/tidak aktif di master bin
- [ ] `EXPIRED_STILL_AVAILABLE`: expiry_date lewat tapi status AVAILABLE
- [ ] `STALE_TASK`: wh_tasks IN_PROGRESS > 48 jam tanpa update
- [ ] `TRANSFER_MISSING_INBOUND_SIDE`: transfer order tanpa pasangan inbound item
- [ ] `GPS_CRON_FRESHNESS`: sync GPS terakhir > 15 menit (freshness check L5 mini)
- [ ] Setiap rule return `{ affected_count, evidence[] }` (max 20 contoh baris)

### 2.3 Runner + Cron
- [ ] `app/api/integrity/audit/route.ts` (GET/POST):
  - Jalankan semua rule → tulis findings baru (hindari duplikat: sama rule + evidence key masih open → update run_at)
  - Return ringkasan hasil
- [ ] Daftarkan cron di `vercel.json`: audit harian (misal jam 06:00 UTC) + opsional manual trigger

### 2.4 Alerting (manfaatkan infrastruktur existing)
- [ ] Finding `critical` baru → kirim WA admin via Twilio (`lib/twilio/clients.ts` sudah ada)
- [ ] Finding `warning` → `sendNotification()` internal (tabel notifikasi existing)

### 2.5 UI — Tab Integrity di `/governance`
- [ ] Tambah tab/section "System Integrity" di `app/(dashboard)/governance/page.tsx`:
  - [ ] Ringkasan: X critical open · Y warning open · run terakhir
  - [ ] List findings dengan evidence expandable + tombol Acknowledge/Resolve
  - [ ] Panel "Runtime Errors" baca `system_error_log` (top fingerprints by occurrences, filter unresolved)

### 2.6 Acceptance — Fase 2
- [ ] Trigger salah satu kondisi nyata (atau insert data uji) → finding muncul setelah audit run
- [ ] WA terkirim untuk severity critical
- [ ] UI menampilkan finding + bisa acknowledge
- [ ] Cron terdaftar & jalan (cek log Vercel)

**Status Fase 2:** ⬜

---

## 🔜 Backlog (Setelah 25-08 — belum dijadwalkan)

- [ ] **F3 — CI GitHub Actions**: workflow `ci.yml` (tsc + build + governance scan), branch protection main
- [ ] **F4 — Post-deploy smoke check**: ping route kritikal setelah aliasing production
- [ ] **F4 — Cron freshness lengkap**: semua cron teregistrasi + alert saat diam
- [ ] Rebuild `/reporting/operational/warehouse` (periodic report; menu disembunyikan sementara)
- [ ] Refresh governance snapshot via CLI (data saat ini stale 7-Agu)

---

## 📁 File yang Akan Dibuat/Diubah (ringkasan)

| File | Aksi |
|---|---|
| `supabase/migrations/191_system_error_log.sql` | buat |
| `supabase/migrations/192_integrity_findings.sql` | buat |
| `app/api/integrity/log-error/route.ts` | buat |
| `app/api/integrity/audit/route.ts` | buat |
| `lib/integrity/captureServer.ts` | buat |
| `lib/integrity/rules.ts` | buat |
| `components/integrity/GlobalErrorBoundary.tsx` | buat |
| `components/integrity/GlobalRuntimeListener.tsx` | buat |
| `app/layout.tsx` | edit (mount listener/boundary) |
| `app/(dashboard)/governance/page.tsx` | edit (tab integrity + errors) |
| `vercel.json` | edit (cron audit) |

---

## ⚠️ Prinsip Keamanan Pengerjaan

1. Jangan ubah perilaku bisnis existing — modul ini **read-only** terhadap data operasional (hanya insert ke tabel miliknya sendiri).
2. Listener/error boundary wajib fail-silent: kegagalan logging tidak boleh mengganggu app.
3. Rate-limit endpoint log-error agar tidak jadi vektor spam.
4. Setiap migration diuji dry-run/di-review sebelum dijalankan di production DB.

---

## 📝 Log Pengerjaan (update saat mengerjakan)

| Waktu | Task | Hasil |
|---|---|---|
| — | — | — |

**Status Akhir Hari:** ⬜
