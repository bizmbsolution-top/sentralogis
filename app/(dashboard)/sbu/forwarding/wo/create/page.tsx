'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, Save, Loader2, Package, Truck, Anchor, CheckCircle2, DollarSign, MapPin, Plus
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function CreateForwardingWOPage() {
  const { profile } = useAuth();
  const router = useRouter();
  
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Lookups
  const [customers, setCustomers] = useState<any[]>([]);
  const [masterPrices, setMasterPrices] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    execution_date: new Date().toISOString().split('T')[0],
    service_type: 'FCL',
    delivery_type: 'D2D',
    origin_port: '',
    destination_port: '',
    notes: '',
    containers: [] as any[]
  });

  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'PENDING'>('PENDING');

  // UI State for Wizard
  const [selectedPrice, setSelectedPrice] = useState<any>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
      fetchLookups(profile.tenant_id);
    }
  }, [profile]);

  const fetchLookups = async (tId: string) => {
    try {
      const [cusRes, priceRes] = await Promise.all([
        supabase.from('md_entities').select('id, name').eq('tenant_id', tId).eq('is_customer', true).order('name'),
        supabase.from('fw_price_master').select('*').eq('tenant_id', tId).eq('is_active', true)
      ]);
      if (cusRes.data) setCustomers(cusRes.data);
      if (priceRes.data) setMasterPrices(priceRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePriceSelect = (price: any) => {
    setSelectedPrice(price);
    setFormData(prev => ({
      ...prev,
      service_type: price.service_type,
      delivery_type: price.delivery_type,
      origin_port: price.origin_port,
      destination_port: price.destination_port,
      containers: [{
        container_type: price.container_type || '20GP',
        price_master_id: price.id,
        sell_price: price.sell_price,
        cogs_pickup: price.cogs_pickup,
        cogs_port_haulage_origin: price.cogs_port_haulage_origin,
        cogs_ocean_freight: price.cogs_ocean_freight,
        cogs_thc_origin: price.cogs_thc_origin,
        cogs_thc_dest: price.cogs_thc_dest,
        cogs_port_haulage_dest: price.cogs_port_haulage_dest,
        cogs_last_mile: price.cogs_last_mile,
        cogs_documentation: price.cogs_documentation,
        cogs_other: price.cogs_other,
        pickup_address: '',
        delivery_address: '',
        commodity: '',
        volume_cbm: 0,
        gross_weight_kg: 0,
        qty: 1
      }]
    }));
  };

  const updateContainer = (index: number, field: string, value: any) => {
    const newContainers = [...formData.containers];
    newContainers[index][field] = value;
    setFormData({ ...formData, containers: newContainers });
  };

  const addContainer = () => {
    if (!selectedPrice) return;
    setFormData(prev => ({
      ...prev,
      containers: [...prev.containers, {
        container_type: selectedPrice.container_type || '20GP',
        price_master_id: selectedPrice.id,
        sell_price: selectedPrice.sell_price,
        cogs_pickup: selectedPrice.cogs_pickup,
        cogs_port_haulage_origin: selectedPrice.cogs_port_haulage_origin,
        cogs_ocean_freight: selectedPrice.cogs_ocean_freight,
        cogs_thc_origin: selectedPrice.cogs_thc_origin,
        cogs_thc_dest: selectedPrice.cogs_thc_dest,
        cogs_port_haulage_dest: selectedPrice.cogs_port_haulage_dest,
        cogs_last_mile: selectedPrice.cogs_last_mile,
        cogs_documentation: selectedPrice.cogs_documentation,
        cogs_other: selectedPrice.cogs_other,
        pickup_address: formData.containers[0]?.pickup_address || '', // copy from first
        delivery_address: formData.containers[0]?.delivery_address || '', // copy from first
        commodity: '',
        volume_cbm: 0,
        gross_weight_kg: 0,
        qty: 1
      }]
    }));
  };

  const removeContainer = (index: number) => {
    if (formData.containers.length <= 1) return;
    const newContainers = [...formData.containers];
    newContainers.splice(index, 1);
    setFormData({ ...formData, containers: newContainers });
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.customer_id) {
      toast.error('Pilih Customer terlebih dahulu'); return;
    }
    if (currentStep === 2 && !selectedPrice) {
      toast.error('Pilih Master Harga rute terlebih dahulu'); return;
    }
    setCurrentStep(c => Math.min(c + 1, 4));
  };

  const prevStep = () => setCurrentStep(c => Math.max(c - 1, 1));

  const handleSubmit = async (status: 'DRAFT' | 'PENDING' = 'PENDING') => {
    if (!tenantId) return;

    // Validate addresses
    if (['D2D', 'D2P'].includes(formData.delivery_type)) {
      const missingPickup = formData.containers.some(c => !c.pickup_address);
      if (missingPickup) {
        toast.error('Mohon isi alamat pickup (Door Asal) untuk semua kontainer');
        setCurrentStep(3);
        return;
      }
    }
    if (['D2D', 'P2D'].includes(formData.delivery_type)) {
      const missingDelivery = formData.containers.some(c => !c.delivery_address);
      if (missingDelivery) {
        toast.error('Mohon isi alamat pengiriman (Door Tujuan) untuk semua kontainer');
        setCurrentStep(3);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forwarding/wo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status,
          tenant_id: tenantId,
          user_id: profile?.id
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(status === 'DRAFT' ? 'Work Order berhasil disimpan sebagai Draft!' : 'Work Order Forwarding berhasil dibuat!');
      router.push(`/sbu/forwarding/wo/${data.wo_id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal membuat Work Order');
    } finally {
      setSubmitting(false);
    }
  };

  // UI Components per Step
  const Step1 = () => (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Pilih Cargo Owner</h2>
        <p className="text-slate-500 mt-2">Pilih customer dan tentukan tanggal order untuk pengiriman forwarding.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer / Cargo Owner *</label>
          <select 
            value={formData.customer_id}
            onChange={e => setFormData({...formData, customer_id: e.target.value})}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">-- Pilih Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Order *</label>
            <input 
              type="date" 
              value={formData.order_date}
              onChange={e => setFormData({...formData, order_date: e.target.value})}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Eksekusi (Target) *</label>
            <input 
              type="date" 
              value={formData.execution_date}
              onChange={e => setFormData({...formData, execution_date: e.target.value})}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
          <textarea 
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Catatan untuk tim operasional..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Pilih Master Harga</h2>
        <p className="text-slate-500 mt-2">Pilih rute harga master yang telah dikonfigurasi sebelumnya.</p>
      </div>

      {masterPrices.length === 0 ? (
        <Card className="p-8 border-slate-200 shadow-sm text-center">
          <Anchor className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Belum ada daftar harga</h3>
          <p className="text-slate-500 mb-4">Anda perlu membuat master harga terlebih dahulu sebelum membuat Work Order.</p>
          <Link href="/sbu/forwarding/master/price">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Buat Master Harga Baru
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {masterPrices.map(price => (
            <div
              key={price.id}
              onClick={() => handlePriceSelect(price)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedPrice?.id === price.id
                  ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${price.delivery_type === 'D2D' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                  {price.delivery_type === 'D2D' ? <Truck className="w-6 h-6" /> : <Anchor className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {price.origin_port} <ArrowRight className="w-4 h-4 text-slate-400" /> {price.destination_port}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600">
                      {price.service_type}
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600">
                      {price.container_type}
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600">
                      {price.delivery_type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Harga Jual per Unit</div>
                <div className="text-xl font-bold text-emerald-600">
                  Rp {(price.sell_price || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const Step3 = () => (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Detail Kontainer & Alamat</h2>
          <p className="text-slate-500 mt-1">Isi informasi barang dan lokasi Door (Pickup/Delivery).</p>
        </div>
        <Button onClick={addContainer} variant="secondary" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Plus className="w-4 h-4 mr-2" /> Tambah Kontainer
        </Button>
      </div>

      <div className="space-y-6">
        {formData.containers.map((cont, idx) => (
          <Card key={idx} className="p-6 border-slate-200 relative shadow-sm">
            {formData.containers.length > 1 && (
              <button 
                onClick={() => removeContainer(idx)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
              >
                &times;
              </button>
            )}
            
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Unit {cont.container_type}</h3>
              <div className="ml-auto text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Revenue: Rp {cont.sell_price?.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Kiri: Alamat Pickup/Delivery */}
              <div className="space-y-5">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" /> Lokasi Pengiriman
                </h4>
                
                {['D2D', 'D2P'].includes(formData.delivery_type) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Pickup (Asal)</label>
                    <textarea 
                      required
                      rows={2}
                      value={cont.pickup_address}
                      onChange={e => updateContainer(idx, 'pickup_address', e.target.value)}
                      placeholder="Alamat lengkap lokasi stuffing/gudang pengirim..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}
                
                {['D2D', 'P2D'].includes(formData.delivery_type) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Delivery (Tujuan)</label>
                    <textarea 
                      required
                      rows={2}
                      value={cont.delivery_address}
                      onChange={e => updateContainer(idx, 'delivery_address', e.target.value)}
                      placeholder="Alamat lengkap gudang penerima/consignee..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}

                {formData.delivery_type === 'P2P' && (
                  <div className="bg-sky-50 text-sky-700 p-4 rounded-lg text-sm flex items-start gap-3">
                    <Anchor className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Port to Port (P2P)</span>
                      <p className="mt-1 opacity-90">Pickup dan delivery dilakukan oleh customer di Port asal & tujuan. Sistem tidak akan meng-auto-create WO Trucking.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Kanan: Detail Barang */}
              <div className="space-y-5">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-500" /> Informasi Komoditas
                </h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Komoditas / Nama Barang</label>
                  <input 
                    type="text" 
                    value={cont.commodity}
                    onChange={e => updateContainer(idx, 'commodity', e.target.value)}
                    placeholder="Cth: Sparepart Mesin, Beras, dll"
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qty / Jumlah</label>
                  <input 
                    type="number" min="1"
                    value={cont.qty || 1}
                    onChange={e => updateContainer(idx, 'qty', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume (CBM)</label>
                    <input 
                      type="number" min="0" step="0.01"
                      value={cont.volume_cbm || ''}
                      onChange={e => updateContainer(idx, 'volume_cbm', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gross Weight (Kg)</label>
                    <input 
                      type="number" min="0"
                      value={cont.gross_weight_kg || ''}
                      onChange={e => updateContainer(idx, 'gross_weight_kg', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const Step4 = () => {
    const totalRev = formData.containers.reduce((acc, c) => acc + (c.sell_price || 0), 0);
    const totalConts = formData.containers.length;

    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Review & Submit</h2>
          <p className="text-slate-500 mt-2">Pastikan semua data sudah benar sebelum menyimpan.</p>
        </div>

        <Card className="p-6 border-slate-200 shadow-sm divide-y divide-slate-100">
          <div className="pb-4">
            <div className="text-sm text-slate-500 mb-1">Cargo Owner</div>
            <div className="font-bold text-lg text-slate-900">
              {customers.find(c => c.id === formData.customer_id)?.name || 'N/A'}
            </div>
          </div>

          <div className="py-4">
            <div className="text-sm text-slate-500 mb-2">Rute & Layanan</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800">{formData.origin_port} &rarr; {formData.destination_port}</div>
                <div className="text-sm text-indigo-600 font-semibold">{formData.service_type} - {formData.delivery_type}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Jumlah Kontainer</div>
                <div className="font-bold text-slate-800">{totalConts} Unit</div>
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="text-sm text-slate-500 mb-2">Status WO</div>
            <div className="flex items-center gap-4">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                submitStatus === 'DRAFT' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
              }`}>
                <input
                  type="radio"
                  name="submitStatus"
                  value="DRAFT"
                  checked={submitStatus === 'DRAFT'}
                  onChange={() => setSubmitStatus('DRAFT')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className={`font-semibold ${submitStatus === 'DRAFT' ? 'text-amber-700' : 'text-slate-600'}`}>
                  Simpan Draft
                </span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                submitStatus === 'PENDING' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
              }`}>
                <input
                  type="radio"
                  name="submitStatus"
                  value="PENDING"
                  checked={submitStatus === 'PENDING'}
                  onChange={() => setSubmitStatus('PENDING')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className={`font-semibold ${submitStatus === 'PENDING' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  Submit
                </span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {submitStatus === 'DRAFT'
                ? 'WO akan disimpan sebagai draft dan bisa diedit nanti.'
                : 'WO akan langsung dibuat dan siap di proses.'}
            </p>
          </div>

          <div className="py-4 bg-emerald-50 -mx-6 px-6 -mb-6 rounded-b-xl border-t border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Total Estimasi Revenue
              </div>
              <div className="text-2xl font-black text-emerald-700">
                Rp {totalRev.toLocaleString('id-ID')}
              </div>
            </div>

            {['D2D', 'D2P', 'P2D'].includes(formData.delivery_type) && (
              <div className="mt-4 text-xs font-semibold text-emerald-800/80 bg-emerald-100/50 p-3 rounded-lg flex items-start gap-2">
                <Truck className="w-4 h-4 shrink-0" />
                <p>Sistem akan otomatis membuat <b>Work Order Trucking</b> terpisah untuk operasional {['D2D', 'D2P'].includes(formData.delivery_type) ? 'Pickup' : ''} {formData.delivery_type === 'D2D' ? 'dan' : ''} {['D2D', 'P2D'].includes(formData.delivery_type) ? 'Last Mile Delivery' : ''} ke lokasi yang ditentukan.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const steps = [
    { title: 'Cargo Owner', component: <Step1 /> },
    { title: 'Rute & Harga', component: <Step2 /> },
    { title: 'Detail Kontainer', component: <Step3 /> },
    { title: 'Selesai', component: <Step4 /> }
  ];

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header Wizard */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Buat WO Forwarding</h1>
              <p className="text-xs text-slate-500 font-medium">Langkah {currentStep} dari 4: {steps[currentStep-1].title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(step => (
              <div 
                key={step} 
                className={`h-2.5 rounded-full transition-all ${
                  step === currentStep 
                    ? 'w-12 bg-indigo-600' 
                    : step < currentStep 
                      ? 'w-6 bg-indigo-300' 
                      : 'w-6 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1">
        {steps[currentStep-1].component}
      </div>

      {/* Footer Wizard */}
      <div className="bg-white border-t border-slate-200 p-4 -mx-6 -mb-6 mt-auto sticky bottom-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={currentStep === 1 ? () => router.back() : prevStep}
            disabled={submitting}
            className="px-6 border-slate-300 text-slate-600"
          >
            {currentStep === 1 ? 'Batal' : 'Kembali'}
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8"
            >
              Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleSubmit('DRAFT')}
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Draft
              </Button>
              <Button
                onClick={() => handleSubmit('PENDING')}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-md shadow-indigo-200"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Submit
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
