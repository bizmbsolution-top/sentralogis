'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, FileText, Wallet, LogOut, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const { profile, logout, loading: isLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace('/login?redirect=/portal/customer');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
          <h1 className="text-lg font-bold">Profile</h1>
        </div>
        <div className="px-4 py-8 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
          <h1 className="text-lg font-bold">Profile</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-500 text-sm mb-4">No profile found</p>
          <button
            onClick={() => router.replace('/login?redirect=/portal/customer')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
        <p className="text-indigo-200 text-sm">Account information</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{profile.full_name}</h3>
              <span className="text-xs text-slate-500">{profile.role}</span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">{profile.email || '—'}</span>
            </div>
            {profile.whatsapp && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{profile.whatsapp}</span>
              </div>
            )}
            {profile.tenant_code && (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Tenant: {profile.tenant_code}</span>
              </div>
            )}
            {profile.customer_id && (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Customer ID: {profile.customer_id}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
