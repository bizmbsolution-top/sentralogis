'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Info, Check, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransportersFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function TransportersFormModal({ isOpen, onClose, onSuccess, initialData }: TransportersFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'fleets' | 'drivers'>('details');
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assignedFleetIds, setAssignedFleetIds] = useState<string[]>([]);
  const [assignedDriverIds, setAssignedDriverIds] = useState<string[]>([]);
  
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    transporter_code: initialData?.transporter_code || '',
    transporter_name: initialData?.transporter_name || '',
    transporter_type: initialData?.transporter_type || 'VENDOR',
    contact_person: initialData?.contact_person || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    tax_id: initialData?.tax_id || '',
    contract_number: initialData?.contract_number || '',
    contract_start_date: initialData?.contract_start_date || '',
    contract_end_date: initialData?.contract_end_date || '',
    payment_terms: initialData?.payment_terms || '',
    is_active: initialData?.is_active ?? true,
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData?.id) {
        fetchAssignments();
      }
      fetchAvailableResources();
    }
  }, [isOpen, initialData]);

  const fetchAvailableResources = async () => {
    const [fRes, dRes] = await Promise.all([
      supabase.from('md_fleets').select('id, plate_number, status'),
      supabase.from('md_drivers').select('id, full_name, status')
    ]);
    setFleets(fRes.data || []);
    setDrivers(dRes.data || []);
  };

  const fetchAssignments = async () => {
    const [fAssign, dAssign] = await Promise.all([
      supabase.from('md_transporter_fleets').select('fleet_id').eq('transporter_id', initialData.id),
      supabase.from('md_transporter_drivers').select('driver_id').eq('transporter_id', initialData.id)
    ]);
    setAssignedFleetIds(((fAssign.data as any[]) || []).map((a: any) => a.fleet_id || '').filter(Boolean));
    setAssignedDriverIds(((dAssign.data as any[]) || []).map((a: any) => a.driver_id || '').filter(Boolean));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.transporter_name || !formData.transporter_code) {
      toast.error('Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...formData, created_by: user?.id };

      let transporterId = initialData?.id;

      if (transporterId) {
        const { error } = await (supabase
          .from('md_transporters' as any) as any)
          .update(payload)
          .eq('id', transporterId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase
          .from('md_transporters' as any) as any)
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        transporterId = (data as any)?.id;
      }

      // Handle Assignments (Simplified: Delete all and re-insert)
      if (transporterId) {
        await Promise.all([
          (supabase.from('md_transporter_fleets' as any) as any).delete().eq('transporter_id', transporterId),
          (supabase.from('md_transporter_drivers' as any) as any).delete().eq('transporter_id', transporterId)
        ]);

        if (assignedFleetIds.length > 0) {
          await (supabase.from('md_transporter_fleets' as any) as any).insert(
            assignedFleetIds.map(fid => ({ transporter_id: transporterId, fleet_id: fid }))
          );
        }

        if (assignedDriverIds.length > 0) {
          await (supabase.from('md_transporter_drivers' as any) as any).insert(
            assignedDriverIds.map(did => ({ transporter_id: transporterId, driver_id: did }))
          );
        }
      }

      toast.success(initialData ? 'Transporter updated' : 'Transporter created');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFleet = (id: string) => {
    setAssignedFleetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleDriver = (id: string) => {
    setAssignedDriverIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[90vh]">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Transporter' : 'Add Transporter'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-6">
          <button 
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('fleets')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fleets' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Assign Fleets ({assignedFleetIds.length})
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'drivers' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Assign Drivers ({assignedDriverIds.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'details' && (
            <form id="transporter-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Transporter Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                    placeholder="e.g. PT Jaya Transport"
                  />
                </div>
                <div>
                  <label className="form-label">Transporter Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.transporter_code}
                    onChange={(e) => setFormData({ ...formData, transporter_code: e.target.value.toUpperCase() })}
                    placeholder="TR-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={formData.transporter_type}
                    onChange={(e) => setFormData({ ...formData, transporter_type: e.target.value as 'OWN' | 'VENDOR' })}
                  >
                    <option value="OWN">OWN (Internal)</option>
                    <option value="VENDOR">VENDOR (External)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {formData.transporter_type === 'VENDOR' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contract Details</h3>
                  <div>
                    <label className="form-label text-xs">Contract Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.contract_number}
                      onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-xs">Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.contract_start_date}
                        onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.contract_end_date}
                        onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Tax ID (NPWP)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Address</label>
                <textarea
                  className="form-input min-h-[60px]"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </form>
          )}

          {activeTab === 'fleets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                <Info size={14} />
                Select vehicles owned by this transporter.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fleets.map(fleet => (
                  <button
                    key={fleet.id}
                    onClick={() => toggleFleet(fleet.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${assignedFleetIds.includes(fleet.id) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                  >
                    <div>
                      <div className="font-bold">{fleet.plate_number}</div>
                      <div className={`text-[10px] uppercase ${assignedFleetIds.includes(fleet.id) ? 'text-slate-400' : 'text-slate-400'}`}>{fleet.status}</div>
                    </div>
                    {assignedFleetIds.includes(fleet.id) && <Check size={16} />}
                  </button>
                ))}
                {fleets.length === 0 && <p className="text-center py-8 text-slate-400 text-sm col-span-2">No fleets available</p>}
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                <Info size={14} />
                Select drivers working for this transporter.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {drivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => toggleDriver(driver.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${assignedDriverIds.includes(driver.id) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                  >
                    <div>
                      <div className="font-bold">{driver.full_name}</div>
                      <div className={`text-[10px] uppercase ${assignedDriverIds.includes(driver.id) ? 'text-slate-400' : 'text-slate-400'}`}>{driver.status}</div>
                    </div>
                    {assignedDriverIds.includes(driver.id) && <Check size={16} />}
                  </button>
                ))}
                {drivers.length === 0 && <p className="text-center py-8 text-slate-400 text-sm col-span-2">No drivers available</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            form="transporter-form"
            onClick={handleSubmit} 
            disabled={loading} 
            className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Transporter' : 'Save Transporter'}
          </button>
        </div>
      </div>
    </div>
  );
}
