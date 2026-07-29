'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Clock, Loader2, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import RouteTimeline from './RouteTimeline';

interface HistoryModalProps {
  entityId: string;
  entityType: 'work_order' | 'job_order';
  onClose: () => void;
  title?: string;
}

const supabase = createClient();

export default function HistoryModal({ entityId, entityType, onClose, title }: HistoryModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'timeline'>('audit');

useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // First, fetch the entity to get tenant_id
        const { data: entityData, error: entityError } = await supabase
          .from(entityType === 'work_order' ? 'work_orders' : 'job_orders')
          .select('id, tenant_id')
          .eq('id', entityId)
          .maybeSingle();

        if (entityError || !entityData) {
          console.error("[HistoryModal] Entity fetch error:", entityError);
          setLogs([]);
          return;
        }

        // Query audit logs with tenant filter
        const { data: logsData, error: logsError } = await supabase
          .from('wo_audit_logs')
          .select('*')
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .eq('tenant_id', entityData.tenant_id)
          .order('performed_at', { ascending: false });

        if (logsError) {
          console.error("[HistoryModal] Error fetching logs:", logsError);
        }

        // Fetch driver tracking logs if entityType is job_order
        let trackingData: any[] = [];
        let routesData: any[] = [];
        if (entityType === 'job_order') {
          const { data: td, error: te } = await supabase
            .from('job_tracking')
            .select('*')
            .eq('job_order_id', entityId)
            .order('created_at', { ascending: false });
          if (!te && td) {
            trackingData = td;
          }
          
          const { data: rd, error: re } = await supabase
            .from('job_routes')
            .select('*')
            .eq('job_order_id', entityId)
            .order('sequence', { ascending: true });
          if (!re && rd) {
            routesData = rd;
            setRoutes(rd);
          }
        }

        if ((!logsData || logsData.length === 0) && trackingData.length === 0) {
          setLogs([]);
          return;
        }

        // Get unique performed_by user IDs from audit logs
        const performedByIds = [...new Set((logsData || []).map(l => l.performed_by).filter(Boolean))];
        
        // Fetch profiles for those users
        let profilesMap: Record<string, any> = {};
        if (performedByIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('tenant_users')
            .select('user_id, full_name')
            .in('user_id', performedByIds);
          
          if (profilesError) {
            console.error("[HistoryModal] Tenant_users error:", JSON.stringify(profilesError, null, 2));
          } else if (profilesData) {
            profilesMap = Object.fromEntries(profilesData.map(p => [p.user_id, { name: p.full_name }]));
          }
        }

        // Enrich audit logs with user info
        const enrichedAuditLogs = (logsData || []).map(log => ({
          ...log,
          user: log.performed_by && profilesMap[log.performed_by] ? profilesMap[log.performed_by] : null
        }));

        // Map tracking logs to same shape
        const mappedTrackingLogs = trackingData.map(t => ({
          id: `trk-${t.id}`,
          operation: 'DRIVER_UPDATE',
          performed_at: t.created_at,
          user: { name: 'Supir / Driver App' },
          tracking_status: t.status,
          tracking_notes: t.notes,
          tracking_location: t.latitude && t.longitude ? `${t.latitude}, ${t.longitude}` : null
        }));

        // Combine and sort
        const combinedLogs = [...enrichedAuditLogs, ...mappedTrackingLogs].sort(
          (a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
        );

        setLogs(combinedLogs);
      } catch (err) {
        console.error("[HistoryModal] Unexpected error:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    if (entityId) fetchLogs();
  }, [entityId, entityType]);

  const formatOperation = (op: string) => {
    switch (op) {
      case 'INSERT': return { label: 'Created', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'UPDATE': return { label: 'Updated', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'DELETE': return { label: 'Deleted', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'DRIVER_UPDATE': return { label: 'GPS Ping', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { label: op, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getUserName = (log: any) => {
    if (log.user?.name) return log.user.name;
    if (log.user?.email) return log.user.email.split('@')[0];
    return 'System / Unknown User';
  };

  const getInitials = (name: string) => {
    if (!name || name === 'System / Unknown User') return 'S';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <Card className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {title || 'History Log'}
              </h2>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Audit Trail
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs for Job Orders */}
        {entityType === 'job_order' && (
          <div className="flex border-b border-slate-200 px-6 bg-slate-50">
             <button 
               onClick={() => setActiveTab('audit')}
               className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
               Audit & Live Event Feed
             </button>
             <button 
               onClick={() => setActiveTab('timeline')}
               className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
               Riwayat Perjalanan (Timeline)
             </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-500">Loading history logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Info size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">No History Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-2">
                There are no recorded changes for this {entityType.replace('_', ' ')}. New updates will appear here.
              </p>
              <p className="text-xs text-slate-400">
                (Entity {entityId} has no audit records yet)
              </p>
            </div>
          ) : activeTab === 'timeline' ? (
            <RouteTimeline routes={routes} />
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute top-4 bottom-4 left-6 w-[2px] bg-slate-200 rounded-full" />
              
              <div className="space-y-6">
                {logs.map((log, idx) => {
                  const op = formatOperation(log.operation);
                  const userName = getUserName(log);
                  const initials = getInitials(userName);
                  const changed_fields = log.changed_fields || [];
                  
                  return (
                    <div key={log.id || idx} className="relative flex gap-4">
                      {/* Timeline Dot & Avatar */}
                      <div className="relative z-10 w-12 flex flex-col items-center shrink-0 pt-1">
                        <div className={`w-12 h-12 bg-white rounded-full border-4 border-slate-50 flex items-center justify-center shadow-sm`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border ${log.operation === 'DRIVER_UPDATE' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                            {initials}
                          </div>
                        </div>
                      </div>

                      {/* Log Card */}
                      <div className="flex-1">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{userName}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${op.color}`}>
                                {op.label}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                              {format(new Date(log.performed_at), 'dd MMM yyyy HH:mm', { locale: id })}
                            </span>
                          </div>

                          {changed_fields && changed_fields.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Changed Fields</p>
                              <div className="flex flex-wrap gap-1.5">
                                {changed_fields.map((field: string) => (
                                  <span key={field} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {log.operation === 'DRIVER_UPDATE' && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                              {log.tracking_status && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Status</span>
                                  <span className="text-sm font-bold text-slate-700">{log.tracking_status}</span>
                                </div>
                              )}
                              {log.tracking_location && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Location</span>
                                  <span className="text-sm font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{log.tracking_location}</span>
                                </div>
                              )}
                              {log.tracking_notes && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 mt-1">Notes</span>
                                  <span className="text-sm text-slate-600 italic bg-amber-50/50 p-2 rounded-lg flex-1 border border-amber-100/50">{log.tracking_notes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
