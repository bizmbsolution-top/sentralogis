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
  CheckCircle2, 
  XCircle,
  Truck,
  Warehouse,
  FileSpreadsheet,
  Globe,
  Settings,
  Info,
  Send,
  Edit2,
  MessageSquare,
  AlertCircle,
  Phone,
  Mail,
  Smartphone,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';


export default function DesktopQuotationBuilder({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  const { user, profile } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: TRUCKING, WAREHOUSE, CLEARANCE, FORWARDING
  const [activeTab, setActiveTab] = useState<string>('');
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [isSendPanelOpen, setIsSendPanelOpen] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');

  // Add Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [negoPrices, setNegoPrices] = useState<Record<string, string>>({});
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

  // Contract Conversion State
  const [convertedContract, setConvertedContract] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [freeTextContractNumber, setFreeTextContractNumber] = useState('');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [convertingLoading, setConvertingLoading] = useState(false);

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
      const { data: quoteData } = await supabase
        .from('crm_quotations')
        .select(`*, crm_deals(title, stage, entity_id, md_entities(name, billing_address, phone, email))`)
        .eq('id', id)
        .single();
      
      if (quoteData) {
        setQuote(quoteData);
        setNotes(quoteData.notes || '');
        setValidityDays(quoteData.validity_days || 30);
        
        // Fetch Sections
        const { data: sectionsData } = await supabase
          .from('crm_quotation_sections')
          .select('*')
          .eq('quotation_id', id)
          .order('sbu_type', { ascending: true });
          
        const currentSections = sectionsData || [];
        setSections(currentSections);

        // Fetch Items
        const { data: itemsData } = await supabase
          .from('crm_quotation_items')
          .select('*')
          .eq('quotation_id', id)
          .order('created_at', { ascending: true });
          
        const itms = itemsData || [];
        setItems(itms);

        // Init nego prices
        const np: Record<string, string> = {};
        itms.forEach((item: any) => {
          np[item.id] = (item.nego_price !== null && item.nego_price !== undefined) ? String(item.nego_price) : String(item.unit_price);
        });
        setNegoPrices(np);
        const currentItems = itemsData || [];
        setItems(currentItems);

        // Determine active tab if not set or not valid
        const activeSbus = currentSections.map(s => s.sbu_type);
        if (currentSections.length > 0) {
          if (!activeTab || !activeSbus.includes(activeTab)) {
            setActiveTab(currentSections[0].sbu_type);
          }
        } else {
          setActiveTab('');
        }

        // Check if contract already converted
        const { data: contractData } = await supabase
          .from('md_storage_contracts')
          .select('id, contract_number, status')
          .ilike('notes', `%${id}%`)
          .maybeSingle();
        setConvertedContract(contractData || null);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenConvertModal = () => {
    setFreeTextContractNumber(quote?.quote_number ? `CTR/${quote.quote_number}` : `CTR-${Date.now()}`);
    setContractStartDate(new Date().toISOString().split('T')[0]);
    setContractEndDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setShowConvertModal(true);
  };

  const handleConfirmConvert = async () => {
    if (!freeTextContractNumber.trim()) {
      alert("Silakan masukkan Nomor Kontrak / Kode Penawaran.");
      return;
    }
    setConvertingLoading(true);
    try {
      const { data, error } = await supabase.rpc('fn_convert_quotation_to_contract', {
        p_quotation_id: id,
        p_contract_number: freeTextContractNumber.trim(),
        p_start_date: contractStartDate,
        p_end_date: contractEndDate
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Unknown error during conversion");

      alert(`Berhasil membuat Master Kontrak resmi: ${data.contract_number} dengan ${data.rates_count} item tarif!`);
      setShowConvertModal(false);
      fetchQuotation();
    } catch (err: any) {
      alert("Gagal mengonversi quotation ke kontrak: " + err.message);
    } finally {
      setConvertingLoading(false);
    }
  };

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
      const routeText = (rate.route_origin && rate.route_destination) 
        ? ` (${rate.route_origin} - ${rate.route_destination})` 
        : '';
      setNewItem({
        ...newItem,
        service_id: '',
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
      const specs = [];
      if (sbuVolumeCbm > 0) specs.push(`${sbuVolumeCbm} CBM`);
      if (sbuTonnage > 0) specs.push(`${sbuTonnage} Ton`);
      const specStr = specs.length > 0 ? ` (${specs.join(', ')})` : '';
      setNewItem(prev => ({
        ...prev,
        description: `${sbuOperationType} - ${whName}${specStr}`
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
        tenant_id: profile?.tenant_id,
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
      const { error } = await supabase
        .from('crm_quotation_sections')
        .update({
          approval_status: approve ? 'APPROVED' : 'REJECTED',
          approved_by: user?.id,
          approved_at: approve ? new Date().toISOString() : null,
          rejection_reason: approve ? null : reason
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
      const rejectedSections = sections.filter(s => s.approval_status === 'REJECTED');
      for (const sec of rejectedSections) {
        await supabase
          .from('crm_quotation_sections')
          .update({ approval_status: 'PENDING', rejection_reason: null })
          .eq('id', sec.id);
      }
      
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'WAITING_APPROVAL' })
        .eq('id', id);
        
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to submit approval: " + err.message);
    }
  };

  const handleSubmitNegoApproval = async () => {
    try {
      // Set all sections to NEGOTIATION
      for (const sec of sections) {
        await supabase
          .from('crm_quotation_sections')
          .update({ approval_status: 'NEGOTIATION', rejection_reason: null })
          .eq('id', sec.id);
      }
      
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'WAITING_APPROVAL' })
        .eq('id', id);
        
      if (error) throw error;
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to submit nego approval: " + err.message);
    }
  };

  const handleEnterNegotiation = async () => {
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'NEGOTIATION' })
        .eq('id', id);
      if (error) throw error;
      
      if (quote.deal_id) {
        await supabase.from('crm_deals').update({ stage: 'NEGOTIATION' }).eq('id', quote.deal_id);
      }
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to enter negotiation: " + err.message);
    }
  };

  const handleMarkAsWon = async () => {
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'ACCEPTED' })
        .eq('id', id);
      if (error) throw error;

      if (quote.deal_id) {
        await supabase.from('crm_deals').update({ stage: 'WON' }).eq('id', quote.deal_id);
      }
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to mark as won: " + err.message);
    }
  };

  const handleMarkAsRejected = async () => {
    if (!confirm('Tolak penawaran ini dan tandai deal sebagai LOST?')) return;
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'REJECTED' })
        .eq('id', id);
      if (error) throw error;

      if (quote.deal_id) {
        await supabase.from('crm_deals').update({ stage: 'LOST' }).eq('id', quote.deal_id);
      }
      fetchQuotation();
    } catch (err: any) {
      alert("Failed to reject quotation: " + err.message);
    }
  };

  const handleSaveNegoPrice = async (itemId: string) => {
    try {
      const val = Number(negoPrices[itemId]);
      if (isNaN(val)) return;

      const { error } = await supabase
        .from('crm_quotation_items')
        .update({ nego_price: val })
        .eq('id', itemId);

      if (error) throw error;
      fetchQuotation(); // This triggers the trigger to recalculate totals
    } catch (err: any) {
      alert("Gagal menyimpan harga nego: " + err.message);
    }
  };

  const handleSendToCustomer = async () => {
    try {
      const { error } = await supabase
        .from('crm_quotations')
        .update({ status: 'SENT' })
        .eq('id', id);
      if (error) throw error;

      if (quote.deal_id && quote.crm_deals?.stage === 'PROSPECTING') {
        await supabase.from('crm_deals').update({ stage: 'QUOTATION' }).eq('id', quote.deal_id);
      }

      fetchQuotation();
    } catch (err: any) {
      alert("Failed to update status to SENT: " + err.message);
    }
  };

  const getComputedMessageTemplate = () => {
    if (messageTemplate) return messageTemplate;
    const custName = quote.crm_deals?.md_entities?.name || 'Bapak/Ibu';
    const quoteNum = quote.quote_number;
    const quoteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://sentralogis.com'}/quote/${id}`;
    return `Halo ${custName},\n\nBerikut kami sampaikan penawaran harga (Quotation) dengan nomor referensi ${quoteNum} dari PT Sentralogis Nusantara.\n\nAnda dapat melihat dan mengunduh detail penawaran (PDF) melalui link berikut:\n${quoteLink}\n\nJika ada pertanyaan, Anda dapat membalas pesan ini.\n\nTerima kasih,\n${profile?.full_name || 'Tim Sentralogis'}`;
  };

  const openSendPanel = () => {
    const template = getComputedMessageTemplate();
    setMessageTemplate(template);
    setIsSendPanelOpen(true);
  };

  const handleSendViaWhatsApp = () => {
    const phone = quote.crm_deals?.md_entities?.phone || '';
    const formattedPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
    const text = encodeURIComponent(getComputedMessageTemplate());
    const waUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${text}` : `https://web.whatsapp.com/send?text=${text}`;
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn("Popup blocked or window.open failed", e);
    }
    handleSendToCustomer(); // Update status to SENT
    setIsSendPanelOpen(false);
  };

  const handleSendViaEmail = () => {
    const email = quote.crm_deals?.md_entities?.email || '';
    const subject = encodeURIComponent(`Quotation ${quote.quote_number} - PT Sentralogis Nusantara`);
    const body = encodeURIComponent(getComputedMessageTemplate());
    const mailUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    try {
      window.open(mailUrl, '_blank');
    } catch (e) {
      console.warn("Mail window open failed", e);
    }
    handleSendToCustomer(); // Update status to SENT
    setIsSendPanelOpen(false);
  };

  if (loading) return <div className="py-12 text-center text-slate-400 text-sm">Loading Quotation...</div>;
  if (!quote) return <div className="py-12 text-center text-slate-400 text-sm">Quotation not found</div>;

  const entityName = quote.crm_deals?.md_entities?.name || (Array.isArray(quote.crm_deals?.md_entities) ? quote.crm_deals?.md_entities[0]?.name : '');
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const activeSection = sections.find(s => s.sbu_type === activeTab);
  const activeItems = items.filter(item => item.section_id === activeSection?.id || (!item.section_id && item.sbu_cluster === activeTab));

  const availableSbus = ['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'].filter(sbu => !sections.some(sec => sec.sbu_type === sbu));
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
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Breadcrumb Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/commercial/pipeline')} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Quotation Builder
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(quote.status)}`}>
                {quote.status}
              </span>
            </h1>
            <p className="text-xs text-slate-500">{quote.quote_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSendViaWhatsApp}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Kirim via WhatsApp
          </button>
          <Link 
            href={`/commercial/quotations/${quote.id}/preview`}
            target="_blank"
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / PDF Preview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Editor & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SBU Tab Selectors */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Bisnis (SBU Sections)</h3>
              {availableSbus.length > 0 && (
                <button 
                  onClick={() => setShowAddSection(true)}
                  className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah SBU Section
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {sections.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada modul SBU ditambahkan. Gunakan tombol Tambah di kanan atas.</p>
              ) : (
                sections.map(sec => {
                  const isActive = activeTab === sec.sbu_type;
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
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
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

          {/* Active SBU Editor Panel */}
          {activeSection ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Approval status header */}
              <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                activeSection.approval_status === 'APPROVED' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : activeSection.approval_status === 'REJECTED' 
                    ? 'bg-rose-50 border-rose-100 text-rose-800' 
                    : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {activeSection.approval_status === 'APPROVED' ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                    ) : activeSection.approval_status === 'REJECTED' ? (
                      <XCircle className="w-4.5 h-4.5 text-rose-600" />
                    ) : (
                      <Clock className="w-4.5 h-4.5 text-amber-600" />
                    )}
                    <span className="text-xs font-bold">
                      Status Section {activeTab}: {activeSection.approval_status}
                    </span>
                  </div>
                  {activeItems.length === 0 && (
                    <button 
                      onClick={() => handleDeleteSection(activeSection.id, activeSection.sbu_type)}
                      className="p-1 hover:bg-rose-100 text-rose-600 rounded-md transition-colors"
                      title="Hapus Modul"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {activeSection.rejection_reason && (
                  <p className="text-xs bg-white/60 p-2 rounded-lg border border-rose-100 text-rose-700 italic">
                    Alasan penolakan: "{activeSection.rejection_reason}"
                  </p>
                )}

                {isApprover && quote.status === 'WAITING_APPROVAL' && activeSection.approval_status === 'PENDING' && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                    <button 
                      onClick={() => handleApproveSection(activeSection.id, true)}
                      className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Setujui (Approve)
                    </button>
                    <button 
                      onClick={() => handleRejectPrompt(activeSection.id)}
                      className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
                    >
                      Tolak (Reject)
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" /> Line Items ({activeItems.length})
                  </h4>
                  <button 
                    onClick={() => setShowAddItem(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {activeItems.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-bold">Belum ada item ditambahkan</p>
                      <p className="text-[10px] text-slate-400 mt-1">Klik tombol 'Add Item' di kanan atas untuk mengisi.</p>
                    </div>
                  ) : (
                    activeItems.map((item, idx) => (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative hover:border-slate-300 transition-all flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800">{idx + 1}. {item.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1 font-medium">
                              <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-bold text-slate-600">{item.qty} {item.uom}</span>
                              <span>x</span>
                              <span>{formatCurrency(item.unit_price)}</span>
                              {item.pricing_type === 'RECURRING_MONTHLY' && (
                                <span className="bg-indigo-50 text-indigo-600 px-1.5 rounded font-bold">/Bulan</span>
                              )}
                              {item.min_qty > 0 && <span className="bg-slate-100 text-slate-600 px-1 rounded">Min: {item.min_qty}</span>}
                              {item.tax_percent > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 rounded border border-amber-100">+ {item.tax_percent}% PPN</span>}
                            </div>
                            
                            {(quote.status === 'NEGOTIATION' || item.nego_price) && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Nego Price:</span>
                                {quote.status === 'NEGOTIATION' ? (
                                  <FormattedNumberInput
                                    value={Number(negoPrices[item.id] || item.nego_price || item.unit_price || 0)}
                                    onChange={val => setNegoPrices({...negoPrices, [item.id]: String(val)})}
                                    onBlur={() => handleSaveNegoPrice(item.id)}
                                    className={`w-28 px-2 py-1 text-xs border rounded-md font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      Number(negoPrices[item.id]) < Number(item.unit_price) 
                                        ? 'text-rose-600 border-rose-200 bg-rose-50' 
                                        : 'text-slate-700 border-slate-200 bg-white'
                                    }`}
                                  />
                                ) : (
                                  <span className={`text-xs font-mono font-bold ${Number(item.nego_price) < Number(item.unit_price) ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {formatCurrency(item.nego_price || item.unit_price)}
                                  </span>
                                )}
                              </div>
                            )}

                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-indigo-600 font-mono">{formatCurrency(item.total_price)}</p>
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
                </div>
              </div>

              {/* Notes / SBU T&C */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Notes / T&C Khusus {activeTab}</h4>
                <div className="relative">
                  <textarea 
                    value={sbuNotes[activeTab] || ''}
                    onChange={e => setSbuNotes({ ...sbuNotes, [activeTab]: e.target.value })}
                    placeholder={`Masukkan T&C spesifik untuk modul ${activeTab}...`}
                    rows={3}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                  <button 
                    onClick={() => handleSaveSbuNotes(activeTab)}
                    disabled={savingSbuNotes[activeTab] || sbuNotes[activeTab] === (activeSection.sbu_notes || '')}
                    className="absolute bottom-3 right-3 p-1.5 bg-indigo-50 text-indigo-700 rounded-lg disabled:opacity-0 flex items-center gap-1 border border-indigo-100 hover:bg-indigo-100"
                  >
                    <Save className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Save</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center shadow-sm">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Quotation Multi-SBU</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Silakan tambahkan modul SBU layanan (Trucking, Warehouse, Clearance, Forwarding) ke penawaran ini untuk mulai membuat line item.</p>
            </div>
          )}

          {/* Global T&C */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-600">Syarat & Ketentuan Umum (Global)</h4>
            <div className="relative">
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="E.g., Pembayaran dilakukan 30 hari setelah invoice diterima..."
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
              <button 
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === quote.notes}
                className="absolute bottom-3 right-3 p-1.5 bg-indigo-50 text-indigo-700 rounded-lg disabled:opacity-0 flex items-center gap-1 border border-indigo-100 hover:bg-indigo-100"
              >
                <Save className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Save</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Summary & Metadata */}
        <div className="space-y-6">
          
          {/* Customer Metadata Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detail Penawaran</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Pelanggan</span>
                <span className="text-xs font-bold text-slate-800">{entityName || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Deal Reference</span>
                <span className="text-xs font-bold text-slate-700 line-clamp-1">{quote.crm_deals?.title || '-'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Masa Berlaku</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={validityDays}
                    onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                    className="w-16 px-2 py-1 text-xs border border-slate-250 rounded-lg text-center font-bold text-slate-700"
                  />
                  <span className="text-xs text-slate-500">Hari</span>
                  {validityDays !== quote.validity_days && (
                    <button 
                      onClick={handleSaveValidity}
                      disabled={savingMeta}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Roll-up Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ringkasan Biaya</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal One-Time</span>
                <span className="font-bold font-mono">{formatCurrency(quote.onetime_total || 0)}</span>
              </div>
              {quote.recurring_total > 0 && (
                <div className="flex justify-between items-center text-indigo-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/30">
                  <span className="font-semibold">Subtotal Bulanan (Recurring)</span>
                  <span className="font-bold font-mono">{formatCurrency(quote.recurring_total)}/bln</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600">
                <span>PPN (Tax)</span>
                <span className="font-bold font-mono">{formatCurrency(quote.tax_amount || 0)}</span>
              </div>
              
              <div className="w-full h-px bg-slate-200 my-2"></div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-black text-slate-800">GRAND TOTAL</span>
                <span className="text-sm font-black text-indigo-700 font-mono">{formatCurrency(quote.total_amount || 0)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              {quote.status === 'DRAFT' || quote.status === 'REJECTED' ? (
                <div className="space-y-2.5">
                  <button 
                    onClick={handleSendViaWhatsApp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Kirim Cepat via WhatsApp
                  </button>
                  <button 
                    onClick={handleSubmitApproval}
                    disabled={sections.length === 0}
                    className="w-full py-2.5 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    Submit for Approval
                  </button>
                </div>
              ) : quote.status === 'READY_TO_SEND' ? (
                <div className="space-y-2.5">
                  <button 
                    onClick={handleSendViaWhatsApp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Kirim via WhatsApp
                  </button>
                  <button 
                    onClick={openSendPanel}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Opsi Kirim Lainnya (Email / Link)
                  </button>
                </div>
              ) : quote.status === 'SENT' ? (
                <div className="space-y-2.5">
                  <button 
                    onClick={handleSendViaWhatsApp}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Kirim Ulang via WhatsApp
                  </button>
                  <button 
                    onClick={handleMarkAsWon}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Tandai Won (Setuju)
                  </button>
                  <button 
                    onClick={handleEnterNegotiation}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Masuk Tahap Negosiasi
                  </button>
                  <button 
                    onClick={handleMarkAsRejected}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Tolak (Reject / Lost)
                  </button>
                </div>
              ) : quote.status === 'NEGOTIATION' ? (
                <div className="space-y-2.5">
                  <button 
                    onClick={handleSendViaWhatsApp}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Kirim Ulang via WhatsApp
                  </button>
                  <button 
                    onClick={handleSubmitNegoApproval}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Ajukan Approval Nego ke SBU
                  </button>
                </div>
              ) : quote.status === 'ACCEPTED' ? (
                <div className="space-y-3">
                  <div className="py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Status: ACCEPTED (WON)
                  </div>
                  {convertedContract ? (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-left">
                      <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
                        <span>⚡ Master Kontrak Terkait:</span>
                      </p>
                      <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-blue-100 shadow-2xs">
                        <span className="font-mono text-xs font-bold text-blue-700">{convertedContract.contract_number}</span>
                        <Link
                          href={`/hq/business/contracts/${convertedContract.id}/edit`}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          Lihat Kontrak →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleOpenConvertModal}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>⚡ Buat Kontrak & Tarif Resmi</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button 
                    onClick={handleSendViaWhatsApp}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Kirim via WhatsApp
                  </button>
                  <div className="py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold text-center">
                    Status: {quote.status}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Add SBU Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddSection(false)}></div>
          
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tambah Modul SBU</h3>
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

      {/* Add Item Bottom Drawer */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setShowAddItem(false); setEditingItem(null); resetSbuFields(); }}></div>
          
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-slate-800">{editingItem ? 'Edit' : 'Add'} Line Item ({activeTab})</h2>
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
                <div className="space-y-4 bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 mb-2">
                  <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      📦 Profil Kargo Gudang (Opsional)
                    </span>
                    <span className="text-[10px] text-amber-700/80 font-medium">Referensi Space Planning</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Tipe Operasi *</label>
                      <select
                        required
                        value={sbuOperationType}
                        onChange={e => setSbuOperationType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 text-slate-800"
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
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Lokasi Gudang *</label>
                      <select
                        required
                        value={sbuWarehouseId}
                        onChange={e => setSbuWarehouseId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 text-slate-800"
                      >
                        <option value="">-- Pilih Gudang --</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.id}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Estimasi Volume (CBM)</label>
                      <FormattedNumberInput
                        value={sbuVolumeCbm}
                        onChange={val => {
                          setSbuVolumeCbm(val);
                          // Auto sync to Qty if UOM is CBM or empty
                          if (val > 0 && (newItem.uom === 'CBM' || !newItem.uom)) {
                            setNewItem(prev => ({ ...prev, qty: val, uom: 'CBM' }));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 text-slate-800"
                      />
                      {sbuVolumeCbm > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewItem(prev => ({ ...prev, qty: sbuVolumeCbm, uom: 'CBM' }))}
                          className="mt-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          ⚡ Gunakan sebagai Qty Tagihan
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Estimasi Tonase (Ton)</label>
                      <FormattedNumberInput
                        value={sbuTonnage}
                        onChange={val => {
                          setSbuTonnage(val);
                          if (val > 0 && newItem.uom === 'TON') {
                            setNewItem(prev => ({ ...prev, qty: val }));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 text-slate-800"
                      />
                      {sbuTonnage > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewItem(prev => ({ ...prev, qty: sbuTonnage, uom: 'TON' }))}
                          className="mt-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          ⚡ Gunakan sebagai Qty Tagihan
                        </button>
                      )}
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

              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    💰 Kalkulasi Tagihan (Billing Basis)
                  </span>
                  <span className="text-[9px] text-slate-500">Subtotal = Qty × Harga Satuan</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Qty (Volume/Jumlah) *</label>
                    <FormattedNumberInput
                      required
                      value={newItem.qty}
                      onChange={val => setNewItem({...newItem, qty: val})}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Satuan Tagihan (UOM) *</label>
                    <input 
                      type="text" 
                      value={newItem.uom} 
                      onChange={e => setNewItem({...newItem, uom: e.target.value.toUpperCase()})} 
                      placeholder="CBM, PALLET, TON..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase" 
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium py-1 mr-1">Pilih Cepat UOM:</span>
                  {['CBM', 'PALLET', 'TON', 'UNIT', 'BULAN', 'LOT'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          uom: u,
                          qty: u === 'CBM' && sbuVolumeCbm > 0 ? sbuVolumeCbm : u === 'TON' && sbuTonnage > 0 ? sbuTonnage : prev.qty
                        }));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        newItem.uom === u 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Harga Satuan (IDR) *</label>
                <FormattedNumberInput
                  required
                  value={newItem.unit_price}
                  onChange={val => setNewItem({...newItem, unit_price: val})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
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

      {/* Send to Customer "Chat Panel" Drawer */}
      {isSendPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsSendPanelOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Communication Panel</h3>
                  <p className="text-xs text-slate-500">Kirim quotation ke customer</p>
                </div>
              </div>
              <button onClick={() => setIsSendPanelOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-2 border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Method Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setSendMethod('whatsapp')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${sendMethod === 'whatsapp' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Smartphone className="w-4 h-4" /> WhatsApp
                </button>
                <button 
                  onClick={() => setSendMethod('email')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${sendMethod === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>

              {/* Recipient Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Recipient</label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">{quote.crm_deals?.md_entities?.name || 'Customer Name'}</span>
                  </div>
                </div>

                {sendMethod === 'whatsapp' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">WhatsApp Number</label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">{quote.crm_deals?.md_entities?.phone || '-'}</span>
                    </div>
                  </div>
                )}

                {sendMethod === 'email' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email Address</label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium text-slate-700">{quote.crm_deals?.md_entities?.email || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Template */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center justify-between">
                  Message Template
                  <span className="text-[10px] font-normal text-slate-400 normal-case bg-slate-100 px-2 py-0.5 rounded">Bisa diedit</span>
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none leading-relaxed shadow-inner"
                  placeholder="Ketik pesan..."
                ></textarea>
                <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  Pastikan Anda sudah mendownload/save PDF terlebih dahulu untuk dilampirkan secara manual di aplikasi WhatsApp atau Email Anda.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-white space-y-3">
              {sendMethod === 'whatsapp' ? (
                <button 
                  onClick={handleSendViaWhatsApp}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Buka WhatsApp & Kirim
                </button>
              ) : (
                <button 
                  onClick={handleSendViaEmail}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Buka Email & Kirim
                </button>
              )}
              
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(messageTemplate);
                    alert("Pesan dan link disalin ke clipboard!");
                  }}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Salin Pesan & Link
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    handleSendToCustomer();
                    setIsSendPanelOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Tandai Terkirim Langsung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Text Convert to Contract Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => !convertingLoading && setShowConvertModal(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-3xl p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-900">Konversi ke Master Kontrak</h3>
                <p className="text-xs text-slate-500">Otomatis menyalin seluruh harga ke Master Billing Rates</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Kontrak / Kode Quotation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={freeTextContractNumber}
                  onChange={(e) => setFreeTextContractNumber(e.target.value)}
                  placeholder="Misal: CTR/QUO-2026/001"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                />
                <p className="text-[11px] text-slate-400 mt-1">Free text: bebas disesuaikan dengan nomor surat perjanjian cetak.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Mulai Kontrak</label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Selesai Kontrak</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={convertingLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={convertingLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                {convertingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Konversi & Simpan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
