'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import GoogleMapsInput from './GoogleMapsInput';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function LocationsFormModal({ isOpen, onClose, onSuccess, initialData }: LocationsFormModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const [formData, setFormData] = useState({
    location_code: initialData?.location_code || '',
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    postal_code: initialData?.postal_code || '',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    is_active: initialData?.is_active ?? true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location_code) {
      toast.error('Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('md_locations')
          .update(formData)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Location updated');
      } else {
        const { error } = await supabase
          .from('md_locations')
          .insert([formData]);
        if (error) throw error;
        toast.success('Location created');
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
            {initialData ? 'Edit Location' : 'Add New Location'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Location Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.location_code}
                onChange={(e) => setFormData({ ...formData, location_code: e.target.value.toUpperCase() })}
                placeholder="e.g. WH-JKT-01"
              />
            </div>
            <div>
              <label className="form-label">Location Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Warehouse Jakarta Pusat"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Search Address (Google Maps)</label>
            <GoogleMapsInput
              value={formData.address}
              onChange={(data) => {
                setFormData({
                  ...formData,
                  address: data.address,
                  city: data.city,
                  province: data.province,
                  latitude: data.latitude,
                  longitude: data.longitude,
                });
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Province</label>
              <input
                type="text"
                className="form-input"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active Location</label>
          </div>
        </form>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Location' : 'Save Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
