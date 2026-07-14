'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, ShieldAlert, ArrowRight, Loader2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';

interface ExceptionData {
  id: string;
  cluster: string;
  anomaly_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reference_id: string;
  reference_number: string;
  description: string;
  detected_at: string;
}

import ExceptionInvestigationModal from './ExceptionInvestigationModal';

export default function ExceptionDashboard({ cluster, title, description }: { cluster: string, title: string, description: string }) {
  const [exceptions, setExceptions] = useState<ExceptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeException, setActiveException] = useState<ExceptionData | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    async function fetchExceptions() {
      if (!profile?.tenant_id) return;
      try {
        setLoading(true);
        // Using maybeSingle or just standard select, vw_director_exceptions is a view
        const { data, error: fetchError } = await supabase
          .from('vw_director_exceptions')
          .select('*')
          .eq('cluster', cluster)
          .eq('tenant_id', profile.tenant_id)
          .order('severity', { ascending: true }) // CRITICAL first (alphabetical C < H < M)
          .order('detected_at', { ascending: false });

        if (fetchError) {
          // View might not exist yet if migration hasn't been run
          if (fetchError.code === '42P01') {
             setError('Database view for exceptions has not been created yet. Please run Migration 112.');
          } else {
             throw fetchError;
          }
        } else {
          setExceptions(data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch exceptions', err);
        const errorMsg = err?.message || err?.error_description || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        // If it's a relation does not exist error but didn't get caught by code check
        if (errorMsg.includes('does not exist') || errorMsg.includes('404')) {
          setError('Database view for exceptions has not been created yet. Please run Migration 112.');
        } else {
          setError(errorMsg || 'An unknown error occurred while fetching exceptions.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchExceptions();
  }, [cluster, profile?.tenant_id]);

  const severityColors = {
    CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-600',
    HIGH: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
    MEDIUM: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  };

  const severityBg = {
    CRITICAL: 'bg-red-50 border-red-100',
    HIGH: 'bg-orange-50 border-orange-100',
    MEDIUM: 'bg-amber-50 border-amber-100',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            {title}
          </h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-700 font-semibold text-sm">Live Monitoring Active</span>
        </div>
      </div>

      {error ? (
        <Card className="p-8 bg-red-50 border-red-200">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800">System Error</h3>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </Card>
      ) : loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
            <p className="text-slate-500">Scanning for anomalies...</p>
          </div>
        </Card>
      ) : exceptions.length === 0 ? (
        <Card className="p-12 bg-slate-50 border-dashed border-slate-200">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2Icon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">All Clear</h3>
            <p className="text-slate-500 mt-2">No active anomalies detected in this cluster.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Requires Attention ({exceptions.length})</h2>
          </div>
          
          <div className="grid gap-4">
            {exceptions.map((exc) => (
              <div 
                key={exc.id} 
                className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${severityBg[exc.severity]}`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl border ${severityColors[exc.severity]}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${severityColors[exc.severity]}`}>
                        {exc.severity}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {exc.anomaly_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">
                      {exc.reference_number || 'Unknown Reference'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                      {exc.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Detected {formatDistanceToNow(new Date(exc.detected_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex justify-end">
                  <button 
                    onClick={() => setActiveException(exc)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border shadow-sm transition-colors"
                  >
                    Investigate
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExceptionInvestigationModal 
        isOpen={!!activeException} 
        onClose={() => setActiveException(null)} 
        exception={activeException} 
      />
    </div>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
