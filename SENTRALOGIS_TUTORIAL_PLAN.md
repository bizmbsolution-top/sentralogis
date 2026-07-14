# Sentralogis Tutorial & Implementasi Plan

## Tujuan

Dokumen ini merinci rencana pembuatan tutorial Sentralogis yang mudah dipahami oleh pengguna baru dan stakeholder operasional. Fokus utamanya adalah membuat pengalaman pembelajaran menjadi langsung, praktis, dan relevan dengan alur kerja logistik yang sudah ada.

## Sasaran Pengguna

- Pemilik usaha / owner Sentralogis
- Tim CS (Customer Service)
- Tim SBU Trucking / operasional armada
- Driver / supir lapangan
- Tim Finance dan administratif
- Tim IT / developer yang menerapkan Supabase + Next.js

## Landasan Materi

Materi tutorial akan dibangun dari dokumen inti proyek:

- `README.md` — ringkasan fitur dan instalasi
- `SopSentraLogis.md` — SOP operasional end-to-end
- `implementasi.md` — kondisi pengembangan dan modul inti

## Onboarding Tenant Real Workflow

1. **Tenant diajukan / dibuat oleh Owner Sentralogis**
   - Owner Sentralogis membuat tenant baru dan mengirimkan akses awal.
   - Tenant belum bisa menjalankan operasional penuh sampai proses `approved` selesai.

2. **Tenant di-approved oleh Owner Sentralogis**
   - Setelah approval, user tenant dapat login ke portal tenant.
   - Akses awal terbuka untuk tenant admin / superadmin tenant.

3. **Halaman `/tenant` menjadi pusat onboarding**
   - Tampilkan `Tutorial Tenant & Role Setup` pada dashboard tenant.
   - Panduan ini menuntun langkah praktis: `Organisasi`, `SBU`, `Staff`, `Roles`, `Master Data`.

4. **Setup Organisasi & SBU**
   - Tenant membuat struktur organisasi internal dan mengaktifkan SBU yang diperlukan.
   - SBU standar: `Trucking`, `Warehouse`, `Clearance`, `Forwarding`.
   - Buat SBU sebagai entitas operasional, lalu atur staff dan role untuk tiap SBU.

5. **Role Setup & Staff Assignment**
   - Login tenant admin ke `Staff Management`.
   - Tambah user dengan role: `HQ`, `SBU Ops`, `SBU Finance`, `Driver`, `Sales`.
   - Atur akses SBU spesifik untuk setiap staff.

6. **Masuk ke workflow HQ → SBU**
   - CS / HQ membuat Work Order di `HQ Work Orders`.
   - WO diberi SBU target dan dikirim ke SBU terkait.
   - SBU Trucking / Warehouse / Clearance / Forwarding menerima tugas dan menjalankan eksekusi.

7. **Eksekusi di SBU dan driver portal**
   - SBU Trucking: alokasi armada, buat JO, monitor status, upload POD.
   - Driver Portal: driver login, terima job, navigasi, evidence upload.
   - SBU Warehouse: inbound/outbound, stok, transfer, print BAST.
   - SBU Clearance/Forwarding: proses dokumen, konsolidasi shipment.

8. **Feedback dan iterasi**
   - Setelah onboarding selesai, tutorial mencakup FAQ, troubleshooting, dan penyempurnaan.

## Struktur Tutorial

1. **Pengenalan Sentralogis**
   - Apa itu Sentralogis
   - Arsitektur umum: Next.js + Supabase + Google Maps + Twilio
   - Keunggulan sistem untuk trucking, warehouse, dan operasional logistik

2. **Persiapan & Instalasi**
   - Prasyarat perangkat lunak
   - Clone repository
   - Install dependensi
   - Konfigurasi `.env.local`
   - Menjalankan aplikasi lokal

3. **Memahami Alur Kerja Utama**
   - CS: pembuatan Work Order (WO)
   - Driver: akses token JO, navigasi, dan bukti pengiriman
   - Finance: faktur, PPN/PPh, dan rekonsiliasi

4. **Struktur Tutorial per SBU**
   - SBU Trucking: workflow armada, JO, tracking, dan delivery
   - SBU Warehouse: inbound/outbound, stok, transfer, dan dokumentasi gudang
   - SBU Clearance: dokumen customs, approval, dan status clearance
   - SBU Forwarding: shipment, konsolidasi, dan koordinasi cargo

5. **Cluster Fitur untuk Tutorial**
   - Platform Core
     - CRM: customer management, leads, deals, quotations
     - HRD / Staff Management: staff roles, organisasi, user profiles
     - User Roles & Access: tenant roles, SBU-specific roles, permission gating
   - SBU Trucking Core
     - FMS (Fleet Management System): tipe truk, fleet data, availability
     - Driver Management: driver profiles, assignment, performance
     - Vendor Management: transporter/vendor contracts, pricing, vendor price
     - Operations: WO → JO → tracking → POD dan laporan
   - SBU Warehouse Core
     - Inventory & Master Data: lokasi, items, unit of measure
     - Inbound/Outbound Flow: receipt, picking, transfer, BAST
     - Warehouse Operations: storage, repacking, bundling, kitting
   - SBU Clearance & Forwarding Core
     - Clearance: dokumen customs, approval workflow, status clearance
     - Forwarding: shipment planning, cargo consolidation, cross-border coordination
   - Shared User Experience
     - Dashboard onboarding & quick start per role
     - Notifikasi dan komunikasi: WhatsApp, in-app alerts, status updates
     - Mobile/driver portal: token access, route navigation, evidence upload

6. **Tenant Onboarding & Role Setup (Page `/tenant`)**
   - Halaman `/tenant` menampilkan tutorial tenant onboarding
   - Langkah awal untuk tenant yang baru di-approve oleh owner Sentralogis
   - Fokus pada:
     - Membuat organisasi tenant
     - Mengaktifkan SBU yang dibutuhkan
     - Menambah staff dan menetapkan role
     - Menghubungkan master data kontak dan lokasi

7. **Chat Robot & Help Assistant**
   - Tambahkan ikon `?` atau tombol bantuan di setiap halaman fitur utama
   - Ketika diklik, buka panel chat ringan atau drawer yang menjawab pertanyaan tutorial
   - Robot chat menggunakan konten tutorial terstruktur untuk menjawab:
     - “Bagaimana setup SBU?”
     - “Dimana membuat Work Order?”
     - “Bagaimana cara daftar driver?”
     - “Apa langkah selanjutnya setelah approval tenant?”
   - Jawaban menyertakan link langsung ke halaman tutorial / page terkait
   - Ideal untuk tenant baru yang butuh support kontekstual saat bekerja di `/tenant` dan dashboard SBU

8. **Spesifikasi Chat Robot**
   - Tujuan: bantu pengguna awam menemukan proses dan halaman yang tepat tanpa meninggalkan aplikasi
   - UI:
     - ikon `?` di header halaman / card fitur
     - sidebar/chat drawer di halaman `/tenant`, `/sbu/trucking`, `/hq/work-orders`, dan driver portal
     - tombol `Buka Bantuan` di dashboard tenant dan SBU
   - Fitur:
     - jawaban cepat berdasarkan topik tutorial yang ada
     - link langsung ke docs atau page terkait
     - daftar pertanyaan populer / quick questions
     - fallback ke FAQ jika pertanyaan tidak dikenali
   - Sumber jawaban:
     - konten tutorial internal di `docs/tutorial/*`
     - ringkasan langkah di halaman `/tenant`
     - glossary istilah seperti WO, JO, SBU, POD, FMS
   - Integrasi teknis minimal:
     - Chat bot bisa berfungsi sebagai rule-based Q&A pertama
     - Jika ingin lebih lanjut, kembangkan jadi LLM-assisted dengan knowledge base dari markdown tutorial
   - Prioritas implementasi:
     1. desain UI help button + drawer
     2. buat rule-based question mapping untuk topik utama
     3. isi jawaban dengan tutorial singkat + link
     4. tambahkan tracking pertanyaan populer untuk perbaikan konten

   - User Story & Chat Flow:
     - User Story 1: Tenant admin baru ingin setup SBU. Ia klik ikon `?`, mengetik “cara aktifkan SBU”, dan menerima langkah cepat beserta link ke `/tenant/sbu`.
     - User Story 2: SBU Ops ingin tahu proses pembuatan JO. Ia memilih quick question “Buat JO”, dan bot menjawab dengan ringkasan langkah pada `SBU Trucking`.
     - User Story 3: Driver ingin tahu apa arti status JO. Ia membuka help drawer di driver portal, pilih pertanyaan populer, dan menerima penjelasan status dengan istilah glossary.
     - User Story 4: Finance butuh cara memverifikasi invoice. Bot menawarkan link ke modul finance dan halaman billing.

   - Chat Flow:
     1. pengguna klik ikon `?` di halaman.
     2. tampil panel chat / drawer berisi opsi populer + input teks.
     3. pengguna ketik atau pilih topik.
     4. bot mencocokkan kata kunci ke topik tutorial.
     5. bot menampilkan jawaban singkat + link ke page/tutorial.
     6. jika bot tidak memahami, tampilkan fallback FAQ dan opsi “Minta bantuan admin”.

9. **Workflow HQ → SBU**
   - CS / HQ membuat Work Order (WO) di dashboard HQ
   - WO ditetapkan ke satu atau beberapa SBU berdasarkan layanan
   - SBU menerima tugas dan memproses job order sesuai domainnya
   - Hasil eksekusi SBU dikembalikan ke Finance / Audit / Billing
   - Driver Portal mendukung eksekusi lapangan dari JO yang diberikan

10. **Fitur Halaman & Modul**
    - Dashboard owner / tenant
    - Master data: lokasi, tipe truk, customer
    - Job Order dan Work Order
    - Portal driver dan mobile experience
    - Notifikasi WhatsApp / komunikasi real-time

    - Dashboard owner / tenant
    - Master data: lokasi, tipe truk, customer
    - Job Order dan Work Order
    - Portal driver dan mobile experience
    - Notifikasi WhatsApp / komunikasi real-time

11. **Tutorial Langkah demi Langkah**
    - Demo awal: Buat WO baru dari CS dan pilih SBU target
    - Demo SBU Trucking: Alokasikan armada dan buat JO
    - Demo SBU Warehouse: Terima inbound dan kelola stok
    - Demo SBU Clearance: Siapkan dokumen dan selesaikan approval
    - Demo SBU Forwarding: Track shipment dan tutup layanan

12. **Implementasi Teknis**
    - Struktur kode Next.js: `app/` dan `(dashboard)`
    - Struktur Supabase: tabel master, JO, notifikasi, autentikasi
    - Pola integrasi Google Maps dan Places
    - Alur otentikasi dan role-based dashboard

13. **Contoh Kasus / Use Case**
    - Pengiriman trucking harian
    - Manajemen tiket armada
    - Penanganan warehouse inbound/outbound
    - Clearance dan forwarding cargo
    - Billing dan audit performance

14. **Tips Cepat untuk Pengguna Baru**
    - Langkah prioritas saat login pertama kali
    - Halaman penting yang perlu dipahami segera
    - Saran koordinasi CS–SBU–Finance
    - Cara membaca dashboard dan pipeline status

15. **Panduan Developer**
    - Menjalankan environment pengembangan
    - Memahami file penting
    - Menambah fitur baru dan mengikuti alur implementasi

## Rencana Implementasi Tutorial

### Fase 1: Draft Konten

- Buat outline tutorial dan daftar topik
- Kumpulkan potongan teks utama dari `README.md`, `SopSentraLogis.md`, dan `implementasi.md`
- Susun narasi operasional dengan gaya bahasa pengguna Indonesia
- Tentukan SBU pilot pertama (mulai dari `TRUCKING`)

### Fase 2: Dokumentasi Modular per SBU

- Buat dokumentasi tutorial per SBU: `TRUCKING`, `WAREHOUSE`, `CLEARANCE`, `FORWARDING`
- Buat komponen konten bersama untuk `Pengenalan`, `Persiapan`, dan `FAQ`
- Tambahkan contoh screenshot atau snippet jika tersedia
- Sisipkan ringkasan proses operasional dalam tabel dan diagram sederhana

### Fase 3: Integrasi di Repository

- Tambahkan file tutorial utama di root: `SENTRALOGIS_TUTORIAL_PLAN.md`
- Buat direktori dokumentasi jika perlu: `docs/tutorial/`
- Susun halaman `docs/tutorial/01_sbu_trucking.md` sebagai pilot pertama
- Tambahkan panduan singkat ke `README.md`

### Fase 4: Validasi & Uji Baca

- Baca ulang dengan perspektif pengguna baru
- Pastikan istilah teknis dijelaskan
- Tambahkan catatan untuk istilah internal seperti WO, JO, SBU
- Minta feedback dari 1-2 pengguna operasional SBU

### Fase 5: Pengembangan Tutorial Lanjutan

- Tambahkan tutorial video atau demo screen capture
- Sediakan FAQ untuk masalah umum
- Tambahkan checklist onboarding untuk tim baru
- Perluas tutorial ke SBU lain setelah pilot `TRUCKING` matang

## Rekomendasi Struktur File

- `SENTRALOGIS_TUTORIAL_PLAN.md` — rencana inti dan roadmap tutorial
- `docs/tutorial/00_chatbot_design.md`
- `docs/tutorial/01_pengenalan.md`
- `docs/tutorial/02_instalasi.md`
- `docs/tutorial/03_alur_kerja.md`
- `docs/tutorial/04_fitur_dasar.md`
- `docs/tutorial/05_kasus_penggunaan.md`
- `docs/tutorial/06_developer_guide.md`

## Catatan Khusus

- Gunakan bahasa sederhana dan contoh riil proses logistik.
- Bedakan antara fungsi operasional (CS/SBU/Finance) dan fungsi teknis.
- Pastikan pengguna akhir dapat langsung melihat halaman mana yang harus digunakan untuk tiap peran.
- Jadikan dokumentasi tutorial sebagai landing page onboarding untuk Sentralogis.
