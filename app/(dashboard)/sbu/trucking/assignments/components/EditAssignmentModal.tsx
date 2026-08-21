'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { saveAssignmentsAction } from '@/lib/actions/assignmentActions';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  X, Loader2, Truck, User, Building2,
  DollarSign, MessageCircle, CheckCircle
} from 'lucide-react';
import { buildWaLink } from '@/lib/domain/phone';
import { displayCode } from '@/lib/domain/tenant/displayCode';
import {
  type AssignmentSlot,
  type TransporterOption,
  parseItemData,
  mapTransportersForTenant,
  generateTrackingToken,
  generateDriverLinkToken,
} from '@/lib/domain/jo/assignment';
import { buildDriverAssignmentMessage } from '@/lib/domain/phone';

const supabase = createClient();

interface EditAssignmentModalProps {
  jo: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAssignmentModal({ jo, onClose, onSuccess }: EditAssignmentModalProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [transporters, setTransporters] = useState<TransporterOption[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [fleets, setFleets] = useState<any[]>([]);
  const [tenantCodeMap, setTenantCodeMap] = useState<Record<string, string>>({});

  const [selectedTransporterId, setSelectedTransporterId] = useState<string>(jo.transporter_id || jo.vendor_id || '');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(jo.driver_id || '');
  const [selectedFleetId, setSelectedFleetId] = useState<string>(jo.fleet_id || '');
  const [purchasePrice, setPurchasePrice] = useState<string>(String(jo.purchase_price || ''));
  const [notes, setNotes] = useState<string>(jo.notes || '');

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoadingData(true);

      try {
        const tenantId = profile.tenant_id;
        const assignedFleetIds = [jo.fleet_id].filter(Boolean);
        const assignedDriverIds = [jo.driver_id].filter(Boolean);

        const [
          transporterRes,
          driverRes,
          fleetRes,
          assignedFleetRes,
          assignedDriverRes,
        ] = await Promise.all([
          supabase.from('md_entities')
            .select('id, name, legal_name, is_vendor, is_customer, is_own, vendor_type')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          supabase.from('md_drivers')
            .select('id, name, phone, is_active, entity_id, md_entities(is_vendor, vendor_tenant_id)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          supabase.from('md_fleets')
            .select('id, plate_number, fleet_type_id, status, entity_id, is_active, vendor_tenant_id, md_fleet_types(type_name)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .in('status', ['available', 'maintenance', 'on_duty']),
          assignedFleetIds.length > 0
            ? supabase.from('md_fleets')
                .select('id, plate_number, fleet_type_id, status, entity_id, vendor_tenant_id, md_fleet_types(type_name)')
                .in('id', assignedFleetIds)
            : Promise.resolve({ data: [], error: null }),
          assignedDriverIds.length > 0
            ? supabase.from('md_drivers')
                .select('id, name, phone, is_active, entity_id, md_entities(is_vendor, vendor_tenant_id)')
                .in('id', assignedDriverIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        // Merge assigned fleets into available list (so on_road fleets appear)
        let availableFleets = fleetRes.data || [];
        const assignedFleets = assignedFleetRes?.data || [];
        const availableFleetIds = new Set(availableFleets.map(f => f.id));
        for (const af of assignedFleets) {
          if (!availableFleetIds.has(af.id)) {
            availableFleets.push(af as typeof availableFleets[number]);
            availableFleetIds.add(af.id);
          }
        }
        availableFleets = availableFleets.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        // Merge assigned drivers into available list (so is_working drivers appear)
        let availableDrivers = driverRes.data || [];
        const assignedDriversList = assignedDriverRes?.data || [];
        const availableDriverIds = new Set(availableDrivers.map(d => d.id));
        for (const ad of assignedDriversList) {
          if (!availableDriverIds.has(ad.id)) {
            availableDrivers.push(ad);
            availableDriverIds.add(ad.id);
          }
        }
        availableDrivers = availableDrivers.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        setFleets(availableFleets);
        setDrivers(availableDrivers);

        // Build tenant code map for cross-tenant vendor badges
        const vendorTenantIds = new Set<string>();
        for (const f of availableFleets) {
          if (f.vendor_tenant_id) vendorTenantIds.add(f.vendor_tenant_id);
        }
        for (const d of availableDrivers) {
          if (d.md_entities?.vendor_tenant_id)
            vendorTenantIds.add(d.md_entities.vendor_tenant_id);
        }
        if (vendorTenantIds.size > 0) {
          const { data: tenantRows } = await supabase
            .from('tenants')
            .select('id, tenant_code')
            .in('id', [...vendorTenantIds]);
          const map: Record<string, string> = {};
          for (const t of tenantRows || []) map[t.id] = t.tenant_code || '';
          setTenantCodeMap(map);
        }

        const tenantName = (profile?.tenants?.name || '').toUpperCase();
        const tenantCode = (profile?.tenant_code || '').toUpperCase();
        if (transporterRes.data) {
          setTransporters(mapTransportersForTenant(transporterRes.data, tenantName, tenantCode));
        }
      } catch (err: any) {
        toast.error('Gagal memuat data: ' + err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [profile?.tenant_id, jo.fleet_id, jo.driver_id]);

  const handleSave = async () => {
    if (saving) return;
    if (!profile?.tenant_id) { toast.error('Tenant ID tidak ditemukan'); return; }

    setSaving(true);
    try {
      const woItem = jo.wo_item;
      if (!woItem) { toast.error('WO Item data tidak ditemukan'); return; }

      const assignmentSlot: AssignmentSlot = {
        id: jo.id,
        jo_number: jo.jo_number,
        transporter_id: selectedTransporterId || null,
        driver_id: selectedDriverId || null,
        driver_phone: drivers.find(d => d.id === selectedDriverId)?.phone || jo.driver_phone || '',
        fleet_id: selectedFleetId || null,
        purchase_price: Number(purchasePrice.replace(/\D/g, '')) || 0,
        base_price: jo.base_price || 0,
        cost_account_id: jo.cost_account_id || null,
        driver_share_percentage: jo.driver_share_percentage || 0,
        advance_amount: jo.advance_amount || 0,
        notes: notes || undefined,
        container_number: jo.container_number || null,
        wa_token: jo.wa_token || generateTrackingToken(),
        tracking_token: jo.tracking_token || generateTrackingToken(),
        driver_link_token: jo.driver_link_token || generateDriverLinkToken(),
        status: jo.status,
        assignment_documents: jo.assignment_documents || [],
      };

      const response = await fetch(`/api/trucking/job-orders/${jo.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriverId || null,
          vehicleId: selectedFleetId || null,
          transporterId: selectedTransporterId || null,
          purchasePrice: Number(purchasePrice.replace(/\\D/g, '')) || 0,
          notes: notes || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Gagal menyimpan perubahan');
        return;
      }

      toast.success('Assignment berhasil diupdate');
      onSuccess();
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSendWA = () => {
    const driver = drivers.find(d => d.id === selectedDriverId);
    const transporter = transporters.find(t => t.id === selectedTransporterId);
    const driverName = driver?.name || transporter?.name || 'Driver/Vendor';
    const phone = driver?.phone || jo.driver_phone || '';
    if (!phone) { toast.error('Nomor telepon tidak ditemukan'); return; }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isInternal = driver?.md_entities?.is_vendor === false;
    const link = isInternal
      ? `${origin}/driver/portal`
      : `https://www.sentralogis.com/jo/${jo.driver_link_token || jo.id}`;

    const msg = buildDriverAssignmentMessage({
      driverName,
      isInternal: Boolean(isInternal),
      link,
      joNumber: jo.jo_number,
      hasNativeApp: (driver as any)?.has_native_app || false,
    });

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
    window.open(buildWaLink(formattedPhone, msg), '_blank');
    toast.success('WhatsApp terbuka');
  };

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedFleet = fleets.find(f => f.id === selectedFleetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Assignment</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{jo.jo_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-3 text-sm text-slate-500">Memuat data...</span>
            </div>
          ) : (
            <>
              {/* Transporter/Vendor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  Vendor / Transporter
                </label>
                <SearchableSelect
                  value={selectedTransporterId}
                  onChange={(val) => {
                    if (val !== selectedTransporterId) {
                      setSelectedDriverId('');
                      setSelectedFleetId('');
                    }
                    setSelectedTransporterId(val);
                  }}
                  placeholder="Pilih Vendor (opsional)"
                  options={[
                    { value: '', label: 'Pilih Vendor (opsional)' },
                    ...transporters.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  className="h-11"
                />
              </div>

              {/* Driver */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  Driver
                </label>
                <SearchableSelect
                  value={selectedDriverId}
                  onChange={(val) => setSelectedDriverId(val)}
                  placeholder="Pilih Driver"
                  options={[
                    { value: '', label: 'Pilih Driver' },
                    ...drivers.map(d => {
                      const name = displayCode(
                        d.name,
                        d.md_entities?.vendor_tenant_id,
                        profile?.tenant_id,
                        tenantCodeMap,
                      );
                      return { value: d.id, label: name, description: d.phone || '-' };
                    })
                  ]}
                  className="h-11"
                />
              </div>

              {/* Fleet */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Truck size={14} className="text-slate-400" />
                  Fleet / Plat Nomor
                </label>
                <SearchableSelect
                  value={selectedFleetId}
                  onChange={(val) => setSelectedFleetId(val)}
                  placeholder="Pilih Unit"
                  options={[
                    { value: '', label: 'Pilih Unit' },
                    ...fleets.map(f => {
                      const plate = displayCode(
                        f.plate_number,
                        f.vendor_tenant_id,
                        profile?.tenant_id,
                        tenantCodeMap,
                      );
                      return { value: f.id, label: plate, description: f.md_fleet_types?.type_name || 'N/A' };
                    })
                  ]}
                  className="h-11"
                />
              </div>

              {/* Purchase Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-400" />
                  Harga Beli (Purchase Price)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-11 pl-10 pr-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                  placeholder="Catatan perubahan (opsional)"
                />
              </div>

              {/* Preview */}
              {(selectedDriver || selectedFleet) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Preview Assignment</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Driver:</span>
                      <p className="font-bold text-slate-900">{selectedDriver?.name || 'Belum dipilih'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Fleet:</span>
                      <p className="font-bold text-slate-900">{selectedFleet?.plate_number || 'Belum dipilih'}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
          <button
            onClick={handleSendWA}
            disabled={saving || !selectedDriverId}
            className="px-5 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle size={16} /> Kirim WA Lagi
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 h-11 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingData}
              className="px-6 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
