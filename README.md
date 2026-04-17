# 🚛 Sentralogis

**Sentralogis** adalah platform logistik modern yang dirancang untuk memberikan solusi trucking yang cepat, transparan, dan terpercaya. Platform ini mengintegrasikan manajemen armada, pelacakan real-time, dan administrasi digital dalam satu ekosistem yang kohesif.

## 🚀 Fitur Utama

### 📊 Tactical Control Center (SBU Trucking)
Dashboard operasional tingkat tinggi untuk mengelola alur kerja Job Order secara real-time.
- **Pipeline Status**: Kelola Work Order melalui status (Draft, Need Approval, Approved, On Journey, Done, Rejected).
- **Fleet Tracking**: Integrasi Google Maps untuk melihat posisi armada secara langsung.
- **Live Job Stream**: Aliran data aktivitas terbaru untuk respons cepat.

### 📱 Driver Mobile Interface
Antarmuka khusus pengemudi dengan desain *Glassmorphism* yang dioptimalkan untuk perangkat seluler.
- **One-Tap Navigation**: Integrasi langsung dengan Google Maps untuk navigasi lokasi penjemputan dan pengiriman.
- **Quick Communication**: Pintasan WhatsApp untuk koordinasi cepat dengan tim operasional.
- **Token-Based Access**: Akses Job Order yang aman dan mudah tanpa kerumitan login manual yang berulang.

### 📦 Enterprise Inbound Terminal (myCFS)
Terminal POS untuk manajemen kargo masuk (inbound) dengan standar industri tinggi.
- **Master Data Management**: Manajemen Shipper, Consignee, dan lokasi secara terpusat.
- **Cargo Evidence**: Penangkapan bukti fisik berupa foto dan perhitungan volumetrik kargo secara otomatis.

### 🛠 Management & Master Data
- **Fleet Management**: Pengaturan tipe truk (CDD, Fuso, Wingbox, dll.) secara dinamis.
- **Location Master**: Database titik koordinat lokasi yang akurat menggunakan Google Places.

## 🛠 Tech Stack

- **Core**: [Next.js 16](https://nextjs.org/) (App Router) & React 19
- **Database & Auth**: [Supabase](https://supabase.com/) (Realtime Database, Edge Functions, Storage)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Maps**: [Google Maps Platform](https://developers.google.com/maps) (JS API & Places)
- **Messaging**: [Twilio API](https://www.twilio.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Memulai

### Prasyarat
- Node.js 20.x atau lebih baru
- Akun Supabase Project
- Google Maps API Key

### Instalasi

1. **Clone repository**:
   ```bash
   git clone https://github.com/username/sentralogis.git
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Buat berkas `.env.local` dan lengkapi variabel berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Jalankan aplikasi**:
   ```bash
   npm run dev
   ```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat hasilnya.

---

&copy; 2026 Sentralogis. Seluruh hak cipta dilindungi undang - undang.
