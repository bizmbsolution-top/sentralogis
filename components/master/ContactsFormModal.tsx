'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import GoogleMapsInput from './GoogleMapsInput';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface ContactsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const ContactsFormModal: React.FC<ContactsFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_type: initialData?.contact_type || 'CUSTOMER',
    code: initialData?.code || '',
    name: initialData?.name || '',
    legal_name: initialData?.legal_name || '',
    tax_id: initialData?.tax_id || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    mobile: initialData?.mobile || '',
    whatsapp: initialData?.whatsapp || '',
    address: initialData?.address || {
      street: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Indonesia',
      latitude: null,
      longitude: null,
    },
    notes: initialData?.notes || '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        ...formData,
        created_by: userData.user?.id,
      };

      let error;
      if (initialData?.id) {
        ({ error } = await supabase
          .from('md_contacts')
          .update(payload)
          .eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('md_contacts').insert([payload]));
      }

      if (error) throw error;

      toast.success(initialData ? 'Contact updated' : 'Contact created');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={formData.contact_type}
                    onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="SHIPPER">Shipper</option>
                    <option value="RECIPIENT">Recipient</option>
                    <option value="BROKER">Broker</option>
                    <option value="TENANT">Tenant</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Code</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CUST-001"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name or company name"
                />
              </div>

              <div>
                <label className="form-label">Legal Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="Official registered name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Tax ID (NPWP)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="00.000.000.0-000.000"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <label className="form-label">Mobile</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">WhatsApp</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input min-h-[100px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Location Details</h3>
              <GoogleMapsInput
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
              />
            </div>
          </div>
        </form>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary min-w-[120px]"
            disabled={loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update Contact' : 'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactsFormModal;
