"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import { 
  MapPin, Clock, CheckCircle2, History, Warehouse, 
  RefreshCw, LogOut, Loader2, Navigation, AlertCircle,
  Users, XCircle, Search
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import dayjs from "dayjs";

type StaffAttendance = {
  id: string;
  name: string;
  role: string;
  staff_type: 'ground' | 'admin';
  today_attendance: {
    id: string;
    check_in_time: string;
    check_out_time: string | null;
    status: 'CHECK_IN' | 'CHECK_OUT';
  } | null;
};

export default function WarehouseAttendancePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [warehouseName, setWarehouseName] = useState("");
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [location, setLocation] = useState<{ lat: number; lng: number; error: string | null; loading: boolean }>({
    lat: 0, lng: 0, error: null, loading: false
  });

  const fetchData = useCallback(async () => {
    if (!profile?.id || !profile?.tenant_id) return;
    try {
      setLoading(true);

      let whId = profile.warehouse_id || null;
      if (!whId) {
        const { data: orgUser } = await supabase
          .from('wo_organization_users')
          .select('assigned_warehouse_id')
          .eq('user_id', profile.id)
          .maybeSingle();
        whId = orgUser?.assigned_warehouse_id || null;
      }

      if (whId) {
        const { data: wh } = await supabase.from('md_warehouses').select('name').eq('id', whId).single();
        if (wh) setWarehouseName(wh.name);
      }
      setWarehouseId(whId || "");

      // Cek absensi hari ini untuk user sendiri
      const { data: activeAtt } = await supabase
        .from('warehouse_staff_attendance')
        .select('*, warehouses:md_warehouses(name)')
        .eq('user_id', profile.id)
        .eq('status', 'CHECK_IN')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurrentAttendance(activeAtt);

      if (!whId) { setLoading(false); return; }

      // Ambil semua staff ground
      const { data: groundStaff } = await supabase
        .from('md_warehouse_staff')
        .select('id, name, role')
        .eq('warehouse_id', whId)
        .eq('tenant_id', profile.tenant_id);

      // Ambil semua admin staff (tenant_users) untuk warehouse ini
      const { data: adminStaff } = await supabase
        .from('tenant_users')
        .select('id, user_id, full_name, role_code')
        .eq('warehouse_id', whId)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      const today = dayjs().format('YYYY-MM-DD');

      // Ambil attendance hari ini untuk warehouse ini
      const { data: todayAtt } = await supabase
        .from('warehouse_staff_attendance')
        .select('id, user_id, check_in_time, check_out_time, status')
        .eq('warehouse_id', whId)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);

      const attMap: Record<string, any> = {};
      if (todayAtt) {
        for (const a of todayAtt) {
          if (!attMap[a.user_id] || a.check_in_time > attMap[a.user_id].check_in_time) {
            attMap[a.user_id] = a;
          }
        }
      }

      const combined: StaffAttendance[] = [];

      // Ground staff — gunakan name sebagai user_id (karena md_warehouse_staff pake name, bukan auth id)
      if (groundStaff) {
        for (const s of groundStaff) {
          const att = attMap[s.id] || null;
          combined.push({
            id: s.id,
            name: s.name,
            role: s.role || 'STAFF',
            staff_type: 'ground',
            today_attendance: att ? {
              id: att.id,
              check_in_time: att.check_in_time,
              check_out_time: att.check_out_time,
              status: att.status,
            } : null,
          });
        }
      }

      // Admin staff
      if (adminStaff) {
        for (const s of adminStaff) {
          const att = attMap[s.user_id] || null;
          combined.push({
            id: s.user_id,
            name: s.full_name || 'Unknown',
            role: s.role_code || 'ADMIN',
            staff_type: 'admin',
            today_attendance: att ? {
              id: att.id,
              check_in_time: att.check_in_time,
              check_out_time: att.check_out_time,
              status: att.status,
            } : null,
          });
        }
      }

      setStaffList(combined);
    } catch (err: any) {
      toast.error('Gagal mengambil data absensi.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.tenant_id, profile?.warehouse_id]);

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
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, error: null, loading: false });
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          const err = 'Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.';
          setLocation(prev => ({ ...prev, loading: false, error: err }));
          reject(new Error(err));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleAction = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!profile?.tenant_id || !profile?.id || !warehouseId) return;

    setSubmitting(true);
    const loadingToast = toast.loading('Sedang mengambil koordinat GPS...');

    try {
      const coords = await getLocation();
      toast.loading('Menyimpan data absensi...', { id: loadingToast });

      if (action === 'CHECK_IN') {
        const { error } = await supabase.from('warehouse_staff_attendance').insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          warehouse_id: warehouseId,
          latitude: coords.lat,
          longitude: coords.lng,
          status: 'CHECK_IN'
        });
        if (error) throw error;
        toast.success('Berhasil Clock In!', { id: loadingToast });
      } else if (action === 'CHECK_OUT' && currentAttendance) {
        const { error } = await supabase.from('warehouse_staff_attendance')
          .update({ check_out_time: new Date().toISOString(), status: 'CHECK_OUT' })
          .eq('id', currentAttendance.id);
        if (error) throw error;
        toast.success('Berhasil Clock Out. Terima kasih!', { id: loadingToast });
      }

      fetchData();
    } catch (err: any) {
      toast.error(err.message || `Gagal melakukan ${action}.`, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const checkedIn = staffList.filter(s => s.today_attendance?.status === 'CHECK_IN').length;
  const checkedOut = staffList.filter(s => s.today_attendance?.status === 'CHECK_OUT').length;
  const absent = staffList.filter(s => !s.today_attendance).length;

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Attendance</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
            {warehouseName || 'Pilih Gudang'} — {dayjs().format('DD MMM YYYY')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

        {/* LEFT: Clock In/Out Card */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="p-6 border-slate-200 shadow-xl shadow-slate-200/50 !rounded-[2.5rem] bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${isCheckedIn ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {isCheckedIn ? <CheckCircle2 size={32} /> : <Warehouse size={32} />}
                </div>
                <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                  {isCheckedIn ? 'Bekerja' : 'Off-Duty'}
                </h2>
                {isCheckedIn && currentAttendance && (
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {dayjs(currentAttendance.check_in_time).format('HH:mm')}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleAction(isCheckedIn ? 'CHECK_OUT' : 'CHECK_IN')}
                disabled={submitting || !warehouseId}
                className={`w-full h-14 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 text-white ${isCheckedIn ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'}`}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isCheckedIn ? (
                  <><LogOut className="w-5 h-5" /> Clock Out</>
                ) : (
                  <><Clock className="w-5 h-5" /> Clock In</>
                )}
              </button>

              {location.error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <p className="text-[8px] font-bold uppercase">{location.error}</p>
                </div>
              )}
            </div>
          </Card>

          {warehouseId && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 border-slate-200 rounded-2xl text-center bg-white">
                <p className="text-2xl font-black text-slate-900">{checkedIn}</p>
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Check In</p>
              </Card>
              <Card className="p-4 border-slate-200 rounded-2xl text-center bg-white">
                <p className="text-2xl font-black text-slate-900">{checkedOut}</p>
                <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mt-1">Check Out</p>
              </Card>
              <Card className="p-4 border-slate-200 rounded-2xl text-center bg-white">
                <p className="text-2xl font-black text-slate-900">{absent}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Absent</p>
              </Card>
            </div>
          )}
        </div>

        {/* RIGHT: Staff List */}
        <div className="xl:col-span-3">
          <Card className="border-slate-200 shadow-sm !rounded-[2rem] bg-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={16} /> Staff ({staffList.length})
              </h3>
              <div className="relative w-full sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Cari staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Tipe</th>
                    <th className="px-5 py-3">Check In</th>
                    <th className="px-5 py-3">Check Out</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Users size={24} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-xs font-bold text-slate-400">Tidak ada staff ditemukan</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(s => (
                      <tr key={`${s.staff_type}-${s.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {s.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">{s.role}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${s.staff_type === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {s.staff_type === 'admin' ? 'Admin' : 'Ground'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {s.today_attendance ? (
                            <span className="text-xs font-bold text-emerald-600">
                              {dayjs(s.today_attendance.check_in_time).format('HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {s.today_attendance?.check_out_time ? (
                            <span className="text-xs font-bold text-rose-600">
                              {dayjs(s.today_attendance.check_out_time).format('HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {!s.today_attendance ? (
                            <span className="text-[9px] font-black uppercase text-slate-300">Absent</span>
                          ) : s.today_attendance.status === 'CHECK_IN' ? (
                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                          ) : (
                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-slate-200 text-slate-600">Done</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
