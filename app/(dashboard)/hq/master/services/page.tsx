'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Edit2, Trash2, Tag, RefreshCw } from 'lucide-react';

interface MasterService {
  id: string;
  sbu_type: string;
  charge_code: string;
  service_name: string;
  category: string;
  default_uom: string;
  description: string;
  is_active: boolean;
  income_account_id: string | null;
  income_account?: { account_number: string; account_name: string } | null;
}

interface COA {
  id: string;
  account_number: string;
  account_name: string;
}

export default function MasterServicesPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [services, setServices] = useState<MasterService[]>([]);
  const [revenueCoas, setRevenueCoas] = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSbu, setFilterSbu] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sbu_type: 'WAREHOUSE',
    charge_code: '',
    service_name: '',
    category: 'STORAGE',
    default_uom: 'PALLET',
    description: '',
    income_account_id: ''
  });

  const fetchServices = async () => {
    if (!tenantId) return;
    setLoading(true);
    
    // Fetch COAs for dropdown
    const coaRes = await supabase
      .from('finance_coa')
      .select('id, account_number, account_name')
      .ilike('category', '%revenue%')
      .order('account_number');
    
    if (coaRes.data) setRevenueCoas(coaRes.data);

    // Fetch Services
    const { data, error } = await supabase
      .from('md_services')
      .select(`
        *,
        income_account:finance_coa!income_account_id(account_number, account_name)
      `)
      .eq('tenant_id', tenantId)
      .order('sbu_type')
      .order('charge_code');

    if (!error && data) {
      setServices(data as unknown as MasterService[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      sbu_type: formData.sbu_type,
      charge_code: formData.charge_code,
      service_name: formData.service_name,
      category: formData.category,
      default_uom: formData.default_uom,
      description: formData.description,
      income_account_id: formData.income_account_id || null, // Allow null to trigger Auto-COA database trigger!
    };

    if (editingId) {
      await supabase.from('md_services').update(payload).eq('id', editingId);
    } else {
      await supabase.from('md_services').insert([payload]);
    }
    
    setIsModalOpen(false);
    fetchServices();
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      sbu_type: filterSbu !== 'ALL' ? filterSbu : 'WAREHOUSE',
      charge_code: '',
      service_name: '',
      category: 'VAS',
      default_uom: 'PCS',
      description: '',
      income_account_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: MasterService) => {
    setEditingId(service.id);
    setFormData({
      sbu_type: service.sbu_type,
      charge_code: service.charge_code,
      service_name: service.service_name,
      category: service.category,
      default_uom: service.default_uom || '',
      description: service.description || '',
      income_account_id: service.income_account_id || ''
    });
    setIsModalOpen(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('md_services').update({ is_active: !current }).eq('id', id);
    fetchServices();
  };

  const filteredServices = services.filter(s => {
    const matchSbu = filterSbu === 'ALL' || s.sbu_type === filterSbu;
    const matchSearch = s.service_name.toLowerCase().includes(search.toLowerCase()) || 
                        s.charge_code.toLowerCase().includes(search.toLowerCase());
    return matchSbu && matchSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Tag className="w-8 h-8 text-indigo-600" />
            Master Services & Charge Codes
          </h1>
          <p className="text-slate-500 mt-2">Kelola parameter tarif komersial dan pemetaan COA otomatis.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Service
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            {['ALL', 'WAREHOUSE', 'TRUCKING', 'CLEARANCE', 'FORWARDING', 'GENERAL'].map(sbu => (
              <button
                key={sbu}
                onClick={() => setFilterSbu(sbu)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterSbu === sbu 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sbu}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">SBU</th>
                <th className="px-6 py-4">Charge Code</th>
                <th className="px-6 py-4">Service Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">UOM</th>
                <th className="px-6 py-4">Income COA Mapping</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading services...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No services found. Try adding a new one.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{srv.sbu_type}</td>
                    <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono text-xs border border-slate-200">{srv.charge_code}</span></td>
                    <td className="px-6 py-4 font-medium text-slate-900">{srv.service_name}</td>
                    <td className="px-6 py-4">{srv.category}</td>
                    <td className="px-6 py-4">{srv.default_uom}</td>
                    <td className="px-6 py-4">
                      {srv.income_account ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{srv.income_account.account_number}</span>
                          <span className="truncate max-w-[150px]" title={srv.income_account.account_name}>{srv.income_account.account_name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-xs font-medium bg-amber-50 px-2 py-1 rounded border border-amber-100">Not Mapped</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleActive(srv.id, srv.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          srv.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        }`}
                      >
                        {srv.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditModal(srv)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SBU Type <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formData.sbu_type} 
                    onChange={e => setFormData({...formData, sbu_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="TRUCKING">Trucking</option>
                    <option value="CLEARANCE">Clearance</option>
                    <option value="FORWARDING">Forwarding</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="STORAGE">Storage</option>
                    <option value="HANDLING">Handling</option>
                    <option value="VAS">Value Added Service (VAS)</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="CLEARANCE">Clearance</option>
                    <option value="ADMIN">Administration</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Charge Code <span className="text-rose-500">*</span></label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. VAS-STK-01"
                    value={formData.charge_code} 
                    onChange={e => setFormData({...formData, charge_code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Default UOM <span className="text-rose-500">*</span></label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. PALLET, PCS, TRIP"
                    value={formData.default_uom} 
                    onChange={e => setFormData({...formData, default_uom: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Name <span className="text-rose-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Biaya Pasang Stiker Barcode"
                  value={formData.service_name} 
                  onChange={e => setFormData({...formData, service_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-sm font-semibold text-indigo-900 mb-1.5">
                  Income Account (COA Mapping)
                </label>
                <p className="text-xs text-indigo-600 mb-3">
                  Pilih akun pendapatan untuk otomatisasi jurnal. <strong className="font-semibold">Jika dikosongkan, sistem akan otomatis membuatkan akun baru untuk Anda.</strong>
                </p>
                <select 
                  value={formData.income_account_id} 
                  onChange={e => setFormData({...formData, income_account_id: e.target.value})}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">-- [AUTO-GENERATE] Buatkan Akun Pendapatan Baru --</option>
                  {revenueCoas.map(coa => (
                    <option key={coa.id} value={coa.id}>{coa.account_number} - {coa.account_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
