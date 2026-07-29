'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ship, Package, Search, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function TrackingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    router.push(`/track/fwd/${encodeURIComponent(token.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-6">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Cargo Tracking
          </h1>
          <p className="text-slate-500 mt-2">
            Lacak status pengiriman forwarding Anda secara real-time
          </p>
        </div>

        <Card className="p-8 shadow-sm">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-1">
                Tracking Token
              </label>
              <div className="relative">
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Masukkan tracking token"
                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Lacak Pengiriman</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <Package className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">FCL / LCL</p>
            <p className="text-xs text-slate-500 mt-1">Kontainer penuh atau LCL</p>
          </Card>
          <Card className="p-4 text-center">
            <Ship className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">Hybrid Delivery</p>
            <p className="text-xs text-slate-500 mt-1">D2D / P2P / P2D</p>
          </Card>
        </div>
      </div>
    </div>
  );
}