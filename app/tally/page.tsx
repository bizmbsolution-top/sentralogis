'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  downloadReceiptsToDevice, 
  getLocalReceipts, 
  syncTalliesToCloud,
  OfflineReceipt 
} from '@/lib/tallyStore';
import { CloudDownload, CloudUpload, RefreshCw, AlertTriangle, PackageCheck, Truck, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function TallyDashboard() {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [receipts, setReceipts] = useState<OfflineReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load from local
    loadLocalData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadLocalData = async () => {
    try {
      const localData = await getLocalReceipts();
      setReceipts(localData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!profile?.tenant_id || !profile?.warehouse_id) return;
    if (!isOnline) {
      toast.error('Anda sedang offline. Tidak bisa mendownload data baru.');
      return;
    }

    setSyncing(true);
    try {
      await downloadReceiptsToDevice(profile.tenant_id, profile.warehouse_id);
      await loadLocalData();
      toast.success('Data tugas berhasil didownload!');
    } catch (e: any) {
      toast.error('Gagal mendownload data');
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Anda sedang offline. Tidak bisa sync data.');
      return;
    }

    setSyncing(true);
    try {
      const syncedCount = await syncTalliesToCloud();
      if (syncedCount > 0) {
        toast.success(`${syncedCount} dokumen berhasil disinkronisasi ke cloud!`);
      } else {
        toast.success('Semua data sudah tersinkronisasi.');
      }
      await loadLocalData();
    } catch (e: any) {
      toast.error('Gagal sinkronisasi');
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && receipts.some(r => !r._synced)) {
      handleSync();
    }
  }, [isOnline]);

  const pendingSyncs = receipts.filter(r => !r._synced).length;

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Inbound Dashboard</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {profile?.email}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            onClick={handleDownload}
            disabled={syncing || !isOnline}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <CloudDownload size={20} className="mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider">Download JO</span>
          </button>
          <button 
            onClick={handleSync}
            disabled={syncing || !isOnline || pendingSyncs === 0}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 active:scale-95 transition-all disabled:opacity-50 relative"
          >
            {pendingSyncs > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">
                {pendingSyncs}
              </span>
            )}
            <RefreshCw size={20} className={`mb-1 ${syncing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider">Sync Cloud</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1 flex items-center justify-between">
          <span>Daftar Kedatangan ({receipts.length})</span>
        </h2>

        {receipts.length === 0 ? (
          <div className="bg-slate-100 border border-slate-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <PackageCheck className="text-slate-400 mb-2" size={32} />
            <p className="text-sm font-bold text-slate-700">Belum ada data tugas</p>
            <p className="text-xs text-slate-500 mt-1">Tekan tombol Download JO saat sedang online untuk mengambil data hari ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((rec) => (
              <Link key={rec.id} href={`/tally/inbound/${rec.id}`}>
                <Card className={`p-4 border-l-4 shadow-sm hover:shadow-md transition-all ${!rec._synced ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-blue-500'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-mono font-bold text-slate-900 text-base">{rec.receipt_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {rec.status.replace(/_/g, ' ')}
                        </span>
                        {!rec._synced && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                            <AlertTriangle size={10} /> Pending Sync
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Truck size={14} /> {rec.transporter || 'TBA'}</span>
                    <span className="flex items-center gap-1"><PackageCheck size={14} /> {rec.items.length} SKUs</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
