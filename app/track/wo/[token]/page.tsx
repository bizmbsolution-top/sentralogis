'use client';

import React, { useState, useEffect } from 'react';
import { use } from 'react';
import { Truck, MapPin, Phone, ShieldCheck, MessageSquare, ChevronDown, Package, Clock, ArrowLeft, User } from 'lucide-react';
import MissionTimeline from '@/components/sbu/MissionTimeline';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MissionMap = dynamic(() => import('@/components/sbu/MissionMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
      <p className="text-slate-400 text-xs">Loading map...</p>
    </div>
  )
});

export default function WOTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJoId, setSelectedJoId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/track/wo/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil data pelacakan');
        }

        const woData = result.data;
        if (!woData) throw new Error('Data tidak ditemukan');

        setData(woData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching WO tracking data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading tracking data...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
      <div>
        <ShieldCheck className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tracking Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">{error || 'Invalid or expired tracking link.'}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium">Retry</button>
      </div>
    </div>
  );

  const { wo, jobOrders } = data;
  
  // Sort: active first, then pending, then completed
  const sortedJOs = [...jobOrders].sort((a, b) => {
    const isActive = (j: any) => j.started_at && !['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(j.status?.toUpperCase());
    const isCompleted = (j: any) => ['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(j.status?.toUpperCase());
    
    if (isActive(a) && !isActive(b)) return -1;
    if (!isActive(a) && isActive(b)) return 1;
    if (isCompleted(a) && !isCompleted(b)) return 1;
    if (!isCompleted(a) && isCompleted(b)) return -1;
    return 0;
  });

  const selectedJo = jobOrders.find((j: any) => j.id === selectedJoId);
  const activeCount = jobOrders.filter((j: any) => j.started_at && !['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(j.status?.toUpperCase())).length;
  const completedCount = jobOrders.filter((j: any) => ['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(j.status?.toUpperCase())).length;

  const getJoStatus = (jo: any) => {
    if (['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(jo.status?.toUpperCase())) return { label: 'Completed', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' };
    if (jo.started_at) return { label: 'On Journey', color: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500 animate-pulse' };
    return { label: 'Pending', color: 'bg-slate-50 border-slate-200 text-slate-600', dot: 'bg-slate-400' };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Back button + title */}
          {selectedJo && (
            <button 
              onClick={() => setSelectedJoId(null)}
              className="flex items-center gap-1 text-xs text-blue-600 mb-2"
            >
              <ArrowLeft size={14} /> Back to all trucks
            </button>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Consolidated Tracking</p>
                <p className="text-base font-semibold text-slate-900">{wo.wo_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live</span>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Customer</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{wo.customer?.name || 'Private Client'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Execution Date</p>
              <p className="text-sm font-semibold text-slate-900">{wo.execution_date ? new Date(wo.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Overall Progress</p>
              <p className="text-xs font-semibold text-blue-600">{completedCount}/{jobOrders.length} trucks</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${jobOrders.length > 0 ? (completedCount / jobOrders.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> {activeCount} active</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {completedCount} completed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-28 max-w-3xl mx-auto">
        {!selectedJo ? (
          <>
            {/* Truck List */}
            <div className="space-y-3 mb-6">
              {sortedJOs.map((jo: any) => {
                const status = getJoStatus(jo);
                const isActive = jo.started_at && !['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(jo.status?.toUpperCase());

                return (
                  <div key={jo.id} className={`rounded-xl border overflow-hidden transition-all ${status.color} ${isActive ? 'shadow-sm ring-1 ring-blue-200' : ''}`}>
                    {/* Active badge */}
                    {isActive && (
                      <div className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-medium flex items-center justify-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        Currently on journey — tap to track live
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedJoId(jo.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-blue-100' : 
                          ['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(jo.status?.toUpperCase()) ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <Truck className={`w-5 h-5 ${isActive ? 'text-blue-600' : ['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(jo.status?.toUpperCase()) ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-900">{jo.fleet?.plate_number || '-'}</p>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {jo.jo_number} • {jo.driver?.name || 'No driver'} • {jo.fleet?.type_name || 'Truck'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Single Truck Detail View */}
            <div className="mb-4">
              {/* Truck info card */}
              <div className={`p-4 rounded-xl border ${getJoStatus(selectedJo).color} mb-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Truck className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-base font-semibold text-slate-900">{selectedJo.fleet?.plate_number || '-'}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getJoStatus(selectedJo).color}`}>
                        {getJoStatus(selectedJo).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{selectedJo.jo_number} • {selectedJo.fleet?.type_name || 'Truck'}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <User size={12} /> {selectedJo.driver?.name || 'No driver'}
                      {selectedJo.driver?.phone && (
                        <>
                          <span className="mx-1">•</span>
                          <a href={`tel:${selectedJo.driver.phone}`} className="text-blue-600 flex items-center gap-0.5">
                            <Phone size={12} /> Call
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="h-64 md:h-80 rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                <MissionMap 
                  stops={selectedJo.routes || []} 
                  tracking={selectedJo.tracking_history || []} 
                  fleetIcon={undefined}
                  focusedLocation={null}
                />
              </div>

              {/* Route stops */}
              {selectedJo.routes && selectedJo.routes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    Route Stops
                  </h3>
                  <div className="space-y-2">
                    {selectedJo.routes.map((route: any, idx: number) => {
                      const isDone = ['completed', 'arrived', 'departed'].includes(route.status);
                      return (
                        <div key={route.id} className={`p-3 rounded-lg border ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-[10px] font-medium ${isDone ? 'text-emerald-600' : 'text-slate-500'}`}>{route.stop_type}</span>
                              <p className="text-sm font-medium text-slate-900 truncate">{route.location_name}</p>
                            </div>
                            {isDone && <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  Mission Log
                </h3>
                <MissionTimeline 
                  routes={selectedJo.routes || []} 
                  tracking={selectedJo.tracking_history || []} 
                  isPublicView={true} 
                  jo_status={selectedJo.status}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          {selectedJo ? (
            <div className="grid grid-cols-2 gap-3">
              <a 
                href={`https://wa.me/${selectedJo.driver?.phone?.replace(/^0/, '62') || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Driver
              </a>
              <a 
                href={`tel:${selectedJo.driver?.phone || ''}`}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-sm"
              >
                <Phone className="w-4 h-4" />
                Call Driver
              </a>
            </div>
          ) : (
            <a 
              href={`https://wa.me/${wo.customer?.phone?.replace(/^0/, '62') || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Customer Service
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
