'use client';

import React, { useState, useEffect } from 'react';
import { use } from 'react';
import { Truck, MapPin, Phone, ShieldCheck, Activity, MessageSquare } from 'lucide-react';
import MissionTimeline from '@/components/sbu/MissionTimeline';

const formatWA = (phone: string | null | undefined) => {
  if (!phone) return '';
  return phone.replace(/^0/, '62').replace(/^\+/, '').replace(/[^0-9]/g, '');
};

export default function PublicTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [jo, setJo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jo/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil data pelacakan');
        }

        const data = result.data;
        if (!data) throw new Error('Data tidak ditemukan');

        setJo({
          id: data.id,
          jo_number: data.jo_number,
          status: data.status,
          customer: data.customer,
          fleet: data.fleet,
          driver: data.driver,
          routes: data.routes || [],
          tracking_history: [],
          wo_details: data.wo_details,
        });
        setError(null);
      } catch (err: any) {
        console.error('Error fetching tracking data:', err);
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
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading tracking data...</p>
      </div>
    </div>
  );

  if (error || !jo) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
      <div>
        <ShieldCheck className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tracking Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">{error || 'Invalid or expired tracking link.'}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Live Tracking</p>
                <p className="text-base font-bold text-slate-900">{jo.jo_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Customer</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{jo.customer?.name || 'Private Client'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Fleet</p>
              <p className="text-sm font-semibold text-slate-900">{jo.fleet?.plate_number || '-'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24 max-w-2xl mx-auto">
        <MissionTimeline 
          routes={jo.routes || []} 
          tracking={jo.tracking_history || []} 
          isPublicView={true} 
          jo_status={jo.status}
        />
      </main>

      {/* Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          <a 
            href={`https://wa.me/${formatWA(jo.driver?.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium shadow-sm ${jo.driver?.phone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 pointer-events-none'}`}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </a>
          <a 
            href={`tel:${jo.driver?.phone || ''}`}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium shadow-sm ${jo.driver?.phone ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 pointer-events-none'}`}
          >
            <Phone className="w-4 h-4" />
            Call Driver
          </a>
        </div>
      </footer>
    </div>
  );
}
