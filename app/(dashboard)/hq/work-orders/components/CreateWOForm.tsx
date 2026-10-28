'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { SBU_MAP, type SBUType } from '@/lib/utils/sbuMapping';
import { toast } from 'react-hot-toast';
import { 
  Plus, Trash2, ArrowLeft, Loader2, Send, Save, Edit2, 
  MapPin, AlertCircle, Truck, ChevronRight, User, ShieldCheck,
  Building2, Calendar, MessageSquare, Package, Globe, Warehouse,
  ChevronDown, Check, Search, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateWONumber } from '@/lib/utils/woNumber';
import { getEntitiesByRole } from '@/lib/actions/entity-role-actions';
import AddTruckingItemModal from './AddTruckingItemModal';
import AddWarehouseItemModal from './AddWarehouseItemModal';
import AddForwardingItemModal from './AddForwardingItemModal';
import ContactFormModal from '@/components/master/ContactFormModal';

interface CreateWOFormProps {
  onBack: () => void;
  editId?: string | null;
}

// [AI] Dynamic SBU options â€” replaced hardcoded list with DB-driven data
export default function CreateWOForm({ onBack, editId }: CreateWOFormProps) {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeSBUModal, setActiveSBUModal] = useState<string | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [woNumber, setWoNumber] = useState<string>('');
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [activeSbuTypes, setActiveSbuTypes] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  // SO-Mandatory Slice 1 (Phase 3C): eligible Sales Orders for new WO creation.
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [salesOrderId, setSalesOrderId] = useState('');
  const [loadingSalesOrders, setLoadingSalesOrders] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
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
  
  const todayLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const nowLocalTime = () => {
    return new Date().toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: todayLocal(),
    order_time: nowLocalTime(),
    execution_date: todayLocal(),
    execution_time: nowLocalTime(),
    notes: '',
    region_id: '',
  });
  const [soCustomer, setSoCustomer] = useState<{ id: string; name: string; entity_code: string; legal_name?: string } | null>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  const [woStatus, setWoStatus] = useState<string | null>(null);
  const [woItems, setWoItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const hasAcceptedOrInProgressJO = woItems.some((item) =>
    (item.job_orders || []).some((jo: any) =>
      jo.driver_response === 'accepted' ||
      ['in_progress', 'ACCEPTED', 'ON ROAD', 'MENUJU LOKASI', 'RECEIVED', 'DONE', 'COMPLETED'].includes((jo.status || '').toUpperCase())
    )
  );

  const isReadOnly = woStatus === 'handover_rejected' || woStatus === 'in_progress' || woStatus === 'completed' || woStatus === 'cancelled' || hasAcceptedOrInProgressJO;

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

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customers for combobox search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.entity_code?.toLowerCase().includes(q) ||
      c.legal_name?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Selected customer display label
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer_id) || (soCustomer?.id === formData.customer_id ? soCustomer : null);
  }, [customers, formData.customer_id, soCustomer]);

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
        // [AI] Join wo_item_manifests + md_product_skus agar data manifests tidak hilang saat edit
        const { data: newItems, error: newItemsError } = await supabase
          .from('wo_items')
          .select('*, wo_item_manifests(*, md_product_skus(sku_code, name, brand_name, unit, volume_m3, weight_kg))')
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
        const normalizedOldItems = (oldItems || []).map((old: any) => ({
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
            let enrichedJobs: any[] = [];
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
              job_orders: enrichedJobs,
              // [AI] Map wo_item_manifests to manifests, flatten md_product_skus for AddWarehouseItemModal
              manifests: ((item as any).wo_item_manifests || []).map((m: any) => ({
                ...m,
                // Flatten nested md_product_skus fields to top level
                sku_code: m.md_product_skus?.sku_code || '',
                name: m.md_product_skus?.name || '',
                brand_name: m.md_product_skus?.brand_name || '',
                unit: m.md_product_skus?.unit || '',
              }))
            };
          })
        );

        // STEP 4: Set state
        setWoStatus(wo.status);
        setWoNumber(wo.wo_number || '');
        setFormData({
          customer_id: wo.customer_id || '',
          order_date: wo.order_date || todayLocal(),
          order_time: (wo as any).order_time || nowLocalTime(),
          execution_date: wo.execution_date || todayLocal(),
          execution_time: wo.execution_time || nowLocalTime(),
          notes: wo.notes || '',
          region_id: wo.region_id || '',
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

  // 1. Customer loader with resilient direct fallback
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!profile?.tenant_id) return;
      try {
        const result = await getEntitiesByRole('CUSTOMER');
        if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
          const list = result.data;
          setCustomers((prev) => {
            const combined = [...list];
            for (const c of prev) {
              if (!combined.some((existing) => existing.id === c.id)) {
                combined.unshift(c);
              }
            }
            return combined;
          });
          return;
        }
        // Direct browser client fallback
        const { data, error } = await supabase
          .from('md_entities')
          .select('id, entity_code, name, legal_name, is_customer')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (!error && data) {
          setCustomers((prev) => {
            const combined = [...data];
            for (const c of prev) {
              if (!combined.some((existing) => existing.id === c.id)) {
                combined.unshift(c);
              }
            }
            return combined;
          });
        }
      } catch (err) {
        console.error('Customer Fetch Fallback:', err);
        const { data } = await supabase
          .from('md_entities')
          .select('id, entity_code, name, legal_name, is_customer')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (data) {
          setCustomers((prev) => {
            const combined = [...data];
            for (const c of prev) {
              if (!combined.some((existing) => existing.id === c.id)) {
                combined.unshift(c);
              }
            }
            return combined;
          });
        }
      }
    };

    fetchCustomers();
  }, [profile?.tenant_id]);

  // Duplikasi dan sinkronisasi data Sales Order ke Work Order
  const applySalesOrderDetails = useCallback(async (soId: string) => {
    if (!soId) return;
    try {
      const res = await fetch(`/api/v1/commercial/sales-orders/${soId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data) return;
      const soData = json.data;

      // 1. Sinkronisasi data utama (Customer, Notes, Tanggal)
      setFormData((prev) => ({
        ...prev,
        customer_id: soData.customerId || prev.customer_id,
        notes: prev.notes ? prev.notes : (soData.commercialNotes || ''),
        order_date: soData.orderDate ? soData.orderDate.slice(0, 10) : prev.order_date,
        execution_date: soData.targetFulfillmentDate
          ? soData.targetFulfillmentDate.slice(0, 10)
          : soData.orderDate
          ? soData.orderDate.slice(0, 10)
          : prev.execution_date,
      }));

      // 2. Pastikan customer muncul di state customers agar nama tampil di dropdown
      if (soData.customerId) {
        const custObj = {
          id: soData.customerId,
          name: soData.customerName || 'Customer',
          legal_name: soData.customerName || 'Customer',
          entity_code: soData.customerCode || 'CUS',
        };
        setSoCustomer(custObj);
        setCustomers((prev) => {
          if (prev.some((c) => c.id === soData.customerId)) return prev;
          return [custObj, ...prev];
        });
      }

      // 3. Pastikan modul SBU Trucking aktif jika tertera di SO
      const notes = soData.commercialNotes || '';
      if (/trucking|truk|container|muatan/i.test(notes)) {
        setActiveSbuTypes((prev) => new Set([...prev, 'tr', 'TRUCKING']));
      }

      // 4. Auto-select Wilayah Kerja jika belum dipilih
      setRegions((currentRegions) => {
        if (currentRegions.length > 0) {
          setFormData((prev) => {
            if (!prev.region_id) {
              const matched = currentRegions.find((r) =>
                notes.toLowerCase().includes(r.name.toLowerCase()) ||
                r.name.toLowerCase().includes('cikarang') ||
                r.name.toLowerCase().includes('surabaya')
              );
              return { ...prev, region_id: matched ? matched.id : currentRegions[0].id };
            }
            return prev;
          });
        }
        return currentRegions;
      });

      // 5. Duplikasi Item Layanan ke woItems jika masih kosong
      setWoItems((prevItems) => {
        if (prevItems.length > 0) return prevItems;

        const totalRev = Number(soData.totalAgreedRevenue) || 0;

        let sbuType = 'TRUCKING';
        if (/warehouse/i.test(notes)) sbuType = 'WAREHOUSE';
        else if (/clearance|customs/i.test(notes)) sbuType = 'CLEARANCE';
        else if (/forwarding/i.test(notes)) sbuType = 'FORWARDING';

        let quantity = 1;
        const qtyMatch = notes.match(/(?:Jumlah|Qty|Quantity):\s*(\d+)/i) || notes.match(/(\d+)\s*(?:unit|truck|armada|kontainer|container)/i);
        if (qtyMatch && parseInt(qtyMatch[1], 10) > 0) {
          quantity = parseInt(qtyMatch[1], 10);
        }

        const unitPrice = quantity > 0 && totalRev > 0 ? Math.round(totalRev / quantity) : totalRev;

        let origin = 'NPCT1 Port';
        let destination = 'Cikarang Pusat';
        const routeMatch = notes.match(/(?:Rute|Route):\s*([^–\->|]+)\s*(?:->|–>|ke|to|-)\s*([^|]+)/i);
        if (routeMatch) {
          origin = routeMatch[1].trim();
          destination = routeMatch[2].trim();
        }

        let cargoDesc = 'CONTAINER 2X40FT';
        const cargoMatch = notes.match(/(?:Muatan|Cargo|Barang):\s*([^|]+)/i);
        if (cargoMatch) {
          cargoDesc = cargoMatch[1].trim();
        } else if (notes) {
          cargoDesc = notes.slice(0, 80);
        }

        let vehicleTypeName = 'Trailer 40ft';
        if (/20/i.test(cargoDesc)) vehicleTypeName = 'Trailer 20ft';
        else if (/cde/i.test(cargoDesc)) vehicleTypeName = 'CDE';
        else if (/cdd/i.test(cargoDesc)) vehicleTypeName = 'CDD';
        else if (/fuso/i.test(cargoDesc)) vehicleTypeName = 'Fuso';
        else if (/wingbox/i.test(cargoDesc)) vehicleTypeName = 'Wingbox';

        const newId = `so-item-${Date.now()}`;
        const autoItem = {
          id: newId,
          sbu_type: sbuType,
          quantity,
          unit_price: unitPrice,
          total_revenue: totalRev || (quantity * unitPrice),
          item_data: {
            unit_count: quantity,
            deal_price: unitPrice,
            cargo_description: cargoDesc,
            vehicle_type_name: vehicleTypeName,
            stops: [
              { stop_type: 'PICKUP', sequence: 1, location_name: origin, address: origin },
              { stop_type: 'DROPOFF', sequence: 2, location_name: destination, address: destination },
            ],
            shipper_name: origin,
            recipient_name: destination,
            shipper_address: origin,
            recipient_address: destination,
            est_revenue: totalRev || (quantity * unitPrice),
            notes: notes,
          },
        };

        toast.success(`Data Sales Order ${soData.soNumber} berhasil disinkronkan ke Work Order!`, { icon: '📋' });
        return [autoItem];
      });
    } catch (err) {
      console.error('Failed to duplicate Sales Order details:', err);
    }
  }, []);

  // Fetch trucking regions for region picker
  useEffect(() => {
    if (!profile?.tenant_id) return;
    setLoadingRegions(true);
    supabase
      .from("md_trucking_regions")
      .select("id, name, level")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setRegions(data);
          setFormData((prev) => {
            if (!prev.region_id && data.length > 0) {
              return { ...prev, region_id: data[0].id };
            }
            return prev;
          });
        }
        setLoadingRegions(false);
      });
  }, [profile?.tenant_id]);

  // Immediate URL params reader on mount
  useEffect(() => {
    if (typeof window === 'undefined' || editId) return;
    const params = new URLSearchParams(window.location.search);
    const urlSoId = params.get('salesOrderId');
    const urlCustomerId = params.get('customerId');
    if (urlSoId) {
      setSalesOrderId(urlSoId);
      applySalesOrderDetails(urlSoId);
    } else if (urlCustomerId) {
      setFormData((prev) => ({
        ...prev,
        customer_id: prev.customer_id || urlCustomerId,
      }));
    }
  }, [editId, applySalesOrderDetails]);

  const localItemSeqRef = useRef(1);

  // SO-Mandatory Slice 1: load eligible Sales Orders for NEW work orders via canonical API.
  useEffect(() => {
    if (editId || !profile?.tenant_id) return;
    let cancelled = false;
    (async () => {
      setLoadingSalesOrders(true);
      try {
        const res = await fetch('/api/v1/commercial/sales-orders?limit=100');
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(json.data)) {
          const eligible = json.data
            .filter((s: any) => ['CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED'].includes(s.status))
            .map((s: any) => ({
              id: s.id,
              so_number: s.soNumber || s.so_number,
              status: s.status,
              customer_id: s.customerId || s.customer_id || null,
              customer_name: s.customerName || s.customer_name || null,
            }));
          setSalesOrders(eligible);

          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlSoId = params.get('salesOrderId');
            const urlCustomerId = params.get('customerId');
            if (urlSoId) {
              setSalesOrderId(urlSoId);
              applySalesOrderDetails(urlSoId);
            } else if (urlCustomerId) {
              setFormData((prev) => ({
                ...prev,
                customer_id: prev.customer_id || urlCustomerId,
              }));
            }
          }
        }
      } catch (err) {
        console.error('Sales Order Fetch Error:', err);
      } finally {
        if (!cancelled) setLoadingSalesOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, profile?.tenant_id]);

  const handleAddItem = (item: any) => {
    if (editingItem) {
      setWoItems(prev => prev.map(i => i.id === editingItem.id ? { ...item, id: editingItem.id } : i));
    } else {
      const newId = `local-item-${localItemSeqRef.current++}`;
      setWoItems(prev => [...prev, { ...item, id: newId }]);
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

    // SO-Mandatory (Phase 3C / L1): every NEW WO must reference an eligible Sales Order.
    if (!editId && !salesOrderId) {
      toast.error('Sales Order wajib dipilih untuk pembuatan WO baru.');
      return;
    }

    // [VALIDATION] Region required when TRUCKING SBU is active
    if (activeSbuTypes.has("tr") && !formData.region_id) {
      toast.error("Wilayah tujuan wajib dipilih untuk SBU Trucking.");
      return;
    }

    // [VALIDATION] Execution datetime must be >= order datetime (date + time).
    const orderDateTime = new Date(`${formData.order_date}T${formData.order_time || '00:00'}`);
    const execDateTime = new Date(`${formData.execution_date}T${formData.execution_time || '00:00'}`);
    if (isNaN(orderDateTime.getTime()) || isNaN(execDateTime.getTime())) {
      toast.error('Tanggal/Waktu eksekusi tidak valid.');
      return;
    }
    if (execDateTime.getTime() < orderDateTime.getTime()) {
      toast.error(
        `Waktu eksekusi (${formData.execution_date} ${formData.execution_time}) tidak boleh sebelum order time (${formData.order_date} ${formData.order_time}).`
      );
      return;
    }

    setSubmitting(status === 'draft' ? 'draft' : 'submit');
    let step = 'init';
    try {
      let woNumber = '';
      let woId = editId;
      const controlWarnings: string[] = [];
      const serverItemIds: Record<string, string> = {};

      const tenantInitial = (profile?.tenants as any)?.name || profile?.tenant_code || 'HQ';

      if (editId) {
        step = 'fetch-existing-wo';
        const { data: existingWO } = await supabase.from('work_orders').select('wo_number').eq('id', editId).single();
        woNumber = existingWO?.wo_number || '';
      } else {
        const customer = customers.find(c => c.id === formData.customer_id);
        const customerInitial = customer?.name || customer?.entity_code || 'CUS';
        woNumber = await generateWONumber(profile.tenant_id, tenantInitial, customerInitial);
      }
      
      const payload = {
        tenant_id: profile.tenant_id,
        wo_number: woNumber,
        customer_id: formData.customer_id,
        order_date: formData.order_date,
        order_time: formData.order_time,
        execution_date: formData.execution_date,
        execution_time: formData.execution_time,
        notes: formData.notes,
        region_id: formData.region_id || null,
        status,
        updated_by: profile?.id
      };

      if (editId) {
        step = 'update-work-order';
        let { error } = await supabase.from('work_orders').update(payload as any).eq('id', editId);
        if (error && /order_time/i.test(error.message || '')) {
          const { order_time, ...safePayload } = payload;
          ({ error } = await supabase.from('work_orders').update(safePayload).eq('id', editId));
        }
        if (error) throw error;
      } else {
        // SO-MANDATORY SLICE 1 (Phase 3C): creation goes through the shared
        // server-side boundary with server-side SO eligibility validation.
        step = 'server-wo-create';
        const createRes = await fetch('/api/v1/operational/work-orders/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'WO_CREATE',
            idempotencyKey: `wo-create-${woNumber}`,
            input: {
              woNumber,
              customerId: formData.customer_id,
              salesOrderId,
              status,
              orderDate: formData.order_date,
              executionDate: formData.execution_date,
              executionTime: formData.execution_time,
              orderTime: formData.order_time,
              regionId: formData.region_id || null,
              notes: formData.notes || null,
            },
          }),
        }).then(r => r.json());

        if (!createRes.success) {
          if (createRes.error?.code === 'IDEMPOTENCY_VIOLATION') {
            // L3-4: read back by verified natural key (UNIQUE tenant_id + wo_number) before continuing.
            const { data: rbWo } = await supabase
              .from('work_orders')
              .select('id')
              .eq('tenant_id', profile.tenant_id)
              .eq('wo_number', woNumber)
              .maybeSingle();
            if (!rbWo) throw new Error('Readback Work Order gagal setelah deteksi duplikat.');
            woId = rbWo.id;
          } else {
            throw new Error(
              (createRes.error?.message || 'Gagal membuat Work Order.') +
                (createRes.error?.code ? ` (${createRes.error.code})` : ''),
            );
          }
        } else {
          if (!createRes.workOrder?.id) throw new Error('WO_CREATE sukses tetapi tanpa id — readback diperlukan.');
          woId = createRes.workOrder.id;
          if (createRes.outcome === 'PARTIAL') {
            controlWarnings.push('WO tersimpan, tetapi catatan kontrol (audit/idempotency) gagal tersimpan.');
          }
        }
      }
      // STEP 1: If editId is present, check existing wo_items in database
      let existingDbItemIds: string[] = [];
      if (editId) {
        const { data: dbItems } = await supabase.from('wo_items').select('id').eq('wo_id', woId as string);
        existingDbItemIds = (dbItems || []).map(i => i.id);

        // Delete items from DB that are no longer in woItems state
        const currentItemIds = new Set(woItems.map(i => i.id).filter(id => id && !id.toString().includes('random') && !id.toString().includes('.')));
        for (const oldId of existingDbItemIds) {
          if (!currentItemIds.has(oldId)) {
            await supabase.from('wo_items').delete().eq('id', oldId);
          }
        }
      } else {
        // Slice 1 (Phase 3C): create-path items are persisted via the shared server
        // boundary (WO_ITEM_UPSERT) BEFORE this loop — never delete them here.
      }

      // SO-MANDATORY SLICE 1: server-side item creation (+ conditional manifests).
      if (!editId) {
        step = 'server-items-upsert';
        const itemPayloads = woItems.map((item: any, index: number) => {
          const sbuKey = item.sbu_type === 'TRUCKING' ? 'TRUCKING' :
                         item.sbu_type === 'CLEARANCE' ? 'CC' :
                         item.sbu_type === 'WAREHOUSE' ? 'WH' :
                         item.sbu_type === 'FORWARDING' ? 'FW' : 'OT';
          const unitQty = item.quantity || item.item_data?.unit_count || 1;
          const itemCode = `${woNumber}/${sbuKey === 'TRUCKING' ? 'TR' : sbuKey}${unitQty.toString().padStart(2, '0')}`;
          return {
            clientKey: String(index),
            itemCode,
            sbuType: item.sbu_type,
            maxJoCount: item.quantity || item.item_data?.unit_count || 1,
            unitPrice: item.unit_price || 0,
            totalRevenue: item.total_revenue || 0,
            status: status === 'draft' ? 'draft' : 'need_assignment',
            itemData: item.item_data,
            manifests: Array.isArray(item.manifests)
              ? item.manifests.map((m: any) => ({
                  productSkuId: m.product_sku_id ?? null,
                  quantity: m.quantity || 1,
                  unitWeightKg: m.unit_weight_kg || 0,
                  unitVolumeM3: m.unit_volume_m3 || 0,
                  notes: m.notes || null,
                  locationCode: m.location_code || null,
                  inventoryId: m.inventory_id || null,
                  batchNumber: m.batch_number || null,
                  earliestExpiry: m.earliest_expiry || null,
                }))
              : null,
          };
        });

        const itemsRes = await fetch('/api/v1/operational/work-orders/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'WO_ITEM_UPSERT',
            idempotencyKey: `wo-items-${woNumber}`,
            input: { workOrderId: woId, items: itemPayloads },
          }),
        }).then(r => r.json());

        if (!itemsRes.success && itemsRes.error?.code !== 'IDEMPOTENCY_VIOLATION') {
          if (itemsRes.items && itemsRes.outcome === 'PARTIAL') {
            controlWarnings.push('Sebagian item gagal tersimpan — kirim ulang dengan kunci yang sama untuk melengkapi.');
          }
          throw new Error(itemsRes.error?.message || 'Gagal menyimpan item Work Order.');
        }

        // Reconcile ids by natural key (item_code within this WO) — covers success,
        // duplicate replay, and partial-retry readback (L3-4). Duplicate item codes
        // fall back to insert-order matching when counts align.
        const { data: rbItems } = await supabase.from('wo_items').select('id, item_code').eq('wo_id', woId as string);
        const rbList = rbItems || [];
        const queues = new Map<string, string[]>();
        for (const ri of rbList) {
          const arr = queues.get(ri.item_code) || [];
          arr.push(ri.id);
          queues.set(ri.item_code, arr);
        }
        const unmatchedIds = rbList.map((ri: any) => ri.id as string);
        itemPayloads.forEach((p: any) => {
          const q = queues.get(p.itemCode);
          if (q && q.length > 0) {
            const id = q.shift() as string;
            serverItemIds[p.clientKey] = id;
            const ui = unmatchedIds.indexOf(id);
            if (ui >= 0) unmatchedIds.splice(ui, 1);
          }
        });
        // Second pass: assign leftover ids to leftover payloads in order (duplicate codes).
        let leftover = 0;
        itemPayloads.forEach((p: any) => {
          if (!serverItemIds[p.clientKey] && leftover < unmatchedIds.length) {
            serverItemIds[p.clientKey] = unmatchedIds[leftover++];
          }
        });
        if (Object.keys(serverItemIds).length !== itemPayloads.length) {
          throw new Error('Readback item gagal: sebagian item tidak ditemukan setelah penyimpanan server.');
        }
        if (itemsRes.outcome === 'PARTIAL') {
          controlWarnings.push('Item tersimpan sebagian (PARTIAL) — periksa konsistensi sebelum retry.');
        }
      }

      // SO-MANDATORY SLICE 1: server-side trucking JO creation (+ conditional routes).
      if (!editId) {
        step = 'server-trucking-jos';
        for (const [index, item] of woItems.entries()) {
          if (!(item.sbu_type === 'TRUCKING' && item.item_data?.stops)) continue;
          const joItemId = serverItemIds[String(index)];
          if (!joItemId) throw new Error(`wo_item id tidak terbaca utk item ${index} — pembuatan JO dihentikan.`);
          const unitCount = item.item_data.unit_count || 1;
          for (let i = 1; i <= unitCount; i++) {
            const joNumber = `${woNumber}-${i.toString().padStart(2, '0')}`;
            const routePayloads = (item.item_data.stops || []).map((stop: any) => ({
              sequence: stop.sequence || 0,
              stopType: stop.stop_type || 'DROPOFF',
              sourceType: stop.source_type || 'MD_LOCATION',
              sourceId: typeof stop.source_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stop.source_id) ? stop.source_id : null,
              locationName: stop.location_name || 'Unknown Location',
              address: stop.address || '',
              latitude: stop.latitude,
              longitude: stop.longitude,
              contactName: stop.contact_name || '',
              contactPhone: stop.contact_phone || '',
              status: status === 'draft' ? 'draft' : 'pending',
            }));
            const joRes = await fetch('/api/v1/operational/work-orders/mutate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command: 'JO_CREATE',
                idempotencyKey: `wo-jo-${joNumber}`,
                input: {
                  woItemId: joItemId,
                  joNumber,
                  sbuType: 'TRUCKING',
                  status: status === 'draft' ? 'draft' : 'pending',
                  totalStops: item.item_data.stops.length,
                  routes: routePayloads,
                },
              }),
            }).then(r => r.json());

            if (!joRes.success && joRes.error?.code !== 'IDEMPOTENCY_VIOLATION') {
              if (joRes.outcome === 'PARTIAL') {
                controlWarnings.push(`JO ${joNumber} tersimpan sebagian (routes/kontrol gagal) — retry akan merekonsiliasi.`);
                continue;
              }
              throw new Error(joRes.error?.message || `Gagal membuat Job Order ${joNumber}.`);
            }
            if (joRes.outcome === 'PARTIAL') {
              controlWarnings.push(`JO ${joNumber}: stage sampingan/kontrol gagal (PARTIAL).`);
            }
          }
        }
      }

      const sbuCounts: Record<string, number> = {};

for (const [index, item] of woItems.entries()) {
        const sbuKey = item.sbu_type === 'TRUCKING' ? 'TR' : 
                       item.sbu_type === 'CLEARANCE' ? 'CC' :
                       item.sbu_type === 'WAREHOUSE' ? 'WH' :
                       item.sbu_type === 'FORWARDING' ? 'FW' : 'OT';
        const unitQty = item.quantity || item.item_data?.unit_count || 1;
        const itemCode = `${woNumber}/${sbuKey}${unitQty.toString().padStart(2, '0')}`;
        
        const isExistingItem = Boolean(editId && item.id && existingDbItemIds.includes(item.id));
        let woItemId = item.id;

        if (isExistingItem) {
          step = `update-wo-item-${index}`;
          // UPDATE existing wo_item cleanly without deleting or resetting child job orders!
          const { error: updateItemError } = await supabase
            .from('wo_items')
            .update({
              item_code: itemCode,
              sbu_type: item.sbu_type,
              max_jo_count: item.quantity || item.item_data?.unit_count || 1,
              unit_price: item.unit_price || 0,
              total_revenue: item.total_revenue || 0,
              item_data: item.item_data,
              status: status === 'draft' ? 'draft' : 'need_assignment'
            })
            .eq('id', item.id);
          if (updateItemError) throw updateItemError;
          woItemId = item.id;
        } else if (editId) {
          step = `insert-wo-item-${index}`;
          // INSERT new wo_item
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
          woItemId = woItem.id;
        } else {
          // Slice 1 (create path): item rows already persisted via server boundary.
          const mappedId = serverItemIds[String(index)];
          if (!mappedId) throw new Error(`Item ${index} tidak memiliki id hasil boundary server.`);
          woItemId = mappedId;
        }

        // INSERT / UPDATE MANIFESTS IF ANY (create path: handled by WO_ITEM_UPSERT server-side)
        if (editId && item.manifests && Array.isArray(item.manifests)) {
          if (isExistingItem) {
            await supabase.from('wo_item_manifests').delete().eq('wo_item_id', woItemId);
          }
          if (item.manifests.length > 0) {
            const manifestPayloads = item.manifests.map((m: any) => ({
              wo_item_id: woItemId,
              tenant_id: profile.tenant_id,
              product_sku_id: m.product_sku_id,
              quantity: m.quantity || 1,
              unit_weight_kg: m.unit_weight_kg || 0,
              unit_volume_m3: m.unit_volume_m3 || 0,
              notes: m.notes || null,
              custom_fields: {
                location_code: m.location_code || null,
                inventory_id: m.inventory_id || null,
                batch_number: m.batch_number || null,
                earliest_expiry: m.earliest_expiry || null
              }
            }));
            const { error: manifestError } = await supabase.from('wo_item_manifests').insert(manifestPayloads);
            if (manifestError) console.error('Error inserting manifests:', manifestError);
          }
        }

        // Trucking JOs + routes: create path handled server-side (JO_CREATE) BEFORE this loop.
        if (editId && item.sbu_type === 'TRUCKING' && item.item_data.stops) {
          step = `trucking-jo-${index}`;
          const unitCount = item.item_data.unit_count || 1;
          let existingJOs: any[] = [];
          if (isExistingItem) {
            const { data: jos } = await supabase
              .from('job_orders')
              .select('id, jo_number, status, fleet_id, driver_id')
              .eq('wo_item_id', woItemId)
              .order('jo_number', { ascending: true });
            existingJOs = jos || [];
          }

          for (let i = 1; i <= unitCount; i++) {
            const joNumber = `${woNumber}-${i.toString().padStart(2, '0')}`;
            let jobOrderId = null;

            if (i <= existingJOs.length) {
              // EXISTING JOB ORDER: Preserve fleet_id, driver_id, and status! Only update total_stops and jo_number!
              const existingJo = existingJOs[i - 1];
              jobOrderId = existingJo.id;
              const { error: joUpdateError } = await supabase
                .from('job_orders')
                .update({
                  jo_number: joNumber,
                  total_stops: item.item_data.stops.length
                })
                .eq('id', jobOrderId);
              if (joUpdateError) throw joUpdateError;
            } else {
              // NEW JOB ORDER (if unit count was increased)
              const { data: jobOrder, error: joError } = await supabase
                .from('job_orders')
                .insert({
                  tenant_id: profile.tenant_id,
                  jo_number: joNumber,
                  wo_item_id: woItemId,
                  total_stops: item.item_data.stops.length,
                  status: status === 'draft' ? 'draft' : 'pending',
                  sbu_type: 'TRUCKING',
                })
                .select('id')
                .single();
              if (joError) throw joError;
              jobOrderId = jobOrder.id;
            }

            // Update job_routes (Stops / Locations) for this Job Order so driver gets updated destination stop!
            if (jobOrderId) {
              step = `trucking-routes-${index}-${i}`;
              await supabase.from('job_routes').delete().eq('job_order_id', jobOrderId);
              const routePayloads = (item.item_data.stops || []).map((stop: any) => ({
                job_order_id: jobOrderId,
                sequence: stop.sequence || 0,
                stop_type: stop.stop_type || 'DROPOFF',
                source_type: stop.source_type || 'MD_LOCATION',
                source_id: (stop.source_type === 'MD_LOCATION' || stop.source_type === 'MD_CONTACT_ADDRESS') && typeof stop.source_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stop.source_id) ? stop.source_id : null,
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

          // If unitCount was decreased during edit, remove excess Job Orders from DB
          if (unitCount < existingJOs.length) {
            for (let k = unitCount; k < existingJOs.length; k++) {
              await supabase.from('job_orders').delete().eq('id', existingJOs[k].id);
            }
          }
        }

        // AUTO-SPLIT JOB ORDERS FOR WAREHOUSE (HYBRID PATTERN)
        if (item.sbu_type === 'WAREHOUSE') {
          step = `warehouse-jo-${index}`;
          const hasManifests = item.manifests && Array.isArray(item.manifests) && item.manifests.length > 0;
          const allManifestsHaveLocation = hasManifests && item.manifests.every(
            (m: any) => m.location_code && m.location_code !== '-' && m.location_code !== ''
          );
          const isHybridReady = hasManifests && allManifestsHaveLocation && status !== 'draft';
          const opType = (item.item_data?.operation_type || '').toUpperCase();
          const isTransferOp = opType.includes('TRANSFER');
          const isOutboundOp = opType === 'OUTBOUND';

          if (isHybridReady && isExistingItem) {
            await supabase.from('wo_items').update({ status: 'menunggu_wh_eksekusi' }).eq('id', woItemId);
          } else if (isHybridReady) {
            await supabase.from('wo_items').update({ status: 'menunggu_wh_eksekusi' }).eq('id', woItemId);
          }

          const unitCount = item.item_data.unit_count || 1;
          let existingWhJOs: any[] = [];
          if (isExistingItem) {
            const { data: jos } = await supabase
              .from('job_orders')
              .select('id, jo_number, status')
              .eq('wo_item_id', woItemId)
              .order('jo_number', { ascending: true });
            existingWhJOs = jos || [];
          }

          for (let i = 1; i <= unitCount; i++) {
            const joNumber = `${itemCode}-${i.toString().padStart(2, '00')}`;
            let jobOrder: any = null;

            if (i <= existingWhJOs.length) {
              jobOrder = existingWhJOs[i - 1];
              await supabase
                .from('job_orders')
                .update({
                  jo_number: joNumber,
                  assigned_warehouse_id: item.item_data?.warehouse_id || null
                })
                .eq('id', jobOrder.id);
            } else {
              const { data: newJo, error: joError } = await supabase
                .from('job_orders')
                .insert({
                  tenant_id: profile.tenant_id,
                  jo_number: joNumber,
                  wo_item_id: woItemId,
                  assigned_warehouse_id: item.item_data?.warehouse_id || null,
                  status: status === 'draft' ? 'draft' : (isHybridReady ? 'menunggu_wh_eksekusi' : 'pending'),
                  sbu_type: 'WAREHOUSE',
                })
                .select('id')
                .single();

              if (joError) {
                console.error('Error creating WH Job Order:', joError);
                continue;
              }
              jobOrder = newJo;
            }

            // HYBRID: Auto-generate portal task if manifests + locations are complete (only for new/uncreated tasks)
            if (isHybridReady && jobOrder && (isOutboundOp || isTransferOp) && i > existingWhJOs.length) {
              try {
                if (isTransferOp) {
                  const { data: newTransfer } = await supabase.from('wh_transfer_orders').insert({
                    tenant_id: profile.tenant_id,
                    from_warehouse_id: item.item_data?.warehouse_id || null,
                    to_warehouse_id: item.item_data?.to_warehouse_id || null,
                    transfer_number: joNumber,
                    status: 'PLANNED',
                    notes: `Auto-generated transfer for JO ${joNumber}`,
                    created_by: profile?.id || null
                  }).select('id').single();

                  if (newTransfer) {
                    const detailPayloads = item.manifests.map((m: any) => ({
                      tenant_id: profile.tenant_id,
                      transfer_order_id: newTransfer.id,
                      product_sku_id: m.product_sku_id,
                      requested_qty: Number(m.quantity) || 0,
                      shipped_qty: 0,
                      received_qty: 0
                    }));
                    if (detailPayloads.length > 0) {
                      await (supabase.from('wh_transfer_order_items' as any) as any).insert(detailPayloads);
                    }
                  }
                } else {
                  const { data: newShipment } = await supabase.from('wh_outbound_shipments').insert({
                    tenant_id: profile.tenant_id,
                    warehouse_id: item.item_data?.warehouse_id || null,
                    wo_item_id: woItemId,
                    shipment_number: joNumber,
                    status: 'PLANNED',
                    notes: `Auto-generated outbound for JO ${joNumber}`,
                    created_by: profile?.id || null
                  }).select('id').single();

                  if (newShipment) {
                    const shipItemPayloads = item.manifests.map((m: any) => ({
                      tenant_id: profile.tenant_id,
                      shipment_id: newShipment.id,
                      product_sku_id: m.product_sku_id,
                      requested_qty: Number(m.quantity) || 0,
                      picked_qty: 0,
                      loaded_qty: 0
                    }));
                    if (shipItemPayloads.length > 0) {
                      await supabase.from('wh_outbound_shipment_items').insert(shipItemPayloads);
                    }
                  }
                }
              } catch (portalErr) {
                console.error('Error auto-generating portal task:', portalErr);
              }
            }
          }

          if (unitCount < existingWhJOs.length) {
            for (let k = unitCount; k < existingWhJOs.length; k++) {
              await supabase.from('job_orders').delete().eq('id', existingWhJOs[k].id);
            }
          }
        }
      }

      if (controlWarnings.length > 0) {
        toast.error(`Tersimpan dengan peringatan kontrol: ${controlWarnings.join(' | ')}`);
      } else {
        toast.success(editId ? 'Perubahan berhasil disimpan' : 'Berhasil disimpan');
      }
      onBack();
    } catch (err: any) {
      console.error('=== SUBMIT DIAGNOSTICS ===');
      console.error('Step when error occurred:', step);
      console.error('typeof err:', typeof err);
      console.error('err === null:', err === null);
      console.error('err === undefined:', err === undefined);
      console.error('Object.keys(err):', Object.keys(err));
      console.error('Object.getOwnPropertyNames(err):', Object.getOwnPropertyNames(err));
      console.error('err?.message:', err?.message);
      console.error('err?.code:', err?.code);
      console.error('err?.details:', err?.details);
      console.error('err?.hint:', err?.hint);
      console.error('err?.toString():', err?.toString());
      console.error('err?.stack:', err?.stack);
      try { console.error('JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err).concat('message'))); } catch {}
      console.error('=== END DIAGNOSTICS ===');
      toast.error(err?.message || `Gagal menyimpan Work Order (step: ${step}).`);
    } finally {
      setSubmitting(null);
    }
  };

  const totalRevenue = woItems.reduce((acc, curr) => acc + (Number(curr.total_revenue) || Number(curr.item_data?.est_revenue) || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8FAFC] text-slate-900 overflow-y-auto">
      {isLoadingEdit && (
        <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-xs font-black text-black uppercase tracking-[0.4em]">Loading Work Order Data...</p>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-black font-bold transition-all uppercase tracking-widest text-[10px]">
            <ArrowLeft size={14} /> Back to Directory
          </button>
          <div className="md:text-right flex flex-col md:items-end gap-3">
            <div>
              <h2 className="text-3xl font-black text-black italic tracking-tight">ORCHESTRATE WORK ORDER</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Multi-SBU Dispatcher System</p>
            </div>
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
                  <div className="relative" ref={customerDropdownRef}>
                    {/* Trigger Button */}
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        if (!isReadOnly) {
                          setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                          setCustomerSearch('');
                        }
                      }}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all cursor-pointer flex items-center justify-between disabled:opacity-70 text-slate-900"
                    >
                      <span className={selectedCustomer ? 'text-black' : 'text-slate-400'}>
                        {selectedCustomer
                          ? `[${selectedCustomer.entity_code}] ${selectedCustomer.name}${selectedCustomer.legal_name ? ` - ${selectedCustomer.legal_name}` : ''}`
                          : 'Select Customer'}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {isCustomerDropdownOpen && !isReadOnly && (
                      <div className="absolute z-50 top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search name, code, or legal name..."
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              className="w-full h-10 pl-9 pr-8 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all text-slate-900"
                            />
                            {customerSearch && (
                              <button
                                onClick={() => setCustomerSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[240px] overflow-y-auto">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                              <p className="text-xs text-slate-400 font-medium">No customer found</p>
                            </div>
                          ) : (
                            filteredCustomers.map(c => {
                              const isSelected = c.id === formData.customer_id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, customer_id: c.id });
                                    setIsCustomerDropdownOpen(false);
                                    setCustomerSearch('');
                                  }}
                                  className={`w-full px-5 py-3 text-left flex items-center justify-between hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">{c.entity_code}</span>
                                      <span className="text-sm font-bold text-black truncate">{c.name}</span>
                                    </div>
                                    {c.legal_name && (
                                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 ml-[52px] truncate">{c.legal_name}</p>
                                    )}
                                  </div>
                                  {isSelected && <Check size={16} className="text-blue-600 shrink-0 ml-2" />}
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Add New Customer */}
                        <div className="border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickAddOpen(true);
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearch('');
                            }}
                            className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-emerald-50 transition-colors text-emerald-700"
                          >
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <Plus size={14} />
                            </div>
                            <span className="text-sm font-bold">Add New Customer</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SO-MANDATORY SLICE 1 (Phase 3C): Sales Order untuk WO baru */}
                {!editId && !isReadOnly && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar size={12} /> Sales Order * (SO-Mandatory)
                    </label>
                    <select
                      value={salesOrderId}
                      onChange={(e) => {
                        const nextSoId = e.target.value;
                        setSalesOrderId(nextSoId);
                        if (nextSoId) {
                          applySalesOrderDetails(nextSoId);
                        }
                      }}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all text-slate-900"
                    >
                      <option value="">
                        {loadingSalesOrders ? 'Memuat Sales Order...' : salesOrders.length === 0 ? 'Tidak ada SO eligible (CONFIRMED/IN_FULFILLMENT/PARTIALLY_FULFILLED)' : '-- Pilih Sales Order --'}
                      </option>
                      {salesOrders.map((so) => (
                        <option key={so.id} value={so.id}>
                          {so.so_number} — {so.status}{so.customer_name ? ` (${so.customer_name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] font-medium text-slate-400 ml-1">
                      WO baru wajib terikat pada SO tenant dengan status eligible; validasi ulang dilakukan di server.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar size={12} /> Order Date *
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        disabled={isReadOnly}
                        value={formData.order_date}
                        onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70 text-slate-900"
                      />
                      <input
                        type="time"
                        disabled={isReadOnly}
                        value={formData.order_time}
                        onChange={(e) => setFormData({...formData, order_time: e.target.value})}
                        className="w-32 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70 text-slate-900"
                      />
                    </div>
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
                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70 text-slate-900"
                      />
                      <input 
                        type="time"
                        disabled={isReadOnly}
                        value={formData.execution_time}
                        onChange={(e) => setFormData({...formData, execution_time: e.target.value})}
                        className="w-32 px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70 text-slate-900"
                      />
                    </div>
                    {(() => {
                      const orderRef = new Date(`${formData.order_date}T${formData.order_time || '00:00'}`);
                      const execRef = new Date(`${formData.execution_date}T${formData.execution_time || '00:00'}`);
                      const invalid = !isNaN(orderRef.getTime()) && !isNaN(execRef.getTime()) && execRef.getTime() < orderRef.getTime();
                      if (!invalid) return null;
                      return (
                        <p className="text-[10px] font-bold text-rose-600 mt-1 ml-1 flex items-center gap-1">
                          âš  Waktu eksekusi ({formData.execution_date} {formData.execution_time}) tidak boleh sebelum Order Time ({formData.order_date} {formData.order_time}).
                        </p>
                      );
                    })()}
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
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-slate-900/5 outline-none transition-all disabled:opacity-70 text-slate-900"
                />
              </div>
            </Card>

            {activeSbuTypes.has("tr") && (
              <Card className="p-6 border-slate-200 shadow-none !rounded-[2rem]">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MapPin size={12} /> Wilayah Tujuan (Kota Surabaya) *
                  </label>
                  <select
                    disabled={isReadOnly || loadingRegions}
                    value={formData.region_id}
                    onChange={(e) => setFormData({...formData, region_id: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all disabled:opacity-70"
                  >
                    <option value="">Pilih Wilayah Kerja</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.level ? ` - ${r.level}` : ''}</option>
                    ))}
                  </select>
                </div>
              </Card>
            )}

            <div className="space-y-4">
               <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] ml-2 italic">Select SBU Modules</h3>
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
                         <span className="text-xs font-black uppercase tracking-widest text-black">{sbu.label}</span>
                      </button>
                    ))}
                 </div>
               )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] italic">Work Order Manifest</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{woItems.length} Items Selected</span>
              </div>

              {woItems.length === 0 ? (
                <Card className="py-20 text-center border-dashed border-2 border-slate-200 shadow-none !rounded-[2.5rem]">
                  <div className="p-4 bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900">
                     <Plus size={24} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select an SBU module above to add items</p>
                </Card>
              ) : (
                woItems.map((item) => (
                  <Card key={item.id} className="p-6 border-slate-200 shadow-none !rounded-[2rem] hover:border-slate-400 transition-all group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 shadow-lg ${
                          item.sbu_type === 'WAREHOUSE' ? 'bg-amber-600 text-white shadow-amber-600/20' :
                          item.sbu_type === 'FORWARDING' ? 'bg-indigo-600 text-white shadow-indigo-600/20' :
                          'bg-blue-600 text-white shadow-blue-600/20'
                        }`}>
                          {item.sbu_type === 'WAREHOUSE' ? <Package size={24} /> :
                           item.sbu_type === 'FORWARDING' ? <Globe size={24} /> :
                           <Truck size={24} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded uppercase tracking-[0.2em] ${
                              item.sbu_type === 'WAREHOUSE' ? 'bg-amber-600' :
                              item.sbu_type === 'FORWARDING' ? 'bg-indigo-600' :
                              'bg-blue-600'
                            }`}>{item.sbu_type}</span>
                            <span className="text-xs font-black text-black uppercase tracking-wider">{item.item_data?.unit_count || 1} Units</span>
                          </div>
                          
                          {item.sbu_type === 'WAREHOUSE' ? (
                            <div className="mt-2 text-sm font-bold text-black">
                               {item.item_data?.operation_type || 'Warehouse Task'} | {item.item_data?.est_volume_cbm || 0} CBM
                            </div>
                          ) : item.sbu_type === 'FORWARDING' ? (
                            <div className="mt-2 text-sm font-bold text-black">
                               {item.item_data?.service_type || 'FCL'} | {item.item_data?.origin_port_name || '?'} â†’ {item.item_data?.destination_port_name || '?'}
                            </div>
                          ) : (
                            <div className="space-y-1.5 mt-2">
                              <div className="text-sm font-black text-black flex items-center gap-2">
                                <span>{item.item_data?.vehicle_type_name || 'Generic Fleet'}</span>
                                {item.item_data?.cargo_description && (
                                  <span className="text-xs font-semibold text-slate-500">
                                    • {item.item_data.cargo_description}
                                  </span>
                                )}
                              </div>
                              {item.item_data?.stops && item.item_data.stops.length >= 2 && (
                                <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                  <span className="text-emerald-600 font-bold">● {item.item_data.stops[0]?.location_name || item.item_data.shipper_name || 'Muat'}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-rose-600 font-bold">■ {item.item_data.stops[item.item_data.stops.length - 1]?.location_name || item.item_data.recipient_name || 'Bongkar'}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                            <p className="text-sm font-black text-black italic font-mono">IDR {Number(item.total_revenue).toLocaleString('id-ID')}</p>
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
            <Card className="p-8 bg-white text-black !rounded-[3rem] shadow-xl shadow-slate-200/60 space-y-8 sticky top-8 border border-slate-100">
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
                    <button onClick={() => handleSubmit('need_assignment')} disabled={submitting !== null} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                       {submitting === 'submit' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} SUBMIT TO SBU
                    </button>
                    <button onClick={() => handleSubmit('draft')} disabled={submitting !== null} className="w-full py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900">
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

        {activeSBUModal === 'FORWARDING' && (
           <AddForwardingItemModal 
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

