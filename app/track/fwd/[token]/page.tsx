'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Loader2, Package, Ship, MapPin, Phone, Truck, Anchor,
  CheckCircle2, Clock, AlertCircle, ExternalLink, ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

type TrackingStatus = 'pending' | 'received' | 'stuffed' | 'shipped' | 'arrived' | 'deconsoled' | 'delivered';

const STATUS_FLOW: { status: TrackingStatus; label: string; icon: any; color: string }[] = [
  { status: 'pending', label: 'Pending', icon: Clock, color: 'bg-slate-400' },
  { status: 'received', label: 'Diterima', icon: Package, color: 'bg-sky-400' },
  { status: 'stuffed', label: 'Distuff', icon: Package, color: 'bg-amber-400' },
  { status: 'shipped', label: 'Shipped', icon: Ship, color: 'bg-indigo-500' },
  { status: 'arrived', label: 'Arrived', icon: Anchor, color: 'bg-fuchsia-500' },
  { status: 'deconsoled', label: 'Deconsol', icon: Truck, color: 'bg-emerald-500' },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'bg-green-600' },
];

export default function CargoOwnerTrackingPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [cargo, setCargo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!token || typeof token !== 'string') return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await (supabase
        .from('fw_container_items' as any) as any)
        .select(`
          id, tracking_token, volume_cbm, gross_weight_kg, packages, package_type,
          commodity, description, delivery_type, delivery_address, delivery_contact, delivery_phone,
          goods_received_at, is_deconsoled, deconsoled_at,
          container_assignment:fw_container_assignments (
            id, container_number, container_type, seal_number, bl_number, status,
            consolidation:fw_consolidations (
              id, consol_number, vessel_name, voyage_number, origin_port, destination_port,
              etd, eta, actual_etd, actual_eta, shipping_line_name, status
            )
          ),
          wo_item:wo_items (
            id, item_code, status,
            work_order:work_orders (
              id, wo_number, status, order_date,
              customer:md_entities!customer_id (id, name, phone, address)
            )
          ),
          last_mile_wo:work_orders!last_mile_wo_id (
            id, wo_number, status
          )
        `)
        .eq('tracking_token', token)
        .eq('is_deconsoled', false)
        .maybeSingle();

      if (error) {
        console.error('Tracking fetch error:', error);
        setError('Data tracking tidak ditemukan atau token tidak valid.');
        setLoading(false);
        return;
      }

      if (!data) {
        const { data: deconsoledData } = await (supabase
          .from('fw_container_items' as any) as any)
          .select(`
            id, tracking_token, volume_cbm, gross_weight_kg, packages, package_type,
            commodity, description, delivery_type, delivery_address, delivery_contact, delivery_phone,
            goods_received_at, is_deconsoled, deconsoled_at,
            container_assignment:fw_container_assignments (
              id, container_number, container_type, seal_number, bl_number, status,
              consolidation:fw_consolidations (
                id, consol_number, vessel_name, voyage_number, origin_port, destination_port,
                etd, eta, actual_etd, actual_eta, shipping_line_name, status
              )
            ),
            wo_item:wo_items (
              id, item_code, status,
              work_order:work_orders (
                id, wo_number, status, order_date,
                customer:md_entities!customer_id (id, name, phone, address)
              )
            ),
            last_mile_wo:work_orders!last_mile_wo_id (
              id, wo_number, status
            )
          `)
          .eq('tracking_token', token)
          .eq('is_deconsoled', true)
          .maybeSingle();

        if (deconsoledData) {
          setCargo(deconsoledData);
        } else {
          setError('Data tracking tidak ditemukan atau token tidak valid.');
        }
        setLoading(false);
        return;
      }

      setCargo(data);
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan saat memuat data tracking.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const getCurrentStatus = (): TrackingStatus => {
    if (!cargo) return 'pending';
    if (cargo.is_deconsoled) return 'deconsoled';
    const woStatus = cargo.wo_item?.work_order?.status?.toUpperCase();
    const containerStatus = cargo.container_assignment?.status;
    if (woStatus === 'COMPLETED' || woStatus === 'DONE') return 'delivered';
    if (containerStatus === 'arrived' || containerStatus === 'shipped') return containerStatus as TrackingStatus;
    if (cargo.goods_received_at) return 'received';
    if (containerStatus === 'stuffed') return 'stuffed';
    if (containerStatus === 'shipped') return 'shipped';
    return 'pending';
  };

  const currentStatus = getCurrentStatus();
  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.status === currentStatus);
  const consol = cargo?.container_assignment?.consolidation;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Memuat data tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !cargo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Tracking Tidak Ditemukan</h1>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <Ship className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cargo Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">Lacak status pengiriman Anda secara real-time</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cargo Owner</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{cargo.wo_item?.work_order?.customer?.name || '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Tracking Token</div>
                <div className="text-sm font-mono font-bold text-slate-700 mt-1">{token}</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Status Pengiriman</h3>
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200 rounded-full">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStatusIndex / (STATUS_FLOW.length - 1)) * 100}%` }}
                />
              </div>
              <div className="relative flex justify-between">
                {STATUS_FLOW.map((step, idx) => {
                  const isActive = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                        isActive ? step.color : 'bg-slate-200'
                      } ${isCurrent ? 'ring-4 ring-white shadow-lg scale-110' : ''}`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div className={`text-xs font-semibold mt-2 text-center ${
                        isActive ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" /> Informasi Barang
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Komoditas</div>
                  <div className="font-semibold text-slate-900">{cargo.commodity || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Volume</div>
                    <div className="font-semibold text-slate-900">{cargo.volume_cbm ? `${cargo.volume_cbm} CBM` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Berat</div>
                    <div className="font-semibold text-slate-900">{cargo.gross_weight_kg ? `${cargo.gross_weight_kg} Kg` : '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Kemasan</div>
                    <div className="font-semibold text-slate-900">{cargo.packages || '-'} {cargo.package_type || ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Delivery Type</div>
                    <div className="font-semibold text-slate-900">{cargo.delivery_type}</div>
                  </div>
                </div>
                {cargo.description && (
                  <div>
                    <div className="text-xs text-slate-500">Deskripsi</div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-1">{cargo.description}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Ship className="w-4 h-4 text-indigo-500" /> Info Kapal & Container
              </h3>
              {consol ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">Consol Number</div>
                    <div className="font-semibold text-slate-900">{consol.consol_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Kapal / Voyage</div>
                    <div className="font-semibold text-slate-900">
                      {consol.vessel_name} {consol.voyage_number ? `(V.${consol.voyage_number})` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{consol.origin_port}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{consol.destination_port}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">ETD</div>
                      <div className="font-semibold text-slate-900">
                        {consol.etd ? new Date(consol.etd).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">ETA</div>
                      <div className="font-semibold text-slate-900">
                        {consol.eta ? new Date(consol.eta).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </div>
                  </div>
                  {consol.actual_etd && (
                    <div>
                      <div className="text-xs text-slate-500">Actual ETD</div>
                      <div className="font-semibold text-slate-900">{new Date(consol.actual_etd).toLocaleString('id-ID')}</div>
                    </div>
                  )}
                  {consol.actual_eta && (
                    <div>
                      <div className="text-xs text-slate-500">Actual ETA</div>
                      <div className="font-semibold text-slate-900">{new Date(consol.actual_eta).toLocaleString('id-ID')}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Belum di-assign ke konsolidasi</p>
              )}
            </CardContent>
          </Card>
        </div>

        {(cargo.delivery_type === 'port_to_door' || cargo.delivery_type === 'door_to_door') && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500" /> Informasi Pengiriman ke Alamat
              </h3>
              <div className="space-y-3">
                {cargo.delivery_address && (
                  <div>
                    <div className="text-xs text-slate-500">Alamat Tujuan</div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-1">{cargo.delivery_address}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {cargo.delivery_contact && (
                    <div>
                      <div className="text-xs text-slate-500">Kontak</div>
                      <div className="font-semibold text-slate-900">{cargo.delivery_contact}</div>
                    </div>
                  )}
                  {cargo.delivery_phone && (
                    <div>
                      <div className="text-xs text-slate-500">Telepon</div>
                      <div className="font-semibold text-slate-900">{cargo.delivery_phone}</div>
                    </div>
                  )}
                </div>
                {cargo.last_mile_wo && (
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <div className="text-xs text-indigo-600 font-medium">Delivery WO</div>
                    <div className="font-semibold text-indigo-800">{cargo.last_mile_wo.wo_number}</div>
                    <div className="text-xs text-indigo-600">{cargo.last_mile_wo.status}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
