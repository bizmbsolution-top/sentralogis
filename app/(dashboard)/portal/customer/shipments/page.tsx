'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Package, Ship, MapPin } from 'lucide-react';

interface ShipmentView {
  id: string;
  shipment_number: string;
  status: string;
  origin_port: string;
  destination_port: string;
  vessel?: string;
  voyage?: string;
  eta?: string;
  etd?: string;
  created_at: string;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    BOOKED: 'Booked',
    IN_TRANSIT: 'In Transit',
    AT_PORT: 'At Port',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
  };
  return map[status] || status.replace(/_/g, ' ');
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (['DELIVERED', 'COMPLETED'].includes(s)) return 'bg-emerald-100 text-emerald-700';
  if (['CANCELLED'].includes(s)) return 'bg-red-100 text-red-700';
  if (['IN_TRANSIT', 'AT_PORT'].includes(s)) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function CustomerShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/forwarding/shipments?limit=50', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch shipments`);
      }
      const json = await res.json();
      setShipments(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const filtered = searchQuery
    ? shipments.filter((s) =>
        s.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.vessel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.voyage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shipments;

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
        <h1 className="text-xl font-bold mb-1">My Shipments</h1>
        <p className="text-indigo-200 text-sm">Track your cargo in transit</p>
      </div>

      <div className="px-4 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shipment number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading your shipments...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button
              onClick={fetchShipments}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Ship className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No shipments found</p>
            <p className="text-slate-400 text-xs mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Your shipments will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/portal/customer/shipments/${s.id}`)}
                className="w-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {s.shipment_number || '—'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>
                    {statusLabel(s.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{s.origin_port || '—'}</span>
                  <span>→</span>
                  <span>{s.destination_port || '—'}</span>
                </div>
                {s.eta && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>ETA: {formatDate(s.eta)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
