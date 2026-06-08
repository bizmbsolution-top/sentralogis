'use client';

import React from 'react';
import { format } from 'date-fns';
import { 
  ShieldCheck, MapPin, Clock, Truck, 
  Activity, CheckCircle2, Image as ImageIcon,
  ChevronRight, AlertCircle, Camera
} from 'lucide-react';

interface MissionTimelineProps {
  routes: any[];
  tracking: any[];
  isPublicView?: boolean;
  jo_status?: string;
  attachments?: any[];
  joId?: string;
  joNumber?: string;
}

export default function MissionTimeline({ 
  routes, 
  tracking, 
  isPublicView = false, 
  jo_status,
  attachments = [],
  joNumber
}: MissionTimelineProps) {
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch {
      return "-";
    }
  };

  if (routes.length === 0 && tracking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
          <Activity size={20} className="text-slate-300" />
        </div>
        <p className="text-xs text-slate-400">Waiting for operational data</p>
        <p className="text-[10px] text-slate-300 mt-1">Milestones will appear once the driver starts the journey</p>
      </div>
    );
  }

  const systemMilestones = [
    {
      id: 'sys-start',
      location_name: 'Order Received',
      status: 'completed',
      stop_type: 'SYSTEM',
      actual_arrival: null,
      isSystem: true
    },
    {
      id: 'sys-progress',
      location_name: 'Journey Started',
      status: (jo_status?.includes('DALAM') || jo_status?.includes('TIBA') || jo_status?.includes('MENUJU')) ? 'completed' : 'pending',
      stop_type: 'SYSTEM',
      isSystem: true
    },
    ...routes,
    {
      id: 'sys-end',
      location_name: 'Mission Complete',
      status: jo_status?.includes('SELESAI') ? 'completed' : 'pending',
      stop_type: 'SYSTEM',
      isSystem: true
    }
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Progress header */}
      <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-blue-600 uppercase">Progress</p>
            <p className="text-lg font-semibold text-slate-900">
              {systemMilestones.length > 0 ? Math.round((systemMilestones.filter(m => m.status === 'completed').length / systemMilestones.length) * 100) : 0}% <span className="text-sm font-normal text-slate-500">completed</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-blue-100">
            <Activity className="text-blue-600" size={18} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {systemMilestones.map((route, idx) => {
          const isCompleted = route.status === 'completed';
          const isCurrent = route.status === 'arrived';
          
          return (
            <div key={route.id} className="relative">
              {idx < systemMilestones.length - 1 && (
                <div className={`absolute left-5 top-10 w-[2px] h-[calc(100%+4px)] z-0 ${isCompleted ? "bg-emerald-200" : "bg-slate-100"}`} />
              )}

              <div className={`relative z-10 rounded-lg p-4 border transition-all ${
                isCompleted ? "border-emerald-100 bg-emerald-50/30" : 
                isCurrent ? "border-blue-200 bg-blue-50/30" : 
                "border-slate-100 bg-white"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isCompleted ? "bg-emerald-500 text-white" :
                    isCurrent ? "bg-blue-500 text-white" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-semibold">{idx + 1}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        route.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600' :
                        route.stop_type === 'DROPOFF' ? 'bg-orange-50 text-orange-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {route.stop_type || 'System'}
                      </span>
                      {route.actual_arrival && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} />
                          {formatTime(route.actual_arrival)}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-medium text-slate-900 truncate">
                      {route.location_name}
                    </h3>
                    {route.address && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {route.address}
                      </p>
                    )}

                    {route.pod_photo_url && (
                      <div className="mt-3">
                        <a href={route.pod_photo_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={route.pod_photo_url} 
                            alt="POD Proof" 
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm hover:scale-105 transition-transform"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RAW GPS Tracking Logs */}
      {tracking && tracking.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
             <MapPin size={12} /> Intelligency Tracking Logs
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {tracking.map((t: any, i: number) => (
               <div key={t.id || i} className="text-[10px] flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="w-10 text-slate-400 shrink-0 font-medium pt-0.5">{formatTime(t.created_at)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700 uppercase tracking-wide">{t.status_update}</p>
                    {t.notes && t.notes.replace(/Route ID: [0-9a-fA-F-]{36}( \| Catatan: )?(\(Photo Attached\) )?/g, '').trim() && (
                      <p className="text-slate-500 mt-0.5">
                        {t.notes.replace(/Route ID: [0-9a-fA-F-]{36}( \| Catatan: )?(\(Photo Attached\) )?/g, '').trim()}
                      </p>
                    )}
                    {t.latitude && t.longitude && (
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">
                          {t.latitude}, {t.longitude}
                        </p>
                    )}
                    {t.photo_url && (
                      <a href={t.photo_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                        <img 
                          src={t.photo_url} 
                          alt="Timeline update" 
                          className="w-16 h-16 object-cover rounded border border-slate-200 shadow-sm hover:scale-105 transition-transform"
                        />
                      </a>
                    )}
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
