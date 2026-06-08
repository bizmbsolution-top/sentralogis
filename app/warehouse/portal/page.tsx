'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, ScanLine, ShieldAlert, Warehouse, ChevronRight, CheckCircle2, Loader2, Package, Inbox, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { notifyUser } from '@/lib/notificationSound';

export default function WarehousePortalDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingInOut, setCheckingInOut] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const storedSession = localStorage.getItem('sentralogis_wh_session');
    if (!storedSession) return;
    const parsed = JSON.parse(storedSession);
    setSession(parsed);

    const doFetch = () => fetchDashboardData(parsed);
    doFetch();

    const interval = setInterval(doFetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (sess: any) => {
    setLoading(true);
    try {
      // 1. Fetch Today's Attendance
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: attData } = await supabase
        .from('wh_staff_attendance')
        .select('*')
        .eq('staff_id', sess.staff_id)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setAttendance(attData);

      // 2. Fetch Inbound Receipts
      let inbQuery = supabase
        .from('wh_inbound_receipts')
        .select(`
          id, receipt_number, status, expected_arrival, created_at,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name)
        `)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (sess.warehouse_id) inbQuery = inbQuery.eq('warehouse_id', sess.warehouse_id);
      else inbQuery = inbQuery.eq('tenant_id', sess.tenant_id);

      const { data: inboundData } = await inbQuery;

      // 3. Fetch Outbound Shipments
      let outQuery = supabase
        .from('wh_outbound_shipments')
        .select(`
          id, shipment_number, status, created_at, notes, driver_id, wo_item_id
        `)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (sess.warehouse_id) outQuery = outQuery.eq('warehouse_id', sess.warehouse_id);
      else outQuery = outQuery.eq('tenant_id', sess.tenant_id);

      const { data: outboundDataRaw } = await outQuery;
      let outboundData = outboundDataRaw || [];
      const woItemIds = [...new Set(outboundData.map((d: any) => d.wo_item_id).filter(Boolean))];
      if (woItemIds.length > 0) {
         const { data: joData } = await supabase.from('job_orders').select('jo_number, wo_item_id').in('wo_item_id', woItemIds);
         if (joData) {
            outboundData = outboundData.map((d: any) => {
               const jo = joData.find((j: any) => j.wo_item_id === d.wo_item_id);
               return {
                  ...d,
                  wo_item: jo ? { job_orders: [jo] } : null
               };
            });
         }
      }

      // Filter outbound based on role
      const filteredOutbound = (outboundData || []).filter((d: any) => {
        if (!sess.role || sess.role === 'ADMIN' || sess.role === 'SUPERADMIN') return true;
        if (sess.role === 'PUTAWAY') {
          return ['PLANNED', 'PENDING', 'ASSIGNED', 'PICKING', 'READY_FOR_CHECKING'].includes(d.status);
        }
        if (sess.role === 'TALLY') {
          return ['READY_FOR_CHECKING', 'CHECKING', 'READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS'].includes(d.status);
        }
        if (sess.role === 'SECURITY') {
          // Security can see all non-completed to record truck arrival anytime
          return true; 
        }
        return true;
      });

      // Merge and sort
      const mergedList = [
        ...(inboundData || []).map((d: any) => ({ ...d, list_type: 'INBOUND' })),
        ...filteredOutbound.map((d: any) => ({ ...d, list_type: 'OUTBOUND' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (prevCountRef.current > 0 && mergedList.length > prevCountRef.current) {
        notifyUser();
      }
      prevCountRef.current = mergedList.length;
      setReceipts(mergedList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!session) return;
    setCheckingInOut(true);
    try {
      if (type === 'CHECK_IN') {
        const { error } = await supabase.from('wh_staff_attendance').insert({
          tenant_id: session.tenant_id,
          staff_id: session.staff_id,
          status: 'CHECK_IN'
        });
        if (error) throw error;
        toast.success('Berhasil Check-In Hari Ini!');
      } else {
        const { error } = await supabase
          .from('wh_staff_attendance')
          .update({
            check_out_time: new Date().toISOString(),
            status: 'CHECK_OUT'
          })
          .eq('id', attendance.id);
        if (error) throw error;
        toast.success('Berhasil Check-Out!');
      }
      fetchDashboardData(session);
    } catch (err: any) {
      toast.error('Gagal memproses absensi');
    } finally {
      setCheckingInOut(false);
    }
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
  }

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'SECURITY': return <ShieldAlert size={28} className="text-rose-500" />;
      case 'TALLY': return <ScanLine size={28} className="text-blue-500" />;
      case 'PUTAWAY': return <Warehouse size={28} className="text-emerald-500" />;
      default: return <Package size={28} className="text-slate-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'SECURITY': return 'bg-rose-50 border-rose-100 text-rose-700';
      case 'TALLY': return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'PUTAWAY': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      default: return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-4 space-y-6">
      
      {/* Attendance Widget */}
      <Card className="p-5 border-none shadow-xl shadow-slate-200/50 relative overflow-hidden bg-white">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full mix-blend-multiply" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock size={20} className="text-slate-400" /> Kehadiran Hari Ini
              </h2>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {attendance?.status === 'CHECK_IN' && (
              <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                <CheckCircle2 size={16} /> ON DUTY
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            {!attendance ? (
              <button 
                onClick={() => handleAttendance('CHECK_IN')}
                disabled={checkingInOut}
                className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-base font-black flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
              >
                {checkingInOut ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                Check In Pagi
              </button>
            ) : attendance.status === 'CHECK_IN' ? (
              <button 
                onClick={() => handleAttendance('CHECK_OUT')}
                disabled={checkingInOut}
                className="flex-1 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-xl text-base font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                {checkingInOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                Selesai Shift (Check Out)
              </button>
            ) : (
              <div className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-xl text-base font-black flex items-center justify-center gap-3 border border-slate-200">
                Shift Selesai
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Task Inbox */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 px-1">
          <Inbox size={20} className="text-slate-400" />
          Daftar Tugas Aktif ({receipts.length})
        </h3>
        
        {receipts.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-base font-black text-slate-400 uppercase tracking-wide">Belum ada tugas aktif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map(receipt => {
              if (receipt.list_type === 'OUTBOUND') {
                return (
                  <div 
                    key={receipt.id}
                    onClick={() => router.push(`/warehouse/portal/outbound/${receipt.id}`)}
                    className={`p-5 bg-white rounded-2xl border flex flex-col justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer border-l-4 border-amber-400`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0 mt-1">
                          <Package size={28} className="text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded">
                              OUTBOUND
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 text-base leading-tight">{receipt.wo_item?.job_orders?.[0]?.jo_number || receipt.shipment_number}</h4>
                          <p className="text-xs font-bold opacity-75 mt-0.5">{receipt.status.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 mt-2" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Catatan / JO</span>
                        <span className="block text-xs font-bold text-slate-700 truncate">{receipt.notes || receipt.wo_item?.job_orders?.[0]?.jo_number || '-'}</span>
                      </div>
                      
                      {/* Tampilkan info supir jika ada (Bisa dicheck oleh Tally) */}
                      {receipt.driver_id && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                           <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Truk / Armada Penjemput</span>
                           <span className="block text-xs font-black text-emerald-600 truncate flex items-center gap-1">
                             <CheckCircle2 size={12} /> Truk Sudah Standby
                           </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const MILESTONES = [
                { key: 'EXPECTED', label: 'Expected' },
                { key: 'TRUCK_ARRIVED', label: 'Arrived' },
                { key: 'UNLOADING', label: 'Unloading' },
                { key: 'CHECKING', label: 'Checking' },
                { key: 'CHECKING_DONE', label: 'Tally Done' },
                { key: 'PUTAWAY_IN_PROGRESS', label: 'Putaway' }
              ];
              const currentIdx = MILESTONES.findIndex(m => m.key === receipt.status);
              const safeIdx = Math.max(0, currentIdx);
              
              return (
                <div 
                  key={receipt.id}
                  onClick={() => router.push(`/warehouse/portal/task/${receipt.id}`)}
                  className={`p-5 bg-white rounded-2xl border flex flex-col justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer border-l-4 ${getRoleColor(session?.role)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0 mt-1">
                        {getRoleIcon(session?.role)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded">
                            INBOUND
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-base leading-tight">{receipt.receipt_number}</h4>
                        <p className="text-xs font-bold opacity-75 mt-0.5">{receipt.status.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 mt-2" />
                  </div>

                  {/* Info Logistik */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Transporter</span>
                      <span className="block text-xs font-bold text-slate-700 truncate">{receipt.transporter?.name || 'TBA'}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Driver & Plat</span>
                      <span className="block text-xs font-bold text-slate-700 truncate">
                        {receipt.driver?.name || 'TBA'} {receipt.fleet?.plate_number ? `(${receipt.fleet.plate_number})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Milestones Progress */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{currentIdx >= 0 ? currentIdx + 1 : 0} / {MILESTONES.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {MILESTONES.map((step, idx) => (
                        <div 
                          key={step.key} 
                          className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= currentIdx ? 'bg-blue-500' : 'bg-slate-100'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest text-center">
                      Tahap Saat Ini: <span className="text-slate-800">{currentIdx >= 0 ? MILESTONES[safeIdx].label : receipt.status}</span>
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
