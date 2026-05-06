'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { Building2, Mail, User, ShieldCheck, X, RefreshCw, Key, Phone } from 'lucide-react';

interface RegisterTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterTenantModal({ isOpen, onClose, onSuccess }: RegisterTenantModalProps) {
  const [formData, setFormData] = useState({
    tenant_name: '',
    tenant_code: '',
    admin_email: '',
    admin_full_name: '',
    whatsapp: '',
    subscription_tier: 'premium'
  });
  const [loading, setLoading] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('register_tenant_test', {
        p_tenant_name: formData.tenant_name,
        p_tenant_code: formData.tenant_code.toUpperCase(),
        p_admin_email: formData.admin_email,
        p_admin_full_name: formData.admin_full_name,
        p_subscription_tier: formData.subscription_tier
      });

      if (error) throw error;

      if (data?.success) {
        // Update WhatsApp in profile if provided
        if (formData.whatsapp && data.user_id) {
          await supabase
            .from('profiles')
            .update({ whatsapp: formData.whatsapp })
            .eq('id', data.user_id);
        }
        
        toast.success('Tenant registered successfully!');
        setRegistrationResult(data);
        onSuccess();
      } else {
        toast.error(data?.message || 'Gagal register tenant');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Register New Tenant</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        {!registrationResult ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenant Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.tenant_name}
                    onChange={(e) => setFormData({...formData, tenant_name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="PT Maju Jaya"
                    required
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenant Code</label>
                <input 
                  type="text" 
                  value={formData.tenant_code}
                  onChange={(e) => setFormData({...formData, tenant_code: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-mono text-sm"
                  placeholder="MAJU001"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={formData.admin_email}
                  onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="admin@majujaya.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={formData.admin_full_name}
                  onChange={(e) => setFormData({...formData, admin_full_name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="Budi Santoso"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="6285218129978"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Tier</label>
              <select 
                value={formData.subscription_tier}
                onChange={(e) => setFormData({...formData, subscription_tier: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                Register Tenant
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-lg font-bold text-emerald-900">Registration Successful!</h4>
              <p className="text-emerald-700 text-sm mt-1">Please provide these credentials to the tenant admin.</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Temporary Password</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-mono font-bold text-slate-900 select-all">
                    {registrationResult.temp_password}
                  </p>
                  <Key size={16} className="text-slate-300" />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admin Email</p>
                <p className="text-slate-900 font-medium">{formData.admin_email}</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setRegistrationResult(null);
                onClose();
              }}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
            >
              Close & Refresh List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
