'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Loader2, Info, Building2, Map as MapIcon, Plus, Trash2, 
  Save, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, Phone, Mail, FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import GoogleMapsInput from '@/components/master/GoogleMapsInput';
import { 
  createCustomerMasterAction, 
  updateCustomerMasterAction, 
  getCustomerMasterDetailAction,
  CustomerMasterContactInput,
  CustomerMasterAddressInput
} from '@/lib/actions/customer-master-actions';
import { getEntitiesByRole } from '@/lib/actions/entity-role-actions';
import { toast } from 'react-hot-toast';

interface MasterCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCustomer: any) => void;
  selectedEntityId?: string | null;
  initialName?: string;
}

export default function MasterCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  selectedEntityId,
  initialName,
}: MasterCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'hierarchy' | 'billing' | 'contacts' | 'addresses'>('identity');
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parents, setParents] = useState<Array<{ id: string; entity_code: string; name: string }>>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: initialName || '',
    legal_name: initialName || '',
    tax_id: '',
    email: '',
    phone: '',
    mobile: '',
    whatsapp: '',
    parent_id: '',
    is_active: true,
    billing_address: '',
    billing_city: '',
    billing_province: '',
    billing_postal_code: '',
    billing_latitude: 0 as number | null,
    billing_longitude: 0 as number | null,
    billing_directions: '',
    billing_verified_from_maps: false,
    payment_terms_days: 30,
    payment_terms_type: 'net_days',
    notes: '',
    entity_code: '',
  });

  const [contacts, setContacts] = useState<CustomerMasterContactInput[]>([
    { contact_name: '', contact_role: 'COMMERCIAL', phone: '', email: '', is_primary: true },
  ]);

  const [addresses, setAddresses] = useState<CustomerMasterAddressInput[]>([]);

  // Load Parent Customer choices (anti-cycle safe)
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadParents() {
      try {
        const res = await getEntitiesByRole('CUSTOMER');
        if (mounted && res.ok && res.data) {
          // Filter out current editing entity to prevent direct self-selection
          const filtered = res.data.filter((e: any) => e.id !== selectedEntityId);
          setParents(filtered);
        }
      } catch (err) {
        console.error('Error fetching parent customers:', err);
      }
    }
    loadParents();

    return () => {
      mounted = false;
    };
  }, [isOpen, selectedEntityId]);

  // Load existing data if editing
  useEffect(() => {
    if (!isOpen) return;

    if (selectedEntityId) {
      setLoadingInitial(true);
      getCustomerMasterDetailAction(selectedEntityId)
        .then((res) => {
          if (res.ok && res.customer) {
            const c = res.customer;
            setFormData({
              name: c.name || '',
              legal_name: c.legal_name || '',
              tax_id: c.tax_id || '',
              email: c.email || '',
              phone: c.phone || '',
              mobile: c.mobile || '',
              whatsapp: c.whatsapp || '',
              parent_id: c.parent_id || '',
              is_active: c.is_active !== false,
              billing_address: c.billing_address || '',
              billing_city: c.billing_city || '',
              billing_province: c.billing_province || '',
              billing_postal_code: c.billing_postal_code || '',
              billing_latitude: c.billing_latitude !== undefined ? Number(c.billing_latitude) : 0,
              billing_longitude: c.billing_longitude !== undefined ? Number(c.billing_longitude) : 0,
              billing_directions: c.billing_directions || '',
              billing_verified_from_maps: Boolean(c.billing_latitude && c.billing_longitude),
              payment_terms_days: c.payment_terms_days !== undefined ? Number(c.payment_terms_days) : 30,
              payment_terms_type: c.payment_terms_type || 'net_days',
              notes: c.notes || '',
              entity_code: c.entity_code || '',
            });

            if (c.contacts && Array.isArray(c.contacts) && c.contacts.length > 0) {
              setContacts(c.contacts);
            } else {
              setContacts([{ contact_name: '', contact_role: 'COMMERCIAL', phone: '', email: '', is_primary: true }]);
            }

            if (c.addresses && Array.isArray(c.addresses) && c.addresses.length > 0) {
              setAddresses(c.addresses);
            } else {
              setAddresses([]);
            }
          } else {
            toast.error(res.error || 'Gagal memuat detail data customer');
          }
        })
        .finally(() => setLoadingInitial(false));
    } else {
      // Create mode reset
      setFormData({
        name: initialName || '',
        legal_name: initialName || '',
        tax_id: '',
        email: '',
        phone: '',
        mobile: '',
        whatsapp: '',
        parent_id: '',
        is_active: true,
        billing_address: '',
        billing_city: '',
        billing_province: '',
        billing_postal_code: '',
        billing_latitude: 0,
        billing_longitude: 0,
        billing_directions: '',
        billing_verified_from_maps: false,
        payment_terms_days: 30,
        payment_terms_type: 'net_days',
        notes: '',
        entity_code: '',
      });
      setContacts([{ contact_name: '', contact_role: 'COMMERCIAL', phone: '', email: '', is_primary: true }]);
      setAddresses([]);
    }
  }, [isOpen, selectedEntityId, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name || !formData.name.trim()) {
      toast.error('Nama Pelanggan (Brand / Alias) wajib diisi.');
      setActiveTab('identity');
      return;
    }

    // P0-B Enforcement: All physical addresses must be selected via Google Maps autocomplete
    // On Create (or if billing_address is modified on Edit), billing address must be verified from Maps
    if (!selectedEntityId || formData.billing_address) {
      if (!formData.billing_address || !formData.billing_address.trim()) {
        toast.error('Alamat kantor penagihan wajib diisi dan dipilih melalui Google Maps.');
        setActiveTab('billing');
        return;
      }
      if (!formData.billing_verified_from_maps || formData.billing_latitude === null || formData.billing_longitude === null) {
        toast.error('Alamat penagihan harus dipilih dari Google Maps Places autocomplete agar koordinat valid terverifikasi.');
        setActiveTab('billing');
        return;
      }
    }

    // Check operational addresses: any newly added address (without an existing id) must be verified
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      if (addr.address && addr.address.trim()) {
        const hasCoords = addr.latitude !== null && addr.longitude !== null && addr.latitude !== 0 && addr.longitude !== 0;
        if (!addr.id && !hasCoords) {
          toast.error(`Alamat operasional #${i + 1} (${addr.address_name || 'Gudang'}) harus dipilih melalui Google Maps autocomplete.`);
          setActiveTab('addresses');
          return;
        }
      }
    }

    setSubmitting(true);
    const toastId = toast.loading('Menyimpan data Customer Master...');

    try {
      const payload = {
        name: formData.name,
        legal_name: formData.legal_name,
        tax_id: formData.tax_id,
        email: formData.email,
        phone: formData.phone,
        mobile: formData.mobile,
        whatsapp: formData.whatsapp,
        parent_id: formData.parent_id || null,
        is_active: formData.is_active,
        billing_address: formData.billing_address,
        billing_city: formData.billing_city,
        billing_province: formData.billing_province,
        billing_postal_code: formData.billing_postal_code,
        billing_latitude: formData.billing_latitude,
        billing_longitude: formData.billing_longitude,
        billing_directions: formData.billing_directions,
        payment_terms_days: formData.payment_terms_days,
        payment_terms_type: formData.payment_terms_type,
        notes: formData.notes,
        contacts: contacts.filter((c) => c.contact_name && c.contact_name.trim()),
        addresses: addresses.filter((a) => a.address && a.address.trim()),
      };

      let result;
      if (selectedEntityId) {
        result = await updateCustomerMasterAction(selectedEntityId, payload);
      } else {
        result = await createCustomerMasterAction(payload);
      }

      if (result.ok && result.customer) {
        toast.success(
          selectedEntityId ? 'Data Customer berhasil diperbarui' : 'Customer baru berhasil didaftarkan',
          { id: toastId }
        );
        onSuccess(result.customer);
        onClose();
      } else {
        toast.error(result.error || 'Gagal menyimpan data customer', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat menyimpan customer', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border-none rounded-3xl overflow-hidden bg-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedEntityId ? 'Edit Master Customer' : 'Daftar Customer Baru'}
                </h2>
                {formData.entity_code && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-200 text-slate-700">
                    {formData.entity_code}
                  </span>
                )}
                {!selectedEntityId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    AUTO-GENERATED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola identitas resmi, legalitas, hierarki grup, termin pembayaran, PIC, dan titik pengiriman.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-full transition-colors text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 px-6 gap-2 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'identity', label: '1. Identitas & Legalitas', icon: Info },
            { id: 'hierarchy', label: '2. Hierarki Perusahaan', icon: Building2 },
            { id: 'billing', label: '3. Penagihan & Termin', icon: FileText },
            { id: 'contacts', label: `4. Kontak PIC (${contacts.filter(c => c.contact_name).length})`, icon: UserCheck },
            { id: 'addresses', label: `5. Lokasi Pengiriman (${addresses.length})`, icon: MapIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-3 border-b-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loadingInitial ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium">Memuat data detail customer...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Identitas & Legalitas */}
              {activeTab === 'identity' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nama Singkat / Brand / Alias *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: TAM, TPS, ANUGERAH"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Digunakan untuk pencarian cepat, kartu order, dan komunikasi operasional.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nama Resmi Badan Usaha (Legal Name)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: PT Toyota Astra Motor"
                        value={formData.legal_name}
                        onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Dicantumkan pada Surat Jalan resmi, kontrak kerjasama, dan Faktur Pajak.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        NPWP / Tax ID (16 Digit)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 01.234.567.8-901.000"
                        value={formData.tax_id}
                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Korespondensi Perusahaan
                      </label>
                      <input
                        type="email"
                        placeholder="info@perusahaan.co.id"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Telepon Kantor
                      </label>
                      <input
                        type="text"
                        placeholder="+62 21 89765432"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        WhatsApp Hotline / Mobile
                      </label>
                      <input
                        type="text"
                        placeholder="+62 812-3456-7890"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active_check"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_active_check" className="text-sm font-semibold text-slate-800 cursor-pointer">
                        Status Customer Aktif
                      </label>
                    </div>
                    <span className="text-xs text-slate-400">
                      Entitas aktif dapat langsung dipilih saat pembuatan Sales Order.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: Hierarki Perusahaan */}
              {activeTab === 'hierarchy' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <ShieldCheck size={16} /> Struktur Holding & Cabang (Anti-Cycle Protected)
                    </div>
                    Jika entitas ini adalah anak perusahaan, pabrik cabang, atau entitas operasional dari holding grup,
                    pilih Perusahaan Induk di bawah ini. Sesuai ADR-070, penagihan tetap dapat ditujukan ke entitas ini
                    secara mandiri atau ke holding.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Perusahaan Induk (Holding / Parent Entity)
                    </label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    >
                      <option value="">-- Entitas Mandiri (Tanpa Parent Holding) --</option>
                      {parents.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.entity_code}] {p.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Sistem Sentralogis secara otomatis memverifikasi bahwa entitas induk yang dipilih tidak menimbulkan
                      siklus referensi (circular hierarchy guard).
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: Penagihan & Termin */}
              {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Kantor Penagihan (Google Maps Places) *
                    </label>
                    <GoogleMapsInput
                      defaultValue={formData.billing_address}
                      isVerified={formData.billing_verified_from_maps}
                      onVerificationChange={(v) => setFormData((prev) => ({ ...prev, billing_verified_from_maps: v }))}
                      onPlaceSelect={(place) => {
                        setFormData((prev) => ({
                          ...prev,
                          billing_address: place.address,
                          billing_city: place.city || prev.billing_city,
                          billing_province: place.province || prev.billing_province,
                          billing_postal_code: place.postal_code || prev.billing_postal_code,
                          billing_latitude: place.latOrNull !== undefined ? place.latOrNull : (place.latitude || null),
                          billing_longitude: place.lngOrNull !== undefined ? place.lngOrNull : (place.longitude || null),
                          billing_verified_from_maps: place.verifiedFromMaps ?? false,
                        }));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jakarta Pusat"
                        value={formData.billing_city}
                        onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: DKI Jakarta"
                        value={formData.billing_province}
                        onChange={(e) => setFormData({ ...formData, billing_province: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Kode Pos
                      </label>
                      <input
                        type="text"
                        placeholder="10110"
                        value={formData.billing_postal_code}
                        onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Detail Patokan Penagihan / Drop-Box Dokumen (Non-Maps)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Gedung Artha Lt. 4, serahkan ke reception finance / loket vendor."
                      value={formData.billing_directions}
                      onChange={(e) => setFormData({ ...formData, billing_directions: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Termin Pembayaran (TOP Hari) *
                      </label>
                      <select
                        value={formData.payment_terms_days}
                        onChange={(e) => setFormData({ ...formData, payment_terms_days: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      >
                        <option value={0}>Cash / Advance (0 Hari)</option>
                        <option value={7}>7 Hari (Net 7)</option>
                        <option value={14}>14 Hari (Net 14)</option>
                        <option value={30}>30 Hari (Net 30 - Standar B2B)</option>
                        <option value={45}>45 Hari (Net 45)</option>
                        <option value={60}>60 Hari (Net 60)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tipe Termin Komersial
                      </label>
                      <select
                        value={formData.payment_terms_type}
                        onChange={(e) => setFormData({ ...formData, payment_terms_type: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="net_days">Net Days (Kredit Sekuensial)</option>
                        <option value="cod">Cash on Delivery (COD)</option>
                        <option value="advance">Advance Payment (CBD)</option>
                        <option value="custom">Custom Commercial Agreement</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Kontak PIC */}
              {activeTab === 'contacts' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Personil Kontak Pelanggan (PIC)</h4>
                      <p className="text-xs text-slate-500">
                        Dikelola secara terstruktur via canonical party_contacts (non-destructive).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setContacts([
                          ...contacts,
                          { contact_name: '', contact_role: 'OPERATIONS', phone: '', email: '', is_primary: false },
                        ])
                      }
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                    >
                      <Plus size={14} /> Tambah PIC
                    </button>
                  </div>

                  <div className="space-y-3">
                    {contacts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Kontak PIC #{idx + 1}
                          </span>
                          {contacts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Nama Lengkap PIC *
                            </label>
                            <input
                              type="text"
                              placeholder="Nama PIC"
                              value={c.contact_name}
                              onChange={(e) => {
                                const next = [...contacts];
                                next[idx].contact_name = e.target.value;
                                setContacts(next);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Peran PIC
                            </label>
                            <select
                              value={c.contact_role || 'COMMERCIAL'}
                              onChange={(e) => {
                                const next = [...contacts];
                                next[idx].contact_role = e.target.value;
                                setContacts(next);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                            >
                              <option value="COMMERCIAL">Komersial / Sales</option>
                              <option value="OPERATIONS">Operasional / Gudang</option>
                              <option value="FINANCE">Finance / Penagihan</option>
                              <option value="MANAGEMENT">Direksi / Manajemen</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Telepon / WhatsApp
                            </label>
                            <input
                              type="text"
                              placeholder="+62 81..."
                              value={c.phone || c.mobile || ''}
                              onChange={(e) => {
                                const next = [...contacts];
                                next[idx].phone = e.target.value;
                                next[idx].mobile = e.target.value;
                                next[idx].whatsapp = e.target.value;
                                setContacts(next);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Email PIC
                            </label>
                            <input
                              type="email"
                              placeholder="pic@domain.com"
                              value={c.email || ''}
                              onChange={(e) => {
                                const next = [...contacts];
                                next[idx].email = e.target.value;
                                setContacts(next);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Lokasi Pengiriman (Ship-To) */}
              {activeTab === 'addresses' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Alamat Operasional & Pengiriman (Ship-To)</h4>
                      <p className="text-xs text-slate-500">
                        Titik bongkar, gudang, atau pabrik pelanggan untuk integrasi surat jalan & dispatch trucking.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAddresses([
                          ...addresses,
                          {
                            address_name: '',
                            address_type: 'WAREHOUSE',
                            address: '',
                            city: '',
                            province: '',
                            postal_code: '',
                            latitude: 0,
                            longitude: 0,
                            contact_person: '',
                            contact_phone: '',
                          },
                        ])
                      }
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                    >
                      <Plus size={14} /> Tambah Lokasi
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                      Belum ada alamat operasional tambahan. Alamat kantor penagihan akan digunakan sebagai acuan default.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map((a, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 relative space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              Lokasi #{idx + 1}: {a.address_name || 'Gudang / Pabrik'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddresses(addresses.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Label Lokasi (Nama Titik) *
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Gudang Cakung Blok B"
                                value={a.address_name}
                                onChange={(e) => {
                                  const next = [...addresses];
                                  next[idx].address_name = e.target.value;
                                  setAddresses(next);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Cari via Google Maps
                              </label>
                              <GoogleMapsInput
                                defaultValue={a.address}
                                isVerified={Boolean(a.latitude && a.longitude)}
                                onPlaceSelect={(place) => {
                                  const next = [...addresses];
                                  next[idx].address = place.address;
                                  next[idx].city = place.city;
                                  next[idx].province = place.province;
                                  next[idx].postal_code = place.postal_code;
                                  next[idx].latitude = place.latOrNull !== undefined ? place.latOrNull : (place.latitude || null);
                                  next[idx].longitude = place.lngOrNull !== undefined ? place.lngOrNull : (place.longitude || null);
                                  setAddresses(next);
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                PIC Titik Muat / Bongkar
                              </label>
                              <input
                                type="text"
                                placeholder="Nama Petugas / Mandor"
                                value={a.contact_person || ''}
                                onChange={(e) => {
                                  const next = [...addresses];
                                  next[idx].contact_person = e.target.value;
                                  setAddresses(next);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Telepon Petugas Lapangan
                              </label>
                              <input
                                type="text"
                                placeholder="+62 8..."
                                value={a.contact_phone || ''}
                                onChange={(e) => {
                                  const next = [...addresses];
                                  next[idx].contact_phone = e.target.value;
                                  setAddresses(next);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>

                            <div className="col-span-full">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Petunjuk Akses Truk / Loading Dock (Non-Maps)
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Akses kontainer 40ft 24 jam, pintu dock timur, wajib helm proyek."
                                value={a.address_directions || ''}
                                onChange={(e) => {
                                  const next = [...addresses];
                                  next[idx].address_directions = e.target.value;
                                  setAddresses(next);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            Batal
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingInitial}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{selectedEntityId ? 'Simpan Perubahan Customer' : 'Daftarkan Customer'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
