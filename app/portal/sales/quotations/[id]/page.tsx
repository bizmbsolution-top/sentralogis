'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  ChevronLeft, 
  Plus, 
  X, 
  Save, 
  Trash2, 
  FileText, 
  Printer, 
  Check, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Truck,
  Warehouse,
  FileSpreadsheet,
  Globe,
  Settings,
  Info,
  Calendar,
  Send,
  Edit2,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';



export default function MobileQuotationBuilder({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  const { user, profile } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: TRUCKING, WAREHOUSE, CLEARANCE, FORWARDING, GENERAL
  const [activeTab, setActiveTab] = useState<string>('');

  // Add Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    service_id: '',
    description: '',
    qty: 1,
    uom: 'Unit',
    unit_price: 0,
    tax_percent: 0,
    pricing_type: 'ONE_TIME',
    min_qty: 0,
    rate_id: '',
    remarks: ''
  });
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Local SBU states for input form
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [sbuVehicleTypeId, setSbuVehicleTypeId] = useState('');
  const [sbuRoute, setSbuRoute] = useState('');
  const [sbuOperationType, setSbuOperationType] = useState('INBOUND');
  const [sbuWarehouseId, setSbuWarehouseId] = useState('');
  const [sbuVolumeCbm, setSbuVolumeCbm] = useState(0);
  const [sbuTonnage, setSbuTonnage] = useState(0);

  // Customer rates for import
  const [customerRates, setCustomerRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string>('');

  // SBU & Global Notes Edit State
  const [notes, setNotes] = useState('');
  const [sbuNotes, setSbuNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingSbuNotes, setSavingSbuNotes] = useState<Record<string, boolean>>({});

  // Quote Metadata
  const [validityDays, setValidityDays] = useState(30);
  const [savingMeta, setSavingMeta] = useState(false);

  // Add Section State
  const [showAddSection, setShowAddSection] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchQuotation();
      fetchServices();
    }
  }, [user, id]);

  // Fetch rates when activeTab or customer changes
  useEffect(() => {
    const customerId = quote?.crm_deals?.entity_id;
    if (customerId && activeTab) {
      fetchCustomerRates(customerId, activeTab);
    } else {
      setCustomerRates([]);
    }
    setSelectedRateId('');
  }, [quote, activeTab]);

  // Load section notes
  useEffect(() => {
    const notesMap: Record<string, string> = {};
    sections.forEach(sec => {
      notesMap[sec.sbu_type] = sec.sbu_notes || '';
    });
    setSbuNotes(notesMap);
  }, [sections]);

  async function fetchQuotation() {
    setLoading(true);
    try {
      const { data: rawQuoteData } = await (supabase
        .from('crm_quotations' as any) as any)
        .select(`*, crm_deals(title, entity_id, md_entities(name, billing_address))`)
        .eq('id', id)
        .single();
      const quoteData = rawQuoteData as any;
      
      if (quoteData) {
        setQuote(quoteData);
        setNotes(quoteData.notes || '');
        setValidityDays(quoteData.validity_days || 30);
        
        // Fetch Sections
        const { data: sectionsData } = await (supabase
          .from('crm_quotation_sections' as any) as any)
          .select('*')
          .eq('quotation_id', id)
          .order('sbu_type', { ascending: true });
          
        const currentSections = (sectionsData as any[]) || [];
        setSections(currentSections);

        // Fetch Items
        const { data: itemsData } = await (supabase
          .from('crm_quotation_items' as any) as any)
          .select('*')
          .eq('quotation_id', id)
          .order('created_at', { ascending: true });
          
        const currentItems = (itemsData as any[]) || [];
        setItems(currentItems);

        // Determine active tab if not set or not valid
        const activeSbus = currentSections.map((s: any) => s.sbu_type);
        if (currentSections.length > 0) {
          if (!activeTab || !activeSbus.includes(activeTab)) {
            setActiveTab(currentSections[0].sbu_type);
          }
        } else {
          setActiveTab('');
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchServices() {
    try {
      const { data } = await supabase
        .from('md_services')
        .select('id, service_name, default_uom, sbu_type')
        .eq('is_active', true)
        .order('service_name', { ascending: true });
      setServices(data || []);
    } catch (err) {
      console.warn(err);
    }
  }

  async function fetchCustomerRates(customerId: string, sbuType: string) {
    try {
      const { data } = await supabase
        .from('crm_sbu_customer_rates')
        .select('*')
        .eq('customer_id', customerId)
        .eq('sbu_type', sbuType)
        .eq('is_active', true);
      setCustomerRates(data || []);
    } catch (err) {
      console.warn(err);
    }
  }

  const handleServiceSelect = (serviceId: string) => {
    const srv = services.find(s => s.id === serviceId);
    if (srv) {
      setNewItem({
        ...newItem,
        service_id: srv.id,
        description: srv.service_name,
        uom: srv.default_uom || 'Unit',
        rate_id: ''
      });
      setSelectedRateId('');
    } else {
      setNewItem({ ...newItem, service_id: '', description: '', rate_id: '' });
      setSelectedRateId('');
    }
  };

  const handleRateSelect = (rateId: string) => {
    setSelectedRateId(rateId);
    const rate = customerRates.find(r => r.id === rateId);
    if (rate) {
      // Auto-construct description with route if present
      const routeText = (rate.route_origin && rate.route_destination) 
        ? ` (${rate.route_origin} - ${rate.route_destination})` 
        : '';
      setNewItem({
        ...newItem,
        service_id: '', // standard service lookup ignored when rate card is selected
        description: `${rate.service_name}${routeText}`,
        uom: rate.uom || 'Unit',
        unit_price: Number(rate.unit_price) || 0,
        pricing_type: rate.pricing_type || 'ONE_TIME',
        min_qty: Number(rate.min_qty) || 0,
        rate_id: rate.id,
        remarks: ''
      });
    }
  };

  async function fetchSbuHelpers() {
    try {
      const vtQuery = supabase
        .from('md_fleet_types')
        .select('id, type_name');
      
      if (profile?.tenant_id) {
        vtQuery.or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`);
      }
      
      const { data: vtData } = await vtQuery.order('type_name');
      setVehicleTypes(vtData || []);

      const whQuery = supabase
        .from('md_warehouses')
        .select('id, name, code')
        .eq('is_active', true);
        
      if (profile?.tenant_id) {
        whQuery.eq('tenant_id', profile.tenant_id);
      }
      
      const { data: whData } = await whQuery.order('name');
      setWarehouses(whData || []);
    } catch (err) {
      console.warn(err);
    }
  }

  const resetSbuFields = () => {
    setSbuVehicleTypeId('');
    setSbuRoute('');
    setSbuOperationType('INBOUND');
    setSbuWarehouseId('');
    setSbuVolumeCbm(0);
    setSbuTonnage(0);
    setNewItem({
      service_id: '',
      description: '',
      qty: 1,
      uom: 'Unit',
      unit_price: 0,
      tax_percent: 0,
      pricing_type: 'ONE_TIME',
      min_qty: 0,
      rate_id: '',
      remarks: ''
    });
  };

  useEffect(() => {
    if (user && profile) {
      fetchSbuHelpers();
    }
  }, [user, profile]);

  useEffect(() => {
    if (activeTab === 'TRUCKING') {
      const selectedVehicleType = vehicleTypes.find(v => v.id === sbuVehicleTypeId);
      const vtName = selectedVehicleType ? selectedVehicleType.type_name : 'TBA';
      setNewItem(prev => ({
        ...prev,
        description: `Trucking ${vtName} (${sbuRoute || 'TBA'})`
      }));
    } else if (activeTab === 'WAREHOUSE') {
      const selectedWarehouse = warehouses.find(w => w.id === sbuWarehouseId);
      const whName = selectedWarehouse ? selectedWarehouse.name : 'TBA';
      setNewItem(prev => ({
        ...prev,
        description: `${sbuOperationType} - ${whName} (${sbuVolumeCbm || 0} CBM, ${sbuTonnage || 0} Ton)`
      }));
    }
  }, [sbuVehicleTypeId, sbuRoute, sbuOperationType, sbuWarehouseId, sbuVolumeCbm, sbuTonnage, activeTab, vehicleTypes, warehouses]);

  const handleAddSection = async (sbuType: string) => {
    try {
      const { data: newSec, error } = await supabase
        .from('crm_quotation_sections')
        .insert([{
          tenant_id: quote.tenant_id,
          quotation_id: id,
          sbu_type: sbuType,
          approval_status: 'PENDING'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setShowAddSection(false);
      await fetchQuotation();
      setActiveTab(sbuType);
    } catch (err: any) {
      alert("Failed to add SBU: " + err.message);
    }
  };

  const handleDeleteSection = async (sectionId: string, sbuType: string) => {
    const sectionItems = items.filter(item => item.section_id === sectionId || (!item.section_id && item.sbu_cluster === sbuType));
    if (sectionItems.length > 0) {
      alert(`Cannot delete ${sbuType} section because it contains line items. Please delete the items first.`);
      return;
    }
    if (!confirm(`Delete ${sbuType} section?`)) return;
    
    try {
      const { error } = await supabase.from('crm_quotation_sections').delete().eq('id', sectionId);
      if (error) throw error;
      
      const remainingSections = sections.filter(s => s.id !== sectionId);
      if (remainingSections.length > 0) {
        setActiveTab(remainingSections[0].sbu_type);
      } else {
        setActiveTab('');
      }
      
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to delete section: " + err.message);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || newItem.qty <= 0 || newItem.unit_price < 0) return;
    setAddingItem(true);

    const activeSec = sections.find(s => s.sbu_type === activeTab);
    if (!activeSec) {
      alert("No active section found for SBU: " + activeTab);
      setAddingItem(false);
      return;
    }

    try {
      const itemPayload: any = {
        tenant_id: profile?.tenant_id as string,
        quotation_id: id,
        section_id: activeSec.id,
        service_id: newItem.service_id || null,
        description: newItem.description,
        qty: newItem.qty,
        uom: newItem.uom,
        unit_price: newItem.unit_price,
        tax_percent: newItem.tax_percent,
        sbu_cluster: activeTab,
        pricing_type: activeTab === 'WAREHOUSE' && (sbuOperationType === 'RENTAL' || sbuOperationType === 'STORAGE') ? 'RECURRING_MONTHLY' : newItem.pricing_type,
        min_qty: newItem.min_qty,
        rate_id: newItem.rate_id || null,
        remarks: newItem.remarks || ''
      };

      if (activeTab === 'TRUCKING') {
        const selectedVehicleType = vehicleTypes.find(v => v.id === sbuVehicleTypeId);
        const vtName = selectedVehicleType ? selectedVehicleType.type_name : 'TBA';
        itemPayload.sbu_metadata = {
          vehicle_type_id: sbuVehicleTypeId,
          vehicle_type_name: vtName,
          stops: sbuRoute ? [{ sequence: 1, stop_type: 'ROUTE', address: sbuRoute }] : []
        };
      } else if (activeTab === 'WAREHOUSE') {
        const selectedWarehouse = warehouses.find(w => w.id === sbuWarehouseId);
        const whName = selectedWarehouse ? selectedWarehouse.name : 'TBA';
        itemPayload.sbu_metadata = {
          operation_type: sbuOperationType,
          warehouse_id: sbuWarehouseId,
          warehouse_name: whName,
          est_volume_cbm: Number(sbuVolumeCbm) || 0,
          est_tonnage: Number(sbuTonnage) || 0,
          manifests: []
        };
      }

      if (editingItem) {
        const { error } = await supabase
          .from('crm_quotation_items')
          .update(itemPayload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_quotation_items')
          .insert([{ ...itemPayload, created_by: user?.id }]);
        if (error) throw error;
      }

      setShowAddItem(false);
      setEditingItem(null);
      resetSbuFields();
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to add item: " + err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const renderItemDetails = (item: any) => {
    if (!item.sbu_metadata || Object.keys(item.sbu_metadata).length === 0) return null;

    if (item.sbu_cluster === 'TRUCKING') {
      const meta = item.sbu_metadata;
      const stops = meta.stops || [];
      return (
        <div className="mt-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
            <span className="text-slate-800">Vehicle: <span className="font-bold text-indigo-600">{meta.vehicle_type_name || 'TBA'}</span></span>
            {meta.execution_date && (
              <span>Schedule: <span className="font-bold text-indigo-600">{meta.execution_date} {meta.execution_time}</span></span>
            )}
            {meta.est_distance_km && (
              <span>Est. Distance: <span className="font-bold text-slate-700">{meta.est_distance_km} km</span></span>
            )}
          </div>
          {stops.length > 0 && (
            <div className="space-y-1 border-t border-slate-200/60 pt-1.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Route Manifest</span>
              <div className="space-y-1 pl-1 border-l-2 border-slate-200">
                {stops.map((stop: any, index: number) => (
                  <div key={stop.id || index} className="flex items-start gap-1">
                    <span className="font-bold text-slate-800">#{stop.sequence || index + 1}</span>
                    <span className={`px-1 rounded text-[9px] font-bold ${stop.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {stop.stop_type}
                    </span>
                    <span className="font-medium text-slate-700">{stop.location_name || stop.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (item.sbu_cluster === 'WAREHOUSE') {
      const meta = item.sbu_metadata;
      const manifests = meta.manifests || [];
      return (
        <div className="mt-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
            <span className="text-slate-800">Operation: <span className="font-bold text-amber-600">{meta.operation_type || 'INBOUND'}</span></span>
            {meta.warehouse_name && (
              <span>Warehouse: <span className="font-bold text-slate-700">{meta.warehouse_name}</span></span>
            )}
            {meta.est_volume_cbm > 0 && (
              <span>Volume: <span className="font-bold text-slate-700">{meta.est_volume_cbm} CBM</span></span>
            )}
            {meta.est_tonnage > 0 && (
              <span>Tonnage: <span className="font-bold text-slate-700">{meta.est_tonnage} Ton</span></span>
            )}
          </div>
          {manifests.length > 0 && (
            <div className="space-y-1 border-t border-slate-200/60 pt-1.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Product Manifest SKUs</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                {manifests.map((m: any, idx: number) => (
                  <div key={m.product_sku_id || idx} className="text-slate-700 font-medium flex items-center justify-between bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
                    <span className="truncate max-w-[70%]">[{m.sku_code || 'SKU'}] {m.name}</span>
                    <span className="font-bold text-slate-800">{m.quantity} {m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this item?')) return;
    try {
      const { error } = await supabase.from('crm_quotation_items').delete().eq('id', itemId);
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to delete item: " + err.message);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('crm_quotations').update({ notes }).eq('id', id);
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to save global notes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveSbuNotes = async (sbuType: string) => {
    const sec = sections.find(s => s.sbu_type === sbuType);
    if (!sec) return;
    setSavingSbuNotes(prev => ({ ...prev, [sbuType]: true }));
    try {
      const { error } = await supabase
        .from('crm_quotation_sections')
        .update({ sbu_notes: sbuNotes[sbuType] || '' })
        .eq('id', sec.id);
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to save SBU notes: " + err.message);
    } finally {
      setSavingSbuNotes(prev => ({ ...prev, [sbuType]: false }));
    }
  };

  const handleSaveValidity = async () => {
    setSavingMeta(true);
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ validity_days: validityDays })
        .eq('id', id);
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to save validity days: " + err.message);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleApproveSection = async (sectionId: string, approve: boolean, reason?: string) => {
    try {
      const { error } = await (supabase
        .from('crm_quotation_sections' as any) as any)
        .update({
          approval_status: approve ? 'APPROVED' : 'REJECTED',
          approved_by: approve ? user?.id : undefined,
          approved_at: approve ? new Date().toISOString() : undefined,
          rejection_reason: approve ? undefined : reason
        })
        .eq('id', sectionId);

      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  const handleRejectPrompt = (sectionId: string) => {
    const reason = prompt("Masukkan alasan penolakan (Wajib):");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    handleApproveSection(sectionId, false, reason);
  };

  const handleSubmitApproval = async () => {
    try {
      // Reset any rejected sections to PENDING
      const rejectedSections = sections.filter(s => s.approval_status === 'REJECTED');
      for (const sec of rejectedSections) {
        await (supabase
          .from('crm_quotation_sections' as any) as any)
          .update({ approval_status: 'PENDING', rejection_reason: undefined })
          .eq('id', sec.id);
      }
      
      const { error } = await (supabase
        .from('crm_quotations' as any) as any)
        .update({ status: 'WAITING_APPROVAL' })
        .eq('id', id);
        
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to submit approval: " + err.message);
    }
  };

  const handleSendToCustomer = async () => {
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'SENT' })
        .eq('id', id);
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to update status to SENT: " + err.message);
    }
  };

  const handleSendViaWhatsApp = () => {
    const custName = quote.crm_deals?.md_entities?.name || 'Bapak/Ibu';
    const quoteNum = quote.quote_number;
    const quoteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://sentralogis.com'}/quote/${id}`;
    const template = `Halo ${custName},\n\nBerikut kami sampaikan penawaran harga (Quotation) dengan nomor referensi ${quoteNum} dari PT Sentralogis Nusantara.\n\nAnda dapat melihat dan mengunduh detail penawaran (PDF) melalui link berikut:\n${quoteLink}\n\nJika ada pertanyaan, Anda dapat membalas pesan ini.\n\nTerima kasih,\n${profile?.full_name || 'Tim Sentralogis'}`;
    const phone = quote.crm_deals?.md_entities?.phone || '';
    const formattedPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
    const text = encodeURIComponent(template);
    const waUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${text}` : `https://web.whatsapp.com/send?text=${text}`;
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn("Popup blocked or window.open failed", e);
    }
    handleSendToCustomer();
  };

  if (loading) return <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading Quotation...</div>;
  if (!quote) return <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Quotation not found</div>;

  const entityName = quote.crm_deals?.md_entities?.name || (Array.isArray(quote.crm_deals?.md_entities) ? quote.crm_deals?.md_entities[0]?.name : '');
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const activeSection = sections.find(s => s.sbu_type === activeTab);
  const activeItems = items.filter(item => item.section_id === activeSection?.id || (!item.section_id && item.sbu_cluster === activeTab));

  const availableSbus = ['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'].filter(sbu => !sections.some(sec => sec.sbu_type === sbu));
  
  // Checking PIC roles for approval options
  const isApprover = profile?.role === 'tenant_admin' || profile?.role === 'sbu_manager' || profile?.role === 'owner_admin';

  const getSbuIcon = (sbu: string) => {
    switch (sbu) {
      case 'TRUCKING': return <Truck className="w-4 h-4" />;
      case 'WAREHOUSE': return <Warehouse className="w-4 h-4" />;
      case 'CLEARANCE': return <FileSpreadsheet className="w-4 h-4" />;
      case 'FORWARDING': return <Globe className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'WAITING_APPROVAL': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'READY_TO_SEND': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SENT': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-40">
      {/* Header */}
      <div className="bg-indigo-600 px-4 py-4 flex items-center gap-3 sticky top-0 z-20 text-white shadow-md">
        <button onClick={() => router.push(`/portal/sales/deals/${quote.deal_id}`)} className="p-2 -ml-2 rounded-full active:bg-indigo-700 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">Quotation Builder</h2>
          <p className="text-[10px] text-indigo-200">{quote.quote_number}</p>
        </div>
        <button 
          onClick={handleSendViaWhatsApp}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full active:bg-emerald-700 shadow-sm border border-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <MessageSquare className="w-3.5 h-3.5" /> WA
        </button>
        <Link 
          href={`/quote/${quote.id}`} 
          className="p-2 bg-indigo-500 rounded-full active:bg-indigo-700 shadow-sm border border-indigo-400 transition-colors"
        >
          <Printer className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* Quote Meta Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{entityName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{quote.crm_deals?.title}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${getStatusBadgeClass(quote.status)}`}>
              {quote.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Masa Berlaku</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={validityDays}
                  onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                  className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-center focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">Hari</span>
                {validityDays !== quote.validity_days && (
                  <button 
                    onClick={handleSaveValidity}
                    disabled={savingMeta}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pajak (PPN)</label>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">Default 11%</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">SBU Sections</label>
            {availableSbus.length > 0 && (
              <button 
                onClick={() => setShowAddSection(true)}
                className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add SBU Section
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {sections.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">No SBU sections added yet. Click "Add SBU Section" to begin.</div>
            ) : (
              sections.map(sec => {
                const isActive = activeTab === sec.sbu_type;
                const secItems = items.filter(item => item.section_id === sec.id);
                
                let statusIcon = <Clock className="w-3 h-3 text-amber-500" />;
                if (sec.approval_status === 'APPROVED') {
                  statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
                } else if (sec.approval_status === 'REJECTED') {
                  statusIcon = <XCircle className="w-3 h-3 text-rose-500" />;
                }

                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.sbu_type)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-200 shadow-sm ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {getSbuIcon(sec.sbu_type)}
                    <span>{sec.sbu_type}</span>
                    <span className="ml-1 bg-white/20 p-0.5 rounded-full flex items-center justify-center">
                      {statusIcon}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Section Content */}
        {activeSection ? (
          <div className="space-y-4">
            {/* Section Approval Banner */}
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
              activeSection.approval_status === 'APPROVED' 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : activeSection.approval_status === 'REJECTED' 
                  ? 'bg-rose-50/50 border-rose-100 text-rose-800' 
                  : 'bg-amber-50/50 border-amber-100 text-amber-800'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {activeSection.approval_status === 'APPROVED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : activeSection.approval_status === 'REJECTED' ? (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-xs font-bold">
                    Section {activeTab}: {activeSection.approval_status}
                  </span>
                </div>
                {/* Delete Section button (only if empty) */}
                {activeItems.length === 0 && (
                  <button 
                    onClick={() => handleDeleteSection(activeSection.id, activeSection.sbu_type)}
                    className="p-1 hover:bg-rose-100 text-rose-600 rounded-md transition-colors"
                    title="Hapus Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {activeSection.rejection_reason && (
                <p className="text-xs bg-white/60 p-2 rounded-lg border border-rose-100 text-rose-700 italic">
                  Alasan penolakan: "{activeSection.rejection_reason}"
                </p>
              )}

              {/* Approver actions for PIC */}
              {isApprover && quote.status === 'WAITING_APPROVAL' && activeSection.approval_status === 'PENDING' && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                  <button 
                    onClick={() => handleApproveSection(activeSection.id, true)}
                    className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-emerald-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleRejectPrompt(activeSection.id)}
                    className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-rose-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>

            {/* Line Items List */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Line Items ({activeItems.length})
              </h3>
              
              <div className="space-y-3">
                {activeItems.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4">
                    <p className="text-xs font-bold text-slate-500">Belum ada item di section {activeTab}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Klik "+ Add Item" di bawah untuk menambah manual atau import.</p>
                  </div>
                ) : (
                  activeItems.map((item, idx) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative hover:border-slate-300 transition-colors flex flex-col justify-between gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800 line-clamp-2">{idx + 1}. {item.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1 mb-2">
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded font-bold border border-slate-100">{item.qty} {item.uom}</span>
                            <span>x</span>
                            <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                            {item.min_qty > 0 && <span className="bg-slate-100 px-1 rounded text-slate-600">Min: {item.min_qty}</span>}
                            {item.pricing_type === 'RECURRING_MONTHLY' && <span className="bg-indigo-50 text-indigo-600 px-1.5 rounded font-semibold">/Bulan</span>}
                            {item.tax_percent > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">+ {item.tax_percent}% PPN</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-indigo-600">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>

                      {renderItemDetails(item)}

                      <div className="flex justify-end gap-2 border-t border-slate-50 pt-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setNewItem({
                              service_id: item.service_id || '',
                              description: item.description,
                              qty: Number(item.qty),
                              uom: item.uom || 'Unit',
                              unit_price: Number(item.unit_price),
                              tax_percent: Number(item.tax_percent) || 0,
                              pricing_type: item.pricing_type || 'ONE_TIME',
                              min_qty: Number(item.min_qty) || 0,
                              rate_id: item.rate_id || '',
                              remarks: item.remarks || ''
                            });
                            if (item.sbu_cluster === 'TRUCKING') {
                              setSbuVehicleTypeId(item.sbu_metadata?.vehicle_type_id || '');
                              setSbuRoute(item.sbu_metadata?.stops?.[0]?.address || item.sbu_metadata?.stops?.[0]?.location_name || '');
                            } else if (item.sbu_cluster === 'WAREHOUSE') {
                              setSbuOperationType(item.sbu_metadata?.operation_type || 'INBOUND');
                              setSbuWarehouseId(item.sbu_metadata?.warehouse_id || '');
                              setSbuVolumeCbm(Number(item.sbu_metadata?.est_volume_cbm) || 0);
                              setSbuTonnage(Number(item.sbu_metadata?.est_tonnage) || 0);
                            }
                            setShowAddItem(true);
                          }}
                          className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)} 
                          className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <button 
                  onClick={() => setShowAddItem(true)}
                  className="w-full py-3.5 bg-white border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50/50 rounded-xl text-sm font-bold active:bg-indigo-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Item to {activeTab}
                </button>
              </div>
            </div>

            {/* Section Specific Notes (T&C) */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Notes / T&C Khusus {activeTab}</h3>
              <div className="relative">
                <textarea 
                  value={sbuNotes[activeTab] || ''}
                  onChange={e => setSbuNotes({ ...sbuNotes, [activeTab]: e.target.value })}
                  placeholder={`Masukkan syarat & ketentuan spesifik untuk ${activeTab} di sini...`}
                  rows={3}
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                ></textarea>
                <button 
                  onClick={() => handleSaveSbuNotes(activeTab)}
                  disabled={savingSbuNotes[activeTab] || sbuNotes[activeTab] === (activeSection.sbu_notes || '')}
                  className="absolute bottom-3 right-3 p-2 bg-indigo-50 text-indigo-700 rounded-lg active:bg-indigo-100 disabled:opacity-0 transition-opacity flex items-center gap-1 border border-indigo-100"
                >
                  <Save className="w-3.5 h-3.5" /> 
                  <span className="text-[10px] font-bold">
                    {savingSbuNotes[activeTab] ? 'Saving...' : 'Save'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 shadow-sm">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">Quotation Multi-SBU</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Untuk memulai, tambahkan setidaknya satu section SBU (Trucking, Warehouse, Clearance, Forwarding) ke dalam quotation ini.</p>
            {availableSbus.length > 0 && (
              <button 
                onClick={() => setShowAddSection(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Add SBU Section
              </button>
            )}
          </div>
        )}

        {/* Global T&C / Notes */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Syarat & Ketentuan Umum (Global)</h3>
          <div className="relative">
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="E.g., Payment 30 days after invoice..."
              rows={3}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            ></textarea>
            <button 
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === quote.notes}
              className="absolute bottom-3 right-3 p-2 bg-indigo-50 text-indigo-700 rounded-lg active:bg-indigo-100 disabled:opacity-0 transition-opacity flex items-center gap-1 border border-indigo-100"
            >
              <Save className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions & Summary Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-xl z-30 max-w-md mx-auto">
        <div className="flex items-center justify-between text-slate-700 text-xs mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>One-Time:</span>
              <span className="font-bold">{formatCurrency(quote.onetime_total || 0)}</span>
            </div>
            {quote.recurring_total > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Recurring:</span>
                <span className="font-bold text-indigo-600">{formatCurrency(quote.recurring_total || 0)}/bln</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wide">Grand Total</span>
            <span className="text-sm font-black text-indigo-700">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          {quote.status === 'DRAFT' || quote.status === 'REJECTED' ? (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={handleSendViaWhatsApp}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Kirim via WA
              </button>
              <button 
                onClick={handleSubmitApproval}
                disabled={sections.length === 0}
                className="px-4 py-3.5 bg-indigo-600 disabled:opacity-50 disabled:active:scale-100 text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Submit
              </button>
            </div>
          ) : quote.status === 'READY_TO_SEND' ? (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={handleSendViaWhatsApp}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Kirim via WA
              </button>
              <button 
                onClick={handleSendToCustomer}
                className="px-4 py-3.5 bg-slate-800 text-white rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                title="Tandai Sudah Dikirim"
              >
                <Send className="w-3.5 h-3.5" /> Set Sent
              </button>
            </div>
          ) : quote.status === 'SENT' || quote.status === 'NEGOTIATION' ? (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={handleSendViaWhatsApp}
                className="flex-1 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Kirim Ulang via WA
              </button>
              <div className="px-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {quote.status}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={handleSendViaWhatsApp}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Kirim via WA
              </button>
              <div className="px-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {quote.status}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add SBU Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddSection(false)}></div>
          
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-4">Add SBU Section</h3>
            <div className="space-y-2">
              {availableSbus.map(sbu => (
                <button
                  key={sbu}
                  onClick={() => handleAddSection(sbu)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all text-left"
                >
                  <span className="bg-white p-1.5 rounded-lg border border-slate-100">
                    {getSbuIcon(sbu)}
                  </span>
                  <span>{sbu} Services</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowAddSection(false)}
              className="w-full mt-4 py-2.5 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold active:bg-slate-50 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Add Item Bottom Sheet */}
      {showAddItem && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setShowAddItem(false); setEditingItem(null); resetSbuFields(); }}></div>
          
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-slate-800">{editingItem ? 'Edit' : 'Add'} Line Item ({activeTab})</h2>
              <button onClick={() => { setShowAddItem(false); setEditingItem(null); resetSbuFields(); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-6">
              
              {/* Import from Rate Card */}
              {!editingItem && customerRates.length > 0 && (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mb-2">
                  <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Import dari Tarif Pelanggan
                  </label>
                  <select 
                    value={selectedRateId} 
                    onChange={e => handleRateSelect(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 text-indigo-900"
                  >
                    <option value="">-- Pilih tarif terdaftar --</option>
                    {customerRates.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.service_name} ({formatCurrency(r.unit_price)} / {r.uom})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Standard Service Lookup */}
              {!editingItem && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Standard Service (Opsional)</label>
                  <select 
                    value={newItem.service_id} 
                    onChange={e => handleServiceSelect(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">-- Custom Item / Input Manual --</option>
                    {services.filter(s => s.sbu_type === activeTab).map(s => (
                      <option key={s.id} value={s.id}>{s.service_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* TRUCKING specific inputs */}
              {activeTab === 'TRUCKING' && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-indigo-700">Tipe Truk *</label>
                    <select
                      required
                      value={sbuVehicleTypeId}
                      onChange={e => setSbuVehicleTypeId(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Tipe Truk --</option>
                      {vehicleTypes.map(vt => (
                        <option key={vt.id} value={vt.id}>{vt.type_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-indigo-700 font-bold">Rute (Free Text) *</label>
                    <input
                      required
                      type="text"
                      value={sbuRoute}
                      onChange={e => setSbuRoute(e.target.value)}
                      placeholder="E.g., Jakarta - Surabaya"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* WAREHOUSE specific inputs */}
              {activeTab === 'WAREHOUSE' && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-amber-700">Tipe Operasi *</label>
                      <select
                        required
                        value={sbuOperationType}
                        onChange={e => setSbuOperationType(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="INBOUND">INBOUND</option>
                        <option value="OUTBOUND">OUTBOUND</option>
                        <option value="STORAGE">STORAGE</option>
                        <option value="RENTAL">RENTAL</option>
                        <option value="HANDLING">HANDLING</option>
                        <option value="VAS">VAS (Value Added Service)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-amber-700">Lokasi Gudang *</label>
                      <select
                        required
                        value={sbuWarehouseId}
                        onChange={e => setSbuWarehouseId(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Pilih Gudang --</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.id}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimasi Volume (CBM)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sbuVolumeCbm}
                        onChange={e => setSbuVolumeCbm(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimasi Tonase (Ton)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sbuTonnage}
                        onChange={e => setSbuTonnage(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deskripsi Layanan *</label>
                <textarea 
                  required 
                  rows={2}
                  value={newItem.description} 
                  onChange={e => setNewItem({...newItem, description: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500" 
                  placeholder="E.g., Sewa Gudang 500 CBM, Inbound, etc." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Qty *</label>
                  <input 
                    required 
                    type="number" 
                    min="0.01" step="0.01"
                    value={newItem.qty} 
                    onChange={e => setNewItem({...newItem, qty: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">UOM</label>
                  <input 
                    type="text" 
                    value={newItem.uom} 
                    onChange={e => setNewItem({...newItem, uom: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Harga Satuan (IDR) *</label>
                <input 
                  required 
                  type="number" 
                  min="0" step="1"
                  value={newItem.unit_price} 
                  onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pajak (PPN) %</label>
                <select 
                  value={newItem.tax_percent} 
                  onChange={e => setNewItem({...newItem, tax_percent: parseFloat(e.target.value)})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">Tanpa Pajak (0%)</option>
                  <option value="11">Standard PPN (11%)</option>
                  <option value="12">Standard PPN (12%)</option>
                  <option value="1.1">PPN Besaran Tertentu (1.1%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keterangan / Remarks</label>
                <input 
                  type="text" 
                  value={newItem.remarks} 
                  onChange={e => setNewItem({...newItem, remarks: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Keterangan tambahan untuk baris ini..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={addingItem} 
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {addingItem ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : `Tambah Line Item ke ${activeTab}`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
