'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Map, MapPin, Anchor, Truck, FileText, CheckCircle2, XCircle, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Tipe Data
import type { PriceMaster, ServiceType, ContainerType, DeliveryType } from '@/lib/domain/forwarding/types';

export default function PriceMasterPage() {
  const { profile } = useAuth();
  
  const [items, setItems] = useState<PriceMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PriceMaster | null>(null);
  
  const initialFormState = {
    origin_port: '',
    destination_port: '',
    service_type: 'FCL' as ServiceType,
    container_type: '20GP' as ContainerType,
    delivery_type: 'D2D' as DeliveryType,
    sell_price: 0,
    cogs_pickup: 0,
    cogs_port_haulage_origin: 0,
    cogs_ocean_freight: 0,
    cogs_thc_origin: 0,
    cogs_thc_dest: 0,
    cogs_port_haulage_dest: 0,
    cogs_last_mile: 0,
    cogs_documentation: 0,
    cogs_other: 0,
    is_active: true,
  };
  
  const [formData, setFormData] = useState<any>(initialFormState);

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
        .from('fw_price_master')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as PriceMaster[]) || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Gagal memuat data Master Harga Forwarding');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleOpenModal = (item?: PriceMaster) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        origin_port: item.origin_port,
        destination_port: item.destination_port,
        service_type: item.service_type,
        container_type: item.container_type || '20GP',
        delivery_type: item.delivery_type,
        sell_price: item.sell_price || 0,
        cogs_pickup: item.cogs_pickup || 0,
        cogs_port_haulage_origin: item.cogs_port_haulage_origin || 0,
        cogs_ocean_freight: item.cogs_ocean_freight || 0,
        cogs_thc_origin: item.cogs_thc_origin || 0,
        cogs_thc_dest: item.cogs_thc_dest || 0,
        cogs_port_haulage_dest: item.cogs_port_haulage_dest || 0,
        cogs_last_mile: item.cogs_last_mile || 0,
        cogs_documentation: item.cogs_documentation || 0,
        cogs_other: item.cogs_other || 0,
        is_active: item.is_active,
      });
    } else {
      setSelectedItem(null);
      setFormData({ ...initialFormState });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setFormData({ ...initialFormState });
  };

  const calculateTotalCogs = (data: any) => {
    return Number(data.cogs_pickup || 0) + 
           Number(data.cogs_port_haulage_origin || 0) + 
           Number(data.cogs_ocean_freight || 0) + 
           Number(data.cogs_thc_origin || 0) + 
           Number(data.cogs_thc_dest || 0) + 
           Number(data.cogs_port_haulage_dest || 0) + 
           Number(data.cogs_last_mile || 0) + 
           Number(data.cogs_documentation || 0) + 
           Number(data.cogs_other || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    // Validate D2D components
    if (formData.delivery_type === 'D2D') {
      if (formData.cogs_pickup <= 0 && formData.cogs_last_mile <= 0) {
        toast.error('Untuk D2D, biaya Pickup atau Last Mile biasanya diisi.');
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        tenant_id: tenantId,
        origin_port: formData.origin_port,
        destination_port: formData.destination_port,
        service_type: formData.service_type,
        container_type: formData.service_type === 'FCL' ? formData.container_type : null,
        delivery_type: formData.delivery_type,
        sell_price: formData.sell_price,
        cogs_pickup: formData.cogs_pickup,
        cogs_port_haulage_origin: formData.cogs_port_haulage_origin,
        cogs_ocean_freight: formData.cogs_ocean_freight,
        cogs_thc_origin: formData.cogs_thc_origin,
        cogs_thc_dest: formData.cogs_thc_dest,
        cogs_port_haulage_dest: formData.cogs_port_haulage_dest,
        cogs_last_mile: formData.cogs_last_mile,
        cogs_documentation: formData.cogs_documentation,
        cogs_other: formData.cogs_other,
        is_active: formData.is_active,
        effective_date: new Date().toISOString().split('T')[0],
      };

      if (selectedItem) {
        const { error } = await supabase
          .from('fw_price_master')
          .update(payload)
          .eq('id', selectedItem.id);
        
        if (error) throw error;
        toast.success('Harga master berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('fw_price_master')
          .insert([payload]);
        
        if (error) throw error;
        toast.success('Harga master berhasil ditambahkan');
      }

      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Gagal menyimpan harga master');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem || !tenantId) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('fw_price_master')
        .delete()
        .eq('id', selectedItem.id);
      
      if (error) throw error;
      
      toast.success('Harga master berhasil dihapus');
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Gagal menghapus data');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.origin_port.toLowerCase().includes(term) ||
      item.destination_port.toLowerCase().includes(term) ||
      item.service_type.toLowerCase().includes(term) ||
      (item.container_type || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Master Harga Rute Forwarding</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola standar harga jual dan budget biaya (COGS) per rute pengiriman D2D/P2P.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari rute, container..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Harga
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Rute & Layanan</th>
                <th className="px-6 py-4 font-semibold text-right">Harga Jual (Sell)</th>
                <th className="px-6 py-4 font-semibold text-right">Budget COGS</th>
                <th className="px-6 py-4 font-semibold text-right">Est. Margin</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center w-[120px]">Aksi</th>
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
                      <Anchor className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada rute ditemukan</p>
                    <p className="text-slate-400 text-xs mt-1">Coba sesuaikan pencarian atau tambah baru.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const totalCogs = calculateTotalCogs(item);
                  const margin = (item.sell_price || 0) - totalCogs;
                  const marginPct = item.sell_price ? (margin / item.sell_price) * 100 : 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.delivery_type === 'D2D' ? 'bg-indigo-50 text-indigo-600' : 'bg-cyan-50 text-cyan-600'}`}>
                            {item.delivery_type === 'D2D' ? <Truck className="w-5 h-5" /> : <Anchor className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {item.origin_port} 
                              <span className="text-slate-400 text-xs">→</span> 
                              {item.destination_port}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{item.service_type}</span>
                              {item.service_type === 'FCL' && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{item.container_type}</span>
                              )}
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{item.delivery_type}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-900">
                          Rp {(item.sell_price || 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">PER CONTAINER</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-700">
                          Rp {totalCogs.toLocaleString('id-ID')}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleOpenModal(item)}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium mt-1 uppercase hover:underline"
                        >
                          Lihat Rincian
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`font-semibold ${margin > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Rp {margin.toLocaleString('id-ID')}
                        </div>
                        <div className={`text-[10px] font-medium mt-1 ${margin > 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                          {marginPct.toFixed(1)}% MARGIN
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.is_active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedItem(item);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedItem ? 'Edit Master Harga' : 'Tambah Master Harga Baru'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Bagian Kiri: Info Rute & Harga Jual */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                      <Map className="w-4 h-4 text-indigo-500" /> Informasi Rute & Layanan
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Origin Port</label>
                        <input 
                          type="text" 
                          required
                          value={formData.origin_port}
                          onChange={e => setFormData({...formData, origin_port: e.target.value})}
                          placeholder="Cth: Tanjung Perak, Surabaya"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Destination Port</label>
                        <input 
                          type="text" 
                          required
                          value={formData.destination_port}
                          onChange={e => setFormData({...formData, destination_port: e.target.value})}
                          placeholder="Cth: Makassar"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Service Type</label>
                        <select
                          value={formData.service_type}
                          onChange={e => setFormData({...formData, service_type: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="FCL">FCL (Full Container)</option>
                          <option value="LCL" disabled>LCL (Konsolidasi CBM) - Coming Soon</option>
                        </select>
                      </div>

                      {formData.service_type === 'FCL' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Container Type</label>
                          <select
                            value={formData.container_type}
                            onChange={e => setFormData({...formData, container_type: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            <option value="20GP">20 Feet GP</option>
                            <option value="40GP">40 Feet GP</option>
                            <option value="40HC">40 Feet HC</option>
                            <option value="20RF">20 Feet Reefer</option>
                            <option value="45HC">45 Feet HC</option>
                          </select>
                        </div>
                      )}

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Type (Terms)</label>
                        <select
                          value={formData.delivery_type}
                          onChange={e => setFormData({...formData, delivery_type: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="D2D">Door to Door (D2D)</option>
                          <option value="P2P">Port to Port (P2P)</option>
                          <option value="D2P">Door to Port (D2P)</option>
                          <option value="P2D">Port to Door (P2D)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                      <FileText className="w-4 h-4 text-emerald-500" /> Harga Jual (Revenue)
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Harga Jual per Container (IDR)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={formData.sell_price}
                        onChange={e => setFormData({...formData, sell_price: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Harga all-in yang akan ditagihkan ke Cargo Owner.</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Status Aktif (Bisa digunakan untuk WO)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bagian Kanan: COGS Breakdown */}
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" /> Breakdown Biaya (COGS Budget)
                    </h4>
                    <span className="text-xs font-medium bg-slate-200 px-2 py-1 rounded text-slate-700">
                      Total: Rp {calculateTotalCogs(formData).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Origin */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Origin (Asal)</div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Pickup (Door to Gudang) - <span className="italic">Auto-fill ke WO Trucking</span></label>
                      <input 
                        type="number" min="0" value={formData.cogs_pickup}
                        onChange={e => setFormData({...formData, cogs_pickup: Number(e.target.value)})}
                        disabled={!['D2D', 'D2P'].includes(formData.delivery_type)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm disabled:bg-slate-100 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Port Haulage Origin (Gudang ke Port/CY)</label>
                      <input 
                        type="number" min="0" value={formData.cogs_port_haulage_origin}
                        onChange={e => setFormData({...formData, cogs_port_haulage_origin: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">THC Origin (Terminal Handling)</label>
                      <input 
                        type="number" min="0" value={formData.cogs_thc_origin}
                        onChange={e => setFormData({...formData, cogs_thc_origin: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Ocean */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ocean Freight</div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Ocean Freight (Biaya Kapal)</label>
                      <input 
                        type="number" min="0" value={formData.cogs_ocean_freight}
                        onChange={e => setFormData({...formData, cogs_ocean_freight: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destination (Tujuan)</div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">THC Destination (Terminal Handling)</label>
                      <input 
                        type="number" min="0" value={formData.cogs_thc_dest}
                        onChange={e => setFormData({...formData, cogs_thc_dest: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Port Haulage Dest (Port/CY ke Gudang)</label>
                      <input 
                        type="number" min="0" value={formData.cogs_port_haulage_dest}
                        onChange={e => setFormData({...formData, cogs_port_haulage_dest: Number(e.target.value)})}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Last Mile (Gudang ke Consignee) - <span className="italic">Auto-fill ke WO Trucking</span></label>
                      <input 
                        type="number" min="0" value={formData.cogs_last_mile}
                        onChange={e => setFormData({...formData, cogs_last_mile: Number(e.target.value)})}
                        disabled={!['D2D', 'P2D'].includes(formData.delivery_type)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm disabled:bg-slate-100 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Lainnya */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lainnya</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Dokumentasi / BL Fee</label>
                        <input 
                          type="number" min="0" value={formData.cogs_documentation}
                          onChange={e => setFormData({...formData, cogs_documentation: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Lain-lain</label>
                        <input 
                          type="number" min="0" value={formData.cogs_other}
                          onChange={e => setFormData({...formData, cogs_other: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Margin Kalkulator Mini */}
                  <div className="mt-6 pt-4 border-t-2 border-slate-200">
                    <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Est. Gross Margin per Container</div>
                        <div className={`text-lg font-bold ${(formData.sell_price - calculateTotalCogs(formData)) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Rp {(formData.sell_price - calculateTotalCogs(formData)).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-medium">Margin Percentage</div>
                        <div className={`text-lg font-bold ${(formData.sell_price - calculateTotalCogs(formData)) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formData.sell_price > 0 ? (((formData.sell_price - calculateTotalCogs(formData)) / formData.sell_price) * 100).toFixed(1) : '0'}%
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {selectedItem ? 'Simpan Perubahan' : 'Tambah Harga'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Master Harga?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus harga untuk rute <b>{selectedItem?.origin_port} → {selectedItem?.destination_port}</b> ({selectedItem?.container_type})? 
                Data yang sudah dihapus tidak dapat dikembalikan. Harga pada WO yang sudah dibuat tidak akan terpengaruh karena menggunakan snapshot.
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedItem(null);
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleDelete} 
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white flex-1"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
