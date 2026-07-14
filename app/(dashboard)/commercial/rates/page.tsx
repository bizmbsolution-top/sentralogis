'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Truck, 
  Warehouse, 
  FileSpreadsheet, 
  Globe, 
  User, 
  Search, 
  ChevronRight, 
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';

export default function CustomerRatesPage() {
  const { user, profile } = useAuth();
  
  // Data State
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [activeSbu, setActiveSbu] = useState<string>('TRUCKING');
  const [rates, setRates] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);

  // Form State (Add / Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null); // null means adding new
  const [formState, setFormState] = useState({
    service_name: '',
    description: '',
    uom: 'Trip',
    unit_price: 0,
    pricing_type: 'ONE_TIME',
    min_qty: 0,
    route_origin: '',
    route_destination: '',
    is_active: true,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCustomerId && activeSbu) {
      fetchRates();
    } else {
      setRates([]);
    }
  }, [selectedCustomerId, activeSbu]);

  async function fetchCustomers() {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('md_entities')
        .select('id, name, entity_type')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      setCustomers(data || []);
      if (data && data.length > 0) {
        setSelectedCustomerId(data[0].id);
      }
    } catch (err) {
      console.warn('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function fetchRates() {
    setLoadingRates(true);
    try {
      const { data, error } = await supabase
        .from('crm_sbu_customer_rates')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .eq('sbu_type', activeSbu)
        .order('service_name', { ascending: true });
      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      console.warn('Error fetching rates:', err);
    } finally {
      setLoadingRates(false);
    }
  }

  const openAddModal = () => {
    setEditingRate(null);
    setFormState({
      service_name: '',
      description: '',
      uom: activeSbu === 'TRUCKING' ? 'Trip' : activeSbu === 'WAREHOUSE' ? 'CBM' : 'Document',
      unit_price: 0,
      pricing_type: 'ONE_TIME',
      min_qty: 0,
      route_origin: '',
      route_destination: '',
      is_active: true,
      notes: ''
    });
    setShowFormModal(true);
  };

  const openEditModal = (rate: any) => {
    setEditingRate(rate);
    setFormState({
      service_name: rate.service_name || '',
      description: rate.description || '',
      uom: rate.uom || 'Unit',
      unit_price: Number(rate.unit_price) || 0,
      pricing_type: rate.pricing_type || 'ONE_TIME',
      min_qty: Number(rate.min_qty) || 0,
      route_origin: rate.route_origin || '',
      route_destination: rate.route_destination || '',
      is_active: rate.is_active !== false,
      notes: rate.notes || ''
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.service_name || formState.unit_price < 0) return;
    setSubmitting(true);

    try {
      if (editingRate) {
        // Update
        const { error } = await supabase
          .from('crm_sbu_customer_rates')
          .update({
            service_name: formState.service_name,
            description: formState.description,
            uom: formState.uom,
            unit_price: formState.unit_price,
            pricing_type: formState.pricing_type,
            min_qty: formState.min_qty,
            route_origin: activeSbu === 'TRUCKING' ? formState.route_origin : null,
            route_destination: activeSbu === 'TRUCKING' ? formState.route_destination : null,
            is_active: formState.is_active,
            notes: formState.notes,
            updated_by: user?.id
          })
          .eq('id', editingRate.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('crm_sbu_customer_rates')
          .insert([{
            tenant_id: profile?.tenant_id,
            customer_id: selectedCustomerId,
            sbu_type: activeSbu,
            service_name: formState.service_name,
            description: formState.description,
            uom: formState.uom,
            unit_price: formState.unit_price,
            pricing_type: formState.pricing_type,
            min_qty: formState.min_qty,
            route_origin: activeSbu === 'TRUCKING' ? formState.route_origin : null,
            route_destination: activeSbu === 'TRUCKING' ? formState.route_destination : null,
            is_active: formState.is_active,
            notes: formState.notes,
            created_by: user?.id
          }]);
        if (error) throw error;
      }

      setShowFormModal(false);
      fetchRates();
    } catch (err: any) {
      alert("Gagal menyimpan tarif: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tarif pelanggan ini?')) return;
    try {
      const { error } = await supabase
        .from('crm_sbu_customer_rates')
        .delete()
        .eq('id', rateId);
      if (error) throw error;
      fetchRates();
    } catch (err: any) {
      alert("Gagal menghapus tarif: " + err.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const getSbuIcon = (sbu: string) => {
    switch (sbu) {
      case 'TRUCKING': return <Truck className="w-4 h-4" />;
      case 'WAREHOUSE': return <Warehouse className="w-4 h-4" />;
      case 'CLEARANCE': return <FileSpreadsheet className="w-4 h-4" />;
      case 'FORWARDING': return <Globe className="w-4 h-4" />;
      default: return <Sliders className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customer Rate Cards</h1>
          <p className="text-slate-500 text-xs mt-1">Kelola master daftar tarif dan rute logistik khusus per pelanggan.</p>
        </div>
        <button 
          onClick={openAddModal}
          disabled={!selectedCustomerId}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Rate Entry
        </button>
      </div>

      {/* Select Customer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 md:flex-initial">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Pelanggan / Entitas</label>
            {loadingCustomers ? (
              <span className="text-xs text-slate-400 italic">Memuat pelanggan...</span>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full md:w-80 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {customers.map(cust => (
                  <option key={cust.id} value={cust.id}>{cust.name} ({cust.entity_type})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 italic">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>Tarif di sini akan otomatis tersedia saat membuat Quotation untuk pelanggan terpilih.</span>
        </div>
      </div>

      {/* SBU Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1 scrollbar-none">
        {['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'].map(sbu => {
          const isActive = activeSbu === sbu;
          return (
            <button
              key={sbu}
              onClick={() => setActiveSbu(sbu)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all duration-200 ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {getSbuIcon(sbu)}
              <span>{sbu} SERVICES</span>
            </button>
          );
        })}
      </div>

      {/* Rates Table/Grid */}
      {loadingRates ? (
        <div className="py-12 text-center text-slate-400 text-sm">Memuat daftar tarif...</div>
      ) : rates.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center p-6">
          <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">Belum Ada Tarif Terdaftar</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Pelanggan ini belum memiliki tarif khusus untuk layanan {activeSbu}. Klik "Add Rate Entry" untuk menambahkan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <th className="px-6 py-4">Nama Layanan</th>
                  {activeSbu === 'TRUCKING' && (
                    <>
                      <th className="px-6 py-4">Asal (Origin)</th>
                      <th className="px-6 py-4">Tujuan (Destination)</th>
                    </>
                  )}
                  {activeSbu === 'WAREHOUSE' && <th className="px-6 py-4">Pricing Model</th>}
                  <th className="px-6 py-4">UOM</th>
                  <th className="px-6 py-4">Harga Unit</th>
                  <th className="px-6 py-4">Min. Qty</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map(rate => (
                  <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div>
                        {rate.service_name}
                        {rate.description && <p className="text-[10px] font-normal text-slate-400 mt-0.5">{rate.description}</p>}
                      </div>
                    </td>
                    {activeSbu === 'TRUCKING' && (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-600">{rate.route_origin || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{rate.route_destination || '-'}</td>
                      </>
                    )}
                    {activeSbu === 'WAREHOUSE' && (
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rate.pricing_type === 'RECURRING_MONTHLY' 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rate.pricing_type === 'RECURRING_MONTHLY' ? 'Recurring / Bln' : 'One-Time'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-600 font-bold">{rate.uom}</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">{formatCurrency(rate.unit_price)}</td>
                    <td className="px-6 py-4 text-slate-600">{rate.min_qty || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rate.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {rate.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(rate)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRate(rate.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowFormModal(false)}></div>
          
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-800">
                {editingRate ? 'Edit Rate Entry' : 'Add Rate Entry'} ({activeSbu})
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Layanan / Tarif *</label>
                <input
                  required
                  type="text"
                  placeholder="E.g., Sewa Gudang Standard, Trucking Wingbox 20ft"
                  value={formState.service_name}
                  onChange={e => setFormState({ ...formState, service_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan opsional..."
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {activeSbu === 'TRUCKING' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Asal (Origin)</label>
                    <input
                      type="text"
                      placeholder="Jakarta, Cikarang"
                      value={formState.route_origin}
                      onChange={e => setFormState({ ...formState, route_origin: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tujuan (Destination)</label>
                    <input
                      type="text"
                      placeholder="Surabaya, Semarang"
                      value={formState.route_destination}
                      onChange={e => setFormState({ ...formState, route_destination: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeSbu === 'WAREHOUSE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pricing Model</label>
                    <select
                      value={formState.pricing_type}
                      onChange={e => setFormState({ ...formState, pricing_type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ONE_TIME">One-Time (Per Aktivitas)</option>
                      <option value="RECURRING_MONTHLY">Recurring (Bulanan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Minimum Qty</label>
                    <FormattedNumberInput
                      value={formState.min_qty}
                      onChange={val => setFormState({ ...formState, min_qty: val })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">UOM *</label>
                  <input
                    required
                    type="text"
                    placeholder="Trip, CBM, Pallet, Box"
                    value={formState.uom}
                    onChange={e => setFormState({ ...formState, uom: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga Satuan (IDR) *</label>
                  <FormattedNumberInput
                    required
                    placeholder="Masukkan harga"
                    value={formState.unit_price}
                    onChange={val => setFormState({ ...formState, unit_price: val })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Syarat & Ketentuan Tambahan (T&C)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan khusus tarif ini..."
                  value={formState.notes}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formState.is_active}
                  onChange={e => setFormState({ ...formState, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-xs font-bold text-slate-600 select-none">Tarif ini aktif dan dapat digunakan</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold active:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
