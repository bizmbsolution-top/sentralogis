'use client';

import React, { useState, useEffect } from 'react';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Truck, Package, PackageCheck, AlertTriangle, ArrowLeft, ShieldCheck, Box, Clock, LayoutGrid } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function WarehouseTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
  const [submittingDecisionId, setSubmittingDecisionId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const joIdParam = searchParams.get('jo_id');

  const submitDecision = async (damageRecordId: string, decision: 'ACCEPT_QUARANTINE' | 'REJECT_RETURN') => {
    if (!confirm(`Anda yakin ingin memilih ${decision.replace('_', ' ')}? Keputusan ini bersifat final.`)) return;
    
    try {
      setSubmittingDecisionId(damageRecordId);
      const res = await fetch(`/api/track/warehouse/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ damageRecordId, decision })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      // Update local state without fetching again
      setData((prev: any) => {
        const newJOs = prev.jobOrders.map((jo: any) => {
          if (!jo.receipt?.wh_inbound_damage_records) return jo;
          return {
            ...jo,
            receipt: {
              ...jo.receipt,
              wh_inbound_damage_records: jo.receipt.wh_inbound_damage_records.map((dmg: any) => 
                dmg.id === damageRecordId ? { ...dmg, decision } : dmg
              )
            }
          };
        });
        return { ...prev, jobOrders: newJOs };
      });
    } catch (err: any) {
      alert(`Gagal menyimpan keputusan: ${err.message}`);
    } finally {
      setSubmittingDecisionId(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/track/warehouse/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil data pelacakan');
        }

        const woData = result.data;
        if (!woData) throw new Error('Data tidak ditemukan');

        setData(woData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching warehouse tracking data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Memuat Live Tracking...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <ShieldCheck className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tracking Tidak Ditemukan</h1>
        <p className="text-sm text-slate-500 mb-6">{error || 'Tautan pelacakan tidak valid atau telah kedaluwarsa.'}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">Muat Ulang</button>
      </div>
    </div>
  );

  const { wo, jobOrders: allJobOrders } = data;
  const isOutbound = wo?.wo_number?.includes('OUT') || allJobOrders.some((j: any) => j.is_outbound);
  
  const jobOrders = joIdParam ? allJobOrders.filter((j: any) => j.id === joIdParam) : allJobOrders;
  
  const getTrackingRecord = (j: any) => isOutbound ? j.shipment : j.receipt;
  
  // Sort: active first, then pending, then completed
  const sortedJOs = [...jobOrders].sort((a, b) => {
    const isActive = (j: any) => {
      const status = getTrackingRecord(j)?.status;
      return status && !['COMPLETED', 'EXPECTED', 'DISPATCHED', 'PLANNED', 'PENDING', 'ASSIGNED'].includes(status);
    };
    const isCompleted = (j: any) => ['COMPLETED', 'DISPATCHED'].includes(getTrackingRecord(j)?.status);
    
    if (isActive(a) && !isActive(b)) return -1;
    if (!isActive(a) && isActive(b)) return 1;
    if (isCompleted(a) && !isCompleted(b)) return 1;
    if (!isCompleted(a) && isCompleted(b)) return -1;
    return 0;
  });

  const selectedJo = jobOrders.find((j: any) => j.id === selectedJoId);
  const activeCount = jobOrders.filter((j: any) => {
    const status = getTrackingRecord(j)?.status;
    return status && !['COMPLETED', 'EXPECTED', 'DISPATCHED', 'PLANNED', 'PENDING', 'ASSIGNED'].includes(status);
  }).length;
  const completedCount = jobOrders.filter((j: any) => ['COMPLETED', 'DISPATCHED'].includes(getTrackingRecord(j)?.status)).length;

  const getStatusDisplay = (status: string | undefined, isOutbound: boolean) => {
    if (!status) return { label: 'Menunggu Alokasi', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: Clock };
    
    if (isOutbound) {
      switch (status) {
        case 'PLANNED': case 'PENDING': case 'ASSIGNED': return { label: 'Menunggu Jadwal', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: Clock };
        case 'PICKING': case 'STAGING': return { label: 'Proses Pengambilan (Picking)', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500 animate-pulse', icon: LayoutGrid };
        case 'READY_FOR_CHECKING': case 'CHECKING': return { label: 'Pengecekan Fisik', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500 animate-pulse', icon: ShieldCheck };
        case 'READY_FOR_LOADING': return { label: 'Truk Tiba (Siap Muat)', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse', icon: MapPin };
        case 'LOADING': return { label: 'Proses Muat (Loading)', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse', icon: Box };
        case 'READY_FOR_DOCUMENTS': return { label: 'Tunggu Dokumen Jalan', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500 animate-pulse', icon: ShieldCheck };
        case 'COMPLETED': case 'DISPATCHED': return { label: 'Selesai (Outbound Done)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: PackageCheck };
        default: return { label: status.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: Box };
      }
    }

    switch (status) {
      case 'EXPECTED': return { label: 'Menunggu Kedatangan', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: Truck };
      case 'TRUCK_ARRIVED': return { label: 'Truk Tiba', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse', icon: MapPin };
      case 'UNLOADING': return { label: 'Bongkar Muat', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse', icon: Box };
      case 'CHECKING': 
      case 'CHECKING_DONE': return { label: 'Pengecekan Fisik', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500 animate-pulse', icon: ShieldCheck };
      case 'PUTAWAY_IN_PROGRESS': return { label: 'Proses Putaway', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500 animate-pulse', icon: LayoutGrid };
      case 'COMPLETED': return { label: 'Selesai (Inbound Done)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: PackageCheck };
      default: return { label: status.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: Box };
    }
  };

  const getTimelineMilestones = (record: any, isOutbound: boolean) => {
    if (!record) return [];
    
    if (isOutbound) {
      return [
        { id: 'planned', label: 'Menunggu Jadwal', isDone: true, time: record.created_at, icon: Clock },
        { id: 'picking', label: 'Proses Pengambilan (Picking)', isDone: ['PICKING', 'STAGING', 'READY_FOR_CHECKING', 'CHECKING', 'READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: LayoutGrid },
        { id: 'checking', label: 'Pengecekan Fisik', isDone: ['CHECKING', 'READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: ShieldCheck },
        { id: 'truck', label: 'Truk Tiba di Gudang', isDone: ['READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: Truck },
        { id: 'loading', label: 'Proses Muat (Loading)', isDone: ['LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: Box },
        { id: 'completed', label: 'Outbound Selesai', isDone: ['COMPLETED', 'DISPATCHED'].includes(record.status), time: record.updated_at, icon: PackageCheck },
      ];
    }
    
    return [
      { id: 'expected', label: 'Menunggu Kedatangan Truk', isDone: true, time: record.created_at, icon: Clock },
      { id: 'arrived', label: 'Truk Tiba di Gudang', isDone: ['TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: Truck },
      { id: 'unloading', label: 'Proses Bongkar Muat (Unloading)', isDone: ['UNLOADING', 'CHECKING', 'CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(record.status), time: record.unloading_start_time || record.updated_at, icon: Box },
      { id: 'checking', label: 'Pengecekan Kualitas & Kuantitas', isDone: ['CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: ShieldCheck },
      { id: 'putaway', label: 'Penempatan Barang di Rak (Putaway)', isDone: ['PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(record.status), time: record.updated_at, icon: LayoutGrid },
      { id: 'completed', label: 'Inbound Selesai', isDone: record.status === 'COMPLETED', time: record.updated_at, icon: PackageCheck },
    ];
  };

  const isWoCompleted = wo?.status === 'completed' || (jobOrders.length > 0 && jobOrders.every((j: any) => ['COMPLETED', 'DISPATCHED'].includes(getTrackingRecord(j)?.status)));

  let totalExpected = 0, totalGood = 0, totalQuarantine = 0, totalRejected = 0;
  if (isWoCompleted) {
    jobOrders.forEach((j: any) => {
      const rec = getTrackingRecord(j);
      if (rec?.metrics) {
        totalExpected += rec.metrics.expectedQty || 0;
        totalGood += rec.metrics.goodQty || 0;
        totalQuarantine += rec.metrics.quarantineQty || 0;
        totalRejected += rec.metrics.rejectedQty || 0;
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {selectedJo && (
            <button 
              onClick={() => setSelectedJoId(null)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors mb-3 bg-amber-50 px-3 py-1.5 rounded-lg w-fit"
            >
              <ArrowLeft size={14} /> Kembali ke Daftar Truk
            </button>
          )}
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Live Warehouse Tracking</p>
                <p className="text-xl font-black text-slate-900 italic tracking-tight uppercase">{wo.wo_number}</p>
                <p className="text-sm font-semibold text-slate-500">{wo.customer?.name || 'Pelanggan Publik'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full shrink-0">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Live</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress {isOutbound ? 'Outbound' : 'Inbound'}</p>
              <p className="text-xs font-black text-amber-600">{completedCount} dari {jobOrders.length} Truk Selesai</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${jobOrders.length > 0 ? (completedCount / jobOrders.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /> {activeCount} Sedang Proses</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> {completedCount} Selesai</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-28 max-w-3xl mx-auto">
        {isWoCompleted ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50">
                 <PackageCheck size={40} />
               </div>
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{isOutbound ? 'Outbound Selesai' : 'Inbound Selesai'}</h2>
               <p className="text-slate-500 font-medium mb-8">Semua {jobOrders.length} kendaraan telah selesai melakukan proses {isOutbound ? 'pemuatan barang (loading)' : 'bongkar muat dan masuk ke rak penyimpanan'}.</p>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Diharapkan</p>
                     <p className="text-2xl font-black text-slate-900">{totalExpected}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                     <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Barang Bagus</p>
                     <p className="text-2xl font-black text-emerald-700">{totalGood}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                     <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Dikarantina</p>
                     <p className="text-2xl font-black text-amber-700">{totalQuarantine}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                     <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Ditolak (Reject)</p>
                     <p className="text-2xl font-black text-rose-700">{totalRejected}</p>
                  </div>
               </div>
            </div>
          </div>
        ) : !selectedJo ? (
          <>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Truck size={16} className="text-slate-400" /> Daftar Kendaraan ({jobOrders.length})
            </h2>
            <div className="space-y-3">
              {sortedJOs.map((jo: any) => {
                const rec = getTrackingRecord(jo);
                const statusInfo = getStatusDisplay(rec?.status, isOutbound);
                const isActive = rec && !['COMPLETED', 'EXPECTED', 'DISPATCHED', 'PLANNED', 'PENDING', 'ASSIGNED'].includes(rec?.status);
                const pendingDamagesCount = (!isOutbound && rec?.wh_inbound_damage_records?.filter((r: any) => r.decision === 'PENDING').length) || 0;

                return (
                  <button
                    key={jo.id}
                    onClick={() => setSelectedJoId(jo.id)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${statusInfo.color.replace('text-', 'border-').replace('50', '200')} ${isActive ? 'shadow-sm ring-2 ring-amber-500/20 ring-offset-2' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white border border-slate-100 shadow-sm relative`}>
                          <statusInfo.icon className={`w-5 h-5 ${statusInfo.color.split(' ')[1]}`} />
                          {pendingDamagesCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{jo.fleet_plate || jo.jo_number}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
                            {jo.transporter_name || 'Internal'} • Driver: {jo.driver_name || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {pendingDamagesCount > 0 && (
                      <div className="mb-3 p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
                        <AlertTriangle size={14} className="text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">{pendingDamagesCount} Keputusan Barang Rusak Menunggu!</span>
                      </div>
                    )}

                    <div className={`px-3 py-2 rounded-lg flex items-center justify-between ${statusInfo.color.split(' ')[0]}`}>
                       <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${statusInfo.color.split(' ')[1]}`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                         {statusInfo.label}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail &rarr;</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            {/* Truck Detail Header */}
            <div className={`bg-white p-5 rounded-2xl border shadow-sm ${getStatusDisplay(getTrackingRecord(selectedJo)?.status, isOutbound).color.replace('text-', 'border-').replace('50', '200')}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                  <Truck className="w-7 h-7 text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-slate-900">{selectedJo.fleet_plate || selectedJo.jo_number}</h2>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{selectedJo.transporter_name || 'Armada Internal'} • {selectedJo.driver_name || 'No Driver'}</p>
                </div>
              </div>

              {getTrackingRecord(selectedJo)?.metrics && (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                   <div className="bg-slate-50 rounded-xl p-2 text-center">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Qty</p>
                     <p className="text-sm font-black text-slate-900">{getTrackingRecord(selectedJo).metrics.expectedQty}</p>
                   </div>
                   <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
                     <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{isOutbound ? 'Picked/Loaded' : 'Good/Baik'}</p>
                     <p className="text-sm font-black text-emerald-700">{getTrackingRecord(selectedJo).metrics.goodQty}</p>
                   </div>
                   {!isOutbound && (
                     <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
                       <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Karantina</p>
                       <p className="text-sm font-black text-amber-700">{getTrackingRecord(selectedJo).metrics.quarantineQty}</p>
                     </div>
                   )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                 <Clock size={150} />
               </div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Clock size={16} className="text-amber-500" /> Timeline Proses {isOutbound ? 'Outbound' : 'Inbound'}
               </h3>
               
               <div className="relative pl-12 space-y-8">
                 {/* Timeline Line */}
                 <div className="absolute left-[23px] top-4 bottom-0 w-0.5 bg-slate-100" />
                 
                 {getTimelineMilestones(getTrackingRecord(selectedJo), isOutbound).map((step: any, idx: number, arr: any[]) => {
                   const isLast = idx === arr.length - 1;
                   const isActive = step.isDone && (!arr[idx+1]?.isDone);

                   return (
                     <div key={step.id} className="relative flex items-start">
                       <div className="absolute left-[-40px] top-1 z-10 flex items-center justify-center">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm transition-all ${step.isDone ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                           <step.icon size={14} />
                         </div>
                       </div>
                       <div className="flex-1 min-w-0 pt-1.5 pb-2">
                         <div className="flex flex-col mb-1">
                           <span className={`text-sm font-black tracking-tight ${isActive ? 'text-amber-600' : step.isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                             {step.label}
                           </span>
                           {step.isDone && step.time && (
                             <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                               {new Date(step.time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                             </span>
                           )}
                         </div>

                         {/* Inject Damage Photos for Checking Step */}
                         {!isOutbound && step.id === 'checking' && step.isDone && getTrackingRecord(selectedJo)?.wh_inbound_damage_records?.length > 0 && (
                           <div className="mt-4 flex flex-col gap-4">
                             {getTrackingRecord(selectedJo).wh_inbound_damage_records.map((dmg: any) => (
                               <div key={dmg.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                 <p className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                                   <AlertTriangle size={14} className="text-amber-500" /> Barang Rusak ({dmg.qty} Qty)
                                 </p>
                                 <div className="flex flex-wrap gap-3 mb-4">
                                   {dmg.source_photo_url && (
                                     <div className="group relative w-20 h-20 rounded-xl overflow-hidden border-2 border-rose-100 shadow-sm">
                                        <img src={dmg.source_photo_url} alt="Barang Rusak" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                           <a href={dmg.source_photo_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-white px-2 py-1 bg-rose-500 rounded-lg">LIHAT</a>
                                        </div>
                                     </div>
                                   )}
                                   {dmg.condition_photo_url && (
                                     <div className="group relative w-20 h-20 rounded-xl overflow-hidden border-2 border-rose-100 shadow-sm">
                                        <img src={dmg.condition_photo_url} alt="Kondisi Rusak" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                           <a href={dmg.condition_photo_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-white px-2 py-1 bg-rose-500 rounded-lg">LIHAT</a>
                                        </div>
                                     </div>
                                   )}
                                 </div>
                                 
                                 {dmg.decision === 'PENDING' ? (
                                   <div className="flex items-center gap-2">
                                     <button 
                                       disabled={submittingDecisionId === dmg.id}
                                       onClick={() => submitDecision(dmg.id, 'REJECT_RETURN')}
                                       className="flex-1 py-2 bg-white border-2 border-rose-200 hover:border-rose-500 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                                     >
                                       {submittingDecisionId === dmg.id ? <Loader2 size={14} className="animate-spin" /> : 'TOLAK (REJECT)'}
                                     </button>
                                     <button 
                                       disabled={submittingDecisionId === dmg.id}
                                       onClick={() => submitDecision(dmg.id, 'ACCEPT_QUARANTINE')}
                                       className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                                     >
                                       {submittingDecisionId === dmg.id ? <Loader2 size={14} className="animate-spin" /> : 'TERIMA KARANTINA'}
                                     </button>
                                   </div>
                                 ) : (
                                   <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${dmg.decision === 'REJECT_RETURN' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                     <ShieldCheck size={14} /> Telah diputuskan: {dmg.decision.replace(/_/g, ' ')}
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-3">
         <div className="max-w-3xl mx-auto px-4 text-center">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Powered by <span className="text-amber-500">Sentralogis WMS</span>
           </p>
         </div>
      </footer>
    </div>
  );
}
