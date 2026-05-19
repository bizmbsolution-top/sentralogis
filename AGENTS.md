# AGENTS.md — Agent Guidelines for Antigravity (No Hallucination, Maximum Consistency)

## 1. Objective
Antigravity bertindak sebagai pair programmer yang **reliable, factual, dan kontekstual**. Tujuan utama:
- Menghasilkan kode yang **run without hallucination**
- Mengikuti **existing codebase patterns** secara ketat
- Tidak pernah mengarang fungsi, API, library, atau konfigurasi yang tidak ada
- Memprioritaskan **verifikasi sebelum eksekusi**
- **Khusus untuk proyek ini**: Semua akses Supabase dan Google Maps API wajib menggunakan kredensial dari `.env.local`, tidak boleh hardcode

## 2. Core Behavior Rules
| Rule | Description |
|------|-------------|
| **Read First** | Sebelum menghasilkan kode, baca file yang relevan (impor, dependensi, utility functions, konfigurasi) |
| **No Fake Imports** | Jangan mengimpor library/module yang tidak terdaftar di package manager file (package.json, requirements.txt, go.mod, Cargo.toml, dll) |
| **No Invented APIs** | Jangan memanggil method/properti/endpoint yang tidak ditemukan di kode atau dokumentasi resmi |
| **Follow Existing Style** | Ikuti pola penamaan, struktur folder, dan gaya kode yang sudah ada (ESLint, Black, gofmt, dll) |
| **Ask When Uncertain** | Jika tidak yakin → tanya, jangan tebak. Tulis `TODO: confirm this` jika terpaksa |
| **One Change at a Time** | Jangan mengubah banyak hal sekaligus tanpa justifikasi |
| **Respect .env.local** | Semua kredensial WAJIB dibaca dari `.env.local`, jangan hardcode, jangan buat nilai palsu |

## 3. Context & Constraints

### 3.1 Proyek Ini Menggunakan
| Komponen | Lokasi Kredensial | Catatan |
|----------|-------------------|---------|
| **Supabase** | `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Jangan panggil Supabase tanpa kedua variabel ini |
| **Google Maps API** | `.env.local` → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Untuk Maps, Places, Geocoding, dll |
| Environment lainnya | `.env.local` | Baca semua variabel dari sini, jangan asumsi |

### 3.2 Wajib Cek Sebelum Generate
- Apakah Supabase client sudah diinisialisasi? Cek file `lib/supabaseClient.js` atau `utils/supabase.js`
- Apakah Google Maps sudah diload? Cek script loader atau `@react-google-maps/api`
- Apakah variabel environment sudah dibaca dengan `process.env.NEXT_PUBLIC_...`?
- Apakah fungsi/class yang mau dipanggil **benar-benar ada**?
- Apakah library sudah diinstal? (cek package.json)

### 3.3 Asumsi yang Tidak Boleh Dibuat
- ❌ "Diasumsikan Supabase sudah connect" — tanpa bukti kode inisialisasi
- ❌ "Pasti ada tabel `profiles` di Supabase" — tanpa cek schema atau migration
- ❌ "Google Maps API key pasti valid" — jangan asumsi, beri error handling
- ❌ "Biasanya `geocode` methodnya seperti ini" — tanpa verifikasi dokumentasi
- ❌ "Tambahkan saja import `@supabase/supabase-js`" — cek dulu apakah sudah ada

## 4. Chain of Thought (Wajib Diucapkan atau Ditulis)
Setiap tugas harus diproses dengan langkah berikut (boleh ditulis sebagai komentar):
[Analisis] Apa yang diminta user?

[Cek .env.local] Apakah kredensial Supabase/Google Maps tersedia?

[Cek Codebase] File mana saja yang relevan? Apakah Supabase client sudah ada?

[Cek Dependensi] Library apa yang dibutuhkan? Apakah sudah ada di package.json?

[Cek Pola] Bagaimana kode serupa ditulis di proyek ini?

[Rencana] Langkah-langkah konkret (tanpa tebakan)

[Eksekusi] Hasilkan kode

[Verifikasi] Apakah saya menggunakan sesuatu yang belum terbukti ada?

text

## 5. Decision Protocol
| Kondisi | Tindakan |
|---------|----------|
| Supabase client belum ada | Usulkan buat file `lib/supabaseClient.js` sesuai dokumentasi resmi |
| Google Maps API key tidak ditemukan di `.env.local` | Minta user untuk menambahkan `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Fungsi/class tidak ditemukan | Jangan panggil. Tanya user |
| Library tidak ada di dependensi | Usulkan tambah: `npm install ...` |
| Ingin akses tabel Supabase yang belum diketahui schemanya | Minta user konfirmasi nama tabel dan kolom |
| Gaya koding tidak konsisten | Ikuti gaya yang dominan di codebase |
| Instruksi ambigu | Minta klarifikasi, jangan eksekusi asumsi |

## 6. Supabase-Specific Rules
```javascript
// ✅ BENAR - Baca dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ❌ SALAH - Hardcode
const supabaseUrl = 'https://xyz.supabase.co';

// ❌ SALAH - Asumsi tabel/kolom
const { data } = await supabase.from('users').select('phone'); // tanpa bukti kolom phone ada

// ✅ BENAR - Cek dulu atau minta konfirmasi
// TODO: confirm bahwa tabel 'users' memiliki kolom 'phone'
7. Google Maps API-Specific Rules
javascript
// ✅ BENAR - Baca API key dari .env.local
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!googleMapsApiKey) {
  throw new Error('Missing Google Maps API key in .env.local');
}

// ✅ BENAR - Load Maps dengan key yang benar
// Gunakan @react-google-maps/api atau react-google-maps-loader

// ❌ SALAH - Hardcode key
const apiKey = 'AIzaSyDummyKey12345';

// ❌ SALAH - Panggil endpoint Google Maps tanpa key
fetch('https://maps.googleapis.com/maps/api/geocode/json?address=Jakarta')

// ✅ BENAR - Selalu sertakan key
fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${googleMapsApiKey}`)
7.1 Google Maps Services yang Sering Dipakai (hanya jika sudah terinstal)
Service	Library/Way	Cek keberadaan
Geocoding	REST API atau @react-google-maps/api	Cek package.json
Places Autocomplete	usePlacesAutocomplete	Cek hook di codebase
Map Component	@react-google-maps/api atau @vis.gl/react-google-maps	Cek impor yang ada
🛑 Jangan asumsikan library Google Maps tertentu sudah terinstall. Cek package.json dulu.

8. Environment Variables (.env.local) Rules
bash
# .env.local - Contoh file yang wajib ada
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
Aturan ketat:

Setiap akses Supabase → WAJIB baca dari process.env.NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY

Setiap akses Google Maps → WAJIB baca process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

Jangan pernah hardcode nilai apapun dari .env.local

Jika variabel tidak ada → throw error jelas: Missing X in .env.local

Jangan generate file .env.local secara otomatis (bisa overwrite punya user)

9. Halusination Prevention (Penting!)
Tipe Halusinasi	Cara Mencegah
Fiksi Supabase method	Cek dokumentasi resmi atau kode existing
Fiksi tabel/kolom Supabase	Minta user atau cek migration file (supabase/migrations/)
Fiksi Google Maps API endpoint	Cek dokumentasi resmi Google Maps
Fiksi API key	Jangan generate, harus dari .env.local
Fiksi library version	Cek package-lock.json / yarn.lock
Fiksi fungsi/API umum	grep -r "functionName" .
🛑 Jika setelah dicek tetap tidak ditemukan → anggap tidak ada. Jangan generate.

10. Error Handling & Fallback
Jika kode yang dihasilkan menyebabkan error:

Baca pesan error secara utuh

Cek apakah error karena:

Supabase key salah/expired → minta user cek .env.local

Google Maps API key invalid → minta user cek .env.local

Tabel/kolom tidak ditemukan → minta user konfirmasi schema

Asumsi yang salah → akui dan perbaiki

Jangan langsung copas solusi dari LLM tanpa verifikasi

Jika tidak bisa perbaiki sendiri → akui keterbatasan

11. Observability (Agar Bisa Di-audit)
Antigravity harus meninggalkan jejak yang bisa dibaca manusia:

Setiap generate kode → sertakan komentar // [AI] why this change

Jika menebak → tulis // [AI] unsure, please verify: ...

Jika membaca dari .env.local → tulis // [AI] reading from .env.local

Jika skip sesuatu → tulis // [AI] skipped because ...

12. Memory & State (Per Session)
Ingat file apa saja yang sudah dibaca

Ingat apakah Supabase client sudah diinisialisasi di file mana

Ingat apakah Google Maps sudah di-load

Ingat keputusan yang sudah disepakati

Jangan mengulangi pertanyaan yang sudah dijawab

Setiap sesi baru: baca ulang AGENTS.md dan cek .env.local

13. Contoh Interaksi yang Benar
User: "Buat fungsi untuk ambil data user dari Supabase"

❌ Salah (halusinasi):

javascript
import { supabase } from '@supabase/supabase-js'; // path salah
const { data } = await supabase.from('users').select('*'); // asumsi tabel users ada
✅ Benar:

text
[Analisis] Fetch user dari Supabase.
[Cek .env.local] Variabel Supabase tersedia.
[Cek Codebase] Ditemukan lib/supabaseClient.js dengan inisialisasi yang benar.
[Cek Schema] Saya tidak tahu tabel apa yang dipakai. Tanya user.
javascript
// [AI] menggunakan supabase client yang sudah ada di lib/supabaseClient.js
import { supabase } from '../lib/supabaseClient';

// [AI] asumsi tabel 'users' - perlu dikonfirmasi user
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')  // TODO: confirm table name
    .select('*');
  
  if (error) throw error;
  return data;
}
User: "Tampilkan peta Google Maps di halaman home"

❌ Salah (halusinasi):

javascript
// Asumsi langsung pakai @react-google-maps/api tanpa cek
import { GoogleMap, LoadScript } from '@react-google-maps/api';
✅ Benar:

[Analisis] Tampilkan Google Maps.
[Cek .env.local] API key tersedia.
[Cek Codebase] Mencari apakah sudah ada library maps... Tidak menemukan @react-google-maps/api di package.json.
[Saran] Saya usulkan install dulu: npm install @react-google-maps/api
14. Version & Compliance
AGENTS.md version: 2.1 (Supabase + Google Maps specific)

Berlaku untuk: Antigravity, Cursor, Copilot, Claude Dev, dan agen coding lain

Enforcement: Agen wajib membaca file ini di awal setiap sesi

Pelanggaran: Jika ketahuan halusinasi (terutama hardcode .env.local atau asumsi API), user bisa mereset konteks dan melaporkan

End of AGENTS.md



