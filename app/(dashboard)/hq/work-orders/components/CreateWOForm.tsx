'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { SBU_MAP, type SBUType } from '@/lib/utils/sbuMapping';
import { toast } from 'react-hot-toast';
import { 
  Plus, Trash2, ArrowLeft, Loader2, Send, Save, Edit2, 
  MapPin, Truck, ChevronRight, User, ShieldCheck,
  Building2, Calendar, MessageSquare, Package, Globe, Warehouse
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateWONumber } from '@/lib/utils/woNumber';
import AddTruckingItemModal from './AddTruckingItemModal';
import AddWarehouseItemModal from './AddWarehouseItemModal';
import ContactFormModal from '@/components/master/ContactFormModal';

interface CreateWOFormProps {
  onBack: () => void;
  editId?: string | null;
}

// [AI] Dynamic SBU options — replaced hardcoded list with DB-driven data
export default function CreateWOForm({ onBack, editId }: CreateWOFormProps) {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeSBUModal, setActiveSBUModal] = useState<string | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [activeSbuTypes, setActiveSbuTypes] = useState<Set<string>>(new Set());
  
  // [AI] Build SBU options from active tenant_sbus records
  const SBU_OPTIONS = useMemo(() => {
    return Object.entries(SBU_MAP)
      .filter(([key]) => activeSbuTypes.has(key))
      .map(([key, info]) => ({
        id: info.woType,
        sbuType: key,
        label: info.label,
        color: `text-${info.color}-600`,
        bg: `bg-${info.color}-50`,
      }));
  }, [activeSbuTypes]);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    execution_date: new Date().toISOString().split('T')[0],
    execution_time: '08:00',
    notes: '',
  });
  const [woStatus, setWoStatus] = useState<string | null>(null);
  const isReadOnly = woStatus === 'handover_rejected' || woStatus === 'assigned' || woStatus === 'in_progress' || woStatus === 'completed';

  const [woItems, setWoItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // [AI] Fetch active SBU types from tenant_sbus
  useEffect(() => {
    if (!profile?.tenant_id) return;
    supabase
      .from('tenant_sbus')
      .select('sbu_type')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setActiveSbuTypes(new Set(data.map((s: any) => s.sbu_type)));
      });
  }, [profile?.tenant_id]);

  // Load data for editing
  useEffect(() => {
    if (!editId || !profile?.tenant_id) return;

    const loadWOData = async () => {
      setIsLoadingEdit(true);
      try {
        console.log('[CreateWOForm] Loading WO data for ID:', editId);
        
        // STEP 1: Ambil Work Order header
        const { data: wo, error: woError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('id', editId)
          .maybeSingle();

        if (woError) throw woError;
        if (!wo) {
          toast.error('Work Order tidak ditemukan');
          return;
        }

        console.log('[CreateWOForm] WO header loaded:', wo.wo_number);

        // STEP 2: Ambil WO Items (gabungan tabel baru dan tabel lama untuk kompatibilitas)
        const { data: newItems, error: newItemsError } = await supabase
          .from('wo_items')
          .select('*')
          .eq('wo_id', editId);

        if (newItemsError) throw newItemsError;

        const { data: oldItems, error: oldItemsError } = await supabase
          .from('wo_work_order_items')
          .select('*')
          .eq('work_order_id', editId);

        if (oldItemsError) {
          console.warn('[CreateWOForm] Could not fetch from old table (might not exist):', oldItemsError);
        }
        
        // Normalize oldItems to new items shape
        const normalizedOldItems = (oldItems || []).map(old => ({
          ...old,
          item_data: old.sbu_metadata || { unit_count: old.quantity, deal_price: old.deal_price },
          sbu_type: old.sbu_type || 'TRUCKING',
          total_revenue: (old.quantity || 1) * (old.deal_price || 0)
        }));

        const items = [...(newItems || []), ...normalizedOldItems];

        // STEP 3: Untuk setiap WO Item, ambil Job Orders (jika ada)
        const woItemsWithJobs = await Promise.all(
          (items || []).map(async (item) => {
            const { data: jobOrders } = await supabase
              .from('job_orders')
              .select(`
                id,
                jo_number,
                status,
                fleet_id,
                driver_id,
                driver_phone,
                purchase_price,
                transporter_id,
                tracking_token
              `)
              .eq('wo_item_id', item.id);

            // Fetch extra details if jobs exist
            let enrichedJobs = [];
            if (jobOrders && jobOrders.length > 0) {
              enrichedJobs = await Promise.all(jobOrders.map(async (jo) => {
                let transporter = null;
                let fleet = null;
                let driver = null;

                if (jo.transporter_id) {
                  const { data } = await supabase.from('md_entities').select('id, name').eq('id', jo.transporter_id).maybeSingle();
                  transporter = data;
                }
                if (jo.fleet_id) {
                  const { data } = await supabase.from('md_fleets').select('id, plate_number').eq('id', jo.fleet_id).maybeSingle();
                  fleet = data;
                }
                if (jo.driver_id) {
                  const { data } = await supabase.from('md_drivers').select('id, name').eq('id', jo.driver_id).maybeSingle();
                  driver = data;
                }

                return { ...jo, transporter, fleets: fleet, drivers: driver };
              }));
            }

            return {
              ...item,
              item_data: typeof item.item_data === 'string' ? JSON.parse(item.item_data) : item.item_data,
              job_orders: enrichedJobs
            };
          })
        );

        // STEP 4: Set state
        setWoStatus(wo.status);
        setFormData({
          customer_id: wo.customer_id || '',
          order_date: wo.order_date || new Date().toISOString().split('T')[0],
          execution_date: wo.execution_date || new Date().toISOString().split('T')[0],
          execution_time: wo.execution_time || '08:00',
          notes: wo.notes || '',
        });
        setWoItems(woItemsWithJobs);

        console.log('[CreateWOForm] Successfully loaded', woItemsWithJobs.length, 'items');

      } catch (err: any) {
        console.error('[CreateWOForm] Load Edit Error:', err);
        toast.error(`Gagal memuat data: ${err.message}`);
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadWOData();
  }, [editId, profile?.tenant_id]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!profile?.tenant_id) return;
      try {
        const { data, error } = await supabase
          .from('md_entities')
          .select('id, entity_code, name, legal_name, is_customer, is_vendor')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_customer', true)
          .order('name', { ascending: true });
        
        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Customer Fetch Error:', err);
      }
    };
    
    fetchCustomers();
  }, [profile?.tenant_id]);

  const handleAddItem = (item: any) => {
    if (editingItem) {
      setWoItems(woItems.map(i => i.id === editingItem.id ? { ...item, id: editingItem.id } : i));
    } else {
      setWoItems([...woItems, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setActiveSBUModal(null);
    setEditingItem(null);
  };

  const removeItem = (id: string) => {
    setWoItems(woItems.filter(i => i.id !== id));
  };

  const handleSubmit = async (status: 'draft' | 'need_assignment') => {
    if (!profile?.tenant_id) return;
    if (!formData.customer_id || woItems.length === 0) {
      toast.error('Customer dan Minimal 1 Item wajib diisi.');
      return;
    }

    setSubmitting(status === 'draft' ? 'draft' : 'submit');
    try {
      let woNumber = '';
      let woId = editId;

      const tenantInitial = (profile?.tenants as any)?.name || profile?.tenant_code || 'HQ';

      if (editId) {
        const { data: existingWO } = await supabase.from('work_orders').select('wo_number').eq('id', editId).single();
        woNumber = existingWO?.wo_number || '';
      } else {
        const customer = customers.find(c => c.id === formData.customer_id);
        const customerInitial = customer?.name || 'CUS';
        woNumber = await generateWONumber(profile.tenant_id, tenantInitial, customerInitial);
      }
      
      const payload = {
        tenant_id: profile.tenant_id,
        wo_number: woNumber,
        customer_id: formData.customer_id,
        order_date: formData.order_date,
        execution_date: formData.execution_date,
        execution_time: formData.execution_time,
        notes: formData.notes,
        status,
        created_by: profile?.id
      };

      if (editId) {
        const { error } = await supabase.from('work_orders').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { data: wo, error } = await supabase.from('work_orders').insert(payload).select().single();
        if (error) throw error;
        woId = wo?.id;
      }

      await supabase.from('wo_items').delete().eq('wo_id', woId);

      const sbuCounts: Record<string, number> = {};

      for (const [index, item] of woItems.entries()) {
        const sbuKey = item.sbu_type === 'TRUCKING' ? 'TR' : 
                       item.sbu_type === 'CLEARANCE' ? 'CC' :
                       item.sbu_type === 'WAREHOUSE' ? 'WH' :
                       item.sbu_type === 'FORWARDING' ? 'FW' : 'OT';
        
        sbuCounts[sbuKey] = (sbuCounts[sbuKey] || 0) + 1;
        const itemCode = `${woNumber}/${sbuKey}${sbuCounts[sbuKey].toString().padStart(2, '0')}`;
        
        const { data: woItem, error: itemError } = await supabase
          .from('wo_items')
          .insert({
            tenant_id: profile.tenant_id,
            wo_id: woId,
            item_code: itemCode,
            sbu_type: item.sbu_type,
            max_jo_count: item.quantity || item.item_data?.unit_count || 1,
            unit_price: item.unit_price || 0,
            total_revenue: item.total_revenue || 0,
            item_data: item.item_data,
            status: status === 'draft' ? 'draft' : 'need_assignment'
          })
          .select()
          .single();
        if (itemError) throw itemError;

        // INSERT MANIFESTS IF ANY
        if (item.manifests && Array.isArray(item.manifests) && item.manifests.length > 0) {
          const manifestPayloads = item.manifests.map((m: any) => ({
            wo_item_id: woItem.id,
            tenant_id: profile.tenant_id,
            product_sku_id: m.product_sku_id,
            quantity: m.quantity || 1,
            unit_weight_kg: m.unit_weight_kg || 0,
            unit_volume_m3: m.unit_volume_m3 || 0,
            notes: m.notes || null
          }));
          const { error: manifestError } = await supabase.from('wo_item_manifests').insert(manifestPayloads);
          if (manifestError) console.error('Error inserting manifests:', manifestError);
        }

        if (item.sbu_type === 'TRUCKING' && item.item_data.stops) {
          const unitCount = item.item_data.unit_count || 1;
          for (let i = 1; i <= unitCount; i++) {
            const joNumber = `${woNumber}-${i.toString().padStart(2, '0')}`;
            
            const { data: jobOrder, error: joError } = await supabase
              .from('job_orders')
              .insert({
                tenant_id: profile.tenant_id,
                jo_number: joNumber,
                wo_item_id: woItem.id,
                total_stops: item.item_data.stops.length,
                status: status === 'draft' ? 'draft' : 'pending',
                tracking_token: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
              })
              .select()
              .single();

            if (joError) throw joError;

            const routePayloads = (item.item_data.stops || []).map((stop: any) => ({
              job_order_id: jobOrder.id,
              sequence: stop.sequence || 0,
              stop_type: stop.stop_type || 'DROPOFF',
              source_type: stop.source_type || 'MD_LOCATION',
              source_id: String(stop.source_id || ''),
              location_name: stop.location_name || 'Unknown Location',
              address: stop.address || '',
              latitude: stop.latitude,
              longitude: stop.longitude,
              contact_name: stop.contact_name || '',
              contact_phone: stop.contact_phone || '',
              status: status === 'draft' ? 'draft' : 'pending'
            }));

            if (routePayloads.length > 0) {
              const { error: routesError } = await supabase.from('job_routes').insert(routePayloads);
              if (routesError) throw routesError;
            }
          }
        }

        // AUTO-SPLIT JOB ORDERS FOR WAREHOUSE
        if (item.sbu_type === 'WAREHOUSE') {
          const unitCount = item.item_data.unit_count || 1;
          for (let i = 1; i <= unitCount; i++) {
            const joNumber = `${itemCode}-${i.toString().padStart(2, '0')}`;
            
            const { error: joError } = await supabase
              .from('job_orders')
              .insert({
                tenant_id: profile.tenant_id,
                jo_number: joNumber,
                wo_item_id: woItem.id,
                status: status === 'draft' ? 'draft' : 'pending',
                tracking_token: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
              });

            if (joError) console.error('Error creating WH Job Order:', joError);
          }
        }
      }

      toast.success(editId ? 'Perubahan berhasil disimpan' : 'Berhasil disimpan');
      onBack();
    } catch (err: any) {
      console.error('SUBMIT FATAL ERROR:', err);
      toast.error(err.message || 'Gagal menyimpan Work Order.');
    } finally {
      setSubmitting(null);
    }
  };

  const totalRevenue = woItems.reduce((acc, curr) => acc + (Number(curr.total_revenue) || Number(curr.item_data?.est_revenue) || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8FAFC] overflow-y-auto">
      {isLoadingEdit && (
        <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-xs font-black text-slate-900 uppercase tracking-[0.4em]">Loading Work Order Data...</p>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all uppercase tracking-widest text-[10px]">
            <ArrowLeft size={14} /> Back to Directory
          </button>
          <div className="md:text-right">
            <h2 className="text-3xl font-black text-slate-900 italic tracking-tight">ORCHESTRATE WORK ORDER</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Multi-SBU Dispatcher System</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-8 border-slate-200 shadow-none !rounded-[2.5rem] space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Building2 size={12} /> Client / Customer Selection *
                  </label>
                  <select 
                    value={formData.customer_id}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsQuickAddOpen(true);
                      } else {
                        setFormData({...formData, customer_id: e.target.value});
                      }
                    }}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select Customer</option>
                    <option value="ADD_NEW" className="text-blue-600 font-black">+ ADD NEW CUSTOMER</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.entity_code}] {c.name} {c.legal_name ? ` - ${c.legal_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar size={12} /> Order Date *
                    </label>
                    <input 
                      type="date"
                      disabled={isReadOnly}
                      value={formData.order_date}
                      onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar size={12} /> Execution Date & Time *
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        disabled={isReadOnly}
                        value={formData.execution_date}
                        onChange={(e) => setFormData({...formData, execution_date: e.target.value})}
                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70"
                      />
                      <input 
                        type="time"
                        disabled={isReadOnly}
                        value={formData.execution_time}
                        onChange={(e) => setFormData({...formData, execution_time: e.target.value})}
                        className="w-32 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <MessageSquare size={12} /> Internal Notes
                </label>
                <textarea 
                  rows={3}
                  disabled={isReadOnly}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Operational notes, fragile handlings, or specific instructions..."
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70"
                />
              </div>
            </Card>

            <div className="space-y-4">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] ml-2 italic">Select SBU Modules</h3>
               {SBU_OPTIONS.length === 0 ? (
                 <p className="text-xs text-slate-400 font-medium ml-2">No active SBU modules. Ask admin to activate SBUs first.</p>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SBU_OPTIONS.map((sbu) => (
                      <button 
                        key={sbu.id}
                        disabled={isReadOnly}
                        onClick={() => !isReadOnly && setActiveSBUModal(sbu.id)}
                        className={`group p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center bg-white border-slate-100 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/5`}
                      >
                         <div className={`p-4 rounded-2xl ${sbu.bg} ${sbu.color} transition-transform group-hover:scale-110`}>
                            {sbu.id === 'TRUCKING' && <Truck size={24} />}
                            {sbu.id === 'WAREHOUSE' && <Warehouse size={24} />}
                            {sbu.id === 'CLEARANCE' && <ShieldCheck size={24} />}
                            {sbu.id === 'FORWARDING' && <Globe size={24} />}
                         </div>
                         <span className="text-xs font-black uppercase tracking-widest text-slate-900">{sbu.label}</span>
                      </button>
                    ))}
                 </div>
               )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">Work Order Manifest</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{woItems.length} Items Selected</span>
              </div>

              {woItems.length === 0 ? (
                <Card className="py-20 text-center border-dashed border-2 border-slate-200 shadow-none !rounded-[2.5rem]">
                  <div className="p-4 bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Plus size={24} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select an SBU module above to add items</p>
                </Card>
              ) : (
                woItems.map((item) => (
                  <Card key={item.id} className="p-6 border-slate-200 shadow-none !rounded-[2rem] hover:border-slate-400 transition-all group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 shadow-lg ${item.sbu_type === 'WAREHOUSE' ? 'bg-amber-600 text-white shadow-amber-600/20' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
                          {item.sbu_type === 'WAREHOUSE' ? <Package size={24} /> : <Truck size={24} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded uppercase tracking-[0.2em] ${item.sbu_type === 'WAREHOUSE' ? 'bg-amber-600' : 'bg-blue-600'}`}>{item.sbu_type}</span>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{item.item_data?.unit_count || 1} Units</span>
                          </div>
                          
                          {item.sbu_type === 'WAREHOUSE' ? (
                            <div className="mt-2 text-sm font-bold text-slate-900">
                               {item.item_data?.operation_type || 'Warehouse Task'} | {item.item_data?.est_volume_cbm || 0} CBM
                            </div>
                          ) : (
                            <div className="text-sm font-bold text-slate-900 mt-1">
                               {item.item_data?.vehicle_type_name || 'Generic Fleet'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                            <p className="text-sm font-black text-slate-900 italic font-mono">IDR {Number(item.total_revenue).toLocaleString('id-ID')}</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                              disabled={isReadOnly}
                              onClick={() => {
                                setEditingItem(item);
                                setActiveSBUModal(item.sbu_type);
                              }}
                              className={`p-3 rounded-xl transition-all ${isReadOnly ? 'text-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              disabled={isReadOnly}
                              onClick={() => removeItem(item.id)} 
                              className={`p-3 rounded-xl transition-all ${isReadOnly ? 'text-slate-200' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-8 bg-white text-slate-900 !rounded-[3rem] shadow-xl shadow-slate-200/60 space-y-8 sticky top-8 border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic border-b border-slate-50 pb-6">Manifest Summary</h3>
              <div className="pt-6 border-t border-slate-50">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Estimated Revenue</span>
                      <span className="text-3xl font-black italic tracking-tighter text-emerald-600">
                         IDR {totalRevenue.toLocaleString('id-ID')}
                      </span>
                   </div>
              </div>
              <div className="space-y-3 pt-4">
                {!isReadOnly && (
                  <>
                    <button onClick={() => handleSubmit('need_assignment')} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                       {submitting === 'submit' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} SUBMIT TO SBU
                    </button>
                    <button onClick={() => handleSubmit('draft')} className="w-full py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                       {submitting === 'draft' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} SAVE AS DRAFT
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        {activeSBUModal === 'TRUCKING' && (
           <AddTruckingItemModal 
             initialData={editingItem}
             customerId={formData.customer_id}
             defaultExecutionDate={formData.execution_date}
             defaultExecutionTime={formData.execution_time}
             onClose={() => { setActiveSBUModal(null); setEditingItem(null); }} 
             onAdd={handleAddItem} 
           />
        )}
        
        {activeSBUModal === 'WAREHOUSE' && (
           <AddWarehouseItemModal 
             initialData={editingItem}
             customerId={formData.customer_id}
             defaultExecutionDate={formData.execution_date}
             defaultExecutionTime={formData.execution_time}
             onClose={() => {
               setActiveSBUModal(null);
               setEditingItem(null);
             }} 
             onAdd={handleAddItem} 
           />
        )}

        {isQuickAddOpen && profile?.tenant_id && (
          <ContactFormModal 
            tenantId={profile.tenant_id}
            onClose={() => setIsQuickAddOpen(false)}
            onSuccess={(newContact) => {
              setCustomers([newContact, ...customers]);
              setFormData({...formData, customer_id: newContact.id});
              setIsQuickAddOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
