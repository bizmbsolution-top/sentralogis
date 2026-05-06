# Standard Operating Procedure (SOP) SentraLogis

**Sistem Manajemen Logistik Terpadu**

Dokumen ini menguraikan alur kerja operasional perusahaan yang dibagi berdasarkan fungsi departemen untuk memastikan koordinasi yang mulus antara penerimaan pesanan hingga penyelesaian laporan keuangan.

---

## 1. Departemen Customer Service (CS)

_Fokus: Manajemen Hubungan Pelanggan & Inisiasi Pesanan_

**Tanggung Jawab Utama:**

1.  **Penerimaan Pesanan**: Menerima permintaan pengiriman dari pelanggan baik melalui WhatsApp Bot, Telepon, maupun Email.
2.  **Verifikasi Master Data**: Memastikan data Pelanggan (Customer) dan Lokasi (Origin & Destination) sudah terdaftar dengan benar di sistem.
3.  **Pembuatan Work Order (WO)**:
    - Memasukkan detail pengiriman (Tanggal Eksekusi, Jenis Truk, Rute).
    - Menetapkan Harga Jual (_Deal Price_) sesuai kesepakatan dengan pelanggan terkait PPN/PPh 23.
4.  **Koordinasi Awal**: Memastikan catatan khusus dari pelanggan terinput dalam kolom _Notes_ agar terbaca oleh SBU.
5.  **Status Workflow**: Menyerahkan WO ke departemen SBU dengan mengubah status menjadi **"Pending SBU"** atau **"Approved"** setelah divalidasi.

---

## 2. Departemen Strategic Business Unit (SBU Trucking)

_Fokus: Eksekusi Lapangan, Manajemen Armada, & Monitoring Real-time_

**Tanggung Jawab Utama:**

1.  **Perencanaan Armada (Fleet Matching)**:
    - Melihat daftar WO yang masuk dari CS.
    - Mengalokasikan truk (Fleet) dan Pengemudi (Driver) yang tersedia sesuai spesifikasi pesanan.
2.  **Penerbitan Job Order (JO)**:
    - Memecah WO menjadi satu atau beberapa JO sesuai jumlah unit yang dikirim.
    - Menetapkan Harga Vendor (_Vendor/Driver Price_).
3.  **Operasional Mission Control**:
    - Mengirimkan Link Tracking unik kepada Driver melalui WhatsApp.
    - Memantau pergerakan Driver secara real-time melalui dashboard (Milestones: Pickup, On Way, Arrived).
4.  **Verifikasi Lapangan**:
    - Menerima dan memeriksa kualitas unggahan foto bukti (POD/Surat Jalan) yang dikirim driver melalui sistem.
    - Menangani kendala di jalan melalui respon cepat terhadap laporan _Panic Button_ atau _Incident_.
5.  **Penyelesaian Operasional**: Memastikan status JO berubah menjadi **"Delivered/Done"** agar berkas digital siap ditagihkan.

---

## 3. Departemen Finance

_Fokus: Billing (AR), Vendor Payment (AP), & Laporan Laba-Rugi_

**Tanggung Jawab Utama:**

1.  **Manajemen Accounts Payable (AP)**:
    - Memproses pencairan Uang Jalan (_Cash Advance_) berdasarkan JO yang telah disetujui SBU.
    - Melakukan verifikasi tagihan vendor/driver setelah operasional selesai.
2.  **Manajemen Accounts Receivable (AR)**:
    - Melakukan penagihan (_Invoicing_) kepada Pelanggan berdasarkan data WO yang sudah selesai (Status: Done).
    - Menerapkan perhitungan PPN 11% (jika ada) dan pemotongan PPh 23 (2%) pada setiap Invoice.
3.  **Dokumentasi Keuangan**:
    - Melakukan audit berkas fisik yang diterima dari SBU (Surat Jalan Asli) untuk dicocokkan dengan bukti digital di sistem.
    - Memastikan pembayaran pelanggan diterima tepat waktu sesuai _Terms of Payment_ (TOP).
4.  **Pelaporan**:
    - Menghitung selisih antara _Deal Price_ (Penjualan) dan _Vendor Price + Extra Cost_ (Biaya) untuk menentukan profitabilitas per Job Order.
    - Menghasilkan laporan laba-rugi operasional periode bulanan untuk direksi.

---

### Matriks Koordinasi Antar Departemen

| Trigger               | Aksi CS             | Aksi SBU              | Aksi Finance          |
| :-------------------- | :------------------ | :-------------------- | :-------------------- |
| **Pemesanan Baru**    | Buat WO & Set Harga | -                     | -                     |
| **Penunjukan Armada** | -                   | Buat JO & Driver Link | Validasi Cash Advance |
| **Barang Terkirim**   | Update Pelanggan    | Verifikasi Foto POD   | Siapkan Invoice AR    |
| **Selesai Tagihan**   | -                   | -                     | Rekonsiliasi Bank     |

---

## 4. KPI Audit Engine & Performance Framework

_Fokus: Akuntabilitas Proses, Kecepatan Eksekusi, & Transparansi Biaya_

Dalam versi terbaru, SentraLogis mengadopsi mesin audit otomatis untuk melacak efisiensi setiap departemen melalui **Executive Cabinet**:

1.  **Phase 1: CS Velocity (Customer Request → Submission)**
    - Mengukur seberapa cepat tim CS merespon pesanan pelanggan hingga siap dieksekusi operasional.
2.  **Phase 2: SBU Negotiation (Submission → Processed)**
    - Mengukur kecepatan SBU dalam menemukan armada, melakukan negosiasi harga vendor, dan plotting unit.
3.  **Phase 3: Decision Speed (SBU Processed → Admin Decision)**
    - Mengukur efisiensi manajer/finance dalam memberikan otorisasi biaya tambahan (Extra Costs) dan persetujuan misi.
4.  **Phase 4: Logistic Cycle Time (Assignment → Delivered)**
    - Mengukur performa armada dan sopir dalam menempuh perjalanan dari lokasi asal ke tujuan.
5.  **Phase 5: Document Recovery (Delivered → Verified)**
    - Mengukur kecepatan tim operasional dalam menagih dan memverifikasi dokumen fisik (Surat Jalan Asli) dari sopir untuk kebutuhan billing.

Semua data ini divisualisasikan dalam **Executive Cabinet Dashboard** menggunakan skala jam (h) dan hari (d) untuk audit performa real-time.

---

_Dokumen SOP ini bersifat dinamis dan akan diperbarui seiring perkembangan skalabilitas perusahaan SentraLogis._
