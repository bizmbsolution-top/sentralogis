'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GlobalRadarMap from './GlobalRadarMap';
import { Loader2, AlertCircle, RefreshCw, Layers, Shield, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/hooks/useAuth';

const TripReplayModal = dynamic(() => import('./TripReplayModal'), { ssr: false });

export default function GlobalRadarConsole() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [replayMission, setReplayMission] = useState<any>(null);

  const fetchActiveMissions = useCallback(async () => {
    try {
      if (!isSyncing) setLoading(true);
      
      let tenantId = profile?.tenant_id;
      const isGlobalRole = profile?.role === 'owner_sentralogis' || profile?.role?.startsWith('hq_');

      if (!tenantId && isGlobalRole) {
        try {
          const { data: tenantData } = await supabase.from('tenants').select('id').limit(1);
          if (tenantData && tenantData.length > 0) {
            tenantId = tenantData[0].id;
          }
        } catch (e) {
          console.error('Failed to resolve fallback tenant ID for GlobalRadarConsole:', e);
        }
      }

      console.log('Radar Debug: Syncing from Secure API Matrix for tenant:', tenantId || 'GLOBAL');
      const url = tenantId ? `/api/sbu/radar?tenant_id=${encodeURIComponent(tenantId)}` : '/api/sbu/radar';
      const response = await fetch(url);
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      
      console.log(`Radar Debug: Matrix Synced. ${result.data?.length || 0} missions online.`);
      setMissions(result.data || []);
    } catch (err: any) {
      console.error('Radar Matrix Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [isSyncing, profile]);

  useEffect(() => {
    fetchActiveMissions();

    // Set up Realtime subscription & 10-second polling interval
    const channel = supabase
      .channel('global-radar-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_tracking' }, () => {
        setIsSyncing(true);
        fetchActiveMissions();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchActiveMissions();
    }, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchActiveMissions, profile]);

  if (loading && !isSyncing) {
    return (
      <div className="h-screen w-screen bg-[#0a192f] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase italic">Initializing Global Matrix</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 animate-pulse">Syncing satellite telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-[#0a192f] flex items-center justify-center p-10">
        <div className="bg-rose-500/10 border border-rose-500/20 p-10 rounded-[3rem] text-center max-w-lg">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
          <h2 className="text-white font-black text-2xl mb-2 tracking-tighter uppercase italic">Radar Offline</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Reconnect Matrix
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#0a192f]">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center pointer-events-none">
         <div className="pointer-events-auto">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <Shield size={20} className="text-white" />
               </div>
               <div>
                  <h1 className="text-white font-black text-lg tracking-tighter italic leading-none">SENTRALOGIS <span className="text-blue-500">RADAR</span></h1>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Fleet Intelligence Command</p>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-4 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Sync</span>
               </div>
               <div className="h-4 w-[1px] bg-white/10" />
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {missions.length} Missions Tracked
               </div>
            </div>

            <button 
               onClick={() => { setIsSyncing(true); fetchActiveMissions(); }}
               className="w-12 h-12 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center transition-all group"
            >
               <RefreshCw size={20} className={`text-blue-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>
         </div>
      </div>

      {/* Main Map */}
      <GlobalRadarMap missions={missions} onOpenReplay={(m) => setReplayMission(m)} />

      {/* Bottom Footer Decor */}
      <div className="absolute bottom-6 right-8 z-10 pointer-events-none opacity-20">
         <div className="flex items-center gap-4">
            <Zap size={16} className="text-blue-400" />
            <p className="text-[8px] font-black text-white uppercase tracking-[1em] italic">
               Encryption Secured | Quantum Telemetry Active
            </p>
         </div>
      </div>

      <TripReplayModal 
        isOpen={!!replayMission} 
        onClose={() => setReplayMission(null)} 
        jobOrder={replayMission} 
      />
    </div>
  );
}
