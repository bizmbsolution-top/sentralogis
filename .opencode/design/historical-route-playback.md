# Historical Route Playback (Trip Replay / Blackbox Audit) - Perencanaan Pengembangan

## 1. Tujuan & Konsep
Mengubah data rekaman koordinat GPS ping (`job_tracking` dengan interval 10 detik) menjadi visualisasi garis rute (*Polyline Trajectory*) yang dapat diputar ulang layaknya pemutar video (misal YouTube) di atas peta Google Maps / Leaflet pada halaman detail pesanan kerja (`Job Order Tracking`).

## 2. Struktur Data Sumber
Data diambil langsung dari tabel `job_tracking` di mana `job_order_id = :id` dan `latitude IS NOT NULL` serta `longitude IS NOT NULL`, diurutkan kronologis:
```sql
SELECT id, latitude, longitude, status_update, notes, created_at
FROM job_tracking
WHERE job_order_id = :id AND latitude IS NOT NULL AND longitude IS NOT NULL
ORDER BY created_at ASC;
```

## 3. Desain Komponen UI (*Media Player Scrubber*)
1. **Polyline Path:** Menggabungkan seluruh titik `[latitude, longitude]` menjadi satu garis rute (`<Polyline />`) yang menghubungkan titik keberangkatan hingga titik tiba saat ini/akhir.
2. **Scrubber Slider:**
   - `<input type="range" min="0" max={points.length - 1} value={currentIndex} />`
   - Menggeser (*rewind / forward*) slider akan langsung memposisikan ikon marker truk ke koordinat `points[currentIndex]`.
3. **Kontrol Pemutaran (*Controls*):**
   - **Play / Pause Button:** Menjalankan `setInterval` / `requestAnimationFrame` untuk memindahkan `currentIndex` dari 0 hingga akhir.
   - **Kecepatan Pemutaran (*Speed Selector*):** `1x`, `2x`, `5x`, `10x`, `30x`.
4. **Dynamic Marker Tooltip:**
   - Menampilkan badge/popup informasi tepat di atas ikon truk saat pemutaran:
     - Waktu (`created_at` diformat `HH:mm:ss WIB`)
     - Status Pesanan / Rute saat itu
     - Kecepatan perkiraan (dihitung dari haversine distance antar dua titik dibagi waktu interval)

## 4. Rencana Implementasi (Fase Berikutnya)
- Buat komponen `TripReplayPlayer.tsx` di dalam `components/sbu/`.
- Integrasikan pada tab "Route Audit / Playback" di halaman detail Job Order (`/app/(dashboard)/hq/job-orders/[id]/page.tsx` atau `FleetTrackingConsole`).
