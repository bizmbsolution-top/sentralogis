"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import { 
  MapPin, Clock, CheckCircle2, History, Warehouse, 
  RefreshCw, LogOut, Loader2, Navigation, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import dayjs from "dayjs";

type AttendanceRecord = {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: 'CHECK_IN' | 'CHECK_OUT';
  warehouse_id: string;
  warehouses?: { name: string } | null;
};

export default function WarehouseAttendancePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number; error: string | null; loading: boolean }>({
    lat: 0,
    lng: 0,
    error: null,
    loading: false
  });

  const fetchData = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      setLoading(true);
      
      // 1. Ambil Gudang Penugasan dari wo_organization_users
      const { data: orgUser } = await supabase
        .from('wo_organization_users')
        .select('assigned_warehouse_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      const assignedId = orgUser?.assigned_warehouse_id;

      // 2. Ambil list gudang
      let whQuery = supabase.from('md_warehouses').select('id, name').eq('tenant_id', profile.tenant_id).eq('is_active', true);
      if (assignedId) whQuery = whQuery.eq('id', assignedId);
      
      const { data: whData } = await whQuery;
      setWarehouses(whData || []);
      
      if (assignedId) setSelectedWarehouseId(assignedId);
      else if (whData && whData.length === 1) setSelectedWarehouseId(whData[0].id);

      // 3. Cek Absensi Hari Ini yang masih CHECK_IN (belum CHECK_OUT)
      const { data: activeAtt } = await supabase
        .from('warehouse_staff_attendance')
        .select('*, warehouses:md_warehouses(name)')
        .eq('user_id', profile.id)
        .eq('status', 'CHECK_IN')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentAttendance(activeAtt as unknown as AttendanceRecord);

      // 4. Riwayat 10 terakhir
      const { data: histData } = await supabase
        .from('warehouse_staff_attendance')
        .select('*, warehouses:md_warehouses(name)')
        .eq('user_id', profile.id)
        .order('check_in_time', { ascending: false })
        .limit(10);
        
      setHistory((histData as unknown as AttendanceRecord[]) || []);

    } catch (err: any) {
      toast.error('Gagal mengambil data absensi.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      setLocation(prev => ({ ...prev, loading: true, error: null }));
      if (!navigator.geolocation) {
        const err = 'Geolocation tidak didukung browser ini.';
        setLocation(prev => ({ ...prev, loading: false, error: err }));
        reject(new Error(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng, error: null, loading: false });
          resolve({ lat, lng });
        },
        (error) => {
          const err = 'Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.';
          setLocation(prev => ({ ...prev, loading: false, error: err }));
          reject(new Error(err));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleAction = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!profile?.tenant_id || !profile?.id) return;
    if (action === 'CHECK_IN' && !selectedWarehouseId) {
      toast.error('Pilih lokasi gudang terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Sedang mengambil koordinat GPS...');

    try {
      // 1. Get GPS Location
      const coords = await getLocation();
      toast.loading('Menyimpan data absensi...', { id: loadingToast });

      // 2. Simpan ke database
      if (action === 'CHECK_IN') {
        const { error } = await supabase.from('warehouse_staff_attendance').insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          warehouse_id: selectedWarehouseId,
          latitude: coords.lat,
          longitude: coords.lng,
          status: 'CHECK_IN'
        });
        if (error) throw error;
        toast.success('Berhasil Clock In!', { id: loadingToast });
      } else if (action === 'CHECK_OUT' && currentAttendance) {
        const { error } = await supabase.from('warehouse_staff_attendance')
          .update({
            check_out_time: new Date().toISOString(),
            status: 'CHECK_OUT'
          })
          .eq('id', currentAttendance.id);
        if (error) throw error;
        toast.success('Berhasil Clock Out. Terima kasih!', { id: loadingToast });
      }

      // Refresh data
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || `Gagal melakukan ${action}.`, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading data...</p>
      </div>
    );
  }

  const isCheckedIn = !!currentAttendance;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">WMS Staff Attendance</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Sistem Absensi Gudang Berbasis GPS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* ACTION CARD */}
        <Card className="p-8 border-slate-200 shadow-xl shadow-slate-200/50 !rounded-[2.5rem] bg-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
           
           <div className="space-y-8">
              {/* Status Info */}
              <div className="text-center space-y-2">
                 <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isCheckedIn ? 'bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-600/20' : 'bg-slate-100 text-slate-400'}`}>
                    {isCheckedIn ? <CheckCircle2 size={40} /> : <Warehouse size={40} />}
                 </div>
                 <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {isCheckedIn ? 'Status: Bekerja' : 'Status: Off-Duty'}
                 </h2>
                 {isCheckedIn && currentAttendance && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                       Check In: {dayjs(currentAttendance.check_in_time).format('DD MMM YYYY, HH:mm')}
                       <br/>
                       Lokasi: {currentAttendance.warehouses?.name || '-'}
                    </p>
                 )}
              </div>

              {/* Warehouse Selection (Only if not checked in) */}
              {!isCheckedIn && (
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Warehouse size={12} /> Pilih Lokasi Gudang
                    </label>
                    <select
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    >
                       <option value="">-- Pilih Lokasi --</option>
                       {warehouses.map(w => (
                         <option key={w.id} value={w.id}>{w.name}</option>
                       ))}
                    </select>
                 </div>
              )}

              {/* GPS Info */}
              {location.error && (
                 <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">{location.error}</p>
                 </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handleAction(isCheckedIn ? 'CHECK_OUT' : 'CHECK_IN')}
                disabled={submitting || (!isCheckedIn && !selectedWarehouseId)}
                className={`w-full h-20 rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 text-white ${isCheckedIn ? 'bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/30' : 'bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                 {submitting ? (
                    <>
                       <Loader2 className="w-6 h-6 animate-spin" />
                       Memproses GPS...
                    </>
                 ) : isCheckedIn ? (
                    <>
                       <LogOut className="w-6 h-6" />
                       Clock Out Sekarang
                    </>
                 ) : (
                    <>
                       <Clock className="w-6 h-6" />
                       Clock In Sekarang
                    </>
                 )}
              </button>
              
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                Pastikan Anda berada di lokasi gudang. GPS akan diverifikasi secara otomatis oleh sistem saat tombol ditekan.
              </p>
           </div>
        </Card>

        {/* HISTORY */}
        <Card className="p-8 border-slate-200 shadow-none !rounded-[2.5rem] bg-white">
           <div className="flex items-center gap-3 mb-8">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Riwayat Absensi (10 Terakhir)</h3>
           </div>

           <div className="space-y-4">
              {history.length === 0 ? (
                 <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada riwayat absensi.</p>
                 </div>
              ) : (
                 history.map(record => (
                   <div key={record.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                         <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">{record.warehouses?.name || 'Unknown Warehouse'}</p>
                         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-2">
                            <span className="text-emerald-600">IN: {dayjs(record.check_in_time).format('DD MMM HH:mm')}</span>
                         </div>
                         {record.check_out_time && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-0.5">
                               <span className="text-rose-600">OUT: {dayjs(record.check_out_time).format('DD MMM HH:mm')}</span>
                            </div>
                         )}
                      </div>
                      <div className="text-right">
                         <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${record.status === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {record.status}
                         </span>
                      </div>
                   </div>
                 ))
              )}
           </div>
        </Card>

      </div>
    </div>
  );
}
