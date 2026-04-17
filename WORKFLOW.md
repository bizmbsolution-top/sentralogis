# Dokumentasi Implementasi SBU Trucking & Admin Dashboard - Sentralogis

Dokumen ini merangkum status terakhir sistem, logika operasional, dan fitur yang telah diimplementasikan untuk referensi pengembangan selanjutnya.

## 1. Alur Kerja Operasional (Workflow)

Sistem menggunakan alur status yang ketat untuk memastikan sinkronisasi antara Admin WO dan Tim SBU:

1.  **Draft (Admin)**: Admin WO membuat pesanan. Edit data masih bebas.
2.  **Awaiting SBU (Admin -> SBU)**: Admin menekan "Submit ke SBU". WO muncul di dashboard SBU.
3.  **Assignment (SBU)**: SBU memilih armada dan driver. 
    *   SBU menekan "Handover" -> Status berubah menjadi **Need Approval**.
4.  **Approval (SBU -> Admin)**: Admin WO menerima notifikasi "Butuh Persetujuan". Admin meninjau armada dan menekan "Setujui".
    *   Status berubah menjadi **Approved**.
5.  **On Journey**: Setelah disetujui, tombol "Kirim Link WA" aktif di SBU. Saat link dikirim/driver update status, status berubah menjadi **On Journey**.
6.  **Done**: Semua Job Order (JO) berstatus `delivered`.

## 2. Fitur Utama & Modul

### A. Admin Dashboard (`app/(dashboard)/admin/page.tsx`)
*   **Interactive Stats Widget**: Filter satu klik untuk kategori: `Semua WO`, `Menunggu SBU`, `Butuh Persetujuan`, dan `Dalam Perjalanan`.
*   **Drilldown Tracking**: Admin bisa melihat setiap unit armada di dalam WO.
*   **Live Map Modal**: Integrasi Google Maps untuk melihat posisi driver secara real-time (A ke B + Marker Live).
*   **Smart Search**: Pencarian real-time berdasarkan No. WO dan Nama Pelanggan.

### B. SBU Trucking Dashboard (`app/sbu/trucking/page.tsx`)
*   **Tactical Control Board**: Fokus pada penugasan armada dan pengiriman link driver.
*   **WhatsApp Individual Management**: Pengiriman link driver dilakukan per-unit untuk menghindari popup blocker.
*   **Restriksi Status**: Tombol "Kirim Link" hanya aktif jika status WO sudah `Approved` oleh Admin.

### C. Manajemen Transporter (Fleet & Driver CRUD)
*   **Dual Mode Modal**: Mendukung input baru dan edit data lama.
*   **Status Lifecycle**:
    *   **Fleet**: `Active`, `Maintenance`, `Non-Active`.
    *   **Driver**: `Active`, `Off`.
*   **Validation**: Penanganan otomatis nilai `null` pada form untuk mencegah error UI.

## 3. Struktur Data Kunci (Database Supabase)

| Tabel | Kolom Baru/Kunci | Fungsi |
| :--- | :--- | :--- |
| `work_orders` | `status`, `notes` | Menyimpan state global dan alasan reject. |
| `fleets` | `status`, `company_id` | Flag perbaikan (maintenance) dan kepemilikan. |
| `drivers` | `status`, `phone` | Flag aktif/tidaknya supir dan kontak WA. |
| `job_orders` | `is_link_sent`, `status` | State pengiriman per-unit armada. |
| `tracking_updates` | `location`, `status_update` | Koordinat Lat,Lng live dari driver. |

## 4. Panduan Pengembangan Selanjutnya (Next Steps)

1.  **Modul POD (Proof of Delivery)**: Implementasi upload foto tanda terima oleh supir di halaman tracking driver.
2.  **Dashboard Performance**: Menambahkan grafik pendapatan bulanan dan utilitas armada pada tab Statistik Admin.
3.  **Auto Routing Optimization**: Menggunakan Google Maps API untuk menyarankan rute tercepat atau urutan drop-off terbaik.
4.  **Notification System**: Mengganti `window.open` WA dengan sistem notifikasi backend (Wablas/Twilio) agar lebih otomatis.

---
**Status Terakhir**: Stable 
**Konfigurasi Maps**: Menggunakan Shared Google Maps API Key.
