'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Activity, Image as ImageIcon } from 'lucide-react';

const formatTimestamp = (dateStr: string | null | undefined, onlyTime: boolean = false) => {
  if (!dateStr) return '--:--';
  try {
    const d = new Date(dateStr);
    if (onlyTime) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDuration = (start: string | null | undefined, end: string | null | undefined = null) => {
  if (!start) return null;
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : new Date().getTime();
  const diffMs = endTime - startTime;
  if (diffMs < 0) return null;
  
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0) {
    return `${hours} jam ${mins} mnt`;
  }
  return `${mins} mnt`;
};

export default function RouteTimeline({ routes }: { routes: any[] }) {
  // Add a tick to force re-render for real-time running duration
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!routes || routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
         <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada rute</p>
      </div>
    );
  }

  return (
    <div className="relative pt-2">
      {/* Vertical line connecting dots */}
      <div className="absolute left-[39px] sm:left-[51px] top-4 bottom-6 w-[1.5px] bg-slate-200" />
      
      <div className="space-y-6">
        {routes.map((route: any, idx: number) => {
          const isDone = ['completed', 'arrived', 'departed'].includes(route.status?.toLowerCase());
          
          // Calculate En-Route time (from previous departure to current arrival)
          let enRouteStr = null;
          let isCurrentlyEnRoute = false;
          if (idx > 0) {
            const prevRoute = routes[idx - 1];
            if (prevRoute.actual_departure) {
              if (route.actual_arrival) {
                enRouteStr = `Perjalanan: ${formatDuration(prevRoute.actual_departure, route.actual_arrival)}`;
              } else {
                enRouteStr = `Sedang di perjalanan: ${formatDuration(prevRoute.actual_departure, null)}`;
                isCurrentlyEnRoute = true;
              }
            }
          }

          // Calculate Dwell time (from arrival to departure)
          let dwellStr = null;
          let isCurrentlyDwelling = false;
          if (route.actual_arrival) {
            if (route.actual_departure) {
              dwellStr = `Waktu di lokasi: ${formatDuration(route.actual_arrival, route.actual_departure)}`;
            } else {
              dwellStr = `Waktu berjalan: ${formatDuration(route.actual_arrival, null)} (Saat ini)`;
              isCurrentlyDwelling = true;
            }
          }
          
          return (
            <div key={route.id || idx} className="relative flex flex-col gap-1">
              {/* EN ROUTE TIME */}
              {enRouteStr && (
                 <div className="flex items-center gap-4 sm:gap-5 ml-2.5 sm:ml-4 -mt-3 mb-2">
                   <div className="w-10 sm:w-12 shrink-0"></div>
                   <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100 relative z-10">
                      <Clock size={12} className={isCurrentlyEnRoute ? "text-blue-500 animate-pulse" : ""} />
                      {enRouteStr}
                   </div>
                 </div>
              )}

              <div className="relative flex items-start gap-4 sm:gap-5">
                {/* Time (Left side) */}
                <div className="w-10 sm:w-12 pt-0.5 text-right shrink-0">
                   <p className="text-xs font-medium text-slate-500">
                     {route.actual_arrival ? formatTimestamp(route.actual_arrival, true) : (route.updated_at && isDone ? formatTimestamp(route.updated_at, true) : '--:--')}
                   </p>
                </div>

                {/* Dot */}
                <div className="relative shrink-0 mt-1 z-10 bg-white py-0.5">
                   <div className={`w-3 h-3 rounded-full border-2 ${isDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                      {isCurrentlyDwelling && <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>}
                   </div>
                </div>
                
                {/* Details (Right side) */}
                <div className="flex-1 pb-4 min-w-0">
                   <p className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-500'}`}>{route.location_name}</p>
                   <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{route.address}</p>
                   
                   {/* DWELL TIME */}
                   {dwellStr && (
                     <p className={`text-xs mt-1.5 flex items-center gap-1.5 font-medium ${isCurrentlyDwelling ? 'text-blue-600' : 'text-emerald-600'}`}>
                        <Activity size={12} className={isCurrentlyDwelling ? "animate-pulse" : ""} />
                        {dwellStr}
                     </p>
                   )}

                   {route.pod_photo_url && (
                      <div className="mt-3">
                        <a href={route.pod_photo_url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group bg-slate-50">
                          <img src={route.pod_photo_url} alt={`POD ${route.location_name}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <ImageIcon size={20} className="text-white" />
                          </div>
                        </a>
                      </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
