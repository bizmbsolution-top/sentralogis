'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FleetsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function FleetsFormModal({ isOpen, onClose, onSuccess, initialData }: FleetsFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [fleetTypes, setFleetTypes] = useState<any[]>([]);
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    fleet_type_id: initialData?.fleet_type_id || '',
    fleet_code: initialData?.fleet_code || '',
    plate_number: initialData?.plate_number || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    stnk_number: initialData?.stnk_number || '',
    stnk_expiry: initialData?.stnk_expiry || '',
    kir_expiry: initialData?.kir_expiry || '',
    status: initialData?.status || 'available',
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchFleetTypes();
    }
  }, [isOpen]);

  const fetchFleetTypes = async () => {
    const { data } = await supabase.from('md_fleet_types').select('id, type_name').eq('is_active', true);
    setFleetTypes(data || []);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate_number || !formData.fleet_type_id || !formData.stnk_expiry || !formData.kir_expiry) {
      toast.error('Plate number, Type, and Expiry dates are required');
      return;
    }

    // Validation for expiry
    const today = new Date();
    if (new Date(formData.stnk_expiry) < today) {
      toast.error('STNK cannot be expired');
      return;
    }
    if (new Date(formData.kir_expiry) < today) {
      toast.error('KIR cannot be expired');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...formData, created_by: user?.id };

      if (initialData?.id) {
        const { error } = await (supabase
          .from('md_fleets' as any) as any)
          .update(payload)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Fleet vehicle updated');
      } else {
        const { error } = await (supabase
          .from('md_fleets' as any) as any)
          .insert([payload]);
        if (error) throw error;
        toast.success('Fleet vehicle created');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Fleet Vehicle' : 'Add New Vehicle'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fleet Type</label>
              <select
                className="form-input"
                value={formData.fleet_type_id}
                onChange={(e) => setFormData({ ...formData, fleet_type_id: e.target.value })}
              >
                <option value="">-- Select Type --</option>
                {fleetTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Plate Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                placeholder="B 1234 ABC"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Fleet Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.fleet_code}
                onChange={(e) => setFormData({ ...formData, fleet_code: e.target.value.toUpperCase() })}
                placeholder="VHC-01"
              />
            </div>
            <div>
              <label className="form-label">Brand</label>
              <input
                type="text"
                className="form-input"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Model</label>
              <input
                type="text"
                className="form-input"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">STNK Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.stnk_number}
                onChange={(e) => setFormData({ ...formData, stnk_number: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="available">Available</option>
                <option value="on_road">On Road</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <label className="form-label">STNK Expiry</label>
              <input
                type="date"
                className="form-input"
                value={formData.stnk_expiry}
                onChange={(e) => setFormData({ ...formData, stnk_expiry: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">KIR Expiry</label>
              <input
                type="date"
                className="form-input"
                value={formData.kir_expiry}
                onChange={(e) => setFormData({ ...formData, kir_expiry: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input min-h-[80px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </form>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Vehicle' : 'Save Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}
