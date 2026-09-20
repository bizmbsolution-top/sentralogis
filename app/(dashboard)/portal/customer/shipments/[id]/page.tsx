'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, MapPin, Calendar, Tag } from 'lucide-react';

interface ShipmentAggregate {
  id: string;
  shipment_number: string;
  status: string;
  origin_port: string;
  destination_port: string;
  vessel?: string;
  voyage?: string;
  eta?: string;
  etd?: string;
  container_type?: string;
  container_count?: number;
  total_quantity?: number;
  unit_of_measure?: string;
  created_at: string;
  updated_at: string;
  shipment_items?: Array<{
    id: string;
    description: string;
    hs_code?: string;
    quantity: number;
    unit_of_measure?: string;
    weight?: number;
  }>;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
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

export default function CustomerShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [shipment, setShipment] = useState<ShipmentAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string>('');

  useEffect(() => {
    params.then(p => setResolvedId(p.id));
  }, [params]);

  const fetchShipment = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/forwarding/shipments/${id}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch shipment`);
      }
      const json = await res.json();
      setShipment(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resolvedId) fetchShipment(resolvedId);
  }, [resolvedId, fetchShipment]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Shipment Details</h1>
        </div>
        <div className="px-4 py-8 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading shipment...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Shipment Details</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-red-500 text-sm mb-3">{error || 'Shipment not found'}</p>
          <button
            onClick={() => resolvedId && fetchShipment(resolvedId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Retry
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
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">{shipment.shipment_number || '—'}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(shipment.status)}`}>
            {statusLabel(shipment.status)}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Route</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 font-medium">Origin</span>
              <span className="text-slate-500">{shipment.origin_port || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 font-medium">Destination</span>
              <span className="text-slate-500">{shipment.destination_port || '—'}</span>
            </div>
            {shipment.vessel && (
              <div className="flex items-center gap-2 text-sm">
                <ShipIcon className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">Vessel</span>
                <span className="text-slate-500">{shipment.vessel}</span>
              </div>
            )}
            {shipment.voyage && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">Voyage</span>
                <span className="text-slate-500">{shipment.voyage}</span>
              </div>
            )}
            {shipment.etd && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">ETD</span>
                <span className="text-slate-500">{formatDate(shipment.etd)}</span>
              </div>
            )}
            {shipment.eta && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">ETA</span>
                <span className="text-slate-500">{formatDate(shipment.eta)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cargo</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Container Type</span>
              <p className="text-slate-700 font-medium">{shipment.container_type || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Containers</span>
              <p className="text-slate-700 font-medium">{shipment.container_count || 0}</p>
            </div>
            <div>
              <span className="text-slate-500">Quantity</span>
              <p className="text-slate-700 font-medium">{shipment.total_quantity || 0} {shipment.unit_of_measure}</p>
            </div>
          </div>
        </div>

        {shipment.shipment_items && shipment.shipment_items.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Items</h3>
            <div className="space-y-2">
              {shipment.shipment_items.map((item) => (
                <div key={item.id} className="py-2 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-700">{item.description}</p>
                  <div className="flex gap-3 text-xs text-slate-500 mt-1">
                    {item.hs_code && <span>HS: {item.hs_code}</span>}
                    <span>Qty: {item.quantity} {item.unit_of_measure}</span>
                    {item.weight && <span>Wt: {item.weight} kg</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12c0 5-4 10-10 10S2 17 2 12 6 2 12 2s10 5 10 10z" />
      <path d="M12 16V8" />
      <path d="M9 11l3 3 3-3" />
    </svg>
  );
}
