# Advanced WMS Workflow Architecture

Tuntutan operasional gudang yang Anda jabarkan sangat detail dan merepresentasikan **Warehouse Management System (WMS) kelas enterprise**. Skema dasar saat ini (`wh_tasks` dengan status `PENDING`, `IN_PROGRESS`, `COMPLETED`) tidak akan sanggup menampung alur persetujuan, pergerakan dokumen, pembentukan *Bill of Material* (BOM) untuk kitting, dan konsep kontainer berlapis (Repacking).

Untuk mengakomodasi ini, kita perlu merombak arsitektur dengan menerapkan konsep **State Machine**, **Bill of Materials (BOM)**, dan **License Plate Number (LPN)**.

## User Review Required

> [!WARNING]
> Perubahan ini adalah perubahan arsitektural besar (Major System Overhaul) di modul Gudang. Eksekusi ini akan memodifikasi struktur database secara masif. Mohon tinjau apakah alur (workflow) yang diajukan sudah sesuai dengan standar operasional perusahaan Anda.

## Open Questions

> [!IMPORTANT]
> 1. **Approval CS (Inbound):** Apakah staf Gudang (Checker) yang men-submit approval, lalu CS (Customer Service / Admin HQ) yang meng-klik "Approve" via Dashboard SBU sebelum barang boleh di-Putaway?
> 2. **Repacking Manifest:** Apakah kardus besar hasil repacking ini akan diperlakukan sebagai SKU baru (seperti bundling), atau sekadar "Kontainer Fisik" (LPN/Pallet) yang memuat SKU-SKU kecil di dalamnya tanpa merubah SKU dasarnya? (Saran saya: Gunakan konsep LPN agar inventory tetap terlacak hingga ke level unit terkecil).

---

## Proposed Changes

Kita akan membagi perubahan menjadi beberapa komponen arsitektur baru.

### 1. Inbound & Outbound Shipment Workflows
Memisahkan operasional menjadi tabel *Parent* (Shipment/Receipt) dan *Child* (Tasks/Milestones).

#### [NEW] `wh_inbound_receipts` & `wh_outbound_shipments`
Tabel ini akan melacak siklus hidup penerimaan dan pengiriman secara end-to-end.
- **Inbound States:** `EXPECTED` -> `TRUCK_ARRIVED` -> `UNLOADING` -> `CHECKING` -> `WAITING_CS_APPROVAL` -> `APPROVED` -> `PUTAWAY_IN_PROGRESS` -> `COMPLETED`.
- **Outbound States:** `PLANNED` -> `PICKING` -> `STAGING` -> `TRUCK_ARRIVED` -> `LOADING` -> `DISPATCHED`.

#### [NEW] `wh_milestone_logs`
Tabel untuk mencatat *timestamp*, siapa yang melakukan, dan dokumen apa yang dicetak di setiap titik (Truck Arrive, BA Printed, DN Printed, dll).

---

### 2. Kitting & Bundling (Bill of Materials)
Kitting membutuhkan resep (BOM) agar sistem tahu produk apa saja yang harus ditarik dari *inventory* untuk dirakit menjadi SKU baru.

#### [NEW] `md_bill_of_materials` & `md_bom_items`
- Menghubungkan 1 SKU Parent (Kit) dengan banyak SKU Child (Komponen).
- Mendukung fitur *Disassembly* (Pelepasan), di mana stok SKU Kit dikurangi dan stok komponen dikembalikan ke inventory.

#### [NEW] `wh_vas_orders` (Value-Added Services)
Tabel khusus untuk *work order* di dalam gudang: Kitting, Bundling, dan Quality Control (QC).
- Pekerja gudang menerima VAS Order -> Sistem mem-booking (reserve) stok komponen -> Pekerja merakit -> Stok komponen hilang -> Stok Kit bertambah.

---

### 3. Repacking & Nested Inventory (LPN Concept)
Repacking membutuhkan konsep kontainer / kardus makro yang memiliki *Manifest* (daftar isi). Dalam WMS enterprise, ini disebut **License Plate Number (LPN)**.

#### [MODIFY] `wh_inventory`
- Tambah kolom `lpn_code` (ID Unik Kardus/Pallet).
- Tambah kolom `parent_lpn_code` (Jika kardus kecil dimasukkan ke dalam kardus yang lebih besar).
- **Benefit:** Pekerja gudang cukup memindai (scan) *barcode* kardus besar, dan sistem otomatis tahu isi manifestnya (SKU apa saja, jumlah berapa) dan bisa dipindahkan sekaligus (Transfer/Putaway/Load).

---

## Verification Plan

### Database Level
- Menjalankan migrasi SQL untuk membuat tabel-tabel BOM, Inbound, Outbound, VAS Orders, dan modifikasi Inventory LPN.
- Memasukkan fungsi otomatis (Triggers) untuk mengurangi/menambah stok berdasarkan aktivitas BOM.

### API & Workflow Level
- Mengembangkan API State Machine untuk merubah status *Inbound* (Arrive -> Unload -> QA -> Putaway).
- Memastikan transisi status tidak bisa diloncati (misal: tidak bisa *Putaway* sebelum di-*Approve CS*).

### UI/UX Level
- Membuat Dashboard khusus *Inbound Receiving* & *Outbound Dispatch* di portal Gudang.
- Membuat fitur "Create Kit / Bundle" di mana user bisa mengeksekusi perakitan barang berdasarkan BOM.
