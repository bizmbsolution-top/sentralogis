# 🛰️ Sentralogis Offline-First PWA Architecture & Implementation Blueprint

Sistem pengembangan **Offline-First PWA** dirancang khusus untuk memenuhi kebutuhan lapangan logistik yang berat (gudang baja bertulang tertutup, pelabuhan, dan jalur pertambangan minim sinyal).

---

## 📁 File Inti yang Telah Dibangun

### 1. **Core Engine (`lib/offline/offlineSyncEngine.ts`)**
Modul *engine* utama berbasis `IndexedDB` (`idb-keyval`) yang menangani 4 pilar sinkronisasi lokal:
* `cacheStaffPinAuth()` & `verifyStaffPinLocal()`: Menyimpan hash kredensial PIN 6-Angka staf untuk autentikasi instan (0,1 detik) tanpa butuh koneksi server.
* `cacheActiveMissions()` & `getCachedActiveMissions()`: Menyiapkan cache data Job Order (JO) dan Work Order (WO) aktif saat tablet/Ponsel berada di zona bersinyal (*Morning Prefetch*).
* `enqueueMutation()`: Menampung seluruh aktivitas scan barang, update status JO, atau catatan *milestone* ke dalam antrean lokal (`offline_mutation_outbox`) ketika sinyal terputus.
* `syncOutboxQueueToCloud()`: Eksekutor latar belakang yang otomatis memproses antrean lokal ke server Supabase secara berurutan (*FIFO*) begitu koneksi internet pulih.

### 2. **React Hook (`lib/hooks/useOfflineStatus.ts`)**
Hook reaktif untuk dipasang pada UI *header/navbar* di seluruh Portal Operasional (`Portal Gudang` dan `Portal Supir Truk`).
* Mengembalikan status realtime: `isOnline`, `pendingCount`, `isSyncing`, dan fungsi `syncNow()`.
* Otomatis mendeteksi event browser `window.addEventListener('online')` untuk memicu *Background Sync* secara otomatis.

---

## 🛠️ Contoh Penggunaan di Komponen Portal (Cara Pasang)

Cukup tambahkan hook `useOfflineStatus()` pada komponen halaman Portal Gudang atau Portal Supir:

```tsx
'use client';

import React from 'react';
import { useOfflineStatus } from '@/lib/hooks/useOfflineStatus';
import { enqueueMutation } from '@/lib/offline/offlineSyncEngine';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function WarehousePortalHeader() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineStatus();

  const handleScanItem = async (itemId: string, actualQty: number) => {
    // 1. Simpan langsung ke Outbox Queue lokal (TIDAK AKAN ERROR MESKI OFFLINE)
    await enqueueMutation('SCAN_ITEM', { item_id: itemId, actual_qty: actualQty }, 'HALU-001');
    
    // 2. Beri respons UI Optimistic ke petugas
    alert('Barang berhasil dipindai!');
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
      <h1 className="text-lg font-bold text-white">⚡ Portal Gudang Scanner</h1>

      {/* Indikator Sinyal & Antrean Offline */}
      <div className="flex items-center gap-3">
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
            <Wifi size={14} /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
            <WifiOff size={14} /> Offline Mode ({pendingCount} Antrean)
          </span>
        )}

        {pendingCount > 0 && (
          <button 
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-1 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1 rounded-full transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Menyinkronkan...' : `Sync Sekarang (${pendingCount})`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 Standar Resolusi Konflik Data (SOP Engineering)
1. **Timestamp-Based Ledger**: Semua mutasi yang masuk ke antrean lokal dibekali `created_at` lokal. Server memproses mutasi secara inkremental (bertambah/berkurang berdasarkan selisih waktu) bukan menimpa total absolut.
2. **Retry Mechanism**: Jika saat proses `syncOutboxQueueToCloud()` terjadi kegagalan jaringan sementara (*Timeout*), item mutasi tidak akan dihapus dari antrean melainkan diubah statusnya menjadi `FAILED` dengan `retry_count + 1`. Sistem akan mencoba ulang pada siklus `setInterval` berikutnya (setiap 30 detik) atau saat event `online` dipicu kembali.
