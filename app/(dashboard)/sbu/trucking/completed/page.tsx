'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { CheckCircle, Calendar, Phone, DollarSign, TrendingUp } from 'lucide-react';

interface CompletedJob {
  id: string;
  jo_number: string;
  status: string;
  completed_at: string;
  driver_phone: string | null;
  purchase_price: number;
  wo_item_id: string;
}

export default function CompletedJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchCompletedJobs();
    }
  }, [profile?.tenant_id]);

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching completed jobs for tenant:', profile?.tenant_id);
      
      // ✅ QUERY SEDERHANA - TANPA JOIN
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          id,
          jo_number,
          status,
          completed_at,
          driver_phone,
          purchase_price,
          wo_item_id
        `)
        .eq('status', 'completed')
        .eq('tenant_id', profile?.tenant_id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      console.log('Fetched jobs:', data?.length || 0);
      setJobs(data || []);
      
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
      toast.error('Gagal mengambil data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Gagal Memuat Data</h2>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={fetchCompletedJobs}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </Card>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Belum Ada Job Completed</h2>
          <p className="text-slate-500">Job order yang sudah selesai akan muncul di sini.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Completed Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">Daftar job order yang sudah selesai</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              {/* Informasi JO */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-mono text-sm font-bold text-slate-800">
                    {job.jo_number}
                  </p>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {job.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Selesai: {formatDate(job.completed_at)}</span>
                  </div>
                  {job.driver_phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      <span>{job.driver_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informasi Harga */}
              <div className="text-right">
                {job.purchase_price > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Purchase Price</p>
                    <p className="text-sm font-semibold text-amber-600">
                      {formatRupiah(job.purchase_price)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
