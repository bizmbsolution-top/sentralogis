'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FleetTypesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function FleetTypesFormModal({ isOpen, onClose, onSuccess, initialData }: FleetTypesFormModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const [formData, setFormData] = useState({
    type_code: initialData?.type_code || '',
    type_name: initialData?.type_name || '',
    capacity_ton: initialData?.capacity_ton || 0,
    capacity_cbm: initialData?.capacity_cbm || 0,
    dimension: initialData?.dimension || { length: 0, width: 0, height: 0 },
    is_active: initialData?.is_active ?? true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type_name || !formData.type_code) {
      toast.error('Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('md_fleet_types')
          .update(formData)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Fleet Type updated');
      } else {
        const { error } = await supabase
          .from('md_fleet_types')
          .insert([formData]);
        if (error) throw error;
        toast.success('Fleet Type created');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Fleet Type' : 'Add Fleet Type'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.type_code}
                onChange={(e) => setFormData({ ...formData, type_code: e.target.value.toUpperCase() })}
                placeholder="TR-20"
              />
            </div>
            <div>
              <label className="form-label">Type Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.type_name}
                onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                placeholder="Trailer 20ft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Capacity (Ton)</label>
              <input
                type="number"
                className="form-input"
                value={formData.capacity_ton}
                onChange={(e) => setFormData({ ...formData, capacity_ton: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="form-label">Capacity (CBM)</label>
              <input
                type="number"
                className="form-input"
                value={formData.capacity_cbm}
                onChange={(e) => setFormData({ ...formData, capacity_cbm: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="form-label">Dimension (cm) - L x W x H</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                className="form-input"
                placeholder="L"
                value={formData.dimension.length}
                onChange={(e) => setFormData({ ...formData, dimension: { ...formData.dimension, length: parseInt(e.target.value) } })}
              />
              <input
                type="number"
                className="form-input"
                placeholder="W"
                value={formData.dimension.width}
                onChange={(e) => setFormData({ ...formData, dimension: { ...formData.dimension, width: parseInt(e.target.value) } })}
              />
              <input
                type="number"
                className="form-input"
                placeholder="H"
                value={formData.dimension.height}
                onChange={(e) => setFormData({ ...formData, dimension: { ...formData.dimension, height: parseInt(e.target.value) } })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_ft"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
            />
            <label htmlFor="is_active_ft" className="text-sm font-medium text-slate-700">Active Type</label>
          </div>
        </form>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Type' : 'Save Type'}
          </button>
        </div>
      </div>
    </div>
  );
}
