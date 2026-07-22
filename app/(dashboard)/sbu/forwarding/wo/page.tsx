'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Loader2, ArrowRight, PackageOpen
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ForwardingWOListPage() {
  const { profile } = useAuth();
  const router = useRouter();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id, wo_number, status, order_date, execution_date,
          customer:md_entities!customer_id (id, name, is_vendor),
          wo_items (
            id, item_code, status, unit_price, total_revenue,
            fw_container_items (id, volume_cbm, gross_weight_kg, container_assignment_id, fw_container_assignments(container_number))
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('sbu_type', 'FORWARDING')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error details:', JSON.stringify(error, null, 2));
        toast.error(error?.message || 'Gagal memuat data Work Order Forwarding');
        return;
      }
      setItems(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error?.message || 'Gagal memuat data Work Order Forwarding');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.wo_number.toLowerCase().includes(term) ||
      (item.customer?.name || '').toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">DRAFT</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">PENDING</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">CONFIRMED</span>;
      case 'ON_PROGRESS':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">ON PROGRESS</span>;
      case 'DONE':
      case 'COMPLETED':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">COMPLETED</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status || 'UNKNOWN'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Work Orders Forwarding</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola order pengiriman D2D/P2P dari Cargo Owner</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari No WO, Customer..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <Link href="/sbu/forwarding/wo/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Buat WO Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">WO Number</th>
                <th className="px-6 py-4 font-semibold">Cargo Owner</th>
                <th className="px-6 py-4 font-semibold text-center">Unit / Cont</th>
                <th className="px-6 py-4 font-semibold text-center">Tgl Order</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <PackageOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada Work Order ditemukan</p>
                    <p className="text-slate-400 text-xs mt-1">Buat WO baru untuk memulai.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-700 tracking-tight">
                        <Link href={`/sbu/forwarding/wo/${item.id}`} className="hover:underline">
                          {item.wo_number}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.customer?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-medium text-slate-700">
                        {item.wo_items?.length || 0} unit
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-slate-600">
                        {item.order_date ? new Date(item.order_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sbu/forwarding/wo/${item.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Detail <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
