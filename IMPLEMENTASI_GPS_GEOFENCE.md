# Plan Implementasi GPS Ping, Geofence & PWA Native Android

## 📋 Status: READY FOR IMPLEMENTATION

---

## Ringkasan Masalah

Berdasarkan analisa codebase:

1. ✅ PWA Android Native sudah bisa terbuka
2. ❌ GPS Ping belum aktif — `isActiveTransitStatus()` tidak komprehensif, tidak ada retry/backoff
3. ❌ Geofence matching belum aktif — RouteStop interface tidak punya latitude/longitude (padahal data di DB sudah ada)
4. ❌ Recording arrival/departure belum aktif — Tidak ada auto-recording dari geofence
5. ⚠️ Deep link Android belum sempurna — `MainActivity.java` tidak override `onNewIntent()`

---

## Phase 1: Fix Critical Issues (Prioritas Tertinggi)

### 1.1 Fix `RouteStop` Interface — Tambah `latitude`/`longitude`

**File:** `app/jo/[token]/page.tsx`

- Tambah properti `latitude?: number` dan `longitude?: number` ke interface `RouteStop`
- **Impact:** Tanpa ini, geofence 100% tidak bisa matching posisi driver dengan lokasi stop

### 1.2 Fix `isActiveTransitStatus()` — Tambah Pengecekan `ACTIVE_STATUSES`

**File:** `lib/hooks/useDriverGpsPing.ts`

- Fungsi `isActiveTransitStatus()` saat ini hanya cek `DONE_STATUSES` dan `INACTIVE_STATUSES`
- Tambah pengecekan eksplisit: jika status ada di `ACTIVE_STATUSES`, return `true`
- **Impact:** GPS ping tidak aktif di banyak status seperti 'TIBA DI LOKASI MUAT', 'MENUNGGU SELESAI', dll

### 1.3 Fix Geofence Threshold & Debounce di Backend

**File:** `app/api/jo/[token]/route.ts`

- Turunkan arrival threshold: 1000m → 500m
- Turunkan departure threshold: 500m → 300m
- Tambah debounce: cek `last_geofence_ping_at` di `job_routes`, jangan trigger ulang dalam 5 menit
- **Impact:** Akurasi geofence lebih baik, tidak trigger berulang

### 1.4 Fix `MainActivity.java` — Override `onNewIntent()`

**File:** `android/app/src/main/java/com/sentralogis/driver/MainActivity.java`

- Tambah override `onNewIntent()` untuk handle deep link dari `sentralogis://jo/{token}`
- Forward intent data ke Capacitor WebView via `bridge.onNewIntent(intent)`
- **Impact:** Deep link dari WhatsApp/email bisa buka app langsung

### 1.5 Update `assetlinks.json` — Placeholder Note

**File:** `public/.well-known/assetlinks.json`

- Tambah komentar jelas cara generate SHA256 fingerprint
- **Impact:** Developer bisa isi fingerprint dengan benar saat production

---

## Phase 2: GPS Ping Stability (High Priority)

### 2.1 Tambah Retry Logic & Adaptive Interval

**File:** `lib/hooks/useDriverGpsPing.ts`

- **Retry logic:** Jika gagal 3x berturut-turut, backoff ke 30 detik. Reset counter setelah sukses
- **Adaptive interval:** 10 detik saat aktif (screen on, foreground), 30 detik saat idle (screen off, background)
- **Max retry:** Setelah 10 gagal berturut-turut, stop ping dan set status error
- **Impact:** Stabilitas GPS ping lebih baik, hemat baterai saat idle

### 2.2 Tambah Background Sync untuk Offline GPS

**File:** `lib/hooks/useDriverGpsPing.ts`

- Saat offline, queue GPS ping ke IndexedDB via `enqueueGpsPing()`
- Saat online, kirim semua queued ping
- **Impact:** Coverage GPS tetap jalan meski sinyal hilang

---

## Phase 3: Geofence Auto-Recording (Medium Priority)

### 3.1 Auto-Update Route Status dari Geofence Event

**File:** `app/jo/[token]/page.tsx`

- Saat `onGeofenceArrival` di-trigger, auto-update route status ke "arrived"
- Tampilkan animasi banner geofence yang lebih smooth
- **Impact:** Driver tidak perlu manual klik "Tiba" — otomatis tercatat

### 3.2 Tambah Kolom `geofence_triggered_at` di Database

**File:** Migration SQL baru

- Tambah kolom `geofence_triggered_at timestamptz` di `job_routes`
- Tambah kolom `last_geofence_ping_at timestamptz` di `job_orders`
- **Impact:** Tracking riwayat geofence untuk audit

---

## Phase 4: UI & UX Improvements (Low Priority)

### 4.1 GPS Status Indicator di Top Bar

**File:** `app/jo/[token]/page.tsx`

- Icon GPS di header: hijau (active), merah (error), abu-abu (inactive)
- Tooltip: "GPS Aktif - Akurasi Xm" atau "GPS Error - Coba restart"

### 4.2 Offline Banner

**File:** `app/jo/[token]/page.tsx`

- Banner kuning "Offline - GPS ping akan dikirim saat online" saat `navigator.onLine === false`

---

## File yang Akan Diubah

| File                                              | Perubahan                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `app/jo/[token]/page.tsx`                         | Tambah latitude/longitude ke RouteStop, auto-recording geofence, GPS indicator, offline banner |
| `lib/hooks/useDriverGpsPing.ts`                   | Fix isActiveTransitStatus, retry logic, adaptive interval, background sync                     |
| `app/api/jo/[token]/route.ts`                     | Fix threshold 1000→500m, 500→300m, tambah debounce                                             |
| `android/app/src/main/java/.../MainActivity.java` | Override onNewIntent() untuk deep link                                                         |
| `public/.well-known/assetlinks.json`              | Tambah instruksi SHA256                                                                        |

---

## Urutan Implementasi

1. **Phase 1.1** → Fix RouteStop interface (5 menit)
2. **Phase 1.2** → Fix isActiveTransitStatus (5 menit)
3. **Phase 1.3** → Fix geofence threshold & debounce di backend (15 menit)
4. **Phase 1.4** → Fix MainActivity.java onNewIntent (10 menit)
5. **Phase 1.5** → Update assetlinks.json (2 menit)
6. **Phase 2.1** → Retry logic & adaptive interval (20 menit)
7. **Phase 2.2** → Background sync offline (10 menit)
8. **Phase 3.1** → Auto-recording geofence di frontend (15 menit)
9. **Phase 4.1-4.2** → UI improvements (15 menit)

**Total estimasi: ~97 menit**

---

## Testing Plan

1. **Unit test:** `isActiveTransitStatus()` dengan berbagai status
2. **API test:** Kirim GPS ping via curl, verifikasi geofence trigger
3. **Integration test:** Buka JO di browser dengan `?browser=1`, verifikasi GPS ping berjalan
4. **Android test:** Build APK, install di device, verifikasi native GPS + deep link
