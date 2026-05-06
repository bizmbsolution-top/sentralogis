# Rencana Implementasi Modul Finance & Billing - Sentralogis (Sistem Bagi Hasil & Integrasi ERP)

Tujuan: Membangun modul keuangan yang solid, minim *data entry*, dan selaras dengan standar akuntansi Indonesia (PSAK) serta siap untuk diintegrasikan dengan aplikasi ERP eksternal (seperti Mekari Jurnal / jurnal.id).

Modul ini dirancang spesifik untuk mendukung model **Bagi Hasil (Revenue Sharing / Borongan)** yang lazim digunakan di perusahaan logistik/trucking Indonesia.

---

## FASE 1: Fondasi Database & Skema Keuangan
Fokus pada penyesuaian struktur database untuk mengakomodasi pencatatan otomatis.
*   **Tabel `finance_coa` (Chart of Account):** Master data akun yang akan disamakan dengan standar `jurnal.id` (Aset, Kewajiban, Ekuitas, Pendapatan, HPP, Beban).
*   **Update Tabel `job_orders` & `work_orders`:** Penambahan kolom untuk nominal deal pelanggan (*Base Price*) dan persentase komisi/bagi hasil driver (*Driver Share %*).
*   **Revamp Tabel `extra_costs` (Additional Charges):** Menambahkan kolom `charge_type` yang terdiri dari:
    *   `surcharge`: Penambahan tagihan yang dikenakan komisi/bagi hasil (Misal: *Overnight*, *Waiting Time*).
    *   `reimbursement`: Tagihan *pass-through* (At-Cost) tanpa margin perusahaan (Misal: Kuli, Tiket khusus).
*   **Tabel `finance_journals` & `finance_journal_entries`:** Untuk mencatat *double-entry bookkeeping* (Debit/Kredit) secara internal sebelum disinkronisasikan keluar.

## FASE 2: SBU UI/UX - Additional Charges & Payout
Fokus pada antarmuka untuk cabang/SBU yang bertugas di lapangan.
*   **Master Data Tarif:** Penambahan pengaturan persentase *Bagi Hasil* standar (Misal: 60% Perusahaan, 40% Driver) di master data SBU / Supir.
*   **Revamp Menu "Add Cost" -> "Trip Charges":**
    *   SBU bisa menambahkan *Surcharge* atau *Reimbursement*.
    *   Sistem secara langsung mensimulasikan perhitungan *P&L* sementara (Estimasi potong komisi).
*   **Driver Payout Screen:** Layar khusus untuk melihat total bagi hasil + reimbursement yang berhak dicairkan kepada supir saat ia kembali.

## FASE 3: Finance HQ Control & Verifikasi (Digitalisasi Dokumen)
Fokus pada kontrol terpusat di kantor pusat (HQ) untuk melakukan audit sebelum menjadi tagihan.
*   **Validasi Cepat via Scanner (QR Code):** Setiap Surat Jalan akan memiliki QR Code. Staf Finance cukup *scan* dokumen fisik untuk langsung membuka rincian Job Order di layar.
*   **Cost & Payout Audit:** Finance HQ memverifikasi bahwa *Surcharge* dan *Reimbursement* yang diajukan SBU sah secara fisik dan siap diterbitkan ke pelanggan.
*   **Hardcopy vs E-POD Policy:** Sistem akan mengecek *flag* pelanggan apakah mereka menerima *E-Invoice* (langsung tagih) atau mewajibkan *Hardcopy* (harus nunggu SJ asli balik).

## FASE 4: Mesin Akuntansi Otomatis (Auto-Journaling)
Pembuatan fungsi *backend* yang mengubah status operasional menjadi angka finansial.
*   Saat JO berstatus `Completed`, sistem men-generate **Jurnal Pendapatan** (Debit: Piutang, Kredit: Jasa Trucking).
*   Sistem men-generate **Jurnal HPP Bagi Hasil** (Debit: Beban Bagi Hasil, Kredit: Hutang Driver).
*   Sistem men-generate **Jurnal Reimbursement** (Hanya mempengaruhi Piutang dan Hutang tanpa menyentuh Laba/Rugi).

## FASE 5: Invoicing & Integrasi ERP Eksternal (Jurnal.id)
Fokus pada penerbitan tagihan final dan sinkronisasi dengan aplikasi pajak/akuntansi standar.
*   **Invoice Generator:** Membuat format tagihan (PDF) yang rapi, menggabungkan *Base Price*, *Surcharges*, dan *Reimbursement* dalam satu dokumen.
*   **API Mapper & Webhook:** Pembuatan fungsi untuk melakukan HTTP *POST* ke API `jurnal.id`.
    *   *Create Sales Invoice* (Faktur Penjualan) untuk pelanggan.
    *   *Create Purchase Bill / Expense* (Tagihan/Beban) untuk mencatat hutang bagi hasil driver.
*   **Payment Status Sync:** Fungsi tarik data (Pull/Webhook) jika invoice di-mark *Paid* di Jurnal.id, status WO di Sentralogis otomatis tertutup (Settled).
