'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateDriverCodeAction } from '@/lib/actions/masterCodeActions';

const isDuplicateDriverPhoneError = (error: any) => {
  const message = String(
    error?.message ||
    error?.details ||
    error?.hint ||
    ''
  ).toLowerCase();

  const constraint = String(
    error?.constraint ||
    ''
  ).toLowerCase();

  return (
    error?.code === '23505' &&
    (
      constraint.includes('md_drivers_tenant_whatsapp_unique') ||
      message.includes('md_drivers_tenant_whatsapp_unique') ||
      (
        message.includes('unique') &&
        message.includes('whatsapp')
      )
    )
  );
};


interface DriversFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function DriversFormModal({ isOpen, onClose, onSuccess, initialData }: DriversFormModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    driver_code: initialData?.driver_code || '',
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
    address: initialData?.address || '',
    sim_number: initialData?.sim_number || '',
    sim_class: initialData?.sim_class || 'B1',
    sim_expiry: initialData?.sim_expiry || '',
    status: initialData?.status || 'available',
    medical_expiry: initialData?.medical_expiry || '',
    last_medical_check: initialData?.last_medical_check || '',
    notes: initialData?.notes || '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone || !formData.sim_expiry) {
      toast.error('Full name, Phone, and SIM expiry are required');
      return;
    }

    // Phone validation (simple)
    if (!/^\d{10,15}$/.test(formData.phone)) {
       toast.error('Invalid phone number format');
       return;
    }

    // Validation for SIM expiry
    if (new Date(formData.sim_expiry) < new Date()) {
      toast.error('SIM cannot be expired');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...formData, created_by: user?.id };

      if (initialData?.id) {
        const { error } = await supabase
          .from('md_drivers')
          .update(payload)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Driver updated');
      } else {
        const codeToUse = formData.driver_code || await generateDriverCodeAction();
        let { error } = await supabase
          .from('md_drivers')
          .insert([{ ...payload, driver_code: codeToUse }]);

        if (error && (error.code === '23505' || error.message?.toLowerCase().includes('unique') || error.message?.toLowerCase().includes('duplicate'))) {
          const fallbackCode = `DRI/${Date.now().toString().slice(-4)}`;
          const retryRes = await supabase
            .from('md_drivers')
            .insert([{ ...payload, driver_code: fallbackCode }]);
          if (retryRes.error) throw retryRes.error;
          error = null;
        } else if (error) {
          throw error;
        }

        toast.success('Driver created');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
        if (isDuplicateDriverPhoneError(error)) {
          toast.error('Nomor WhatsApp sudah digunakan oleh driver lain di tenant ini.');
        } else {
          toast.error(error.message);
        }
      } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Driver' : 'Add New Driver'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="form-label">Driver Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.driver_code}
                onChange={(e) => setFormData({ ...formData, driver_code: e.target.value.toUpperCase() })}
                placeholder="DRV-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081234567890"
              />
            </div>
            <div>
              <label className="form-label">WhatsApp (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="081234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <label className="form-label">SIM Class</label>
              <select
                className="form-input"
                value={formData.sim_class}
                onChange={(e) => setFormData({ ...formData, sim_class: e.target.value })}
              >
                <option value="A">A</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C">C</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">SIM Expiry</label>
              <input
                type="date"
                className="form-input"
                value={formData.sim_expiry}
                onChange={(e) => setFormData({ ...formData, sim_expiry: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">SIM Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.sim_number}
                onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
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
                <option value="on_duty">On Duty</option>
                <option value="unavailable">Unavailable (Sakit/Cuti)</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Address</label>
            <textarea
              className="form-input min-h-[60px]"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Medical Expiry</label>
              <input
                type="date"
                className="form-input"
                value={formData.medical_expiry}
                onChange={(e) => setFormData({ ...formData, medical_expiry: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Last Medical Check</label>
              <input
                type="date"
                className="form-input"
                value={formData.last_medical_check}
                onChange={(e) => setFormData({ ...formData, last_medical_check: e.target.value })}
              />
            </div>
          </div>
        </form>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Driver' : 'Save Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}
