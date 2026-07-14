# Desain Chatbot Tutorial Sentralogis

## Tujuan

Menyediakan asisten bantuan interaktif untuk pengguna tenant baru dan SBU operasional. Chatbot membantu menjawab pertanyaan tutorial secara kontekstual, mempercepat onboarding, dan mengarahkan pengguna ke halaman aplikasi yang tepat.

## Sasaran

- Tenant admin/superadmin yang baru mendapat approval
- Operator SBU Trucking, Warehouse, Clearance, Forwarding
- Driver yang menggunakan portal lapangan
- Tim Finance dan CS yang butuh panduan cepat

## Prinsip Desain

1. **Ringkas dan praktis**
   - Jawaban singkat dulu, baru beri link ke tutorial detail.
2. **Konteks halaman**
   - Chatbot muncul di halaman yang relevan: `/tenant`, `/sbu/trucking`, `/hq/work-orders`, driver portal.
3. **Navigasi langsung**
   - Setiap jawaban termasuk link ke page terkait atau bagian tutorial.
4. **Konten terstruktur**
   - Sumber jawaban adalah `docs/tutorial/*`, FAQ, dan glossary istilah.
5. **Rule-based dulu, LLM nanti**
   - Implementasi awal menggunakan pemetaan kata kunci simple.
   - Nanti bisa dikembangkan menjadi LLM-assisted knowledge base.

## UI Komponen

- Ikon `?` di header halaman dan pada card fitur utama.
- Tombol `Buka Bantuan` di dashboard tenant dan halaman SBU.
- Panel drawer atau modal chat kecil.
- Quick questions / suggestions di bagian atas.
- Input teks untuk pertanyaan bebas.
- Daftar contoh pertanyaan populer.

## Lokasi Implementasi Utama

- `/tenant`
  - onboarding tenant
  - organisasi & role setup
  - konfigurasi SBU
- `/sbu/trucking`
  - FMS, driver, vendor, WO/JO
- `/hq/work-orders`
  - pembuatan WO, SBU assignment, approval
- `driver portal`
  - status JO, evidence upload, navigasi

## Topik Chatbot

1. **Tenant & Role Setup**
   - Bagaimana membuat organisasi tenant?
   - Bagaimana mengaktifkan SBU?
   - Bagaimana menambahkan staff dan role?
2. **HQ Workflow**
   - Di mana membuat Work Order?
   - Bagaimana assign WO ke SBU?
   - Apa perbedaan WO dan JO?
3. **SBU Trucking**
   - Bagaimana membuat JO?
   - Apa itu FMS?
   - Bagaimana mengelola driver dan fleet?
4. **Driver Portal**
   - Bagaimana login driver?
   - Bagaimana status JO diterjemahkan?
   - Bagaimana upload bukti pengiriman?
5. **Warehouse / Clearance / Forwarding**
   - Bagaimana menerima inbound?
   - Bagaimana dokumen clearance diproses?
   - Bagaimana membuat shipment forwarding?
6. **Bantuan umum**
   - Dimana melihat laporan?
   - Bagaimana mencetak dokumen BAST?
   - Apa arti istilah WO, JO, SBU, POD, FMS?

## Contoh User Story

- **Tenant admin baru**: "Saya perlu aktifkan SBU Warehouse dan tambah staff warehouse." Chatbot mengarahkan ke `/tenant/sbu` dan `Tenant Staff Management`.
- **SBU Ops**: "Bagaimana cara buat JO untuk trucking?" Chatbot memberikan ringkasan langkah dan link ke `SBU Trucking`.
- **Driver**: "Apa arti status `PICKING_UP`?" Chatbot menjelaskan status di context driver portal.
- **Finance**: "Di mana verifikasi invoice?" Chatbot mengarahkan ke modul finance dan billing.

## Flow Percakapan

1. Pengguna klik ikon `?`.
2. Drawer/chat muncul.
3. Pengguna lihat topik populer atau ketik pertanyaan.
4. Bot memetakan pertanyaan ke topik.
5. Bot menampilkan jawaban singkat + link ke tutorial/page.
6. Jika tidak ada match, bot menampilkan FAQ dan opsi kontak admin.

## Implementasi Teknis Awal

- **Rule-based Q&A**
  - Buat pasangan kata kunci → topik.
  - Contoh: `"aktifkan sbu"` → `Tenant SBU Setup`.
- **Jawaban statis**
  - Simpan jawaban pendek di JavaScript/JSON.
  - Sertakan URL target untuk setiap jawaban.
- **Page-specific context**
  - Prioritaskan jawaban yang relevan dengan halaman aktif.
  - Tambahkan opsi quick question khusus halaman.
- **Tracking**
  - Simpan pertanyaan populer untuk perbaikan konten.

## Evolusi ke LLM-assisted

1. Ekstrak konten tutorial markdown ke knowledge base.
2. Bangun endpoint internal untuk query Q&A.
3. Gunakan LLM lokal atau API untuk menjawab pertanyaan bebas.
4. Tetap sertakan link ke dokumen / page dan validasi jawaban rule-based jika perlu.

## Prioritas Implementasi

1. Desain UI help button + drawer.
2. Buat rule-based question mapping untuk topik utama.
3. Siapkan jawaban singkat + link ke modul.
4. Tambahkan tracking pertanyaan populer untuk perbaikan.

## Catatan

- Ini bukan chatbot generik; fokus pada tutorial dan navigasi aplikasi.
- Jawaban harus praktis, tidak panjang lebar.
- Selalu sertakan tautan ke langkah berikutnya.
