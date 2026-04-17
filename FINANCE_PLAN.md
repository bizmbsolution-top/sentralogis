# Rencana Implementasi Modul Finance & Billing - Sentralogis

Tujuan: Melengkapi siklus operasional dari WO selesai hingga penagihan (Invoicing) dan pelunasan (Payment).

## 1. Alur Pengajuan Biaya Tambahan (Cost Management)

Bila terjadi penambahan biaya di lapangan (Overtime, Uang Kawal, Bongkar-Muat, dll):
*   **Input SBU**: Tim SBU melakukan input biaya tambahan pada Job Order (JO) tertentu.
*   **State**: `Pending Cost Approval`.
*   **Verifikasi Admin WO**:
    *   Admin WO melihat pengajuan biaya.
    *   SOP: Admin WO melakukan konfirmasi manual ke pelanggan.
*   **Keputusan Admin WO**:
    *   **APPROVE**: Biaya ditambahkan ke nilai tagihan pelanggan (Revenue). Total WO = `(Qty x Deal Price) + Approved Extra Costs`.
    *   **REJECT**: Biaya tetap menjadi kewajiban perusahaan ke pihak ketiga (AP/Vendor/Supir), namun **TIDAK** ditagihkan ke pelanggan.

## 2. Fitur Validasi Cepat (QR Code Integration)

Untuk mengatasi masalah lambatnya pencarian data fisik saat dokumen kembali ke kantor:
*   **QR Scanner on SJ**: Setiap Surat Jalan (Printout) akan dilengkapi QR Code unik yang merujuk pada `JO_ID`.
*   **Quick Search Admin/Finance**: Di dashboard, akan ditambahkan kolom "Scan/Input JO ID" yang jika discan menggunakan kamera atau scanner, akan langsung **"Jump to Record"** (membuka detail WO/JO tersebut) tanpa perlu scroll/cari manual.

## 3. Profil Penagihan Pelanggan (Billing Method)

Akan ditambahkan flag pada Master Pelanggan untuk menentukan alur penagihan:
1.  **Digital (E-POD)**: Begitu status `Done` dan biaya tambahan diaudit, Finance bisa langsung kirim invoice via email/whatsapp.
2.  **Hardcopy Mandatory**: Finance harus menunggu verifikasi dokumen fisik sebelum tombol "Cetak Invoice" aktif.

## 4. Dashboard Finance (Visibility & Control)

Finance memiliki dashboard khusus untuk memantau WO yang sudah berstatus `Done`:
*   **Document Checklist**: Finance memverifikasi apakah dokumen fisik (Surat Jalan/POD) sudah di-collect dari SBU.
*   **Cost Audit**: Memastikan semua biaya tambahan sudah memiliki kejelasan status (Approve/Reject) sebelum invoice dibuat.

## 5. Siklus Invoicing & Penagihan (Billing Cycle)

Status WO setelah `Done` dalam pandangan Finance:
1.  **Ready to Invoice**: Dokumen lengkap (fisik atau digital) dan biaya tambahan sudah diaudit.
2.  **Invoiced**: Finance menerbitkan invoice.
3.  **Receipt Confirmed**: Pelanggan telah menerima invoice (Tanda Terima).
4.  **Paid**: Pembayaran telah diterima dan WO dinyatakan tutup (Closed/Settled).

## 6. Perubahan Database (Proposed Schema)

*   Tabel `extra_costs`: Menyimpan data biaya tambahan per JO (Type, Amount, Description, Status).
*   Master `customers`: Tambahan kolom `billing_method` (`epod` / `hardcopy`).
*   Tabel `invoices`: Menyimpan data penagihan.
*   Update `work_orders`: Flag status penagihan (`ready_to_invoice`, `invoiced`, `paid`).

---
**Mohon koreksi bagian mana pun yang tidak sesuai dengan SOP internal Anda sebelum kita masuk ke tahap coding.**
