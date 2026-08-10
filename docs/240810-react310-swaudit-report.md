# Report — React #310 & SW Update Error (Production)

Tanggal: 2026-08-10

## Ringkasan

Dua error produksi diperiksa:

1. **React #310** (di `/driver/portal`) — `Minified React error #310` = *too many re-renders*.
2. **SW update error** — `Failed to update a ServiceWorker for scope: https://sentralogis.com/ ... bad state, the update is blocked`.

Kedua-nya sudah diperbaiki. Root cause SW sudah **diperbaiki di working tree** (`public/sw.js`). Root cause #310 sudah diperbaiki di commit `bf54607` (HEAD) — tinggal **deploy ulang** agar masuk produksi.

---

## 1. React #310 — `/driver/portal`

### Root cause
`app/driver/portal/page.tsx` (commit `bf54607`) — `useEffect` untuk route-map (DirectionsService) berada **di bawah** blok early-return penjaga (`sessionLoading/loading`, `error`, `isBlocked`, readiness gate). Saat kondisi berubah (loading → selesai → readiness), jumlah hook yang diregister berubah antar render → React #310.

Stack produksi yang dilaporkan: `at er (1:47378)` — bundle minified dari `page.tsx` (route-map effect region).

### Fix (sudah ter-commit di `bf54607`)
Semua hook (termasuk `useEffect` route-map, hooks readiness) **di-hoist ke atas seluruh early-return**:
- Hook terakhir: baris **1767** (`useEffect` route-map)
- Early-return pertama: baris **1797** (`if (!mounted)`)
- Tidak ada hook setelah early-return (diverifikasi dengan audit baris-per-baris).

**Status:** fix ada di HEAD, **belum ter-deploy** (build produksi terakhir ~44 menit lalu dibuat sebelum `bf54607`).

---

## 2. SW update error — "bad state, the update is blocked"

### Root cause
`public/sw.js` memiliki **SyntaxError** (baris 124) pada fallback HTML offline: string HTML dibuka dengan **kutip tunggal** (`'<!DOCTYPE html>...`) tetapi:
- mengandung **newline di tengah string** (multi-line dalam string single-quote — ilegal di JS), dan
- berisi **kutip tunggal bersarang** (`getElementById('offline-code')`) yang menutup string lebih awal.

Script SW yang gagal dievaluasi tidak bisa di-install oleh browser → update diblokir → error `bad state, the update is blocked` di console. Karena `public/` diserve langsung di root (`/sw.js`), syntax error ini ikut ter-deploy.

### Fix (working tree, belum di-commit)
Kutip pembuka & penutup string diubah ke **template literal (backtick)**:
- baris 124: `'<!DOCTYPE html>...` → `` `<!DOCTYPE html>... ``
- baris 132: `...</html>'` → `` ...</html>` ``

Verifikasi:
- `node --check public/sw.js` → **lolos (exit 0)**
- `git diff public/sw.js` → hanya 2 perubahan delimiter (4 baris)
- `npm run build` → **sukses** (exit 0); routes `/`, `/jo/[token]`, `/driver/*` ter-compile.

---

## 3. Audit Rules of Hooks — halaman target

Semua halaman **BEBAS pelanggaran** (tidak ada hook setelah conditional return):

| Halaman | Hooks terakhir | Early-return pertama | Status |
|---|---|---|---|
| `app/page.tsx` | 26 | 83+ | Aman |
| `app/jo/[token]/page.tsx` | 17 | 44 | Aman |
| `app/driver/login/page.tsx` | 16 | — (tanpa early return) | Aman |
| `app/driver/portal/page.tsx` | 1767 | 1797 | **Aman (fix di `bf54607`)** |
| `app/driver/order/[token]/page.tsx` | 96 | 200 | Aman |
| `app/driver/execution/[token]/page.tsx` | 210 | 223 | Aman |

Custom hooks yang dipakai halaman-halaman di atas (`useDriverGpsPing`, `useDriverAuth`, `useTTS`, `useGoogleMaps`/`GoogleMapsProvider`, `useAuth`/`AuthProvider`, `useGpsStatus`, `useLanguage`/`LanguageProvider`) — semua hook **unconditional, sebelum return**. Aman.

---

## 4. Catatan (di luar scope — butuh persetujuan terpisah)

- `app/driver/execution/[token]/page.tsx:198-208` memanggil `useDriverGpsPing` dengan **urutan argumen salah**:
  - arg 2 `status` diisi boolean `readinessComplete && !!jobOrder` (seharusnya string status)
  - arg 3 `enabled` diisi callback `(acc, batt, speed) => {...}` (seharusnya boolean)
  - Konsekuensi: gating `enabled` selalu truthy dan `isActiveTransitStatus(true)` berpotensi throw saat efek berjalan.
  - **Bukan penyebab #310** (hook count tetap stabil), dan sesuai instruksi tidak diubah. Perlu keputusan untuk diperbaiki.

---

## 5. Langkah lanjut

1. **Commit** perubahan `public/sw.js`.
2. **Deploy ulang** (produksi) — sekaligus membawa fix #310 dari `bf54607`.
3. Setelah deploy, SW lama yang gagal akan otomatis mencoba update pada kunjungan berikutnya (deteksi perubahan byte → install baru berhasil).
4. (Opsional) Perbaiki arg-order `useDriverGpsPing` di execution page bila disetujui.
