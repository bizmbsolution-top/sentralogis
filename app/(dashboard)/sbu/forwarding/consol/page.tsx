'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Loader2, Ship, MapPin, Calendar, CheckCircle2, Package, ArrowRight, XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Consolidation } from '@/lib/domain/forwarding/types';
import Link from 'next/link';

export default function ConsolidationListPage() {
  const { profile } = useAuth();
  const router = useRouter();
  
  const [items, setItems] = useState<Consolidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State for Create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    vessel_name: '',
    voyage_number: '',
    origin_port: '',
    destination_port: '',
    etd: '',
    eta: '',
    shipping_line_name: ''
  });

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
        .from('fw_consolidations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as Consolidation[]) || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Gagal memuat data Konsolidasi');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);

    try {
      const payload = {
        tenant_id: tenantId,
        vessel_name: formData.vessel_name,
        voyage_number: formData.voyage_number,
        origin_port: formData.origin_port,
        destination_port: formData.destination_port,
        etd: formData.etd || null,
        eta: formData.eta || null,
        shipping_line_name: formData.shipping_line_name || null,
        status: 'open'
      };

      const { data, error } = await supabase
        .from('fw_consolidations')
        .insert([payload as any])
        .select('id')
        .single();
      
      if (error) throw error;
      
      toast.success('Konsolidasi baru berhasil dibuat');
      setIsModalOpen(false);
      setFormData({
        vessel_name: '',
        voyage_number: '',
        origin_port: '',
        destination_port: '',
        etd: '',
        eta: '',
        shipping_line_name: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Gagal membuat konsolidasi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.consol_number.toLowerCase().includes(term) ||
      item.vessel_name.toLowerCase().includes(term) ||
      item.origin_port.toLowerCase().includes(term) ||
      item.destination_port.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">OPEN</span>;
      case 'stuffing':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">STUFFING</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">SHIPPED</span>;
      case 'arrived':
        return <span className="px-2.5 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-semibold">ARRIVED</span>;
      case 'deconsol_done':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">DECONSOL</span>;
      case 'closed':
        return <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold">CLOSED</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Konsolidasi</h1>
          <p className="text-slate-500 text-sm mt-1">Jadwal Kapal & Konsolidasi Kontainer (Vessel / Voyage)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari consol, kapal..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buat Consol Baru
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Consol Number</th>
                <th className="px-6 py-4 font-semibold">Rute & Kapal</th>
                <th className="px-6 py-4 font-semibold text-center">Jadwal (ETD / ETA)</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Ship className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada konsolidasi ditemukan</p>
                    <p className="text-slate-400 text-xs mt-1">Buat consol baru untuk memulai.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-700 tracking-tight">
                        <Link href={`/sbu/forwarding/consol/${item.id}`} className="hover:underline">
                          {item.consol_number}
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {item.origin_port} 
                        <span className="text-slate-400 text-xs">â†’</span> 
                        {item.destination_port}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <Ship className="w-3 h-3 text-slate-400" />
                        <span className="font-medium">{item.vessel_name}</span>
                        {item.voyage_number && <span>(V.{item.voyage_number})</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-medium w-8">ETD</span>
                          <span className="font-semibold">{item.etd ? new Date(item.etd).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-medium w-8">ETA</span>
                          <span className="font-semibold">{item.eta ? new Date(item.eta).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(item.status || "")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sbu/forwarding/consol/${item.id}`}>
                        <Button variant="secondary" size="sm" className="text-xs h-8">
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

      {/* Form Modal Create Consol */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Ship className="w-5 h-5 text-indigo-500" /> Buat Consol Baru
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kapal (Vessel) *</label>
                  <input 
                    type="text" required
                    value={formData.vessel_name}
                    onChange={e => setFormData({...formData, vessel_name: e.target.value})}
                    placeholder="Cth: KM Bukit Raya"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voyage Number</label>
                  <input 
                    type="text" 
                    value={formData.voyage_number}
                    onChange={e => setFormData({...formData, voyage_number: e.target.value})}
                    placeholder="Cth: V.245"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Line / Pelayaran</label>
                  <input 
                    type="text" 
                    value={formData.shipping_line_name}
                    onChange={e => setFormData({...formData, shipping_line_name: e.target.value})}
                    placeholder="Cth: Meratus / SPIL"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div className="col-span-2 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Rute & Jadwal Estimasi</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Origin Port *</label>
                  <input 
                    type="text" required
                    value={formData.origin_port}
                    onChange={e => setFormData({...formData, origin_port: e.target.value})}
                    placeholder="Cth: Surabaya"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Destination Port *</label>
                  <input 
                    type="text" required
                    value={formData.destination_port}
                    onChange={e => setFormData({...formData, destination_port: e.target.value})}
                    placeholder="Cth: Makassar"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ETD (Estimasi Berangkat)</label>
                  <input 
                    type="date" 
                    value={formData.etd}
                    onChange={e => setFormData({...formData, etd: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ETA (Estimasi Tiba)</label>
                  <input 
                    type="date" 
                    value={formData.eta}
                    onChange={e => setFormData({...formData, eta: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Buat Consol
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
