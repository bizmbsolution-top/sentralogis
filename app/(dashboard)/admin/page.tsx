"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  Truck, Package, AlertCircle, Plus,
  X, Trash2, FileText, Loader2,
  Search, BarChart3, TrendingUp,
  Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, MessageSquare, AlertTriangle, Check, Send, Edit2, Edit3, Download,
  CheckCircle2, Ban, Hourglass, UserPlus, Calendar, MapPin, Navigation, Banknote, CircleDollarSign, Save, ExternalLink, ShieldCheck, LayoutGrid, RefreshCw, Target,
  Ship, Warehouse, HardHat, ChevronRight, ChevronLeft, Activity, Upload, Verified
} from "lucide-react";

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type Customer = {
  id: string;
  phone: string;
  name: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipcode: string | null;
  billing_method?: 'epod' | 'hardcopy';
};

type Location = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  city: string | null;
  province: string | null;
  zipcode: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
};

type TrackingUpdate = {
  id: string;
  location: string;
  status_update: string;
  created_at: string;
};

type WorkOrderItem = {
  id?: string;
  truck_type: string;
  origin_location_id: string;
  destination_location_id: string;
  quantity: number;
  deal_price: number;
  origin_location?: Location;
  destination_location?: Location;
  job_orders?: JobOrder[];
  sbu_type?: string;
  sbu_metadata?: any;
};

type JobOrder = {
  id: string;
  jo_number: string;
  status: string;
  is_link_sent: boolean;
  fleets?: { 
    id: string; 
    plate_number: string;
    companies?: { name: string; type: string } | null;
  } | null;
  drivers?: { id: string; name: string; phone: string } | null;
  external_driver_name?: string | null;
  external_driver_phone?: string | null;
  tracking_updates?: TrackingUpdate[];
};

type WorkOrder = {
  id: string;
  wo_number: string;
  customer_id: string;
  order_date: string;
  execution_date: string;
  notes: string | null;
  status: string;
  source?: string;
  route_name?: string | null;
  sbu_handover_notes?: string | null;
  customers?: Customer;
  work_order_items?: WorkOrderItem[];
  billing_status?: string;
  physical_doc_received?: boolean;
  physical_doc_files?: string[];
  physical_doc_notes?: string;
  physical_doc_collected_at?: string;
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [truckTypes, setTruckTypes] = useState<{id: string, name: string}[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [expandedWOId, setExpandedWOId] = useState<string | null>(null);
  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetWOId, setRejectTargetWOId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingWO, setRejectingWO] = useState(false);

  // Tracking Modal State
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedJOData, setSelectedJOData] = useState<{ jo: JobOrder, item: WorkOrderItem, wo: WorkOrder } | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending_sbu: 0,
    need_approval: 0,
    on_journey: 0,
    // BI metrics
    funnel: {
      received: 0,
      running: 0,
      finished_pending_docs: 0,
      docs_complete_pending_finance: 0
    },
    topCustomers: [] as { name: string, totalRevenue: number }[],
    revenueComparison: {
      thisMonth: 0,
      lastMonth: 0,
      growth: 0
    }
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [selectedSbus, setSelectedSbus] = useState<string[]>(['trucking']);
  const [activeWizardTab, setActiveWizardTab] = useState('trucking');
  const [editingWOId, setEditingWOId] = useState<string | null>(null);

  const [newWO, setNewWO] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split('T')[0],
    execution_date: new Date().toISOString().slice(0, 16),
    notes: "",
    sbu_type: "trucking",
  });

  const resetWOForm = () => {
    setEditingWOId(null);
    setNewWO({
      customer_id: "",
      order_date: new Date().toISOString().split('T')[0],
      execution_date: new Date().toISOString().slice(0, 16),
      notes: "",
      sbu_type: "trucking",
    });
    setWoItems([
      {
        truck_type: "CDE",
        origin_location_id: "",
        destination_location_id: "",
        quantity: 1,
        deal_price: 0,
        sbu_type: "trucking",
        sbu_metadata: {}
      }
    ]);
    setSelectedSbus(['trucking']);
    setActiveWizardTab('trucking');
    setWizardStep(1);
  };

  const openEditModal = (wo: any) => {
    setEditingWOId(wo.id);
    
    // Robust date parsing for datetime-local
    let execDate = "";
    if (wo.execution_date) {
      if (wo.execution_date.includes('T')) {
        execDate = wo.execution_date.slice(0, 16);
      } else {
        // Fallback if only date is provided
        execDate = `${wo.execution_date}T09:00`;
      }
    } else {
      execDate = new Date().toISOString().slice(0, 16);
    }

    setNewWO({
      customer_id: wo.customer_id,
      order_date: wo.order_date ? wo.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
      execution_date: execDate,
      notes: wo.notes || "",
      sbu_type: wo.sbu_type || "trucking"
    });
    
    // Load existing items
    const items = wo.work_order_items || [];
    if (items.length > 0) {
      setWoItems(items.map((item: any) => ({
        ...item,
        sbu_metadata: item.sbu_metadata || {}
      })));
      
      // Populate selected SBUs based on items
      const sbus = Array.from(new Set(items.map((i: any) => i.sbu_type))) as string[];
      const validSbus = sbus.length > 0 ? sbus : ['trucking'];
      setSelectedSbus(validSbus);
      setActiveWizardTab(validSbus[0]);
    } else {
      setWoItems([{
        truck_type: "CDE",
        origin_location_id: "",
        destination_location_id: "",
        quantity: 1,
        deal_price: 0,
        sbu_type: "trucking",
        sbu_metadata: {}
      }]);
      setSelectedSbus(['trucking']);
      setActiveWizardTab('trucking');
    }

    setWizardStep(1);
    setShowCreateModal(true);
  };

  // WO Items
  const [woItems, setWoItems] = useState<WorkOrderItem[]>([
    {
      truck_type: "CDE",
      origin_location_id: "",
      destination_location_id: "",
      quantity: 1,
      deal_price: 0,
      sbu_type: "trucking",
      sbu_metadata: {}
    }
  ]);

  // Form New Customer
  const [newCustomer, setNewCustomer] = useState({
    phone: "",
    name: "",
    company_name: "",
    address: "",
    city: "",
    province: "",
    zipcode: "",
    billing_method: 'epod' as 'epod' | 'hardcopy',
  });
  const [customerView, setCustomerView] = useState<'list' | 'form'>('form');
  const [isCustomerEdit, setIsCustomerEdit] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Form New Location
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    district: "",
    city: "",
    province: "",
    zipcode: "",
    notes: "",
  });
  const [savingLocation, setSavingLocation] = useState(false);

  // Google Maps Autocomplete refs
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const customerAutocompleteInputRef = useRef<HTMLInputElement>(null);
  const customerAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyBilling = async (woId: string) => {
    try {
      setVerifying(true);
      const { error } = await supabase
        .from('work_orders')
        .update({ billing_status: 'completed' })
        .eq('id', woId);

      if (error) throw error;
      toast.success("Dokumen & Biaya terverifikasi! Siap ditagihkan oleh Finance.");
      fetchDashboardData();
    } catch (err: any) {
      toast.error("Gagal verifikasi: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  // =====================================================
  // FETCH DATA
  // =====================================================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select(`
          *,
          customers (*),
          sbu_handover_notes,
          work_order_items (
            id, truck_type, origin_location_id, destination_location_id, quantity, deal_price, sbu_type, sbu_metadata,
            origin_location:origin_location_id (*),
            destination_location:destination_location_id (*),
            job_orders (
              id, jo_number, status, is_link_sent, 
              fleets (
                id, plate_number, truck_type,
                companies (name, type)
              ), 
              drivers:driver_id (id, name, phone),
              external_driver_name,
              external_driver_phone,
              tracking_updates (id, location, status_update, created_at),
              extra_costs (*)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (woError) throw woError;

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true, nullsLast: true });

      if (customerError) console.error("Customer fetch error:", customerError);

      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true });

      if (locationError) console.error("Location fetch error:", locationError);

      const { data: truckTypesData, error: truckTypesError } = await supabase
        .from("truck_types")
        .select("*")
        .order("name", { ascending: true });

      if (truckTypesError) console.error("Truck Types fetch error:", truckTypesError);

      const { count: fleetCount, error: fleetError } = await supabase
        .from("fleets")
        .select("*", { count: "exact", head: true })
        .eq("status", "available");

      if (fleetError) console.error("Fleet count error:", fleetError);

      // Calculate detailed stats for Admin WO activities
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastYear = lastMonthDate.getFullYear();

      const newStats = {
        total: woData?.length || 0,
        draft: 0,
        pending_sbu: 0,
        need_approval: 0,
        on_journey: 0,
        funnel: {
          received: 0,
          running: 0,
          finished_pending_docs: 0,
          docs_complete_pending_finance: 0
        },
        topCustomers: [] as any[],
        revenueComparison: {
          thisMonth: 0,
          lastMonth: 0,
          growth: 0
        }
      };

      const customerMap = new Map();

      woData?.forEach((wo: WorkOrder) => {
        const displayStatus = getWODisplayStatus(wo);
        
        // Basic Stats
        if (displayStatus.key === 'draft') newStats.draft++;
        else if (displayStatus.key === 'awaiting_sbu') newStats.pending_sbu++;
        else if (displayStatus.key === 'need_approval') newStats.need_approval++;
        else if (displayStatus.key === 'on_journey') newStats.on_journey++;

        // BI Funnel Logic
        if (displayStatus.key === 'draft' || displayStatus.key === 'awaiting_sbu') {
          newStats.funnel.received++;
        } else if (displayStatus.key === 'need_approval' || displayStatus.key === 'on_journey') {
          newStats.funnel.running++;
        } else if (displayStatus.key === 'done' || displayStatus.key === 'finished') {
          // Check docs
          if (!wo.physical_doc_received) {
            newStats.funnel.finished_pending_docs++;
          } else if (wo.billing_status === 'none' || !wo.billing_status) {
            newStats.funnel.docs_complete_pending_finance++;
          }
        }

        // Financial Data (Monthly)
        const woDate = new Date(wo.order_date);
        const woMonth = woDate.getMonth();
        const woYear = woDate.getFullYear();
        
        const totalAmount = (wo.work_order_items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.deal_price || 0)), 0);

        if (woMonth === thisMonth && woYear === thisYear) {
           newStats.revenueComparison.thisMonth += totalAmount;
           
           // Track customer revenue this month
           const custName = wo.customers?.company_name || wo.customers?.name || 'Unknown';
           customerMap.set(custName, (customerMap.get(custName) || 0) + totalAmount);
        } else if (woMonth === lastMonth && woYear === lastYear) {
           newStats.revenueComparison.lastMonth += totalAmount;
        }
      });

      // Calculate Growth
      if (newStats.revenueComparison.lastMonth > 0) {
        newStats.revenueComparison.growth = ((newStats.revenueComparison.thisMonth - newStats.revenueComparison.lastMonth) / newStats.revenueComparison.lastMonth) * 100;
      } else if (newStats.revenueComparison.thisMonth > 0) {
        newStats.revenueComparison.growth = 100;
      }

      // Top 5 Customers
      newStats.topCustomers = Array.from(customerMap.entries())
        .map(([name, totalRevenue]) => ({ name, totalRevenue }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      setWorkOrders(woData || []);
      setCustomers(customerData || []);
      setLocations(locationData || []);
      setTruckTypes(truckTypesData || []);
      setStats(newStats);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTO-FILL HARGA DARI DATA TERAKHIR
  // =====================================================
  const fetchLastPrice = async (customer_id: string, truck_type: string, origin_id: string, destination_id: string, itemIndex: number) => {
    if (!customer_id || !truck_type || !origin_id || !destination_id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("work_order_items")
        .select(`
          deal_price,
          created_at,
          work_orders!inner (
            customer_id
          )
        `)
        .eq("work_orders.customer_id", customer_id)
        .eq("truck_type", truck_type)
        .eq("origin_location_id", origin_id)
        .eq("destination_location_id", destination_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].deal_price && data[0].deal_price > 0) {
        const lastPrice = data[0].deal_price;
        setWoItems(prevItems => {
          const newItems = [...prevItems];
          newItems[itemIndex].deal_price = lastPrice;
          return newItems;
        });
        toast.success(`Harga terakhir: Rp ${lastPrice.toLocaleString('id-ID')}`, { duration: 2000 });
      }
    } catch (error: any) {
      console.error("Error fetching last price:", error);
    }
  };

  // Auto-fill price when customer, route, or truck type changes (ONLY for NEW Work Orders)
  useEffect(() => {
    if (!editingWOId && newWO.customer_id && showCreateModal && woItems.length > 0) {
      woItems.forEach((item, index) => {
        if (item.truck_type && item.origin_location_id && item.destination_location_id) {
           lookupLastPrice(index);
        }
      });
    }
  }, [newWO.customer_id, showCreateModal, editingWOId, woItems.map(i => `${i.truck_type}-${i.origin_location_id}-${i.destination_location_id}`).join(',')]);

  useEffect(() => {
    // Check if Google Maps API is loaded
    if (showLocationModal && autocompleteInputRef.current && typeof google !== 'undefined' && google.maps && google.maps.places) {
      try {
        autocompleteRef.current = new google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "id" },
          }
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place || !place.geometry) return;

          let fullAddress = place.formatted_address || "";

          let district = "";
          let city = "";
          let province = "";
          let zipcode = "";

          place.address_components?.forEach((component) => {
            const types = component.types;
            if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
              district = component.long_name;
            }
            if (types.includes("locality") || types.includes("administrative_area_level_3")) {
              city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              province = component.long_name;
            }
            if (types.includes("postal_code")) {
              zipcode = component.long_name;
            }
          });

          setNewLocation((prev) => ({
            ...prev,
            address: fullAddress,
            district: district,
            city: city,
            province: province,
            zipcode: zipcode,
          }));
        });
      } catch (error) {
        console.error("Error initializing Google Maps Autocomplete:", error);
      }
    }
  }, [showLocationModal]);

  // Google Maps Autocomplete for Customer Modal
  useEffect(() => {

    // Google Maps Autocomplete for Customer Modal
    if (showCustomerModal && customerAutocompleteInputRef.current && typeof google !== 'undefined' && google.maps && google.maps.places) {
      try {
        customerAutocompleteRef.current = new google.maps.places.Autocomplete(
          customerAutocompleteInputRef.current,
          {
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "id" },
          }
        );

        customerAutocompleteRef.current.addListener("place_changed", () => {
          const place = customerAutocompleteRef.current?.getPlace();
          if (!place || !place.geometry) return;

          let fullAddress = place.formatted_address || "";
          let city = "";
          let province = "";
          let zipcode = "";

          place.address_components?.forEach((component) => {
            const types = component.types;
            if (types.includes("locality") || types.includes("administrative_area_level_3")) {
              city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              province = component.long_name;
            }
            if (types.includes("postal_code")) {
              zipcode = component.long_name;
            }
          });

          setNewCustomer((prev) => ({
            ...prev,
            address: fullAddress,
            city: city,
            province: province,
            zipcode: zipcode,
          }));
        });
      } catch (error) {
        console.error("Error initializing Customer Google Maps Autocomplete:", error);
      }
    }
  }, [showCustomerModal, customerView]);

  // =====================================================
  // CRUD CUSTOMER
  // =====================================================
  const handleSaveCustomer = async () => {
    if (!newCustomer.phone) {
      toast.error("Nomor WA wajib diisi");
      return;
    }

    setSavingCustomer(true);
    try {
      const payload = {
        phone: newCustomer.phone,
        name: newCustomer.name || null,
        company_name: newCustomer.company_name || null,
        address: newCustomer.address || null,
        city: newCustomer.city || null,
        province: newCustomer.province || null,
        zipcode: newCustomer.zipcode || null,
        billing_method: newCustomer.billing_method,
      };

      if (isCustomerEdit && editingCustomerId) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomerId);
        
        if (error) throw error;
        toast.success("Data pelanggan diperbarui!");
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        toast.success("Pelanggan baru ditambahkan!");
        setNewWO(prev => ({ ...prev, customer_id: data.id }));
      }

      // Refresh and reset
      const { data: refreshedCustomers } = await supabase.from("customers").select("*").order("name", { ascending: true, nullsLast: true });
      setCustomers(refreshedCustomers || []);
      
      setShowCustomerModal(false);
      resetCustomerForm();
    } catch (error: any) {
      toast.error("Gagal: " + error.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const resetCustomerForm = () => {
    setNewCustomer({ phone: "", name: "", company_name: "", address: "", city: "", province: "", zipcode: "", billing_method: 'epod' });
    setIsCustomerEdit(false);
    setEditingCustomerId(null);
    setCustomerView('form');
  };

  // =====================================================
  // CRUD LOCATION
  // =====================================================
  const createLocation = async () => {
    if (!newLocation.name) {
      toast.error("Nama lokasi wajib diisi");
      return;
    }
    if (!newLocation.address) {
      toast.error("Alamat wajib diisi");
      return;
    }

    setSavingLocation(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          name: newLocation.name,
          address: newLocation.address,
          district: newLocation.district || null,
          city: newLocation.city || null,
          province: newLocation.province || null,
          zipcode: newLocation.zipcode || null,
          notes: newLocation.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Lokasi berhasil ditambahkan!");
      setLocations(prev => [...prev, data]);
      setShowLocationModal(false);
      setNewLocation({
        name: "",
        address: "",
        district: "",
        city: "",
        province: "",
        zipcode: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error("Gagal: " + error.message);
    } finally {
      setSavingLocation(false);
    }
  };

  // =====================================================
  // WO ITEMS MANAGEMENT
  // =====================================================
  const addWoItem = () => {
    setWoItems(prev => [
      ...prev,
      {
        truck_type: "CDE",
        origin_location_id: "",
        destination_location_id: "",
        quantity: 1,
        deal_price: 0,
      }
    ]);
  };

  const removeWoItem = (index: number) => {
    if (woItems.length === 1) {
      toast.error("Minimal 1 item");
      return;
    }
    setWoItems(prev => prev.filter((_, i) => i !== index));
  };

  const lookupLastPrice = async (index: number, currentItems?: WorkOrderItem[]) => {
    const targetItems = currentItems || woItems;
    const item = targetItems[index];
    
    if (!newWO.customer_id || !item.truck_type || !item.origin_location_id || !item.destination_location_id || item.sbu_type !== 'trucking') return;

    try {
      const { data, error } = await supabase
        .from('work_order_items')
        .select(`
          deal_price,
          work_orders!inner(customer_id, created_at)
        `)
        .eq('work_orders.customer_id', newWO.customer_id)
        .eq('truck_type', item.truck_type)
        .eq('origin_location_id', item.origin_location_id)
        .eq('destination_location_id', item.destination_location_id)
        .order('created_at', { foreignTable: 'work_orders', ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.deal_price) {
        const updated = [...targetItems];
        updated[index] = { ...updated[index], deal_price: data.deal_price };
        setWoItems(updated);
        toast.success(`Tarif terakhir ditemukan: Rp ${data.deal_price.toLocaleString('id-ID')}`, {
          icon: '💰',
          duration: 3000
        });
      }
    } catch (err) {
      console.error("Price lookup error:", err);
    }
  };

  const updateWoItem = (index: number, field: string, value: any, subField?: string) => {
    const updated = [...woItems];
    if (subField) {
      updated[index] = {
        ...updated[index],
        [field]: {
          ...(updated[index][field as keyof WorkOrderItem] as object || {}),
          [subField]: value
        }
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setWoItems(updated);

    // Trigger Lookup if route/type changed
    if (['truck_type', 'origin_location_id', 'destination_location_id'].includes(field)) {
      lookupLastPrice(index, updated);
    }
  };

  // Automatic price lookups merged above

  // Hitung total
  const getItemTotal = (item: WorkOrderItem) => {
    return (item.quantity || 0) * (item.deal_price || 0);
  };

  const getGrandTotal = () => {
    return woItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // Create Work Order
  // Create Work Order
  const createWorkOrder = async (targetStatus: string = "draft") => {
    if (!newWO.customer_id) {
      toast.error("Pilih pelanggan dulu");
      return;
    }

    for (let i = 0; i < woItems.length; i++) {
      const item = woItems[i];
      // Hanya validasi lokasi jika SBU adalah trucking
      if (item.sbu_type === 'trucking') {
        if (!item.origin_location_id) {
          toast.error(`Item ${i + 1} (Trucking): Pilih lokasi pickup`);
          return;
        }
        if (!item.destination_location_id) {
          toast.error(`Item ${i + 1} (Trucking): Pilih lokasi dropoff`);
          return;
        }
      }
      if (item.quantity < 1) {
        toast.error(`Item ${i + 1}: Jumlah unit minimal 1`);
        return;
      }
    }

    const selectedCustomer = customers.find(c => c.id === newWO.customer_id);
    const required_units = woItems.reduce((sum, item) => sum + item.quantity, 0);

    try {
      const response = await fetch('/api/wo', {
        method: editingWOId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingWOId ? { id: editingWOId } : {}),
          customer_id: newWO.customer_id,
          customer_phone: selectedCustomer?.phone,
          customer_name: selectedCustomer?.name,
          company_name: selectedCustomer?.company_name,
          order_date: newWO.order_date,
          execution_date: newWO.execution_date,
          notes: newWO.notes,
          status: targetStatus,
          source: "admin_cs",
          created_by: "Admin",
          required_units: required_units,
          sbu_type: newWO.sbu_type,
          items: woItems
        }),
      });

      if (response.ok) {
        toast.success(editingWOId ? "Work Order diperbarui!" : "Work Order berhasil dibuat!");
        setShowCreateModal(false);
        setEditingWOId(null);
        
        setNewWO({
          customer_id: "",
          order_date: new Date().toISOString().split('T')[0],
          execution_date: new Date().toISOString().slice(0, 16),
          notes: "",
          sbu_type: "trucking"
        });
        setWoItems([{
          truck_type: "CDE",
          origin_location_id: "",
          destination_location_id: "",
          quantity: 1,
          deal_price: 0,
          sbu_type: "trucking",
          sbu_metadata: {}
        }]);
        setWizardStep(1);
        setSelectedSbus(['trucking']);
        setActiveWizardTab('trucking');

        fetchDashboardData();
      } else {
        throw new Error("Gagal membuat WO");
      }
    } catch (error: any) {
      console.error("Error creating WO:", error);
      toast.error("Gagal membuat WO: " + error.message);
    }
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Work Order berhasil dihapus");
      fetchDashboardData();
    } catch (error: any) {
      console.error("Error deleting WO:", error);
      toast.error("Gagal menghapus WO: " + error.message);
    }
  };

  // =====================================================
  // REJECT WITH REASON
  // =====================================================
  const openRejectModal = (woId: string) => {
    setRejectTargetWOId(woId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectWithReason = async () => {
    if (!rejectTargetWOId) return;
    if (!rejectReason.trim()) { toast.error("Tuliskan alasan penolakan"); return; }
    setRejectingWO(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: "rejected", notes: rejectReason.trim() })
        .eq("id", rejectTargetWOId);
      if (error) throw error;
      toast.success("WO berhasil ditolak");
      setShowRejectModal(false);
      setRejectTargetWOId(null);
      setRejectReason("");
      fetchDashboardData();
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setRejectingWO(false);
    }
  };

  // Submit draft to SBU
  const handleExportReport = () => {
    try {
      toast.loading("Menyiapkan Master Report...", { id: 'admin-export' });

      const headers = [
        "WO Number",
        "Order Date",
        "Execution Date",
        "Customer",
        "Status",
        "Units",
        "Deal Price (Total)",
        "Extra Costs (Total)",
        "Grand Total",
        "Fleet Assignments"
      ];

      const rows = workOrders.map(wo => {
        const displayStatus = getWODisplayStatus(wo);
        const totalDeal = (wo.work_order_items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.deal_price || 0)), 0);
        
        const extraCosts = (wo.work_order_items || []).flatMap(i => i.job_orders || []).reduce((acc, jo) => {
          return acc + (jo.extra_costs || []).reduce((cAcc: number, c: any) => cAcc + (Number(c.amount) || 0), 0);
        }, 0);

        const assignments = (wo.work_order_items || []).flatMap(i => i.job_orders || []).map(jo => `${jo.jo_number}:${jo.fleets?.plate_number}`).join("; ");

        return [
          wo.wo_number,
          wo.order_date,
          wo.execution_date,
          wo.customers?.company_name || wo.customers?.name || "-",
          displayStatus.label,
          (wo.work_order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
          totalDeal,
          extraCosts,
          totalDeal + extraCosts,
          assignments
        ];
      });

      const csvRows = [headers.join(",")];
      rows.forEach(row => {
        const escaped = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`);
        csvRows.push(escaped.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Sentralogis_Master_Admin_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Master Report berhasil diunduh!", { id: 'admin-export' });
    } catch (err: any) {
      toast.error("Gagal export: " + err.message, { id: 'admin-export' });
    }
  };

  const handleSubmitToSBU = async (woId: string) => {
    try {
      const { error } = await supabase.from("work_orders").update({ status: "pending_sbu" }).eq("id", woId);
      if (error) throw error;
      toast.success("WO berhasil dikirmkan ke SBU Trucking!");
      fetchDashboardData();
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    }
  };

  const updateExtraCostStatus = async (costId: string, status: 'approved' | 'rejected', isBillable: boolean) => {
    try {
      const { error } = await supabase
        .from("extra_costs")
        .update({ status, is_billable: isBillable })
        .eq("id", costId);

      if (error) throw error;
      toast.success(status === 'approved' ? "Biaya disetujui untuk ditagih ke pelanggan" : "Biaya ditolak untuk penagihan (Hanya Internal)");
      fetchDashboardData();
    } catch (error: any) {
      toast.error("Gagal update biaya: " + error.message);
    }
  };

  // Helper: derive WO display status from work order + job_orders
  const getWODisplayStatus = (wo: WorkOrder) => {
    const s = wo.status;
    if (s === 'draft') return { key: 'draft', label: 'Draft', color: 'text-slate-500' };
    if (s === 'pending_sbu') return { key: 'awaiting_sbu', label: 'Awaiting SBU Assignment', color: 'text-blue-500' };
    if (s === 'pending_armada_check') return { key: 'need_approval', label: 'Need Approval', color: 'text-amber-500' };
    if (s === 'rejected') return { key: 'rejected', label: 'Rejected', color: 'text-red-500' };
    if (s === 'approved') {
      const allJOs = (wo.work_order_items || []).flatMap(i => i.job_orders || []);
      if (allJOs.length === 0) return { key: 'approved', label: 'Approved', color: 'text-emerald-500' };
      const allDone = allJOs.every(j => j.status === 'delivered');
      if (allDone) return { key: 'done', label: 'Done', color: 'text-teal-500' };
      return { key: 'on_journey', label: 'On Journey', color: 'text-blue-400' };
    }
    return { key: s, label: s.replace(/_/g, ' '), color: 'text-slate-400' };
  };

  const updateWOStatus = async (id: string, status: string) => {
    try {
      if (status === "approved") {
        // Logika Smart Partial Approval: Sesuaikan kuantitas dengan hal yang sudah di-assign
        // 1. Ambil data item dan jumlah JO-nya
        const { data: woItemsData, error: itemsError } = await supabase
          .from("work_order_items")
          .select(`
            id, quantity,
            job_orders(id)
          `)
          .eq("work_order_id", id);
        
        if (itemsError) throw itemsError;

        let totalNewUnits = 0;
        for (const item of woItemsData || []) {
            const assignedCount = (item.job_orders || []).length;
            totalNewUnits += assignedCount;
            
            // 2. Update kuantitas item agar SAMA dengan jumlah penugasan
            // Jika penugasan 0, maka kuantitas tetap (atau bisa disesuaikan sesuai kebutuhan bisnis)
            // Namun permintaan user: "yang ketiga block tidak bisa di isi", berarti yang kosong dibuang.
            if (assignedCount < item.quantity) {
                const { error: updateItemErr } = await supabase
                    .from("work_order_items")
                    .update({ quantity: assignedCount })
                    .eq("id", item.id);
                if (updateItemErr) console.error("Error truncating item quantity:", updateItemErr);
            }
        }

        // 3. Update total required_units di WO
        const { error: updateWOErr } = await supabase
            .from("work_orders")
            .update({ status: "approved", required_units: totalNewUnits })
            .eq("id", id);
        
        if (updateWOErr) throw updateWOErr;
      } else {
        const { error } = await supabase
          .from("work_orders")
          .update({ status })
          .eq("id", id);

        if (error) throw error;
      }

      toast.success(`Work Order berhasil di-${status}`);
      fetchDashboardData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal memperbarui status: " + error.message);
    }
  };

  const generateWALink = (wo: WorkOrder) => {
    const customerName = wo.customers?.company_name || wo.customers?.name || "Pelanggan";
    const waNumber = wo.customers?.phone || "";
    
    // Format message
    let message = `*KONFIRMASI WORK ORDER - SENTRA LOGISTIK*\n\n`;
    message += `Nomor WO: *${wo.wo_number || '-'}*\n`;
    message += `Pelanggan: ${customerName}\n`;
    message += `Status: ✅ *DISETUJUI & SIAP PROSES*\n\n`;
    
    message += `*Detail Item:*\n`;
    wo.work_order_items?.forEach((item, index) => {
        message += `${index + 1}. ${item.truck_type} (${item.quantity} Unit)\n`;
    });
    
    message += `\nSilakan klik link berikut untuk memantau status pengiriman Anda secara real-time.\n`;
    message += `Terima kasih atas kepercayaan Anda.`;

    const encoded = encodeURIComponent(message);
    return `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encoded}`;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = workOrders.reduce((sum, wo) => {
    const itemsTotal = (wo.work_order_items || []).reduce((itemSum, item) => itemSum + ((item.quantity || 0) * (item.deal_price || 0)), 0);
    return sum + itemsTotal;
  }, 0);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 p-6 pb-32 md:pb-6 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Control Center • Sentra Logistik
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0 md:pb-0 md:overflow-visible scrollbar-hide w-[calc(100%+3rem)] md:w-auto">
              <Link
                href="/sbu-launchpad"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 active:scale-95"
              >
                <Target className="w-5 h-5" />
                Mission Control
              </Link>
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 px-6 py-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-bold active:scale-95"
              >
                <Download className="w-5 h-5" />
                Export Data
              </button>
              <Link
                href="/finance"
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl hover:bg-white/10 transition-all font-bold active:scale-95"
              >
                <Banknote className="w-5 h-5 text-emerald-400" />
                Finance Controller
              </Link>
              <Link
                href="/admin/entities"
                className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 px-6 py-3 rounded-2xl hover:bg-purple-600 hover:text-white transition-all font-bold active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                Master Entities
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 font-bold active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Work Order Baru
              </button>
          </div>
        </div>

        {/* BI COCKPIT - Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto lg:overflow-visible pb-8 -mx-6 px-6 lg:mx-0 lg:px-0 lg:pb-0 mb-12 snap-x snap-mandatory scrollbar-hide">
          {/* 1. Operational Funnel */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">Operational Funnel</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Pipeline Tracking</p>
              </div>
            </div>

            <div className="space-y-6 relative">
              {[
                { label: 'Terima (Belum Jalan)', count: stats?.funnel?.received || 0, color: 'text-slate-400', bar: 'bg-slate-500' },
                { label: 'Running (Aktif)', count: stats?.funnel?.running || 0, color: 'text-blue-400', bar: 'bg-blue-500' },
                { label: 'Selesai (Doc Incomplete)', count: stats?.funnel?.finished_pending_docs || 0, color: 'text-amber-400', bar: 'bg-amber-500' },
                { label: 'Doc OK (Antri Finance)', count: stats?.funnel?.docs_complete_pending_finance || 0, color: 'text-emerald-400', bar: 'bg-emerald-500' },
              ].map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{step.label}</span>
                    <span className={`text-lg font-black ${step.color} leading-none tracking-tighter`}>{step.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${step.bar} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                      style={{ width: `${(step.count / (stats.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Revenue Performance */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-8 shadow-2xl overflow-hidden relative group">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
             
             <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">Monthly Business</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Comparison</p>
              </div>
            </div>

            <div className="flex flex-col justify-center h-[calc(100%-80px)]">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Bulan Ini</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black text-emerald-500/50 italic">Rp</span>
                  <span className="text-5xl font-black text-white tracking-tighter">
                    {stats?.revenueComparison?.thisMonth?.toLocaleString('id-ID') || '0'}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bulan Lalu</p>
                  <p className="text-sm font-black text-slate-300 tracking-tight">
                    Rp {stats?.revenueComparison?.lastMonth?.toLocaleString('id-ID') || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pertumbuhan</p>
                  <div className={`flex items-center gap-1 text-sm font-black ${(stats?.revenueComparison?.growth || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(stats?.revenueComparison?.growth || 0) >= 0 ? '+' : ''}{(stats?.revenueComparison?.growth || 0).toFixed(1)}%
                    <TrendingUp className={`w-3 h-3 ${(stats?.revenueComparison?.growth || 0) < 0 ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Top Customers */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <Hourglass className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">Top Customers</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contribution (This Month)</p>
              </div>
            </div>

            <div className="space-y-4">
              {stats.topCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <Package className="w-10 h-10 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data</p>
                </div>
              ) : (
                (() => {
                  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const formatCompact = (val: number) => {
                    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'M';
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'jt';
                    if (val >= 1000) return (val / 1000).toFixed(1) + 'rb';
                    return val.toString();
                  };

                  return stats.topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all cursor-default relative overflow-hidden">
                      {i === 0 && <div className="absolute inset-y-0 left-0 w-1 bg-purple-500" />}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[10px] font-black text-purple-400 border border-purple-500/20">
                          {getInitials(c.name)}
                        </div>
                        <span className="text-xs font-black text-slate-200 uppercase tracking-tight line-clamp-1 max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-white italic bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                         {formatCompact(c.totalRevenue)}
                      </span>
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <button 
            onClick={() => setStatusFilter("all")}
            className={`text-left bg-[#151f32]/80 backdrop-blur-xl border rounded-[2.5rem] p-6 shadow-[0_0_20px_rgba(59,130,246,0.05)] transition-all ${statusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                 <Package className="w-6 h-6 text-blue-500" />
               </div>
               <TrendingUp className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Semua WO</p>
            <p className="text-3xl font-black text-white">{stats.total}</p>
          </button>

          <button 
            onClick={() => setStatusFilter("awaiting_sbu")}
            className={`text-left bg-[#151f32]/80 backdrop-blur-xl border rounded-[2.5rem] p-6 shadow-[0_0_20px_rgba(59,130,246,0.05)] transition-all ${statusFilter === 'awaiting_sbu' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-blue-400/10 rounded-2xl flex items-center justify-center">
                 <Hourglass className="w-6 h-6 text-blue-400" />
               </div>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Menunggu SBU</p>
            <p className="text-3xl font-black text-white">{stats.pending_sbu}</p>
          </button>

          <button 
            onClick={() => setStatusFilter("need_approval")}
            className={`text-left bg-[#151f32]/80 backdrop-blur-xl border rounded-[2.5rem] p-6 shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all ${statusFilter === 'need_approval' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                 <AlertCircle className="w-6 h-6 text-amber-500" />
               </div>
               <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Butuh Persetujuan</p>
            <p className="text-3xl font-black text-amber-500">{stats.need_approval}</p>
          </button>

          <button 
            onClick={() => setStatusFilter("on_journey")}
            className={`text-left bg-[#151f32]/80 backdrop-blur-xl border rounded-[2.5rem] p-6 shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all ${statusFilter === 'on_journey' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                 <Navigation className="w-6 h-6 text-emerald-500" />
               </div>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Dalam Perjalanan</p>
            <p className="text-3xl font-black text-emerald-500">{stats.on_journey}</p>
          </button>
        </div>

        {/* Work Orders List Container */}
        <div className="bg-[#151f32]/80 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl mb-20">
          <div className="p-10 border-b border-white/5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white/5">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white flex items-center gap-5 italic uppercase tracking-tighter">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-emerald-500" />
                  </div>
                  Manajemen Work Order
              </h2>
              <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] mt-2 ml-1">Operational Cockpit • Sentra Logistik</p>
            </div>
            
            <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="relative flex-1 xl:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Cari No. WO atau Pelanggan..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#0a0f1e] border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full font-bold text-white transition-all"
                    />
                </div>
                <button 
                  onClick={() => { resetWOForm(); setShowCreateModal(true); }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 whitespace-nowrap"
                >
                  <Plus className="w-6 h-6" />
                  Buat WO Baru
                </button>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {workOrders
              .filter(wo => {
                const displayStatus = getWODisplayStatus(wo);
                if (statusFilter !== 'all' && displayStatus.key !== statusFilter) return false;
                const searchStr = `${wo.wo_number} ${wo.customers?.name} ${wo.customers?.company_name}`.toLowerCase();
                return searchStr.includes(searchTerm.toLowerCase());
              })
              .length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-10 h-10 text-slate-800" />
                    </div>
                    <p className="text-slate-600 font-black uppercase text-xs tracking-widest leading-loose">
                        {searchTerm ? "Tidak ada hasil pencarian" : "Belum ada data Work Order tersedia"}
                    </p>
                    {statusFilter !== 'all' && (
                        <button onClick={() => setStatusFilter('all')} className="mt-4 text-emerald-500 font-black uppercase text-[10px] tracking-widest hover:text-emerald-400">Lihat Semua</button>
                    )}
                </div>
              ) : (
                workOrders
                  .filter(wo => {
                    const displayStatus = getWODisplayStatus(wo);
                    if (statusFilter !== 'all' && displayStatus.key !== statusFilter) return false;
                    const searchStr = `${wo.wo_number} ${wo.customers?.name} ${wo.customers?.company_name}`.toLowerCase();
                    return searchStr.includes(searchTerm.toLowerCase());
                  })
                  .map((wo) => {
                    const isExpanded = expandedWOId === wo.id;
                    const items = wo.work_order_items || [];
                    const sbus = Array.from(new Set(items.map((i: any) => i.sbu_type)));
                    const displayStatus = getWODisplayStatus(wo);

                    return (
                      <div key={wo.id} className="group mb-3">
                         <div 
                           onClick={() => setExpandedWOId(isExpanded ? null : wo.id)}
                           className={`bg-[#151f32]/60 border border-white/5 hover:border-blue-500/40 rounded-[2.5rem] p-8 transition-all cursor-pointer flex items-center gap-10 ${isExpanded ? 'border-blue-500/50 bg-[#0d1628] shadow-2xl' : ''}`}
                         >
                            {/* WO # & DATE */}
                            <div className="w-56 flex-shrink-0">
                               <div className="flex items-center gap-3 mb-2">
                                  <div className={`w-3 h-3 rounded-full ${displayStatus.color.replace('text-', 'bg-')} animate-pulse`} />
                                  <span className="text-[16px] font-bold text-white italic tracking-tighter uppercase">{wo.wo_number}</span>
                                </div>
                                <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">
                                   {new Date(wo.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                               <p className="text-[15px] font-black text-white uppercase truncate mb-1">
                                  {wo.customers?.company_name || wo.customers?.name || "No Customer Name"}
                               </p>
                               <p className="text-[12px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-md">
                                  {wo.notes || "No Operational Notes"}
                               </p>
                            </div>

                            <div className="flex gap-3 items-center flex-shrink-0 bg-white/5 px-5 py-3 rounded-2xl border border-white/5">
                               {['trucking', 'clearances', 'forwarding', 'warehouse', 'project'].map(sId => {
                                  const isActive = sbus.includes(sId);
                                  const IconComp = sId === 'trucking' ? Truck : sId === 'clearances' ? FileText : sId === 'forwarding' ? Ship : sId === 'warehouse' ? Warehouse : HardHat;
                                  if (!isActive) return null;
                                  return (
                                     <button 
                                         key={sId}
                                         onClick={(e) => { 
                                            e.stopPropagation(); 
                                            openEditModal(wo);
                                            setTimeout(() => {
                                               setWizardStep(2);
                                               setActiveWizardTab(sId);
                                            }, 100);
                                         }}
                                         className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-lg focus:outline-none" 
                                         title={`Edit ${sId}`}
                                      >
                                        <IconComp className="w-5 h-5" />
                                     </button>
                                  );
                               })}
                            </div>

                            <div className="w-44 flex-shrink-0 text-right">
                               <span className={`px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest border ${displayStatus.color} bg-white/5 border-white/10 shadow-lg`}>
                                  {displayStatus.label}
                               </span>
                            </div>

                             <div className="flex items-center gap-3 flex-shrink-0">
                                <button 
                                   onClick={(e) => { e.stopPropagation(); openEditModal(wo); }} 
                                   className="p-4 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-2xl transition-all border border-white/5 active:scale-95 shadow-lg"
                                >
                                   <Edit2 className="w-6 h-6" />
                                </button>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); if(confirm('Hapus Work Order?')) deleteWorkOrder(wo.id); }} 
                                   className="p-4 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-white/5 active:scale-95 shadow-lg"
                                >
                                   <Trash2 className="w-6 h-6" />
                                </button>
                                <div className={`p-4 rounded-2xl border transition-all shadow-lg ${isExpanded ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                                   <ChevronDown className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                             </div>
                         </div>

                         {isExpanded && (
                             <div className="mt-4 bg-[#0d1628]/60 border border-white/5 rounded-[2.5rem] p-10 animate-in fade-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                   {items.map((item: any) => {
                                       const isClearance = item.sbu_type === 'clearances';
                                       return (
                                         <div key={item.id} className="bg-slate-950/40 border border-white/5 p-6 rounded-3xl group/item hover:border-blue-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-5">
                                               <div className="flex items-center gap-4">
                                                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                                     {item.sbu_type === 'trucking' ? <Truck className="w-6 h-6 text-blue-500" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
                                                  </div>
                                                  <div>
                                                     <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.sbu_type}</p>
                                                     <p className="text-[15px] font-black text-white uppercase tracking-tight">
                                                        {isClearance ? (item.sbu_metadata?.doc_code || "Clearance Task") : (item.truck_type || "N/A")}
                                                     </p>
                                                  </div>
                                               </div>
                                               <span className="text-[14px] font-black text-emerald-500 italic">Rp {item.deal_price?.toLocaleString('id-ID')}</span>
                                            </div>
                                            
                                            {item.sbu_type === 'clearances' ? (
                                               <div className="space-y-4 px-1">
                                                  <div className="flex items-center gap-3 text-[12px] font-bold text-slate-400">
                                                     <Target className="w-4 h-4 text-emerald-500/50" /> 
                                                     Jalur: <span className={'px-2 py-0.5 rounded text-[10px] uppercase font-black ' + (item.sbu_metadata?.lane === 'Merah' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500')}>{item.sbu_metadata?.lane || 'Hijau'}</span>
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 tracking-wider">
                                                     <FileText className="w-4 h-4 text-slate-600" /> No. Aju: {item.sbu_metadata?.aju_number || "-"}
                                                  </div>
                                               </div>
                                            ) : (
                                               <div className="space-y-3 px-1">
                                                  <div className="flex items-center gap-3 text-[13px] font-bold text-slate-400">
                                                     <MapPin className="w-4 h-4 text-slate-600" /> {item.origin_location?.name || 'TBA'}
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[13px] font-bold text-slate-400">
                                                     <Navigation className="w-4 h-4 text-slate-600" /> {item.destination_location?.name || 'TBA'}
                                                  </div>
                                               </div>
                                            )}
                                         </div>
                                       );
                                   })}
                                </div>
                             </div>
                         )}
                      </div>
                    );
                  })
              )}
          </div>
        </div>
        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50 md:hidden">
            <button onClick={() => { setStatusFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-1.5 ${statusFilter === 'all' ? 'text-emerald-500' : 'text-slate-600'}`}>
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-widest">Cockpit</span>
            </button>
            <button onClick={() => { resetCustomerForm(); setCustomerView('list'); setShowCustomerModal(true); }} className="flex flex-col items-center gap-1.5 text-slate-600">
                <UserPlus className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-widest">Customer</span>
            </button>
            <div className="-mt-14 relative">
                <button onClick={() => { resetWOForm(); setShowCreateModal(true); }} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl text-white border-4 border-[#0a0f1e] active:scale-90 transition-all">
                    <Plus className="w-8 h-8 font-black" />
                </button>
            </div>
            <a href="/finance" className="flex flex-col items-center gap-1.5 text-slate-600">
                <Banknote className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-widest">Finance</span>
            </a>
            <button onClick={() => fetchDashboardData()} className="flex flex-col items-center gap-1.5 text-slate-600 active:scale-95 transition-all">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">Refresh</span>
            </button>
        </nav>

      {/* ===================================================== */}
      {/* MODAL CREATE WORK ORDER */}
      {/* ===================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowCreateModal(false);
        }}>
          <div key={editingWOId || 'new'} className="bg-slate-900 border border-white/10 p-6 md:p-10 rounded-3xl md:rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
                    <FileText className="w-8 h-8 text-emerald-500" />
                    {editingWOId ? `Edit Work Order #${editingWOId.substring(0,6)}` : "Buat Work Order Baru"}
                </h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Lengkapi detail pengiriman barang</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="text-slate-600 hover:text-white transition-colors p-2"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* CLOSED SBU SELECTION - NOW MOVED TO STEP 1 */}

            {wizardStep === 1 ? (
              /* ===================================================== */
              /* STEP 1: GENERAL INFO & SBU SELECTION */
              /* ===================================================== */
              <div className="space-y-8">
                {/* 1. Pilih Pelanggan */}
                <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">1. Pilih Pelanggan Pengirim *</label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative group">
                      <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                      <select
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer"
                        value={newWO.customer_id}
                        onChange={(e) => setNewWO({ ...newWO, customer_id: e.target.value })}
                      >
                        <option value="">-- Pilih Pelanggan Master --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.name || c.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => { resetCustomerForm(); setShowCustomerModal(true); }}
                      className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-8 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Tambah
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">2. Tanggal Order</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="date"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all"
                        value={newWO.order_date}
                        onChange={(e) => setNewWO({ ...newWO, order_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">3. Tanggal & Jam Eksekusi</label>
                    <div className="relative group">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
                      <input
                        type="datetime-local"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-amber-500/30 transition-all font-sans"
                        value={newWO.execution_date}
                        onChange={(e) => setNewWO({ ...newWO, execution_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">4. Catatan Internal / Instruksi</label>
                  <textarea
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-sm font-bold text-white focus:ring-2 focus:ring-purple-500/30 transition-all min-h-[100px]"
                    placeholder="Masukkan instruksi operasional..."
                    value={newWO.notes || ""}
                    onChange={(e) => setNewWO({ ...newWO, notes: e.target.value })}
                  />
                </div>

                {/* SBU SELECTION (MULTI) */}
                <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 ml-1">5. Pilih SBU / Layanan yang Diperlukan</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'trucking', label: 'Trucking', icon: Truck },
                      { id: 'clearances', label: 'Clearances', icon: FileText },
                      { id: 'forwarding', label: 'Forwarding', icon: Ship },
                      { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
                      { id: 'project', label: 'Project Log', icon: HardHat }
                    ].map(sbu => (
                      <label 
                        key={sbu.id}
                        className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${selectedSbus.includes(sbu.id) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-950 border-white/5 text-slate-500'}`}
                      >
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={selectedSbus.includes(sbu.id)}
                          onChange={() => {
                            if (selectedSbus.includes(sbu.id)) {
                              setSelectedSbus(prev => prev.filter(x => x !== sbu.id));
                              if (activeWizardTab === sbu.id) setActiveWizardTab("trucking");
                            } else {
                              setSelectedSbus(prev => Array.from(new Set([...prev, sbu.id])));
                            }
                          }}
                        />
                        <sbu.icon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{sbu.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-12">
                   <button 
                     onClick={() => setShowCreateModal(false)}
                     className="px-10 py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                   >
                     Batal
                   </button>
                   <button 
                     onClick={() => {
                       if (!newWO.customer_id) return toast.error("Pilih pelanggan dahulu");
                       if (selectedSbus.length === 0) return toast.error("Pilih minimal 1 SBU");
                       setWizardStep(2);
                       setActiveWizardTab(selectedSbus[0]);
                       // Reset items ONLY IF creating NEW (not editing) and current items are empty placeholders
                       if (!editingWOId && woItems.length === 1 && !woItems[0].origin_location_id && !woItems[0].sbu_metadata?.doc_code) {
                          setWoItems(selectedSbus.map(sId => ({
                             truck_type: sId === 'trucking' ? "CDE" : "N/A",
                             origin_location_id: "",
                             destination_location_id: "",
                             quantity: 1,
                             deal_price: 0,
                             sbu_type: sId,
                             sbu_metadata: {}
                          })));
                       }
                     }}
                     className="bg-blue-600 text-white px-16 py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
                   >
                     Konfigurasi Layanan <ChevronRight className="w-4 h-4 inline-block ml-2" />
                   </button>
                </div>
              </div>
            ) : (
              /* ===================================================== */
              /* STEP 2: TACTICAL TAB CONFIGURATION */
              /* ===================================================== */
              <div className="space-y-8">
                {/* TAB NAVIGATION */}
                <div className="flex gap-2 p-1 bg-slate-950 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
                  {selectedSbus.map((sId, sIdx) => (
                    <button
                      key={`${sId}-${sIdx}`}
                      onClick={() => setActiveWizardTab(sId)}
                      className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeWizardTab === sId ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {sId} Details
                    </button>
                  ))}
                </div>

                <div className="min-h-[400px]">
                   {activeWizardTab === 'trucking' && (
                     <div className="space-y-8">
                        <div className="flex justify-between items-center mb-6 px-2">
                           <div>
                              <h4 className="text-xl font-bold text-white tracking-tight">Detail Armada Trucking</h4>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Definisikan rute dan jenis unit</p>
                           </div>
                           <button 
                              onClick={() => setWoItems([...woItems, {
                                 truck_type: "CDE",
                                 origin_location_id: "",
                                 destination_location_id: "",
                                 quantity: 1,
                                 deal_price: 0,
                                 sbu_type: "trucking",
                                 sbu_metadata: {}
                              }])}
                              className="bg-white text-slate-950 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-white/5"
                           >
                              <Plus className="w-4 h-4" /> Tambah Armada
                           </button>
                        </div>

                        {woItems.map((item, index) => {
                           if (item.sbu_type !== 'trucking') return null;
                           const itemTotal = (item.quantity || 0) * (item.deal_price || 0);
                           return (
                              <div key={index} className="bg-white/5 border border-white/5 rounded-[3rem] p-10 mb-8 relative group hover:border-blue-500/20 transition-all">
                                 <button 
                                    onClick={() => setWoItems(woItems.filter((_, i) => i !== index))} 
                                    className="absolute top-10 right-10 text-slate-600 hover:text-red-500 transition-colors"
                                 >
                                    <Trash2 className="w-8 h-8" />
                                 </button>
                                 
                                 <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center font-black text-blue-500 text-sm italic">
                                          #{index + 1}
                                    </div>
                                    <div>
                                          <p className="text-xs font-black text-white uppercase tracking-[0.2em]">Item Pengiriman Trucking</p>
                                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Konfigurasi Unit & Rute</p>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                    <div>
                                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Type Unit Truck *</label>
                                       <select
                                          className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                                          value={item.truck_type}
                                          onChange={(e) => updateWoItem(index, "truck_type", e.target.value)}
                                       >
                                          {truckTypes.map(tt => <option key={tt.id} value={tt.name}>{tt.name}</option>)}
                                       </select>
                                    </div>
                                    <div>
                                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Kuantiti (Unit) *</label>
                                       <input
                                          type="number"
                                          min="1"
                                          className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all"
                                          value={item.quantity}
                                          onChange={(e) => updateWoItem(index, "quantity", parseInt(e.target.value) || 1)}
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Lokasi Pickup (Origin) *</label>
                                       <div className="flex gap-4">
                                          <div className="flex-1 relative">
                                             <select
                                                className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-6 pr-12 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                                                value={item.origin_location_id}
                                                onChange={(e) => updateWoItem(index, "origin_location_id", e.target.value)}
                                             >
                                                <option value="">-- Pilih Lokasi Pickup --</option>
                                                {locations.map((loc) => (
                                                   <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                                                ))}
                                             </select>
                                             <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
                                          </div>
                                          <button onClick={() => setShowLocationModal(true)} className="bg-blue-600/10 text-blue-500 border border-blue-500/20 w-[60px] rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                                             <Plus className="w-6 h-6" />
                                          </button>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Lokasi Dropoff (Destination) *</label>
                                       <div className="flex gap-4">
                                          <div className="flex-1 relative">
                                             <select
                                                className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-6 pr-12 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                                                value={item.destination_location_id}
                                                onChange={(e) => updateWoItem(index, "destination_location_id", e.target.value)}
                                             >
                                                <option value="">-- Pilih Lokasi Dropoff --</option>
                                                {locations.map((loc) => (
                                                   <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                                                ))}
                                             </select>
                                             <Navigation className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
                                          </div>
                                          <button onClick={() => setShowLocationModal(true)} className="bg-blue-600/10 text-blue-500 border border-blue-500/20 w-[60px] rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                                             <Plus className="w-6 h-6" />
                                          </button>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                                    <div className="flex flex-col justify-center">
                                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Harga Deal per Unit (Rp)</label>
                                       <div className="relative group">
                                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs uppercase">Rp</span>
                                          <input
                                             type="text"
                                             className="w-full bg-slate-950 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-xl font-black text-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-xl shadow-emerald-500/5 placeholder:text-slate-800"
                                             placeholder="0"
                                             value={item.deal_price === 0 ? "" : item.deal_price.toLocaleString('id-ID')}
                                             onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                const numValue = parseInt(rawValue) || 0;
                                                updateWoItem(index, "deal_price", numValue);
                                             }}
                                          />
                                       </div>
                                       <p className="text-[8px] text-slate-600 font-bold uppercase mt-3 italic ml-1 flex items-center gap-1.5">
                                          <TrendingUp className="w-3 h-3" /> Auto-fill Master Tarif Aktif
                                       </p>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center items-end">
                                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Sub Total Item ini</span>
                                       <span className="text-3xl font-black text-white italic tracking-tighter">
                                          Rp {itemTotal.toLocaleString('id-ID')}
                                       </span>
                                    </div>
                                 </div>
                              </div>
                           );
                        })}

                        <div className="bg-white/5 p-8 rounded-[2.5rem] mt-10 border border-white/5">
                           <div className="flex justify-between items-center">
                              <div>
                                 <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Total Keseluruhan Trucking</span>
                                 <p className="text-slate-600 text-[10px] mt-1 italic font-bold">Terhitung dari akumulasi harga item di atas</p>
                              </div>
                              <span className="text-4xl font-black text-white italic tracking-tighter">
                                 Rp {woItems.reduce((acc, i) => acc + (i.sbu_type === 'trucking' ? (i.quantity * i.deal_price) : 0), 0).toLocaleString('id-ID')}
                              </span>
                           </div>
                        </div>
                     </div>
                   )}
                   {activeWizardTab === 'clearances' && (() => {
                      const idx = woItems.findIndex(i => i.sbu_type === 'clearances');
                      if (idx === -1) return null;
                      const item = woItems[idx];
                      const meta = item.sbu_metadata || {};
                      const items = meta.items || [{ brand: "", type: "", hs_code: "" }];
                      const checklist = meta.checklist || [
                         { name: "Invoice", received: false, ref_no: "", ref_date: "", file_url: "" },
                         { name: "Packing List", received: false, ref_no: "", ref_date: "", file_url: "" },
                         { name: "B/L atau AWB", received: false, ref_no: "", ref_date: "", file_url: "" },
                         { name: "NIB / NPWP", received: false, ref_no: "", ref_date: "", file_url: "" },
                         { name: "Certificate of Origin", received: false, ref_no: "", ref_date: "", file_url: "" },
                         { name: "Izin Lartas / SNI", received: false, ref_no: "", ref_date: "", file_url: "" },
                      ];

                      const updateMeta = (key: string, val: any) => {
                         updateWoItem(idx, "sbu_metadata", { ...meta, [key]: val });
                      };

                      return (
                       <div className="space-y-10 pb-20">
                          {/* 1. REGIME & SCHEME (COMPACT BANNER) */}
                          <div className="bg-slate-950/40 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
                             <div className="flex flex-col xl:flex-row gap-8 items-center">
                                <div className="flex-1 w-full">
                                   <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 ml-1">Customs Regime</label>
                                   <div className="relative group">
                                      <select 
                                         className="w-full bg-slate-900 border border-white/10 rounded-xl px-6 py-4 text-base font-black text-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all italic hover:border-emerald-500/30"
                                         value={meta.doc_code || "BC20"}
                                         onChange={(e) => updateMeta("doc_code", e.target.value)}
                                      >
                                         <option value="BC20">PIB - Impor Untuk Dipakai (BC 2.0)</option>
                                         <option value="BC30">PEB - Ekspor (BC 3.0)</option>
                                         <option value="BC23">BC 2.3 - Gudang Berikat / PLB</option>
                                         <option value="BC27">BC 2.7 - Antar Kawasan Berikat</option>
                                         <option value="BC40">BC 4.0 - TLDDP ke KB</option>
                                         <option value="BC41">BC 4.1 - KB ke TLDDP</option>
                                      </select>
                                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                         <ChevronRight className="w-5 h-5 rotate-90" />
                                      </div>
                                   </div>
                                </div>
                                <div className="w-full xl:w-auto min-w-[360px]">
                                   <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 ml-1 text-center xl:text-left">Lane</label>
                                   <div className="flex gap-2">
                                      {['Merah', 'Kuning', 'Hijau', 'MITA', 'AEO'].map(lane => (
                                         <button 
                                            key={lane}
                                            onClick={() => updateMeta("lane", lane)}
                                            className={`flex-1 py-4 px-4 rounded-xl text-[9px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${
                                               meta.lane === lane
                                                  ? lane === 'Merah' ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20' : lane === 'Kuning' ? 'bg-yellow-500 border-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20' : 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                                                  : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                                            }`}
                                         >
                                            {lane}
                                         </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* 2. LOGISTICS & VOYAGE */}
                          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-8">
                             <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                   <Ship className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Logistics & Voyage</h4>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Shipping Line / Carrier</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="MSK / NYK / GA" value={meta.carrier || ""} onChange={(e) => updateMeta("carrier", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Vessel / Voyage / Flight</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="MV. SENTOSA V.01" value={meta.vessel || ""} onChange={(e) => updateMeta("vessel", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Port of Loading (POL)</label>
                                   <input type="text" list="global-ports" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="Search POL..." value={meta.pol || ""} onChange={(e) => updateMeta("pol", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Port of Discharge (POD)</label>
                                   <input type="text" list="global-ports" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="Search POD..." value={meta.port || ""} onChange={(e) => updateMeta("port", e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-3">
                                      <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">ETD</label>
                                      <input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all font-mono" value={meta.etd || ""} onChange={(e) => updateMeta("etd", e.target.value)} />
                                   </div>
                                   <div className="space-y-3">
                                      <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">ETA</label>
                                      <input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all font-mono" value={meta.eta || ""} onChange={(e) => updateMeta("eta", e.target.value)} />
                                   </div>
                                </div>

                                {/* Port Datalist Engine */}
                                <datalist id="global-ports">
                                   <optgroup label="Indonesia Main Ports">
                                      <option value="IDTPP - Tanjung Priok, Jakarta" />
                                      <option value="IDTPE - Tanjung Perak, Surabaya" />
                                      <option value="IDBLW - Belawan, Medan" />
                                      <option value="IDSRG - Tanjung Emas, Semarang" />
                                      <option value="IDUPG - Soekarno-Hatta, Makassar" />
                                      <option value="IDPLM - Boom Baru, Palembang" />
                                      <option value="IDBPN - Kariangau, Balikpapan" />
                                      <option value="IDJKT - Soekarno-Hatta Intl Airport (CGK)" />
                                   </optgroup>
                                   <optgroup label="International Hubs">
                                      <option value="SGSIN - Singapore, Singapore" />
                                      <option value="CNSHA - Shanghai, China" />
                                      <option value="CNNGB - Ningbo-Zhoushan, China" />
                                      <option value="CNSZN - Shenzhen, China" />
                                      <option value="KRPUS - Busan, South Korea" />
                                      <option value="HKHKG - Hong Kong, China" />
                                      <option value="MYPKG - Port Klang, Malaysia" />
                                      <option value="AEDXB - Dubai, UAE (Jebel Ali)" />
                                      <option value="NLRTM - Rotterdam, Netherlands" />
                                      <option value="USLAX - Los Angeles, USA" />
                                      <option value="DEHAM - Hamburg, Germany" />
                                      <option value="JPTOK - Tokyo, Japan" />
                                   </optgroup>
                                </datalist>
                             </div>
                          </div>

                          {/* 3. CONTAINERS & EQUIPMENT (NEW: MULTI-CONTAINER SUPPORT) */}
                          <div className="bg-slate-950/40 p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-inner">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                      <Package className="w-5 h-5" />
                                   </div>
                                   <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Containers & Equipment</h4>
                                </div>
                                <button 
                                   onClick={() => {
                                      const containers = meta.containers || [];
                                      updateMeta("containers", [...containers, { container_no: "", seal_no: "", size_type: "40HC", eir_url: "" }]);
                                   }}
                                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                                >
                                   <Plus className="w-4 h-4" /> Add Container
                                </button>
                             </div>

                             <div className="space-y-4">
                                {(meta.containers || []).map((cont: any, cIdx: number) => (
                                   <div key={cIdx} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-950 border border-white/5 p-6 rounded-[2rem] group relative">
                                      <button 
                                         onClick={() => {
                                            const containers = meta.containers.filter((_: any, i: number) => i !== cIdx);
                                            updateMeta("containers", containers);
                                         }}
                                         className="absolute -right-2 -top-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                                      >
                                         <X className="w-4 h-4" />
                                      </button>
                                      
                                      <div className="md:col-span-3 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Container No.</label>
                                         <input type="text" placeholder="MSKU..." className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-indigo-500/50 outline-none font-mono" value={cont.container_no} onChange={(e) => {
                                            const newCont = [...meta.containers]; newCont[cIdx].container_no = e.target.value.toUpperCase(); updateMeta("containers", newCont);
                                         }} />
                                      </div>
                                      <div className="md:col-span-3 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Seal No.</label>
                                         <input type="text" placeholder="098..." className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-indigo-500/50 outline-none font-mono" value={cont.seal_no} onChange={(e) => {
                                            const newCont = [...meta.containers]; newCont[cIdx].seal_no = e.target.value.toUpperCase(); updateMeta("containers", newCont);
                                         }} />
                                      </div>
                                      <div className="md:col-span-3 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Size & Type</label>
                                         <select className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-indigo-500/50 outline-none appearance-none cursor-pointer" value={cont.size_type} onChange={(e) => {
                                            const newCont = [...meta.containers]; newCont[cIdx].size_type = e.target.value; updateMeta("containers", newCont);
                                         }}>
                                            <option value="20GP">20' General Purpose</option>
                                            <option value="40GP">40' General Purpose</option>
                                            <option value="40HC">40' High Cube</option>
                                            <option value="20RF">20' Reefer</option>
                                            <option value="40RF">40' Reefer</option>
                                            <option value="20OT">20' Open Top</option>
                                            <option value="40OT">40' Open Top</option>
                                            <option value="20FR">20' Flat Rack</option>
                                            <option value="40FR">40' Flat Rack</option>
                                         </select>
                                      </div>
                                      <div className="md:col-span-3 flex justify-end pt-4">
                                         {cont.eir_url ? (
                                            <div className="flex items-center gap-2 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                                               <a href={cont.eir_url} target="_blank" className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300">View Document</a>
                                               <button onClick={() => {
                                                  const newCont = [...meta.containers]; newCont[cIdx].eir_url = ""; updateMeta("containers", newCont);
                                               }} className="text-red-500 p-1 hover:bg-red-500/10 rounded-lg"><X className="w-3 h-3" /></button>
                                            </div>
                                         ) : (
                                            <label className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase text-indigo-400/60 cursor-pointer hover:bg-indigo-600 hover:text-white transition-all">
                                               <Upload className="w-3 h-3" /> Upload EIR/Photo
                                               <input type="file" className="hidden" onChange={async (e) => {
                                                  const file = e.target.files?.[0]; if (!file) return;
                                                  toast.loading(`Uploading EIR...`, { id: 'cont-upload' });
                                                  try {
                                                     const { data, error } = await supabase.storage.from('pod_documents').upload(`cont_${Date.now()}_${cIdx}`, file);
                                                     if (error) throw error;
                                                     const { data: { publicUrl } } = supabase.storage.from('pod_documents').getPublicUrl(data.path);
                                                     const newCont = [...meta.containers]; newCont[cIdx].eir_url = publicUrl; updateMeta("containers", newCont);
                                                     toast.success(`Doc Linked to ${cont.container_no || 'Container'}`, { id: 'cont-upload' });
                                                  } catch (err: any) { toast.error("Upload failed", { id: 'cont-upload' }); }
                                               }} />
                                            </label>
                                         )}
                                      </div>
                                   </div>
                                ))}
                                {(!meta.containers || meta.containers.length === 0) && (
                                   <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-[2rem]">
                                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No containers assigned yet</p>
                                   </div>
                                )}
                             </div>
                          </div>

                          {/* 3. PARTIES & ENTITIES (NEW) */}
                          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-10">
                             <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                                   <UserPlus className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Parties & Entities</h4>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Shipper */}
                                <div className="space-y-6">
                                   <label className="block text-[11px] font-black text-orange-500 uppercase tracking-widest ml-1">Shipper / Exporter</label>
                                   <div className="space-y-4">
                                      <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-orange-500/50 outline-none" placeholder="Company Name" value={meta.shipper_name || ""} onChange={(e) => updateMeta("shipper_name", e.target.value)} />
                                      <textarea className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-medium text-slate-400 h-24 focus:border-orange-500/50 outline-none" placeholder="Complete Address & Country" value={meta.shipper_address || ""} onChange={(e) => updateMeta("shipper_address", e.target.value)} />
                                   </div>
                                </div>
                                {/* Consignee */}
                                <div className="space-y-6">
                                   <label className="block text-[11px] font-black text-emerald-500 uppercase tracking-widest ml-1">Consignee / Importer</label>
                                   <div className="space-y-4">
                                      <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-emerald-500/50 outline-none" placeholder="Company Name / NPWP" value={meta.consignee_name || ""} onChange={(e) => updateMeta("consignee_name", e.target.value)} />
                                      <textarea className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-medium text-slate-400 h-24 focus:border-emerald-500/50 outline-none" placeholder="Complete Address & NPWP" value={meta.consignee_address || ""} onChange={(e) => updateMeta("consignee_address", e.target.value)} />
                                   </div>
                                </div>
                             </div>
                             <div className="pt-6 border-t border-white/5">
                                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4 ml-1">Notify Party (If different from consignee)</label>
                                <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none" placeholder="Notify Party Name & Contact" value={meta.notify_party || ""} onChange={(e) => updateMeta("notify_party", e.target.value)} />
                             </div>
                          </div>

                          {/* 4. MANIFEST & CUSTOMS */}
                          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-8">
                             <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                   <Target className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Manifest & References</h4>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Master BL / AWB</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none transition-all font-mono" placeholder="MAEU..." value={meta.bl_awb || ""} onChange={(e) => updateMeta("bl_awb", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">House BL / AWB</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none transition-all font-mono" placeholder="Optional" value={meta.hbl_awb || ""} onChange={(e) => updateMeta("hbl_awb", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">No. BC 1.1 & Pos</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none transition-all font-mono" placeholder="000XXX Pos: 00XX" value={meta.bc11_number || ""} onChange={(e) => updateMeta("bc11_number", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">TPS / Gudang</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none transition-all font-mono" placeholder="JICT / KOJA" value={meta.tps || ""} onChange={(e) => updateMeta("tps", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Gross Weight (Kgs)</label>
                                   <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none font-mono" placeholder="0" value={meta.gross_weight || ""} onChange={(e) => updateMeta("gross_weight", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Incoterms</label>
                                   <select className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500/50 appearance-none cursor-pointer" value={meta.incoterms || "CIF"} onChange={(e) => updateMeta("incoterms", e.target.value)}>
                                      <option value="CIF">CIF (Cost Insurance Freight)</option>
                                      <option value="FOB">FOB (Free on Board)</option>
                                      <option value="CFR">CFR (Cost and Freight)</option>
                                      <option value="EXW">EXW (Ex Works)</option>
                                      <option value="DDP">DDP (Delivered Duty Paid)</option>
                                   </select>
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Insurance / Additional Reference</label>
                                   <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-emerald-500/50 outline-none font-mono" placeholder="Policy number or special notes" value={meta.insurance_ref || ""} onChange={(e) => updateMeta("insurance_ref", e.target.value)} />
                                </div>
                             </div>
                          </div>

                          {/* 5. FINANCIAL & VALUATION */}
                          <div className="bg-slate-950/40 p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-inner">
                             <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                                   <CircleDollarSign className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Financial & Valuation</h4>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Currency Code</label>
                                   <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-xs font-black text-amber-500 outline-none focus:border-amber-500/50 text-center font-mono" placeholder="USD / EUR" value={meta.currency || "USD"} onChange={(e) => updateMeta("currency", e.target.value.toUpperCase())} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Invoice Value (FOB)</label>
                                   <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white outline-none focus:border-amber-500/50 font-mono" placeholder="0.00" value={meta.invoice_value || ""} onChange={(e) => updateMeta("invoice_value", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Freight Amount</label>
                                   <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white outline-none focus:border-amber-500/50 font-mono" placeholder="0.00" value={meta.freight_value || ""} onChange={(e) => updateMeta("freight_value", e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Insurance Amount</label>
                                   <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white outline-none focus:border-amber-500/50 font-mono" placeholder="0.00" value={meta.insurance_value || ""} onChange={(e) => updateMeta("insurance_value", e.target.value)} />
                                </div>
                             </div>
                             <div className="mt-4 p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex justify-between items-center">
                                <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Calculated Customs Value (CIF Estimate)</span>
                                <span className="text-xl font-black text-amber-500 italic tracking-tighter font-mono">
                                   {meta.currency || 'USD'} {((Number(meta.invoice_value) || 0) + (Number(meta.freight_value) || 0) + (Number(meta.insurance_value) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                             </div>
                          </div>

                          {/* 6. ITEM ANALYSIS */}
                          <div className="bg-slate-950/40 p-12 rounded-[3.5rem] border border-white/5 space-y-10 shadow-inner">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                   <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase">Item Analysis & HS Classification</h4>
                                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                      <AlertTriangle className="w-3 h-3 text-amber-500" /> Mandatory for CEISA 4.0 / INSW 2026
                                   </p>
                                </div>
                                <button 
                                   onClick={() => updateMeta("items", [...items, { brand: "", type: "", hs_code: "" }])}
                                   className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                                >
                                   <Plus className="w-5 h-5" /> Tambah Pos Barang
                                </button>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-6">
                                {items.map((it: any, itIdx: number) => (
                                   <div key={itIdx} className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-emerald-500/30 transition-all">
                                      <button 
                                         onClick={() => updateMeta("items", items.filter((_: any, i: number) => i !== itIdx))}
                                         className="absolute right-6 top-6 w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                      >
                                         <X className="w-5 h-5" />
                                      </button>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                         <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Merek (Min. 3 Karakter) *</label>
                                            <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="Samsung" value={it.brand} onChange={(e) => { const newItems = [...items]; newItems[itIdx].brand = e.target.value; updateMeta("items", newItems); }} />
                                         </div>
                                         <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Tipe / Model *</label>
                                            <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all font-mono" placeholder="SM-G998B" value={it.type} onChange={(e) => { const newItems = [...items]; newItems[itIdx].type = e.target.value; updateMeta("items", newItems); }} />
                                         </div>
                                         <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">HS Code (8 Digit)</label>
                                            <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all font-mono" placeholder="8517.13.00" value={it.hs_code} onChange={(e) => { const newItems = [...items]; newItems[itIdx].hs_code = e.target.value; updateMeta("items", newItems); }} />
                                         </div>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>

                          {/* 7. DOKUMEN CHECKLIST */}

                          <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10">
                             <div className="flex items-center gap-4 mb-10">
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                   <Verified className="w-5 h-5" />
                                </div>
                                <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">Verification Checklist</h4>
                             </div>

                             <div className="space-y-3">
                                {checklist.map((doc: any, docIdx: number) => (
                                   <div key={docIdx} className="grid grid-cols-12 gap-6 items-center bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] hover:bg-white/5 transition-all group">
                                      <div className="col-span-1 flex justify-center">
                                         <button 
                                            onClick={() => { const newCheck = [...checklist]; newCheck[docIdx].received = !newCheck[docIdx].received; updateMeta("checklist", newCheck); }}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${doc.received ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-950 text-slate-800 border border-white/10'}`}
                                         >
                                            <Check className="w-5 h-5" />
                                         </button>
                                      </div>
                                      <div className="col-span-3">
                                         <p className="text-xs font-black text-white uppercase truncate tracking-tight">{doc.name}</p>
                                         <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{doc.received ? 'Ready' : 'Pending'}</p>
                                      </div>
                                      <div className="col-span-3">
                                         <input type="text" placeholder="Ref No..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500/50 outline-none transition-all font-mono" value={doc.ref_no} onChange={(e) => { const newCheck = [...checklist]; newCheck[docIdx].ref_no = e.target.value; updateMeta("checklist", newCheck); }} />
                                      </div>
                                      <div className="col-span-2">
                                         <input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500/50 outline-none transition-all" value={doc.ref_date} onChange={(e) => { const newCheck = [...checklist]; newCheck[docIdx].ref_date = e.target.value; updateMeta("checklist", newCheck); }} />
                                      </div>
                                      <div className="col-span-3 flex justify-end items-center gap-3">
                                         {doc.file_url ? (
                                            <div className="flex items-center gap-2">
                                               <a href={doc.file_url} target="_blank" className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                                                  <ExternalLink className="w-4 h-4" />
                                               </a>
                                               <button onClick={() => { const newCheck = [...checklist]; newCheck[docIdx].file_url = ""; updateMeta("checklist", newCheck); }} className="w-8 h-8 text-slate-600 hover:text-red-500 transition-colors">
                                                  <XCircle className="w-5 h-5" />
                                               </button>
                                            </div>
                                         ) : (
                                            <label className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-500 cursor-pointer hover:bg-white/10 hover:text-white transition-all">
                                               <Upload className="w-4 h-4" /> Upload
                                               <input type="file" className="hidden" onChange={async (e) => {
                                                  const file = e.target.files?.[0]; if (!file) return;
                                                  toast.loading(`Uploading...`, { id: 'clr-upload' });
                                                  try {
                                                     const { data, error } = await supabase.storage.from('pod_documents').upload(`clr_${Date.now()}_${docIdx}`, file);
                                                     if (error) throw error;
                                                     const { data: { publicUrl } } = supabase.storage.from('pod_documents').getPublicUrl(data.path);
                                                     const newCheck = [...checklist]; newCheck[docIdx].file_url = publicUrl; newCheck[docIdx].received = true; updateMeta("checklist", newCheck);
                                                     toast.success(`Success`, { id: 'clr-upload' });
                                                  } catch (err: any) { toast.error("Error", { id: 'clr-upload' }); }
                                               }} />
                                            </label>
                                         )}
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>

                          {/* 8. SERVICE QUOTATION & FEES (DYNAMC PPJK TARIFF WITH QTY) */}
                          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-8">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                      <Banknote className="w-5 h-5" />
                                   </div>
                                   <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Service Quotation & Fees</h4>
                                </div>
                                <button 
                                   onClick={() => {
                                      const fees = meta.service_fees || [];
                                      updateMeta("service_fees", [...fees, { item_name: "", amount: 0, qty: 1 }]);
                                   }}
                                   className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                                >
                                   <Plus className="w-4 h-4" /> Add Service Item
                                </button>
                             </div>

                             <div className="space-y-3">
                                {(meta.service_fees || []).map((fee: any, fIdx: number) => (
                                   <div key={fIdx} className="bg-slate-950 border border-white/5 p-6 rounded-[2rem] group grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative">
                                      <button 
                                         onClick={() => {
                                            const fees = meta.service_fees.filter((_: any, i: number) => i !== fIdx);
                                            updateMeta("service_fees", fees);
                                         }}
                                         className="absolute -right-2 -top-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
                                      >
                                         <X className="w-3 h-3" />
                                      </button>
                                      
                                      <div className="md:col-span-5 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Service Component</label>
                                         <input type="text" list="ppjk-standard-fees" placeholder="e.g. Jasa PPJK" className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50" value={fee.item_name} onChange={(e) => {
                                            const newFees = [...meta.service_fees]; newFees[fIdx].item_name = e.target.value; updateMeta("service_fees", newFees);
                                         }} />
                                      </div>
                                      
                                      <div className="md:col-span-2 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Amount (IDR)</label>
                                         <input type="number" placeholder="0" className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500/50 font-mono text-right" value={fee.amount} onChange={(e) => {
                                            const newFees = [...meta.service_fees]; newFees[fIdx].amount = Number(e.target.value); updateMeta("service_fees", newFees);
                                         }} />
                                      </div>

                                      <div className="md:col-span-1 space-y-2">
                                         <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1 text-center">Qty</label>
                                         <input type="number" placeholder="1" className="w-full bg-slate-900 border border-white/5 rounded-xl px-2 py-3 text-xs font-black text-emerald-400 outline-none focus:border-emerald-500/50 text-center font-mono" value={fee.qty || 1} onChange={(e) => {
                                            const newFees = [...meta.service_fees]; newFees[fIdx].qty = Number(e.target.value); updateMeta("service_fees", newFees);
                                         }} />
                                      </div>

                                      <div className="md:col-span-4 flex flex-col items-end gap-1">
                                         <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mr-2">Subtotal</span>
                                         <div className="bg-emerald-500/5 px-4 py-3 rounded-xl border border-emerald-500/10 w-full text-right">
                                            <span className="text-xs font-black text-emerald-500 font-mono">
                                               Rp {((fee.amount || 0) * (fee.qty || 1)).toLocaleString('id-ID')}
                                            </span>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                                
                                <datalist id="ppjk-standard-fees">
                                   <option value="Jasa Pengurusan PIB / PEB" />
                                   <option value="Jasa EDI & Transfer System" />
                                   <option value="Jasa Handling & Admin" />
                                   <option value="Jasa Behandle / Fisik" />
                                   <option value="Jasa DO Online / Pinjam" />
                                   <option value="Biaya Operasional Lapangan" />
                                </datalist>
                             </div>

                             <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-6">
                                   <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total Service Revenue</span>
                                      <span className="text-2xl font-black text-white italic tracking-tighter">
                                         Rp {(meta.service_fees || []).reduce((acc: number, f: any) => acc + ((f.amount || 0) * (f.qty || 1)), 0).toLocaleString('id-ID')}
                                      </span>
                                   </div>
                                   <button 
                                      onClick={() => {
                                         const totalFee = (meta.service_fees || []).reduce((acc: number, f: any) => acc + ((f.amount || 0) * (f.qty || 1)), 0);
                                         const newWOItems = [...woItems];
                                         newWOItems[idx].deal_price = totalFee;
                                         setWoItems(newWOItems);
                                         toast.success("Deal Price Updated!");
                                      }}
                                      className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-emerald-400 transition-colors"
                                   >
                                      <RefreshCw className="w-3 h-3" /> Sync to Deal Price
                                   </button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold max-w-sm text-center md:text-right italic">
                                   *Perhitungan tariff di atas sudah termasuk perkalian Qty. Gunakan tombol sync untuk memperbarui nilai kontrak utama.
                                </p>
                             </div>
                          </div>
                       </div>
                      );
                    })()}

                   {!['trucking', 'clearances'].includes(activeWizardTab) && (
                     <div className="flex flex-col items-center justify-center h-[300px] text-slate-600">
                        <Package className="w-16 h-16 mb-6 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Module ini dalam tahap integrasi tactical</p>
                     </div>
                   )}
                </div>

                <div className="bg-emerald-600/10 border border-emerald-500/20 p-8 rounded-[2rem] mt-10">
                   <div className="flex justify-between items-center">
                      <div>
                         <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Total Mission Value</span>
                         <p className="text-slate-500 text-[10px] mt-1 italic font-bold">Akumulasi seluruh layanan SBU yang dipilih</p>
                      </div>
                      <div className="text-right">
                         <span className="text-4xl font-black text-white italic tracking-tighter">
                            Rp {woItems.reduce((acc, i) => acc + ((i.quantity || 0) * (i.deal_price || 0)), 0).toLocaleString('id-ID')}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-10">
                    <button 
                      onClick={() => setWizardStep(1)}
                      className="px-10 py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" /> Kembali
                    </button>
                    <button 
                      onClick={() => createWorkOrder("draft")}
                      className="flex-1 bg-slate-800 text-slate-300 px-10 py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                    >
                      Simpan Draft
                    </button>
                    <button 
                      onClick={() => {
                        // --- HARD VALIDATION FOR CLEARANCES ---
                        const missingData: string[] = [];
                        
                        woItems.forEach((item, idx) => {
                          if (item.sbu_type === 'clearances') {
                            const meta = item.sbu_metadata || {};
                            const prefix = `[Item ${idx + 1}: Clearances]`;
                            
                            // 1. Core Fields
                            if (!meta.pol) missingData.push(`${prefix} Port of Loading (POL)`);
                            if (!meta.port) missingData.push(`${prefix} Port of Discharge (POD)`);
                            if (!meta.carrier) missingData.push(`${prefix} Shipping Line / Carrier`);
                            if (!meta.vessel) missingData.push(`${prefix} Vessel Name / Voyage`);
                            if (!meta.shipper_name) missingData.push(`${prefix} Shipper Name`);
                            if (!meta.consignee_name) missingData.push(`${prefix} Consignee Name`);
                            if (!meta.bl_awb) missingData.push(`${prefix} Master BL / AWB`);
                            
                            // 2. Structurals
                            if (!meta.containers || meta.containers.length === 0) missingData.push(`${prefix} At least 1 Container`);
                            if (!meta.items || meta.items.length === 0) missingData.push(`${prefix} At least 1 Item Analysis`);
                            
                            // 3. Mandatory Documents (Checklist Validation)
                            const checklist = meta.checklist || [];
                            const isReady = (name: string) => checklist.find((d: any) => d.name === name)?.received;
                            
                            if (!isReady("Commercial Invoice")) missingData.push(`${prefix} Commercial Invoice must be READY`);
                            if (!isReady("Packing List")) missingData.push(`${prefix} Packing List must be READY`);
                            if (!isReady("Bill of Lading / AWB")) missingData.push(`${prefix} Bill of Lading must be READY`);
                          }
                        });

                        if (missingData.length > 0) {
                          toast.error(
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 text-left">
                              <p className="font-black border-b border-red-500/20 pb-2 text-[10px] uppercase tracking-widest text-red-500 text-center">Submission Blocked</p>
                              <p className="text-[10px] font-bold text-slate-400">Harap lengkapi data berikut:</p>
                              <ul className="text-[9px] list-disc pl-4 space-y-1 font-mono">
                                {missingData.map((m, i) => <li key={i} className="text-red-400">{m}</li>)}
                              </ul>
                            </div>,
                            { duration: 6000, position: 'top-center' }
                          );
                          return;
                        }

                        // Validation Passed
                        createWorkOrder("pending_sbu");
                      }}
                      className="flex-[2] bg-emerald-600 text-white px-10 py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                      <ShieldCheck className="w-5 h-5" /> Execute & Deploy to SBU
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL TAMBAH PELANGGAN */}
      {/* ===================================================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowCustomerModal(false);
        }}>
          <div className="bg-slate-900 border border-white/10 p-0 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Master Pelanggan</h2>
                <div className="flex gap-4 mt-2">
                   <button 
                    onClick={() => setCustomerView('form')}
                    className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${customerView === 'form' ? 'text-emerald-500 border-emerald-500' : 'text-slate-600 border-transparent'}`}
                   >
                     {isCustomerEdit ? 'Update Data' : 'Tambah Baru'}
                   </button>
                   <button 
                    onClick={() => setCustomerView('list')}
                    className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${customerView === 'list' ? 'text-emerald-500 border-emerald-500' : 'text-slate-600 border-transparent'}`}
                   >
                     Daftar Pelanggan
                   </button>
                </div>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <XCircle className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {customerView === 'list' ? (
                <div className="space-y-4">
                  <div className="relative mb-6">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input 
                      type="text"
                      placeholder="Cari nama atau perusahaan..."
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-xs text-white"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customers
                      .filter(c => 
                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
                        c.company_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.phone?.includes(customerSearch)
                      )
                      .map(c => (
                        <div key={c.id} className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 flex items-center justify-between group hover:bg-white/10 transition-all">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase">{c.company_name || c.name || 'Untitled'}</p>
                            <p className="text-[8px] text-slate-500 font-mono mt-1">{c.phone}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setNewCustomer({
                                phone: c.phone || "",
                                name: c.name || "",
                                company_name: c.company_name || "",
                                address: c.address || "",
                                city: c.city || "",
                                province: c.province || "",
                                zipcode: c.zipcode || "",
                                billing_method: (c.billing_method as any) || 'epod'
                              });
                              setEditingCustomerId(c.id);
                              setIsCustomerEdit(true);
                              setCustomerView('form');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* FORM FIELDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Nomor WhatsApp *</p>
                      <input
                          type="text"
                          placeholder="081234..."
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Nama Personal</p>
                      <input
                          type="text"
                          placeholder="Full Name..."
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Nama Perusahaan</p>
                    <input
                        type="text"
                        placeholder="Corporate Name..."
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all font-sans"
                        value={newCustomer.company_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Pencarian Alamat (Google Maps) *</p>
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-all" />
                      <input
                          ref={customerAutocompleteInputRef}
                          type="text"
                          placeholder="Cari alamat atau nama gedung..."
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Alamat Kantor Lengkap & Detail (Invoice)</p>
                    <textarea
                        placeholder="Masukkan alamat lengkap kantor pelanggan..."
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 transition-all min-h-[100px] font-sans"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Kota / Kabupaten</p>
                        <input
                            type="text"
                            readOnly
                            placeholder="..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] font-black text-slate-400 font-sans"
                            value={newCustomer.city}
                        />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Kode Pos</p>
                        <input
                            type="text"
                            readOnly
                            placeholder="..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] font-black text-slate-400 font-sans"
                            value={newCustomer.zipcode}
                        />
                      </div>
                  </div>
                  
                  <div>
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Provinsi</p>
                    <input
                        type="text"
                        readOnly
                        placeholder="..."
                        className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] font-black text-slate-400 font-sans"
                        value={newCustomer.province}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-3 ml-1">Metode POD (Billing Method)</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setNewCustomer({ ...newCustomer, billing_method: 'epod' })}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2 border ${
                          newCustomer.billing_method === 'epod' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-950 border-white/5 text-slate-600 hover:bg-white/5'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        E-POD
                      </button>
                      <button 
                        onClick={() => setNewCustomer({ ...newCustomer, billing_method: 'hardcopy' })}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2 border ${
                          newCustomer.billing_method === 'hardcopy' 
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                            : 'bg-slate-950 border-white/5 text-slate-600 hover:bg-white/5'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Hardcopy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    {isCustomerEdit && (
                      <button 
                        onClick={resetCustomerForm}
                        className="bg-slate-950 text-slate-600 font-bold uppercase tracking-widest text-[10px] py-5 px-6 rounded-2xl hover:text-white transition-all border border-white/5"
                      >
                        Batal Edit
                      </button>
                    )}
                    <button 
                      onClick={handleSaveCustomer} 
                      disabled={savingCustomer}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {savingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isCustomerEdit ? 'Update Data' : 'Simpan Pelanggan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL TAMBAH LOKASI DENGAN AUTOCOMPLETE */}
      {/* ===================================================== */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowLocationModal(false);
        }}>
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Data Master Lokasi</h2>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-600 hover:text-white transition-colors">
                <XCircle className="w-10 h-10" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Nama Identitas Lokasi *</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all"
                  placeholder="Misal: Gudang Utama, Kantor Jakarta..."
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                />
              </div>

              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Search via Google Maps API *</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 transition-all font-sans"
                    placeholder="Search address or landmark..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-1">Alamat Lengkap</label>
                   <textarea
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-xs text-slate-300 min-h-[140px] focus:ring-2 focus:ring-blue-500/30"
                    value={newLocation.address}
                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                    placeholder="Detail alamat..."
                    />
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Kecamatan</p>
                            <input type="text" value={newLocation.district} readOnly className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-slate-500" />
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Kota</p>
                            <input type="text" value={newLocation.city} readOnly className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-slate-500" />
                         </div>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Provinsi</p>
                        <input type="text" value={newLocation.province} readOnly className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-slate-500" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Petunjuk (Notes)</p>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-[10px] text-white focus:ring-2 focus:ring-blue-500/30"
                            placeholder="Gedung biru, samping gang..."
                            value={newLocation.notes || ""}
                            onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                        />
                    </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button
                onClick={createLocation}
                disabled={savingLocation}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-xl shadow-blue-600/10 active:scale-95 transition-all"
              >
                {savingLocation ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Registrasi Lokasi"}
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-10 bg-slate-950 text-slate-600 font-bold uppercase tracking-widest text-[10px] py-5 rounded-2xl hover:text-white transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================== */}
      {/* MODAL REJECT REASON */}
      {/* ===================================================== */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-[#151f32] border border-red-500/20 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative">
            {/* Stripe */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/60 rounded-t-[2rem]" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Tolak Work Order</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Berikan alasan penolakan</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="ml-auto text-slate-600 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Armada belum tersedia, rute tidak feasible, dll..."
              rows={4}
              className="w-full bg-[#0a0f1e]/80 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none mb-6 font-medium"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRejectWithReason}
                disabled={rejectingWO}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectingWO ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                {rejectingWO ? 'Menyimpan...' : 'Konfirmasi Tolak WO'}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-8 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    {/* ===================================================== */}
    {/* MODAL LIVE TRACKING MAP */}
    {/* ===================================================== */}
    {showTrackingModal && selectedJOData && (
        <TrackingModal 
            data={selectedJOData} 
            onClose={() => {
                setShowTrackingModal(false);
                setSelectedJOData(null);
            }} 
        />
    )}
      </div>
    </div>
  );
}

// Sub-component for Live Tracking
function TrackingModal({ data, onClose }: { data: { jo: JobOrder, item: WorkOrderItem, wo: WorkOrder }, onClose: () => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const { jo, item, wo } = data;

    useEffect(() => {
        if (!mapRef.current || typeof google === 'undefined') return;

        const latestTracking = (jo.tracking_updates || [])
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        const map = new google.maps.Map(mapRef.current, {
            center: { lat: -6.200000, lng: 106.816666 },
            zoom: 12,
            styles: [
                { "elementType": "geometry", "stylers": [{ "color": "#12192b" }] },
                { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
                { "elementType": "labels.text.stroke", "stylers": [{ "color": "#12192b" }] },
                { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
                { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
                { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
                { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
                { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
                { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
                { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
                { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
                { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
                { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
            ],
            disableDefaultUI: true,
            zoomControl: true,
        });

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#3b82f6",
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        });

        // Add Markers
        if (item.origin_location?.latitude && item.origin_location?.longitude) {
            new google.maps.Marker({
                position: { lat: Number(item.origin_location.latitude), lng: Number(item.origin_location.longitude) },
                map,
                label: { text: "A", color: "white", fontWeight: "bold" },
                title: "Pickup: " + item.origin_location.name
            });
        }

        if (item.destination_location?.latitude && item.destination_location?.longitude) {
            new google.maps.Marker({
                position: { lat: Number(item.destination_location.latitude), lng: Number(item.destination_location.longitude) },
                map,
                label: { text: "B", color: "white", fontWeight: "bold" },
                title: "Dropoff: " + item.destination_location.name
            });
        }

        // Driver Marker
        if (latestTracking?.location && latestTracking.location.includes(',')) {
            const [lat, lng] = latestTracking.location.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                new google.maps.Marker({
                    position: { lat, lng },
                    map,
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: "#10b981",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white",
                        rotation: 0
                    },
                    title: "Driver: " + (jo.drivers?.name || "Driver")
                });

                // Set bounds to include driver
                const bounds = new google.maps.LatLngBounds();
                if (item.origin_location?.latitude) bounds.extend({ lat: Number(item.origin_location.latitude), lng: Number(item.origin_location.longitude) });
                if (item.destination_location?.latitude) bounds.extend({ lat: Number(item.destination_location.latitude), lng: Number(item.destination_location.longitude) });
                bounds.extend({ lat, lng });
                map.fitBounds(bounds);
            }
        }

        // Get Directions
        if (item.origin_location?.address && item.destination_location?.address) {
            directionsService.route({
                origin: item.origin_location.address,
                destination: item.destination_location.address,
                travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                }
            });
        }

        setMapLoaded(true);
    }, [jo, item]);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[300] p-4 md:p-10">
            <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Modal Header */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#151f32]/50 backdrop-blur-md">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                            <Navigation className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase">{jo.jo_number}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                Tracking Unit: <span className="text-blue-400">{jo.fleets?.plate_number}</span> • Driver: <span className="text-emerald-400">{jo.drivers?.name}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                    {/* Map Area */}
                    <div className="flex-[2] relative bg-slate-900 border-r border-white/5">
                        <div ref={mapRef} className="absolute inset-0" />
                        {!mapLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                        )}
                        
                        {/* Legend Overlay */}
                        <div className="absolute bottom-6 left-6 p-4 bg-[#0a0f1e]/80 backdrop-blur-md border border-white/10 rounded-2xl z-20 space-y-2">
                             <div className="flex items-center gap-3">
                                 <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Pickup: {item.origin_location?.name}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,44,44,0.5)]" />
                                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Dropoff: {item.destination_location?.name}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Posisi Armada (Live)</p>
                             </div>
                        </div>
                    </div>

                    {/* Timeline & Details */}
                    <div className="lg:w-[400px] flex flex-col bg-[#111827]/30">
                        <div className="p-8 overflow-y-auto flex-1">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Riwayat Tracking (Pod)
                            </p>
                            
                            <div className="space-y-8 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/5" />
                                
                                {jo.tracking_updates && jo.tracking_updates.length > 0 ? (
                                    jo.tracking_updates
                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map((update, idx) => (
                                            <div key={update.id} className="relative pl-8">
                                                <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#111827] z-10 ${idx === 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                                                <p className={`text-xs font-black uppercase tracking-tight ${idx === 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                                                    {update.status_update || 'Update Lokasi'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                                    {new Date(update.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                                </p>
                                                {idx === 0 && (
                                                    <span className="mt-2 inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded">Latest Update</span>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                        <TrendingUp className="w-10 h-10 mb-4" />
                                        <p className="text-[10px] font-black text-center uppercase tracking-widest">Belum ada data tracking</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Info Footer */}
                        <div className="p-8 bg-black/20 border-t border-white/5">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">Customer Tracking Info</p>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-xs font-black text-white">{wo.customers?.company_name || wo.customers?.name}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{wo.wo_number} • {item.truck_type}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
