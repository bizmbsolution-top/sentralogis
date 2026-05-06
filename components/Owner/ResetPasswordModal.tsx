'use client';

import { useState } from 'react';
import { resetTenantPassword } from '@/app/(dashboard)/owner/actions';
import toast from 'react-hot-toast';
import { Key, X, RefreshCw, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  tenant: { user_id: string; name: string; admin_email: string } | null;
  onClose: () => void;
}

export default function ResetPasswordModal({ isOpen, tenant, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !tenant) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const res = await resetTenantPassword(tenant.user_id, newPassword);

      if (res.success) {
        toast.success(`Password untuk ${tenant.admin_email} berhasil direset!`);
        onClose();
        setNewPassword('');
      } else {
        toast.error(res.message || 'Gagal reset password');
      }
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 bg-amber-50 border-b border-amber-100">
          <div className="flex gap-3">
            <ShieldAlert className="text-amber-600 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-900">Konfirmasi Reset</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Anda akan mengubah password untuk akun: <br/>
                <span className="font-bold">{tenant.admin_email}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleReset} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button 
              type="button"
              onClick={generatePassword}
              className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Generate Password Acak
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Memproses...' : 'Reset Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
