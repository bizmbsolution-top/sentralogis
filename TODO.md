# TODO: Implementasi GPS Ping, Geofence & PWA Native Android

## Status: IMPLEMENTING PHASE 1

---

## Phase 1: Fix Critical Issues ✅ COMPLETE

### 1.1 ✅ Fix `RouteStop` Interface — Tambah `latitude`/`longitude`

### 1.2 ✅ Fix `isActiveTransitStatus()` — Tambah Pengecekan `ACTIVE_STATUSES`

### 1.3 ✅ Fix Geofence Threshold & Debounce di Backend (already implemented: 500m arrival, 300m departure, 5min debounce)

### 1.4 ✅ Fix `MainActivity.java` — Override `onNewIntent()`

### 1.5 ✅ Update `assetlinks.json` — Instruksi SHA256 (verifikasi saat release signing)

## Phase 2: GPS Ping Stability ✅ COMPLETE

### 2.1 ✅ Tambah Retry Logic & Adaptive Interval (10s active, 30s idle, backoff after 3 failures, max 10 consecutive failures)

### 2.2 ✅ Tambah Background Sync Offline (IndexedDB store-and-forward via offlineSyncEngine.ts, GPS ping priority sync)

## Phase 3: Geofence Auto-Recording ✅ COMPLETE

### 3.1 ✅ Auto-Update Route Status dari Geofence (500m arrival, 300m departure, 5min debounce, re-entry detection)

## Phase 4: UI and UX ✅ COMPLETE

### 4.1 ✅ GPS Status Indicator (gpsStatus state di /jo/[token] page, warna hijau/merah/kuning)

### 4.2 ✅ Offline Banner (isOnline state + navigator online/offline event listeners di /jo/[token] page)

---

## Additional Improvements (Done)
- Driver tracking page at `/dashboard/driver/tracking` — real-time GPS tracking UI (replaced placeholder)
- Public tracking page at `/tracking` — cargo owner token lookup leading to `/track/fwd/[token]`