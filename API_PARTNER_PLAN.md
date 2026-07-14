# Rencana Kerja & Implementasi: Sentralogis B2B Partner API Gateway

**Dokumen Versi**: 1.0.0  
**Status**: Proposed / Planned  
**Target Pengguna**: E-Commerce Platform, ERP Klien, Software WMS Pihak Ketiga, Distributor 3PL  

---

## 1. Latar Belakang & Tujuan
Saat ini Sentralogis telah beroperasi sebagai sistem manajemen logistik terpusat (*Core Next.js & Supabase*) yang melayani operasional **SBU Trucking** dan **SBU Warehouse**. Untuk memperluas pangsa pasar dan mendukung automasi bisnis klien (seperti E-Commerce), Sentralogis membutuhkan **B2B Partner API Gateway** yang aman, berstandar OpenAPI/Swagger, serta terhubung langsung dengan mesin perhitungan saldo token (*SBU Token Burning System*).

### Tujuan Utama:
1. **Automasi Tanpa Sentuhan (*Touchless Order Push*)**: E-commerce dapat mengirim pesanan pengiriman truk atau titip gudang langsung dari sistem mereka tanpa input manual di dashboard Sentralogis.
2. **Transparansi Stok & Pelacakan (*Real-Time Visibility*)**: Mitra dapat menarik sisa stok gudang aktual dan posisi GPS armada secara langsung (*Live Query*).
3. **Monetisasi & Kontrol Token**: Memastikan setiap pemesanan via API eksternal tetap memotong saldo token tenant sesuai aturan tarif yang berlaku (Trucking: 2 TKN, Warehouse: 1 TKN, dst).

---

## 2. Arsitektur Keamanan & Autentikasi (*Security Architecture*)

Agar endpoint internal tidak diekspos secara sembarangan, kita akan membangun layar pembatas (*API Middleware Layer*):

```
[ Mitra E-Commerce ] ---> HTTPS Request + Header X-API-Key
                                |
                   [ Next.js API Middleware ]
                                |
               +----------------+----------------+
               | (Validasi SHA-256 Key & Rate Limit)
               v
     [ Tabel partner_api_keys ]
               |
               +---> Jika Valid ---> Hit Endpoint (/api/v1/partner/*)
                                            |
                                            +---> Cek & Deduct Token Balance
                                            +---> Insert ke Database Supabase
                                            +---> Kirim Webhook Status (BAST/Done)
```

### Mekanisme Proteksi:
* **Autentikasi**: Menggunakan HTTP Header `X-API-Key: sl_live_xxxxxxxxxxxx` atau `Authorization: Bearer <API_KEY>`.
* **Key Hashing**: API Key disimpan di database Supabase dalam bentuk *hash SHA-256* (kunci asli hanya ditampilkan sekali kepada Admin Klien saat pertama kali dibuat).
* **Rate Limiting**: Pembatasan hit (misal: maksimum 60 request / menit per API Key) untuk mencegah pencurian data atau pembengkakan beban server (*DoS Protection*).
* **IP Whitelisting** *(Opsional)*: Membatasi asal IP server klien yang diperbolehkan mengakses API.

---

## 3. Spesifikasi Database Tambahan (Supabase Migrations)

Kita akan membuat migration baru (contoh: `150_partner_api_gateway.sql`) untuk mendukung ekosistem ini:

```sql
-- 1. Tabel Manajemen API Key Mitra
CREATE TABLE public.partner_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.md_entities(id) ON DELETE SET NULL, -- Spesifik untuk klien tertentu
    key_name VARCHAR(100) NOT NULL, -- Contoh: "Shopee Integration Prod"
    api_key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 Hash
    api_key_prefix VARCHAR(12) NOT NULL, -- awalan "sl_live_xxxx" untuk display
    permissions TEXT[] DEFAULT '{"trucking:write", "trucking:read", "warehouse:write", "warehouse:read"}',
    rate_limit_per_minute INT DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tabel Catatan Aktivitas API (Audit Trail)
CREATE TABLE public.partner_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    ip_address VARCHAR(45),
    request_payload JSONB,
    response_payload JSONB,
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Tahapan & Peta Jalan Implementasi (*Implementation Phases*)

### FASE 1: Fondasi Keamanan & Generator Kunci (Minggu 1)
* [ ] Pembuatan berkas migrasi SQL `partner_api_keys` & `partner_api_logs` beserta kebijakan *Row Level Security* (RLS).
* [ ] Pembuatan fungsi *helper* kriptografi di `lib/api/auth.ts` (generate key, verifikasi SHA-256 hash).
* [ ] Pembuatan UI **"API Key Management"** di dalam menu *Tenant Settings* (Tombol `+ Create API Key`, Tabel Daftar Kunci, Tombol `Revoke`).

### FASE 2: SBU Trucking & Delivery Endpoints (Minggu 2)
* [ ] **`POST /api/v1/partner/trucking/orders`**  
  Membuat *Work Order* & *Job Order* Trucking baru secara otomatis. Integrasi langsung dengan `check_token_balance()` dan mendaftarkan trigger deduksi token.
* [ ] **`GET /api/v1/partner/trucking/orders/:jo_number`**  
  Menarik status pengiriman aktual (`pending`, `in_progress`, `completed`), nama driver, pelat nomor armada, dan koordinat GPS terakhir.
* [ ] **`POST /api/v1/partner/webhooks/register`**  
  Mitra mendaftarkan URL Webhook mereka agar Sentralogis menembakkan event `ORDER_DISPATCHED`, `GOODS_LOADED`, dan `ORDER_COMPLETED` (BAST terbit).

### FASE 3: SBU Warehouse / Fulfillment Endpoints (Minggu 3)
* [ ] **`GET /api/v1/partner/warehouse/inventory`**  
  *Query Params*: `?sku=SKU-001&warehouse_id=...`  
  Mitra mengecek jumlah stok tersedia (`AVAILABLE`), stok karantina, dan batch kadaluwarsa sebelum membuka pre-order.
* [ ] **`POST /api/v1/partner/warehouse/inbound` (ASN)**  
  Mengirim dokumen *Advanced Shipping Notice* rencana barang masuk dari supplier e-commerce.
* [ ] **`POST /api/v1/partner/warehouse/outbound`**  
  Mengirim perintah *Pick & Pack Fulfillment* otomatis ketika ada barang terjual di e-commerce.

### FASE 4: Swagger UI & Developer Portal (Minggu 4)
* [ ] Memasang pustaka `next-swagger-doc` dan `swagger-ui-react`.
* [ ] Menyediakan rute publik **`/api-docs`** berpenampilan gelap premium agar developer e-commerce dapat menguji coba coba API secara interaktif langsung dari peramban.

---

## 5. Contoh Rancangan Payload JSON (*Draft Specification*)

### A. Membuat Order Pengiriman Truk
**Request:** `POST /api/v1/partner/trucking/orders`  
**Headers:**
```http
Content-Type: application/json
X-API-Key: sl_live_8f92b4c1a7d6e3f0...
```
**Body:**
```json
{
  "external_order_id": "SHOPEE-INV-20260625-9921",
  "service_type": "TRUCKING_FTL",
  "fleet_type": "CDD_LONG",
  "schedule_date": "2026-06-26T08:00:00Z",
  "origin": {
    "name": "Gudang Utama Shopee Jakarta",
    "address": "Jl. Marunda Makmur No. 1, Cilincing, Jakarta Utara",
    "pic_name": "Budi Gudang",
    "pic_phone": "081234567890",
    "latitude": -6.10231,
    "longitude": 106.94211
  },
  "destination": {
    "name": "DC Bandung Fulfillment",
    "address": "Jl. Soekarno Hatta No. 500, Bandung",
    "pic_name": "Santi Penerima",
    "pic_phone": "081987654321",
    "latitude": -6.93812,
    "longitude": 107.65819
  },
  "manifest": [
    {
      "sku_code": "ELEC-TV-42",
      "product_name": "Smart TV LED 42 Inch",
      "quantity": 25,
      "unit": "UNIT",
      "weight_kg": 300
    }
  ],
  "agreed_price": 2850000
}
```

**Response Sukses (201 Created):**
```json
{
  "success": true,
  "data": {
    "sentralogis_wo_number": "HALU-SHP-0626-01",
    "sentralogis_jo_number": "HALU-SHP-0626-01-01",
    "external_order_id": "SHOPEE-INV-20260625-9921",
    "status": "pending",
    "tracking_url": "https://sentralogis.com/track/cargo/tok_a8f9c1e2b...",
    "token_deducted": 2,
    "token_balance_remaining": 387,
    "created_at": "2026-06-25T19:40:00Z"
  }
}
```

---

### B. Mengecek Stok Gudang 3PL
**Request:** `GET /api/v1/partner/warehouse/inventory?sku_code=ELEC-TV-42`  
**Headers:** `X-API-Key: sl_live_8f92b4c1a7d6e3f0...`  

**Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "sku_code": "ELEC-TV-42",
    "product_name": "Smart TV LED 42 Inch",
    "warehouse_name": "Sentralogis Hub Marunda",
    "stock_summary": {
      "available_qty": 142,
      "quarantine_qty": 5,
      "damaged_qty": 1,
      "reserved_qty": 10,
      "total_qty": 158,
      "unit": "UNIT"
    },
    "updated_at": "2026-06-25T19:40:12Z"
  }
}
```

---

## 6. Persiapan Langkah Eksekusi (*Next Immediate Actions*)

Jika rencana implementasi ini disetujui, kita dapat langsung memulai **Fase 1** dengan menginstruksikan sistem:
1. Menjalankan skrip SQL penciptaan tabel `partner_api_keys` di Supabase.
2. Membangun komponen antarmuka manajemen API Key di halaman pengaturan Owner & Tenant.
