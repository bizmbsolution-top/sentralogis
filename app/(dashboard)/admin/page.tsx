"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { useGoogleMaps } from "@/lib/google-maps-context";
import { toast, Toaster } from "react-hot-toast";
import {
  Truck, Package, AlertCircle, Plus,
  X, Trash2, FileText, Loader2,
  Search, BarChart3, TrendingUp,
  Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, MessageSquare, AlertTriangle, Check, Send, Edit2, Edit3, Download,
  CheckCircle2, Ban, Hourglass, UserPlus, UsersRound, Calendar, MapPin, Navigation, Banknote, CircleDollarSign, Save, ExternalLink, ShieldCheck, LayoutGrid, RefreshCw, Target, Building2, Wallet,
  Ship, Warehouse, HardHat, ChevronRight, ChevronLeft, Activity, Upload, Verified, LogOut, User, MapPin as MapPinIcon, Globe, Pencil
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
  extra_costs?: any[];
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
  created_at: string;
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

  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending_sbu: 0,
    need_approval: 0,
    on_journey: 0,
    rejected: 0,
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

  const getRoleDisplayName = (role: string) => {
    const map: Record<string, string> = {
        'superadmin': 'Superadmin (App Owner)',
        'admin': 'Admin (Viewer)',
        'cs': 'CS (Pembuat WO)',
        'cs_trucking': 'SBU Trucking Admin',
        'cs_customs': 'SBU Customs Admin',
        'cs_forwarding': 'SBU Forwarding Admin',
        'finance_ar': 'Finance AR',
        'finance_ap': 'Finance AP',
        'finance_manager': 'Finance Manager',
        'director': 'Director',
        'viewer': 'Viewer'
    };
    return map[role] || (role || '').replace('_', ' ').toUpperCase();
  };

  const [wizardStep, setWizardStep] = useState(1);
  const [activatedSbus, setActivatedSbus] = useState<string[]>(['trucking']);
  const [selectedSbus, setSelectedSbus] = useState<string[]>(['trucking']);
  const [activeWizardTab, setActiveWizardTab] = useState('trucking');
  const [editingWOId, setEditingWOId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Staff Management State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSbuModal, setShowSbuModal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', full_name: '', password: '', role: 'operator' });
  const [addingStaff, setAddingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const deleteStaffMember = async (staffId: string) => {
    if (!confirm("Hapus personel dari organisasi ini?")) return;
    try {
        // Gunakan role 'viewer' yang valid untuk melewati check constraint
        // Idealnya: gunakan kolom status 'inactive' jika kolom tersebut ada di DB
        const { error } = await supabase
            .from('profiles')
            .update({ 
                organization_id: null,
                role: 'viewer' 
            })
            .eq('id', staffId);
        if (error) throw error;
        toast.success("Personel berhasil dihapus dari organisasi");
        setStaffList(prev => prev.filter(s => s.id !== staffId));
    } catch (error: any) {
        toast.error("Gagal hapus staf: " + error.message);
    }
  };

  const handleEditStaff = (member: any) => {
    setEditingStaffId(member.id);
    setNewStaff({
        email: member.email || '',
        full_name: member.full_name || '',
        password: '', // Biarkan kosong jika tidak ingin ganti password
        role: member.role || 'operator'
    });
  };

  // Superadmin BI State
  const [superAdminStats, setSuperAdminStats] = useState<any>({
    revenueByTenant: [],
    sbuDistribution: [],
    totalGlobalRevenue: 0,
    organizations: [],
    monthlySeries: []
  });

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

  const [newWO, setNewWO] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split('T')[0],
    execution_date: new Date().toISOString().slice(0, 16),
    notes: "",
    sbu_type: "trucking",
  });

  const [newCustomer, setNewCustomer] = useState({
    phone: "",
    name: "",
    company_name: "",
    address: "",
    city: "",
    province: "",
    district: "",
    zipcode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    billing_method: 'epod' as 'epod' | 'hardcopy',
  });
  const [customerView, setCustomerView] = useState<'list' | 'form'>('form');
  const [isCustomerEdit, setIsCustomerEdit] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    district: "",
    city: "",
    province: "",
    zipcode: "",
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [savingLocation, setSavingLocation] = useState(false);

  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const customerAddressInputRef = useRef<HTMLInputElement>(null);
  const locationAddressInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Berhasil keluar!");
      window.location.href = "/";
    } catch (error: any) {
      toast.error("Gagal keluar: " + error.message);
    }
  };

  const fetchStaff = async (orgId: string) => {
    if (!orgId) return;
    setLoadingStaff(true);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', orgId)
            .order('role');
        if (error) throw error;
        setStaffList(data || []);
    } catch (error: any) {
        toast.error("Gagal memuat staf: " + error.message);
    } finally {
        setLoadingStaff(false);
    }
  };

  const updateStaffRole = async (staffId: string, newRole: string) => {
      try {
          // Sync SBU Access based on new quick-switched role
          let sbuAcc: string[] = [];
          if (newRole === 'cs_trucking') sbuAcc = ['trucking'];
          else if (newRole === 'cs_customs') sbuAcc = ['clearances'];
          else if (newRole === 'cs_forwarding') sbuAcc = ['forwarding'];
          else if (['superadmin', 'admin', 'cs', 'director'].includes(newRole)) sbuAcc = ['trucking', 'clearances', 'forwarding'];

          const { error } = await supabase
              .from('profiles')
              .update({ role: newRole, sbu_access: sbuAcc })
              .eq('id', staffId);
          if (error) throw error;
          toast.success("Identity Permissions Synchronized");
          setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, role: newRole, sbu_access: sbuAcc } : s));
      } catch (error: any) {
          toast.error("Gagal ubah role: " + error.message);
      }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Ambil profil asli dulu untuk cek role
        const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        // 1. Ambil Perusahaan Terbaru di Database (Paling Masuk Akal sebagai Klien Baru)
        const { data: latestOrg } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // 2. Jika user adalah mbst1, paksa dia menjadi Admin dari perusahaan terbaru tersebut (UNTUK DATA TESTING/TENANT)
        if (user.email === 'mbst1@sentralogis.com' && latestOrg) {
            const forcedProfile = {
                id: user.id,
                email: user.email,
                organization_id: latestOrg.id,
                role: 'director', // Pastikan director sesuai skema baru
                organizations: latestOrg
            };
            
            setUserProfile(forcedProfile);
            if (latestOrg?.activated_sbus) {
                setActivatedSbus(latestOrg.activated_sbus);
            }
            return latestOrg;
        }

        // Jika dia adalah superadmin (admin1), jangan paksa role admin
        const { data: matchingOrg } = await supabase
            .from('organizations')
            .select('*')
            .eq('email', user.email)
            .limit(1)
            .maybeSingle();

        // Gunakan role dari DB, default ke user jika belum ada
        let targetRole = currentProfile?.role || 'user';
        
        const { data: finalProfileData } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            organization_id: matchingOrg?.id || currentProfile?.organization_id || null,
            role: targetRole,
            full_name: currentProfile?.full_name || user.email.split('@')[0]
        }).select('*, organizations(*)').single();

        setUserProfile(finalProfileData);
        if (finalProfileData?.organizations?.activated_sbus) {
            setActivatedSbus(finalProfileData.organizations.activated_sbus);
        }
        return finalProfileData.organizations || matchingOrg;
      }
      return null;
    } catch (error) { 
        return null; 
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const activeOrg = await fetchUserProfile();
      
      // Jika bukan superadmin DAN tidak ada org, baru return
      if (!activeOrg && userProfile?.role !== 'superadmin') {
        setWorkOrders([]);
        setLoading(false);
        return;
      }

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
        .eq('organization_id', activeOrg.id)
        .order("created_at", { ascending: false });

      if (woError) throw woError;

      const { data: customerData } = await supabase.from("customers").select("*").eq('organization_id', activeOrg.id).order("name", { ascending: true, nullsLast: true });
      const { data: locationData } = await supabase.from("locations").select("*").eq('organization_id', activeOrg.id).order("name", { ascending: true });
      const { data: truckTypesData } = await supabase.from("truck_types").select("*").order("name", { ascending: true });

      if (userProfile?.role === 'superadmin') {
         await fetchSuperAdminBI();
      }

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonthDate = new Date(); lastMonthDate.setMonth(now.getMonth() - 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastYear = lastMonthDate.getFullYear();

      const newStats = {
        total: woData?.length || 0,
        draft: 0,
        pending_sbu: 0,
        need_approval: 0,
        on_journey: 0,
        rejected: 0,
        funnel: { received: 0, running: 0, finished_pending_docs: 0, docs_complete_pending_finance: 0 },
        topCustomers: [] as any[],
        revenueComparison: { thisMonth: 0, lastMonth: 0, growth: 0 }
      };

      const customerMap = new Map();

      woData?.forEach((wo: WorkOrder) => {
        const displayStatus = getWODisplayStatus(wo);
        if (displayStatus.key === 'draft') newStats.draft++;
        else if (displayStatus.key === 'awaiting_sbu') newStats.pending_sbu++;
        else if (displayStatus.key === 'need_approval') newStats.need_approval++;
        else if (displayStatus.key === 'on_journey') newStats.on_journey++;
        else if (displayStatus.key === 'rejected') newStats.rejected++;

        if (displayStatus.key === 'draft' || displayStatus.key === 'awaiting_sbu') newStats.funnel.received++;
        else if (displayStatus.key === 'need_approval' || displayStatus.key === 'on_journey') newStats.funnel.running++;
        else if (displayStatus.key === 'done') {
          if (!wo.physical_doc_received) newStats.funnel.finished_pending_docs++;
          else if (!wo.billing_status || wo.billing_status === 'none') newStats.funnel.docs_complete_pending_finance++;
        }

        const woDate = new Date(wo.order_date);
        const totalAmount = (wo.work_order_items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.deal_price || 0)), 0);

        if (woDate.getMonth() === thisMonth && woDate.getFullYear() === thisYear) {
           newStats.revenueComparison.thisMonth += totalAmount;
           const custName = wo.customers?.company_name || wo.customers?.name || 'Unknown';
           customerMap.set(custName, (customerMap.get(custName) || 0) + totalAmount);
        } else if (woDate.getMonth() === lastMonth && woDate.getFullYear() === lastYear) {
           newStats.revenueComparison.lastMonth += totalAmount;
        }
      });

      if (newStats.revenueComparison.lastMonth > 0) {
        newStats.revenueComparison.growth = ((newStats.revenueComparison.thisMonth - newStats.revenueComparison.lastMonth) / newStats.revenueComparison.lastMonth) * 100;
      } else if (newStats.revenueComparison.thisMonth > 0) {
        newStats.revenueComparison.growth = 100;
      }

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
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperAdminBI = async () => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('work_order_items')
        .select(`
          deal_price, quantity, sbu_type,
          work_orders!inner(organization_id, created_at)
        `);
      
      if (itemsError) throw itemsError;

      const { data: orgs } = await supabase.from('organizations').select('*');
      
      const tenantMap = new Map();
      const sbuMap = new Map();
      let globalRev = 0;

      items?.forEach((item: any) => {
        const orgId = item.work_orders.organization_id;
        const rev = (item.deal_price || 0) * (item.quantity || 1);
        globalRev += rev;

        if (!tenantMap.has(orgId)) {
          const org = orgs?.find(o => o.id === orgId);
          tenantMap.set(orgId, { 
            name: org?.company_name || org?.name || 'Unknown Tenant',
            revenue: 0,
            credits: org?.mission_credits || 0,
            status: org?.is_active
          });
        }
        const t = tenantMap.get(orgId);
        t.revenue += rev;

        const sbu = item.sbu_type || 'trucking';
        sbuMap.set(sbu, (sbuMap.get(sbu) || 0) + rev);
      });

      setSuperAdminStats({
        revenueByTenant: Array.from(tenantMap.values()).sort((a,b) => b.revenue - a.revenue),
        sbuDistribution: Array.from(sbuMap.entries()).map(([name, value]) => ({ name, value })),
        totalGlobalRevenue: globalRev,
        organizations: orgs || []
      });
    } catch (err) {}
  };

  const lookupLastPrice = async (index: number, currentItems?: WorkOrderItem[]) => {
    const targetItems = currentItems || woItems;
    const item = targetItems[index];
    if (!newWO.customer_id || !item.truck_type || !item.origin_location_id || !item.destination_location_id || item.sbu_type !== 'trucking') return;

    try {
      const { data } = await supabase
        .from('work_order_items')
        .select('deal_price, work_orders!inner(customer_id, created_at)')
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
        toast.success("Tarif terakhir ditemukan: Rp " + data.deal_price.toLocaleString('id-ID'));
      }
    } catch (err) {}
  };

  const updateWoItem = (index: number, field: string, value: any, subField?: string) => {
    const updated = [...woItems];
    if (subField) {
      updated[index] = { ...updated[index], [field]: { ...(updated[index][field as keyof WorkOrderItem] as object || {}), [subField]: value } };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setWoItems(updated);
    if (['truck_type', 'origin_location_id', 'destination_location_id'].includes(field)) {
      lookupLastPrice(index, updated);
    }
  };

  const createWorkOrder = async (targetStatus: string = "draft") => {
    if (!newWO.customer_id) return toast.error("Pilih pelanggan");
    for (let i = 0; i < woItems.length; i++) {
       if (woItems[i].sbu_type === 'trucking' && (!woItems[i].origin_location_id || !woItems[i].destination_location_id)) {
          return toast.error("Lengkapi rute untuk item #" + (i+1));
       }
    }

    try {
      const selectedCustomer = customers.find(c => c.id === newWO.customer_id);
      const response = await fetch('/api/wo', {
        method: editingWOId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingWOId ? { id: editingWOId } : {}),
          ...newWO,
          customer_phone: selectedCustomer?.phone,
          customer_name: selectedCustomer?.name,
          company_name: selectedCustomer?.company_name,
          organization_id: userProfile?.organization_id || userProfile?.organizations?.id || null,
          status: targetStatus,
          items: woItems,
          source: "admin_cs"
        }),
      });

      if (response.ok) {
        toast.success("Work Order tersimpan!");
        setShowCreateModal(false);
        fetchDashboardData();
        resetWOForm();
      } else {
        throw new Error("Gagal simpan");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const resetWOForm = () => {
    setEditingWOId(null);
    setWizardStep(1);
    setNewWO({
      customer_id: "",
      order_date: new Date().toISOString().split('T')[0],
      execution_date: new Date().toISOString().slice(0, 16),
      notes: "",
      sbu_type: "trucking",
    });
    setWoItems([{ truck_type: "CDE", origin_location_id: "", destination_location_id: "", quantity: 1, deal_price: 0, sbu_type: "trucking", sbu_metadata: {} }]);
  };

  const openEditModal = (wo: WorkOrder) => {
    setEditingWOId(wo.id);
    setNewWO({
      customer_id: wo.customer_id,
      order_date: wo.order_date,
      execution_date: wo.execution_date || new Date().toISOString().slice(0, 16),
      notes: wo.notes || "",
      sbu_type: wo.source || "trucking",
    });
    setWoItems(wo.work_order_items?.map(item => ({
      id: item.id,
      truck_type: item.truck_type,
      origin_location_id: item.origin_location_id,
      destination_location_id: item.destination_location_id,
      quantity: item.quantity,
      deal_price: item.deal_price,
      sbu_type: item.sbu_type,
      sbu_metadata: item.sbu_metadata || {}
    })) || []);
    setSelectedSbus(Array.from(new Set(wo.work_order_items?.map(i => i.sbu_type || 'trucking'))));
    setWizardStep(1);
    setShowCreateModal(true);
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase.from("work_orders").delete().eq("id", id);
      if (error) throw error;
      toast.success("Work Order deleted");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusUpdate = async (id: string, status: string, reason?: string) => {
    setLoading(true);
    try {
      const { data: wo } = await supabase.from('work_orders').select('notes').eq('id', id).single();
      
      const { error } = await supabase
          .from('work_orders')
          .update({ 
              status: status,
              notes: reason ? (wo?.notes || "") + "\n\n[ADMIN DECISION]: " + reason : (wo?.notes || "")
          })
          .eq('id', id);

      if (error) throw error;

      // 🟢 IF REJECTED: Also cancel all associated Job Orders to release Fleet & Drivers
      if (status === 'rejected') {
        const { data: items } = await supabase.from('work_order_items').select('id').eq('work_order_id', id);
        if (items && items.length > 0) {
          const itemIds = items.map(i => i.id);
          const { error: joCancelError } = await supabase
            .from('job_orders')
            .update({ status: 'cancelled' })
            .in('work_order_item_id', itemIds);
          
          if (joCancelError) console.error("Error cancelling JOs:", joCancelError);
          else toast.success("Associated Job Orders released.");
        }
      }

      toast.success(`Work Order ${status === 'approved' ? 'Disetujui' : 'Ditolak'}`);
      fetchDashboardData();
      if (status === 'rejected') {
        setShowRejectModal(false);
        setRejectReason("");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWODisplayStatus = (wo: WorkOrder) => {
    const s = wo.status;
    if (s === 'draft') return { key: 'draft', label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' };
    if (s === 'pending_sbu') return { key: 'awaiting_sbu', label: 'Menunggu SBU', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (s === 'pending_armada_check') return { key: 'need_approval', label: 'Butuh Persetujuan', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (s === 'approved') {
       const allJOs = (wo.work_order_items || []).flatMap(i => i.job_orders || []);
       if (allJOs.length > 0 && allJOs.every(j => j.status === 'delivered')) return { key: 'done', label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
       if (allJOs.length > 0) return { key: 'on_journey', label: 'Dalam Perjalanan', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
       return { key: 'approved', label: 'Disetujui', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    }
    if (s === 'rejected') return { key: 'rejected', label: 'Ditolak', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    return { key: s, label: s, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };
  };

  const resetCustomerForm = () => {
    setNewCustomer({ phone: "", name: "", company_name: "", address: "", city: "", province: "", district: "", zipcode: "", latitude: null, longitude: null, billing_method: 'epod' });
    setIsCustomerEdit(false);
    setEditingCustomerId(null);
    setCustomerView('form');
  };

  const handleSaveCustomer = async () => {
     if (!newCustomer.phone) return toast.error("Nomor WA wajib");
     setSavingCustomer(true);
     try {
       const payload: any = { ...newCustomer, organization_id: userProfile?.organization_id || userProfile?.organizations?.id || null };
       if (isCustomerEdit && editingCustomerId) {
         await supabase.from("customers").update(payload).eq("id", editingCustomerId);
         toast.success("Customer updated");
       } else {
         const { data } = await supabase.from("customers").insert(payload).select().single();
         setNewWO(prev => ({ ...prev, customer_id: data.id }));
         toast.success("Customer added");
       }
       fetchDashboardData();
       setShowCustomerModal(false);
     } catch (err: any) {
       toast.error(err.message);
     } finally {
       setSavingCustomer(false);
     }
  };

  const createLocation = async () => {
    if (!newLocation.name || !newLocation.address) return toast.error("Nama & Alamat wajib");
    setSavingLocation(true);
    try {
      const payload = { ...newLocation, organization_id: userProfile?.organization_id || userProfile?.organizations?.id || null };
      const { data } = await supabase.from("locations").insert(payload).select().single();
      setLocations(prev => [...prev, data]);
      setShowLocationModal(false);
      toast.success("Lokasi disimpan");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingLocation(false);
    }
  };

  // =====================================================
  // GOOGLE PLACES AUTOCOMPLETE HELPERS
  // =====================================================
  const extractAddressComponents = (place: google.maps.places.PlaceResult) => {
    const get = (type: string) => place.address_components?.find(c => c.types.includes(type));
    return {
      address: place.formatted_address || '',
      district: get('administrative_area_level_3')?.long_name || get('sublocality_level_1')?.long_name || get('locality')?.long_name || '',
      city: get('administrative_area_level_2')?.long_name || get('locality')?.long_name || '',
      province: get('administrative_area_level_1')?.long_name || '',
      zipcode: get('postal_code')?.long_name || '',
      latitude: place.geometry?.location?.lat() || null,
      longitude: place.geometry?.location?.lng() || null,
    };
  };

  const initPlacesAutocomplete = useCallback((inputRef: React.RefObject<HTMLInputElement | null>, onSelect: (data: ReturnType<typeof extractAddressComponents>) => void) => {
    if (!mapsLoaded || !inputRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'id' },
      fields: ['formatted_address', 'address_components', 'geometry'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        onSelect(extractAddressComponents(place));
      }
    });
    return autocomplete;
  }, [mapsLoaded]);

  // Init customer Places autocomplete
  useEffect(() => {
    if (showCustomerModal && mapsLoaded && customerAddressInputRef.current) {
      const ac = initPlacesAutocomplete(customerAddressInputRef, (data) => {
        setNewCustomer(prev => ({ ...prev, ...data }));
      });
      return () => { if (ac) google.maps.event.clearInstanceListeners(ac); };
    }
  }, [showCustomerModal, mapsLoaded, initPlacesAutocomplete]);

  // Init location Places autocomplete
  useEffect(() => {
    if (showLocationModal && mapsLoaded && locationAddressInputRef.current) {
      const ac = initPlacesAutocomplete(locationAddressInputRef, (data) => {
        setNewLocation(prev => ({ ...prev, ...data }));
      });
      return () => { if (ac) google.maps.event.clearInstanceListeners(ac); };
    }
  }, [showLocationModal, mapsLoaded, initPlacesAutocomplete]);

  const handleExportReport = () => {
    const headers = ["WO Number", "Customer", "Date", "Status", "Revenue"];
    const rows = workOrders.map(wo => [
      wo.wo_number,
      wo.customers?.company_name || wo.customers?.name || "-",
      wo.order_date,
      getWODisplayStatus(wo).label,
      (wo.work_order_items || []).reduce((sum, i) => sum + (i.quantity * i.deal_price), 0)
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Admin_Report.csv";
    link.click();
  };

  useEffect(() => {
    if (showStaffModal && userProfile?.organization_id) {
        fetchStaff(userProfile.organization_id);
    }
  }, [showStaffModal, userProfile?.organization_id]);

  useEffect(() => {
    fetchDashboardData();
    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-6 overflow-x-hidden">
      <Toaster position="top-right" />

       {/* 🧭 PREMIUM NAVIGATION BAR */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                      <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sentralogis Admin</p>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">
                          {userProfile?.organizations?.name || 'Control Center'}
                      </h2>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <button onClick={() => fetchDashboardData()} className="p-2.5 hover:bg-slate-100 text-slate-400 rounded-xl transition-all">
                      <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={handleLogout} className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 group">
                      <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </button>
              </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
           {/* 🌿 PROFESSIONAL MISSION CONTROL HERO */}
           <div className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-2xl group/banner">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent z-0" />
               <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
               
               <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="text-center md:text-left flex-1">
                       <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                           <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                               <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{userProfile?.role === 'superadmin' ? 'Strategic Intelligence' : 'Operational Pulse'}</span>
                           </div>
                       </div>
                       <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
                           {userProfile?.role === 'superadmin' ? 'Sentralogis Global' : (userProfile?.organizations?.name || 'Enterprise' )}<br/>
                           <span className="text-slate-500 text-sm md:text-xl not-italic font-medium tracking-normal">
                               {userProfile?.role === 'superadmin' ? 'Holding Management Environment' : 'Standard Operational Environment'}
                           </span>
                       </h1>
                   </div>

                   <div className="flex flex-col gap-6 w-full md:w-auto min-w-[320px]">
                       {/* High Density Information */}
                       <div className="grid grid-cols-2 gap-3">
                           <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-2xl">
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    {userProfile?.role === 'superadmin' ? 'Global Revenue' : 'Available Credits'}
                               </p>
                               <div className="flex items-center gap-2">
                                   {userProfile?.role === 'superadmin' ? <Banknote className="w-4 h-4 text-emerald-500" /> : <Wallet className="w-4 h-4 text-amber-500" />}
                                   <p className="text-lg font-black text-white italic tracking-tighter">
                                        {userProfile?.role === 'superadmin' 
                                            ? `Rp ${superAdminStats.totalGlobalRevenue.toLocaleString('id-ID')}`
                                            : userProfile?.organizations?.mission_credits || 0
                                        }
                                   </p>
                               </div>
                           </div>
                           <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-2xl">
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    {userProfile?.role === 'superadmin' ? 'Total Tenants' : 'Team Strength'}
                               </p>
                               <div className="flex items-center gap-2">
                                   {userProfile?.role === 'superadmin' ? <Building2 className="w-4 h-4 text-blue-400" /> : <UsersRound className="w-4 h-4 text-blue-400" />}
                                   <p className="text-lg font-black text-white italic tracking-tighter">
                                        {userProfile?.role === 'superadmin' ? superAdminStats.revenueByTenant.length : staffList.length}
                                   </p>
                               </div>
                           </div>
                       </div>

                       {/* Action Matrix */}
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {userProfile?.role === 'superadmin' ? (
                                <Link 
                                    href="/admin/clients"
                                    className="col-span-3 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                                >
                                    <Building2 className="w-5 h-5" /> Tenant & Token Hub
                                </Link>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setShowSbuModal(true)}
                                        className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-2xl py-4 border border-white/5 transition-all active:scale-95 group"
                                    >
                                        <LayoutGrid className="w-5 h-5 text-emerald-400 group-hover:rotate-90 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
                                    </button>
                                    <button 
                                        onClick={() => setShowStaffModal(true)}
                                        className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-2xl py-4 border border-white/5 transition-all active:scale-95 group"
                                    >
                                        <UsersRound className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Team</span>
                                    </button>
                                    <button 
                                        onClick={() => { resetWOForm(); setShowCreateModal(true); }}
                                        className="col-span-2 lg:col-span-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" /> New WO
                                    </button>
                                </>
                            )}
                       </div>
                   </div>
               </div>
           </div>

       <div className="max-w-7xl mx-auto px-6 py-12">
        {userProfile?.role === 'superadmin' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 🏆 TENANT PERFORMANCE LEADERBOARD */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group/card text-slate-900">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover/card:bg-blue-500/10 transition-colors" />
                   <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3 relative z-10">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      Tenant Performance Leaderboard
                   </h3>
                   <div className="space-y-6 relative z-10">
                      {superAdminStats.revenueByTenant.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                           <Loader2 className="w-10 h-10 mb-4 animate-spin opacity-20" />
                           <p className="text-sm font-black uppercase tracking-widest opacity-20 text-center">Analysing holding revenue...</p>
                        </div>
                      ) : superAdminStats.revenueByTenant.map((tenant: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all group/item shadow-sm hover:shadow-md">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-lg font-black text-slate-400 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                                 {idx + 1}
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[180px]">{tenant.name}</p>
                                 <p className={"text-[9px] font-bold uppercase tracking-widest " + (tenant.status ? "text-emerald-500" : "text-rose-500")}>
                                    {tenant.status ? 'ACTIVE OPERATIONAL' : 'INACTIVE'}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-lg font-black text-slate-900 tracking-tighter italic">Rp {tenant.revenue.toLocaleString('id-ID')}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{tenant.credits} Tokens Available</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* 📊 GLOBAL SBU DISTRIBUTION */}
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group/sbu">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
                   <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3 relative z-10">
                      <LayoutGrid className="w-6 h-6 text-emerald-400" />
                      Global SBU Distribution
                   </h3>
                   <div className="space-y-10 relative z-10">
                      {superAdminStats.sbuDistribution.map((sbu: any, idx: number) => {
                         const percentage = (sbu.value / (superAdminStats.totalGlobalRevenue || 1)) * 100;
                         return (
                           <div key={idx} className="space-y-3">
                              <div className="flex justify-between items-end">
                                 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{sbu.name}</p>
                                 <p className="text-sm font-black italic">Rp {sbu.value.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="h-5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                                 <div 
                                   className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                   style={{ width: `${percentage}%` }}
                                 />
                              </div>
                           </div>
                         );
                      })}
                   </div>
                   <div className="mt-16 pt-8 border-t border-white/5 relative z-10 text-center">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated Global Assets</p>
                      <p className="text-5xl font-black italic tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                         Rp {superAdminStats.totalGlobalRevenue.toLocaleString('id-ID')}
                      </p>
                   </div>
                </div>
             </div>

             {/* ⚡ STRATEGIC INSIGHT GRID */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
                {[
                  { label: 'System Purity', val: '99.9%', icon: Activity, color: 'emerald' },
                  { label: 'Tenant Nodes', val: superAdminStats.revenueByTenant.length + ' Active', icon: Globe, color: 'blue' },
                  { label: 'Token Liquidity', val: superAdminStats.revenueByTenant.reduce((acc: number, t: any) => acc + t.credits, 0).toLocaleString('id-ID'), icon: Wallet, color: 'amber' }
                ].map((insight, i) => (
                  <div key={i} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-sm group hover:border-blue-400 transition-all hover:shadow-xl hover:-translate-y-1">
                     <div className={`w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center shadow-inner transition-colors`}>
                        <insight.icon className="w-6 h-6" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{insight.label}</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{insight.val}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <>
            {/* STRATEGIC PULSE */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-12">
           {[
             { id: 'all', label: 'Total Volume', count: stats.total, icon: Package, color: 'blue' },
             { id: 'draft', label: 'Drafts', count: stats.draft, icon: Edit3, color: 'slate' },
             { id: 'awaiting_sbu', label: 'Awaiting SBU', count: stats.pending_sbu, icon: Hourglass, color: 'indigo' },
             { id: 'need_approval', label: 'Needs Approval', count: stats.need_approval, icon: AlertCircle, color: 'amber' },
             { id: 'on_journey', label: 'On Journey', count: stats.on_journey, icon: Navigation, color: 'emerald' },
             { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'red' },
           ].map(s => {
              const isActive = statusFilter === s.id;
              const colorClass = s.color === 'blue' ? 'blue' : s.color === 'indigo' ? 'indigo' : s.color === 'amber' ? 'amber' : s.color === 'red' ? 'rose' : 'emerald';
              return (
                <button 
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={"group relative flex flex-col p-8 rounded-3xl border transition-all text-left overflow-hidden " + (isActive ? "bg-white border-" + colorClass + "-500 ring-4 ring-" + colorClass + "-50 shadow-2xl" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm")}
                >
                  <div className={"w-12 h-12 rounded-2xl flex items-center justify-center mb-6 " + (isActive ? "bg-" + colorClass + "-600 text-white" : "bg-slate-50 text-slate-400 group-hover:text-" + colorClass + "-500 transition-colors")}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className={"text-4xl font-black tracking-tighter " + (isActive ? "text-slate-900" : "text-slate-400")}>{s.count}</p>
                  {isActive && <div className={"absolute top-0 right-0 w-32 h-32 bg-" + colorClass + "-500/5 rounded-full -mr-10 -mt-10 blur-2xl"} />}
                </button>
              );
           })}
        </div>

        {/* WORK ORDER TERMINAL */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[600px]">
           <div className="p-10 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                   <FileText className="w-8 h-8 text-blue-600" />
                   Operational Cockpit
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Real-time Fulfillment Tracking</p>
              </div>

              <div className="flex items-center gap-4 w-full xl:w-auto">
                 <div className="relative flex-1 xl:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Cari WO, Customer, atau Catatan..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                    />
                 </div>
              </div>
           </div>

           <div className="p-8 space-y-4">
              {!statusFilter ? (
                  <div className="py-32 flex flex-col items-center justify-center text-slate-300">
                     <Target className="w-20 h-20 mb-4 opacity-10" />
                     <p className="text-sm font-black uppercase tracking-widest opacity-20 text-center px-10">Pilih modul Tactical Command diatas<br/>untuk memantau operasional</p>
                  </div>
              ) : workOrders
                .filter(wo => {
                  const ds = getWODisplayStatus(wo);
                  if (statusFilter !== 'all' && ds.key !== statusFilter) return false;
                  return `${wo.wo_number} ${wo.customers?.company_name} ${wo.customers?.name}`.toLowerCase().includes(searchTerm.toLowerCase());
                }).length === 0 ? (
                  <div className="py-32 flex flex-col items-center justify-center text-slate-300">
                     <Package className="w-20 h-20 mb-4 opacity-10" />
                     <p className="text-sm font-black uppercase tracking-widest opacity-20">Terminal Kosong</p>
                  </div>
                ) : (
                  workOrders
                    .filter(wo => {
                      const ds = getWODisplayStatus(wo);
                      if (statusFilter !== 'all' && ds.key !== statusFilter) return false;
                      return `${wo.wo_number} ${wo.customers?.company_name} ${wo.customers?.name}`.toLowerCase().includes(searchTerm.toLowerCase());
                    })
                    .map(wo => {
                       const isExp = expandedWOId === wo.id;
                       const ds = getWODisplayStatus(wo);
                       const sbus = Array.from(new Set(wo.work_order_items?.map(i => i.sbu_type)));

                       return (
                         <div key={wo.id} className={"rounded-3xl border transition-all " + (isExp ? "bg-slate-50 border-blue-200 shadow-xl" : "bg-white border-slate-100 hover:border-slate-200")}>
                            <div 
                              onClick={() => setExpandedWOId(isExp ? null : wo.id)}
                              className="p-8 flex flex-col lg:flex-row lg:items-center gap-8 cursor-pointer"
                            >
                               <div className="w-48 flex-shrink-0">
                                  <p className="text-[14px] font-black text-slate-900 italic uppercase leading-none mb-2">{wo.wo_number}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(wo.created_at).toLocaleDateString('id-ID', { day:'2-digit', month: 'short' })}</p>
                               </div>

                               <div className="flex-1">
                                  <p className="text-[15px] font-black text-slate-900 uppercase leading-tight mb-1">{wo.customers?.company_name || wo.customers?.name || "No Name"}</p>
                                  <p className="text-[11px] font-bold text-slate-400 truncate max-w-md">{wo.notes || "Tak ada instruksi khusus"}</p>
                               </div>

                               <div className="flex items-center gap-2">
                                  {['trucking', 'clearances', 'forwarding'].map(s => {
                                     const has = sbus.includes(s);
                                     const Icon = s === 'trucking' ? Truck : s === 'clearances' ? FileText : Ship;
                                     if (!has) return null;
                                     return (
                                       <div key={s} className="w-9 h-9 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                          <Icon className="w-4 h-4" />
                                       </div>
                                     );
                                  })}
                               </div>

                               <div className="w-44 text-right">
                                  <span className={"px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border " + ds.color + " " + ds.bg + " " + ds.border}>
                                     {ds.label}
                                  </span>
                               </div>

                               <div className="flex items-center gap-2 flex-shrink-0">
                                  <button 
                                    disabled={wo.status === 'pending_armada_check'}
                                    onClick={(e) => { e.stopPropagation(); openEditModal(wo); }} 
                                    className={"p-3 rounded-xl transition-all shadow-sm " + (wo.status === 'pending_armada_check' ? "bg-slate-50 text-slate-300 cursor-not-allowed grayscale" : "bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200")} 
                                    title={wo.status === 'pending_armada_check' ? "Locked (Pending Approval)" : "Edit WO"}
                                  >
                                     <Edit2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    disabled={wo.status === 'pending_armada_check'}
                                    onClick={(e) => { e.stopPropagation(); if(confirm('Hapus Work Order?')) deleteWorkOrder(wo.id); }} 
                                    className={"p-3 rounded-xl transition-all shadow-sm " + (wo.status === 'pending_armada_check' ? "bg-slate-50 text-slate-300 cursor-not-allowed grayscale" : "bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200")} 
                                    title={wo.status === 'pending_armada_check' ? "Locked (Pending Approval)" : "Hapus WO"}
                                  >
                                     <Trash2 className="w-5 h-5" />
                                  </button>
                                  <div className={"p-3 rounded-xl border transition-all " + (isExp ? "bg-blue-600 text-white border-blue-500" : "bg-white border-slate-100 text-slate-400")}>
                                     <ChevronDown className={"w-5 h-5 transition-transform " + (isExp ? "rotate-180" : "")} />
                                  </div>
                               </div>
                            </div>

                            {isExp && (
                               <div className="p-8 pt-0 animate-in fade-in slide-in-from-top-2">
                                  <div className="bg-white rounded-2xl border border-slate-200 p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                     <div className="space-y-6">
                                        <div>
                                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Itemized Activity</p>
                                           <div className="space-y-3">
                                              {wo.work_order_items?.map((item, idx) => (
                                                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-slate-100">
                                                          {item.sbu_type === 'trucking' ? <Truck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                       </div>
                                                       <div>
                                                          <p className="text-[13px] font-black text-slate-900 uppercase">{(item.sbu_metadata?.doc_code || item.truck_type || 'Task') + ' (' + item.quantity + ')'}</p>
                                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1">{ (item.origin_location?.name || 'TBA') + " → " + (item.destination_location?.name || 'TBA') }</p>
                                                       </div>
                                                    </div>
                                                    <span className="text-[13px] font-black text-emerald-600">Rp {item.deal_price?.toLocaleString('id-ID')}</span>
                                                 </div>
                                              ))}
                                           </div>
                                        </div>
                                     </div>

                                     <div className="space-y-8 flex flex-col justify-between">
                                        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                           <div className="relative z-10">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Deal Value</p>
                                              <p className="text-4xl font-black italic tracking-tighter">Rp { (wo.work_order_items?.reduce((sum, i) => sum + (i.quantity*i.deal_price), 0) || 0).toLocaleString('id-ID') }</p>
                                           </div>
                                           <Banknote className="absolute top-1/2 right-10 -translate-y-1/2 w-24 h-24 text-white/5" />
                                        </div>

                                        <div className="flex gap-4">
                                           {ds.key === 'draft' && (
                                              <button onClick={() => createWorkOrder('pending_sbu')} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                                 Submit to Operational
                                              </button>
                                           )}
                                           {ds.key === 'need_approval' && (
                                              <>
                                                 <button 
                                                   onClick={() => handleStatusUpdate(wo.id, 'approved')} 
                                                   className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                 >
                                                    <ShieldCheck className="w-4 h-4" /> Approve Mission
                                                 </button>
                                                 <button 
                                                   onClick={() => { setRejectTargetWOId(wo.id); setShowRejectModal(true); }}
                                                   className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                                 >
                                                    <Ban className="w-4 h-4" /> Reject
                                                 </button>
                                              </>
                                           )}
                                           {ds.key === 'on_journey' && (
                                              <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                                                 <Target className="w-4 h-4" /> Live Tracking
                                              </button>
                                           )}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            )}
                         </div>
                       );
                    })
                )}
           </div>
        </div>
       </>
      )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 pb-10 flex justify-around items-center z-50 md:hidden shadow-2xl">
          <button onClick={() => setStatusFilter('all')} className={"flex flex-col items-center gap-1 " + (statusFilter === 'all' ? "text-blue-600" : "text-slate-400")}>
              <LayoutGrid className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase">Cockpit</span>
          </button>
          <button onClick={() => { resetCustomerForm(); setShowCustomerModal(true); }} className="flex flex-col items-center gap-1 text-slate-400">
              <UserPlus className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase">Entities</span>
          </button>
          <div className="-mt-14 scale-125">
             <button onClick={() => { resetWOForm(); setShowCreateModal(true); }} className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-slate-50 active:scale-90 transition-all">
                <Plus className="w-8 h-8 font-black" />
             </button>
          </div>
          <Link href="/finance" className="flex flex-col items-center gap-1 text-slate-400">
              <Banknote className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase">Finance</span>
          </Link>
          <button onClick={() => fetchDashboardData()} className="flex flex-col items-center gap-1 text-slate-400">
              <RefreshCw className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase">Refresh</span>
          </button>
      </nav>

      {/* ===================================================== */}
      {/* MODALS LIGHT THEMED */}
      {/* ===================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative p-10">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 flex items-center gap-3">
                       <Plus className="w-8 h-8 text-blue-600" />
                       {editingWOId ? "Edit Work Order" : "Work Order Baru"}
                    </h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Operational Configuration Gateway</p>
                 </div>
                 <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                    <X className="w-8 h-8" />
                 </button>
              </div>

              {wizardStep === 1 ? (
                <div className="space-y-8">
                   <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">1. Pilih Customer Master *</label>
                      <div className="flex gap-4">
                        <div className="flex-1 relative group">
                           <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                           <select 
                             className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all appearance-none cursor-pointer"
                             value={newWO.customer_id}
                             onChange={(e) => setNewWO({...newWO, customer_id: e.target.value})}
                           >
                              <option value="">-- Cari Pelanggan --</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                           </select>
                        </div>
                        <button onClick={() => { resetCustomerForm(); setShowCustomerModal(true); }} className="bg-white border border-slate-200 text-slate-900 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                           Tambah
                        </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">2. Tanggal Order</label>
                        <div className="relative group">
                           <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                           <input type="date" className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all" value={newWO.order_date} onChange={e => setNewWO({...newWO, order_date: e.target.value})} />
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">3. Jam Eksekusi</label>
                        <div className="relative group">
                           <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                           <input type="datetime-local" className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all" value={newWO.execution_date} onChange={e => setNewWO({...newWO, execution_date: e.target.value})} />
                        </div>
                      </div>
                   </div>

                   <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">4. Keterangan / Instruksi Khusus</label>
                      <div className="relative group">
                         <MessageSquare className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                         <textarea 
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[100px] placeholder:text-slate-300"
                            value={newWO.notes}
                            onChange={e => setNewWO({...newWO, notes: e.target.value})}
                            placeholder="Contoh: Muatan fragile, wajib terpal, muat malam jam 20:00, dll..."
                         />
                      </div>
                   </div>

                   <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">5. Layanan SBU</label>
                      <div className="grid grid-cols-3 gap-4">
                         {['trucking', 'customs', 'forwarding'].filter(s => activatedSbus.includes(s)).map(s => {
                            const isS = selectedSbus.includes(s);
                            const Icon = s === 'trucking' ? Truck : s === 'customs' ? FileText : Ship;
                            return (
                               <button 
                                 key={s} 
                                 onClick={() => {
                                    if (isS) {
                                       if (selectedSbus.length > 1) setSelectedSbus(prev => prev.filter(x => x !== s));
                                    } else {
                                       setSelectedSbus(prev => [...prev, s]);
                                    }
                                 }}
                                 className={"flex items-center gap-4 p-6 rounded-2xl border transition-all " + (isS ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/10" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300")}
                               >
                                  <Icon className="w-6 h-6" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">{s === 'customs' ? 'Clearances' : s}</span>
                               </button>
                            );
                         })}
                      </div>
                   </div>

                   <div className="flex justify-end pt-10">
                      <button 
                        onClick={() => {
                           if (!newWO.customer_id) return toast.error("Pilih customer");
                           setWizardStep(2);
                           setActiveWizardTab(selectedSbus[0]);
                           if (!editingWOId) {
                               setWoItems(selectedSbus.map(s => ({
                                  truck_type: s === 'trucking' ? "CDE" : "N/A",
                                  origin_location_id: "",
                                  destination_location_id: "",
                                  quantity: 1,
                                  deal_price: 0,
                                  sbu_type: s,
                                  sbu_metadata: {}
                               })));
                           }
                        }}
                        className="bg-slate-900 text-white px-16 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl active:scale-95 transition-all"
                      >
                         Konfigurasi Detail <ChevronRight className="w-4 h-4 inline-block ml-2" />
                      </button>
                   </div>
                </div>
              ) : (
                <div className="space-y-8">
                   <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                      {selectedSbus.map(s => (
                         <button key={s} onClick={() => setActiveWizardTab(s)} className={"flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all " + (activeWizardTab === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}>
                            {s} Items
                         </button>
                      ))}
                   </div>

                   <div className="min-h-[400px]">
                      {woItems.map((item, idx) => {
                         if (item.sbu_type !== activeWizardTab) return null;
                         return (
                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 mb-8 relative group">
                               <button onClick={() => setWoItems(woItems.filter((_, i) => i !== idx))} className="absolute top-10 right-10 text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-8 h-8" />
                               </button>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  {activeWizardTab === 'trucking' ? (
                                    <>
                                       <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Jenis Unit</label>
                                          <select className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none" value={item.truck_type} onChange={e => updateWoItem(idx, 'truck_type', e.target.value)}>
                                             {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                          </select>
                                       </div>
                                       <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Volume (Unit)</label>
                                          <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none" value={item.quantity} onChange={e => updateWoItem(idx, 'quantity', parseInt(e.target.value)||1)} />
                                       </div>
                                       <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Titik Pickup</label>
                                          <div className="flex gap-2">
                                             <select className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none" value={item.origin_location_id} onChange={e => updateWoItem(idx, 'origin_location_id', e.target.value)}>
                                                <option value="">-- Pilih Lokasi --</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                             </select>
                                             <button type="button" onClick={() => { setNewLocation({ name: "", address: "", district: "", city: "", province: "", zipcode: "", notes: "", latitude: null, longitude: null }); setShowLocationModal(true); }} className="px-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all whitespace-nowrap">+ Baru</button>
                                          </div>
                                       </div>
                                       <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Titik Dropoff</label>
                                          <div className="flex gap-2">
                                             <select className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none" value={item.destination_location_id} onChange={e => updateWoItem(idx, 'destination_location_id', e.target.value)}>
                                                <option value="">-- Pilih Lokasi --</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                             </select>
                                             <button type="button" onClick={() => { setNewLocation({ name: "", address: "", district: "", city: "", province: "", zipcode: "", notes: "", latitude: null, longitude: null }); setShowLocationModal(true); }} className="px-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all whitespace-nowrap">+ Baru</button>
                                          </div>
                                       </div>
                                    </>
                                  ) : (
                                     <div className="col-span-2">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Regime / Document Code</label>
                                        <input className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none" value={item.sbu_metadata?.doc_code || ""} onChange={e => updateWoItem(idx, 'sbu_metadata', e.target.value, 'doc_code')} placeholder="e.g. BC20" />
                                     </div>
                                  )}
                                  
                                  <div className="col-span-2 pt-8 border-t border-slate-100 flex items-center justify-between">
                                     <div className="flex-1 max-w-xs">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Harga Deal (Gross)</label>
                                        <div className="relative">
                                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[12px]">Rp</span>
                                           <input type="text" className="w-full bg-slate-900 border-none rounded-2xl pl-14 pr-6 py-6 text-xl font-black text-emerald-400 outline-none" value={item.deal_price === 0 ? "" : item.deal_price.toLocaleString('id-ID')} onChange={e => updateWoItem(idx, 'deal_price', parseInt(e.target.value.replace(/\./g,''))||0)} />
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sub Total</p>
                                        <p className="text-3xl font-black italic tracking-tighter">Rp { (item.quantity*item.deal_price).toLocaleString('id-ID') }</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>

                   <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center pt-8 border-t border-slate-100 gap-4">
                      <button onClick={() => setWizardStep(1)} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all flex items-center gap-2 py-4">
                         <ChevronLeft className="w-4 h-4" /> Kembali
                      </button>
                      <div className="flex gap-4">
                         <button onClick={() => createWorkOrder('draft')} className="bg-white border-2 border-slate-200 text-slate-700 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 shadow-sm">
                            <Save className="w-4 h-4 text-slate-400" /> Save Draft
                         </button>
                         <button onClick={() => createWorkOrder('pending_sbu')} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 hover:bg-blue-500">
                            <Send className="w-4 h-4" /> Submit to SBU
                         </button>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
           <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                 <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Master Customer Entity</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Google Maps Address Auto-Resolution</p>
                 </div>
                 <button onClick={() => setShowCustomerModal(false)} className="p-3 hover:bg-slate-50 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Company Name *</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10" value={newCustomer.company_name} onChange={e => setNewCustomer({...newCustomer, company_name: e.target.value})} placeholder="PT. Logistik Maju Jaya" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">PIC Name</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Nama PIC / Contact Person" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">WhatsApp / Phone *</label>
                        <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none text-blue-600 focus:ring-2 focus:ring-blue-600/10" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="628123..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Billing Control</label>
                        <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none" value={newCustomer.billing_method} onChange={e => setNewCustomer({...newCustomer, billing_method: e.target.value as any})}>
                            <option value="epod">E-POD (Paperless)</option>
                            <option value="hardcopy">Hardcopy Gateway</option>
                        </select>
                    </div>
                 </div>

                 {/* GOOGLE PLACES SEARCH */}
                 <div className="bg-blue-50/50 border-2 border-blue-100 rounded-[2rem] p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                       <MapPin className="w-5 h-5 text-blue-600" />
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Smart Address Search — Powered by Google Maps</p>
                    </div>
                    <div className="relative">
                       <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                       <input 
                          ref={customerAddressInputRef}
                          className="w-full bg-white border-2 border-blue-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all placeholder:text-slate-300" 
                          placeholder="Ketik alamat untuk mencari otomatis..." 
                          defaultValue={newCustomer.address}
                       />
                    </div>
                    {newCustomer.address && (
                       <div className="bg-white rounded-2xl border border-blue-100 p-5">
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Resolved Address</p>
                          <p className="text-sm font-bold text-slate-900 leading-relaxed">{newCustomer.address}</p>
                       </div>
                    )}
                 </div>

                 {/* AUTO-FILLED FIELDS */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">District / Kecamatan</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newCustomer.district} onChange={e => setNewCustomer({...newCustomer, district: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">City / Kab-Kota</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newCustomer.city} onChange={e => setNewCustomer({...newCustomer, city: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Province</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newCustomer.province} onChange={e => setNewCustomer({...newCustomer, province: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Zip Code</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newCustomer.zipcode} onChange={e => setNewCustomer({...newCustomer, zipcode: e.target.value})} placeholder="Auto-fill" />
                    </div>
                 </div>

                 {(newCustomer.latitude && newCustomer.longitude) && (
                    <div className="flex items-center gap-4 px-2">
                       <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">GPS Locked</span>
                       </div>
                       <span className="text-[10px] font-bold text-slate-400">{newCustomer.latitude?.toFixed(6)}, {newCustomer.longitude?.toFixed(6)}</span>
                    </div>
                 )}

                 <button onClick={handleSaveCustomer} disabled={savingCustomer} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all hover:bg-blue-600">
                    {savingCustomer ? "Simpan..." : "Register Customer Gateway"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 📍 LOCATION MODAL — Google Places AutoSearch */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
           <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                 <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3"><MapPin className="w-7 h-7 text-emerald-600" /> New Location</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Google Maps Auto-Resolution for Pickup & Dropoff</p>
                 </div>
                 <button onClick={() => setShowLocationModal(false)} className="p-3 hover:bg-slate-50 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Location Label / Nama Lokasi *</label>
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/10" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} placeholder="Gudang Cikarang, Pabrik MM2100, dll..." />
                 </div>

                 <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-[2rem] p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                       <MapPin className="w-5 h-5 text-emerald-600" />
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Smart Address Search — Powered By Google Maps</p>
                    </div>
                    <div className="relative">
                       <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                       <input 
                          ref={locationAddressInputRef}
                          className="w-full bg-white border-2 border-emerald-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all placeholder:text-slate-300" 
                          placeholder="Ketik alamat untuk mencari otomatis..." 
                          defaultValue={newLocation.address}
                       />
                    </div>
                    {newLocation.address && (
                       <div className="bg-white rounded-2xl border border-emerald-100 p-5">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Resolved Address</p>
                          <p className="text-sm font-bold text-slate-900 leading-relaxed">{newLocation.address}</p>
                       </div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">District / Kecamatan</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newLocation.district} onChange={e => setNewLocation({...newLocation, district: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">City / Kab-Kota</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newLocation.city} onChange={e => setNewLocation({...newLocation, city: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Province</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newLocation.province} onChange={e => setNewLocation({...newLocation, province: e.target.value})} placeholder="Auto-fill" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Zip Code</label>
                       <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold outline-none" value={newLocation.zipcode} onChange={e => setNewLocation({...newLocation, zipcode: e.target.value})} placeholder="Auto-fill" />
                    </div>
                 </div>

                 {(newLocation.latitude && newLocation.longitude) && (
                    <div className="flex items-center gap-4 px-2">
                       <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">GPS Locked</span>
                       </div>
                       <span className="text-[10px] font-bold text-slate-400">{newLocation.latitude?.toFixed(6)}, {newLocation.longitude?.toFixed(6)}</span>
                    </div>
                 )}

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Location Notes / Petunjuk Alamat</label>
                    <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-medium outline-none h-24 focus:ring-2 focus:ring-emerald-600/10" value={newLocation.notes} onChange={e => setNewLocation({...newLocation, notes: e.target.value})} placeholder="Masuk dari Gerbang 2, belok kanan setelah pos keamanan..." />
                 </div>

                 <button onClick={createLocation} disabled={savingLocation} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all hover:bg-emerald-600">
                    {savingLocation ? "Simpan..." : "Save Location to Master"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 👥 STAFF MANAGEMENT MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
           <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-slate-900">
                        <UsersRound className="w-8 h-8 text-blue-600" />
                        Team Governance
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Manage personnel access & strategic roles</p>
                 </div>
                 <button onClick={() => setShowStaffModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              {/* ➕ ADD STAFF FORM (Direct Account Creation) */}
              <div className="bg-slate-50 border-b border-slate-200 p-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Provision New Personnel Account</p>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-1">
                          <input 
                              placeholder="Full Name" 
                              value={newStaff.full_name}
                              onChange={e => setNewStaff({...newStaff, full_name: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                          />
                      </div>
                      <div className="md:col-span-1">
                          <input 
                              placeholder="Staff Email" 
                              value={newStaff.email}
                              onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                          />
                      </div>
                      <div className="md:col-span-1">
                          <input 
                              type="password"
                              placeholder="Default Password" 
                              value={newStaff.password}
                              onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                          />
                      </div>
                      <div className="md:col-span-1">
                          <select 
                              value={newStaff.role}
                              onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-[11px] font-black outline-none"
                          >
                              <optgroup label="Core Team">
                                  <option value="superadmin">Superadmin (Pemilik Tenant)</option>
                                  <option value="cs">CS (Pembuat WO / Admin WO)</option>
                                  <option value="admin">Admin (All Can View)</option>
                              </optgroup>
                              <optgroup label="Finance & Accounting">
                                  <option value="finance_manager">Finance Manager</option>
                                  <option value="finance_ar">Finance AR</option>
                                  <option value="finance_ap">Finance AP</option>
                              </optgroup>
                              <optgroup label="SBU Management">
                                  {selectedSbus.includes('trucking') && <option value="cs_trucking">SBU Trucking Admin</option>}
                                  {selectedSbus.includes('customs') && <option value="cs_customs">SBU Customs Admin</option>}
                                  {selectedSbus.includes('forwarding') && <option value="cs_forwarding">SBU Forwarding Admin</option>}
                              </optgroup>
                          </select>
                      </div>
                      <div className="md:col-span-1">
                          <button 
                              onClick={async () => {
                                  if (!newStaff.email || !newStaff.full_name) return toast.error("Lengkapi Nama & Email");
                                  if (!editingStaffId && !newStaff.password) return toast.error("Password wajib untuk akun baru");
                                  
                                  if (!userProfile?.organization_id) return toast.error("Organization ID missing.");
                                  
                                  setAddingStaff(true);
                                  try {
                                      if (editingStaffId) {
                                          // 1. Determine SBU access to sync
                                          let sbuAcc: string[] = [];
                                          if (newStaff.role === 'cs_trucking') sbuAcc = ['trucking'];
                                          else if (newStaff.role === 'cs_customs') sbuAcc = ['clearances'];
                                          else if (newStaff.role === 'cs_forwarding') sbuAcc = ['forwarding'];
                                          else if (['superadmin', 'admin', 'cs'].includes(newStaff.role)) sbuAcc = ['trucking', 'clearances', 'forwarding'];

                                          // 2. Update Profile table
                                          const { error } = await supabase.from('profiles').update({
                                              full_name: newStaff.full_name,
                                              role: newStaff.role,
                                              sbu_access: sbuAcc
                                          }).eq('id', editingStaffId);
                                          if (error) throw error;

                                          // 3. Sync to Auth (Password & Meta)
                                          const upRes = await fetch('/api/admin/update-user', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                  userId: editingStaffId,
                                                  password: newStaff.password, // Will only update if length >= 6
                                                  full_name: newStaff.full_name,
                                                  role: newStaff.role
                                              })
                                          });

                                          if (!upRes.ok) {
                                              toast.error("Profil diperbarui, tapi sinkronisasi Auth gagal. Cek Password.");
                                          } else {
                                              toast.success("Profil & Auth staf diperbarui");
                                          }
                                          setEditingStaffId(null);
                                      } else {
                                          // 1. Check if user already has a profile
                                          const { data: existing } = await supabase.from('profiles').select('id').eq('email', newStaff.email).maybeSingle();
                                          
                                          if (existing) {
                                              let sbuAcc: string[] = [];
                                              if (newStaff.role === 'cs_trucking') sbuAcc = ['trucking'];
                                              else if (newStaff.role === 'cs_customs') sbuAcc = ['clearances'];
                                              else if (newStaff.role === 'cs_forwarding') sbuAcc = ['forwarding'];
                                              else if (['superadmin', 'admin', 'cs'].includes(newStaff.role)) sbuAcc = ['trucking', 'clearances', 'forwarding'];

                                              const { error } = await supabase.from('profiles').update({
                                                  organization_id: userProfile.organization_id,
                                                  role: newStaff.role,
                                                  full_name: newStaff.full_name,
                                                  sbu_access: sbuAcc
                                              }).eq('id', existing.id);
                                              if (error) throw error;
                                          } else {
                                              // 2. Call Management API
                                              const res = await fetch('/api/admin/create-user', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                      email: newStaff.email,
                                                      password: newStaff.password,
                                                      full_name: newStaff.full_name,
                                                      organization_id: userProfile.organization_id,
                                                      role: newStaff.role
                                                  })
                                              });
                                              
                                              if (!res.ok) {
                                                  const errData = await res.json();
                                                  throw new Error(errData.message || "Gagal membuat akun staf");
                                              }
                                          }
                                          toast.success("Akun staf berhasil dibuat.");
                                      }

                                      setNewStaff({ email: '', full_name: '', password: '', role: 'operator' });
                                      fetchStaff(userProfile.organization_id);
                                  } catch (err: any) {
                                      toast.error(err.message);
                                  } finally {
                                      setAddingStaff(false);
                                  }
                              }}
                              disabled={addingStaff}
                              className="w-full bg-blue-600 text-white rounded-xl py-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                              {addingStaff ? <RefreshCw className="w-3 h-3 animate-spin"/> : editingStaffId ? <Save className="w-3 h-3"/> : <UserPlus className="w-3 h-3"/>}
                              {editingStaffId ? "Update Profile" : "Enroll Staff"}
                          </button>
                      </div>
                  </div>
              </div>

              <div className="p-10 overflow-y-auto flex-1">
                 {loadingStaff ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Loading team members...</p>
                    </div>
                 ) : staffList.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                       <UserPlus className="w-16 h-16 mb-4 opacity-10" />
                       <p className="text-sm font-black uppercase tracking-widest opacity-20 text-center">Belum ada staf terdaftar<br/>di organisasi Anda</p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {staffList.map((member) => (
                          <div key={member.id} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-blue-200">
                             <div className="flex items-center gap-5 flex-1">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl font-black text-slate-400 shadow-sm">
                                   {member.full_name?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                   <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-0.5">{member.full_name || 'Anonym User'}</p>
                                   <p className="text-[11px] font-bold text-slate-400 italic lowercase">{member.email}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-4">
                                <div className="text-right hidden md:block">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Role</p>
                                   <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                       (member.role === 'admin' || member.role === 'director') ? 'bg-blue-600 text-white border-blue-600' : 
                                       member.role?.startsWith('finance') ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                       member.role?.startsWith('cs') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                       'bg-slate-100 text-slate-600 border-slate-200'
                                   }`}>
                                       {getRoleDisplayName(member.role)}
                                   </span>
                                </div>

                                <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block" />

                                <div className="flex flex-col gap-1.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Quick Switch Permissions</p>
                                    <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                                        {[
                                            { id: 'admin', label: 'Admin', color: 'hover:bg-blue-600', show: true },
                                            { id: 'director', label: 'Director', color: 'hover:bg-indigo-600', show: true },
                                            { id: 'finance_ar', label: 'AR', color: 'hover:bg-amber-500', show: true },
                                            { id: 'finance_ap', label: 'AP', color: 'hover:bg-amber-600', show: true },
                                            { id: 'cs_trucking', label: 'TRK', color: 'hover:bg-emerald-500', show: activatedSbus.includes('trucking') },
                                            { id: 'cs_customs', label: 'CUS', color: 'hover:bg-emerald-600', show: activatedSbus.includes('customs') },
                                            { id: 'cs_forwarding', label: 'FWD', color: 'hover:bg-indigo-600', show: activatedSbus.includes('forwarding') },
                                            { id: 'viewer', label: 'View', color: 'hover:bg-slate-500', show: true }
                                        ].filter(r => r.show).map((r) => (
                                            <button 
                                                key={r.id}
                                                onClick={() => updateStaffRole(member.id, r.id)}
                                                className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border ${
                                                    member.role === r.id ? 'bg-slate-950 text-white border-slate-950 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:text-white ' + r.color
                                                }`}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                 </div>

                                 <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block" />

                                 <div className="flex items-center gap-2">
                                     <button 
                                         onClick={() => handleEditStaff(member)}
                                         className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                         title="Edit Personnel"
                                     >
                                         <Pencil className="w-4 h-4" />
                                     </button>
                                     <button 
                                         onClick={() => deleteStaffMember(member.id)}
                                         className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                                         title="Delete Personnel"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Total Team Capacity: <b className="text-slate-900">{staffList.length} Personnel</b>
                 </p>
                 <div className="flex gap-4">
                    <button onClick={() => setShowStaffModal(false)} className="text-slate-400 font-black uppercase tracking-widest text-[11px] hover:text-slate-900 transition-colors">Close Control</button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* 🧩 SBU MARKETPLACE MODAL */}
      {showSbuModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
           <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-slate-900">
                        <LayoutGrid className="w-8 h-8 text-emerald-600" />
                        Solution Marketplace
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Activate strategic business units dynamically</p>
                 </div>
                 <button onClick={() => setShowSbuModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="p-10 space-y-6">
                 {[
                    { id: 'trucking', name: 'SBU Trucking', desc: 'Fleet management & trip operations', icon: Truck, color: 'text-blue-600' },
                    { id: 'customs', name: 'SBU Customs', desc: 'Import/Export clearance gateway', icon: Ship, color: 'text-emerald-600' },
                    { id: 'forwarding', name: 'SBU Forwarding', desc: 'Global logistics & consolidation', icon: Globe, color: 'text-indigo-600' }
                 ].map(sbu => (
                    <div key={sbu.id} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-blue-200 transition-all">
                       <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center ${sbu.color} shadow-sm group-hover:scale-110 transition-transform`}>
                             <sbu.icon className="w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-sm font-black uppercase tracking-tight text-slate-900">{sbu.name}</p>
                             <p className="text-[10px] font-bold text-slate-400 italic">{sbu.desc}</p>
                          </div>
                       </div>
                       <button 
                         onClick={async () => {
                            if (!userProfile?.organization_id) return toast.error("Profile not loaded yet");
                            
                            const newSbus = activatedSbus.includes(sbu.id) 
                                ? activatedSbus.filter(i => i !== sbu.id) 
                                : [...activatedSbus, sbu.id];
                            
                            setActivatedSbus(newSbus);
                            // Auto save to DB
                            try {
                                const { error } = await supabase.from('organizations').update({
                                    activated_sbus: newSbus
                                }).eq('id', userProfile.organization_id);
                                if (error) throw error;
                                toast.success(`${sbu.name} ${newSbus.includes(sbu.id) ? 'Activated' : 'Deactivated'}`);
                            } catch (e: any) {
                                toast.error(e.message);
                            }
                         }}
                         className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activatedSbus.includes(sbu.id) ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                         }`}
                       >
                          {activatedSbus.includes(sbu.id) ? 'Active' : 'Get Module'}
                       </button>
                    </div>
                 ))}
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Changes apply instantly to your workspace</p>
                 <button onClick={() => setShowSbuModal(false)} className="bg-slate-900 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Done Setup</button>
              </div>
           </div>
        </div>
      )}
       {/* ❌ REJECT REASON MODAL */}
       {showRejectModal && (
         <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in fade-in zoom-in duration-200">
               <div className="mb-8">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
                     <Ban className="w-7 h-7 text-red-600" />
                     Reject Mission
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Specify official rejection reason</p>
               </div>

               <div className="space-y-6">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Rejection Details / Alasan *</label>
                     <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-200 transition-all min-h-[120px] placeholder:text-slate-300"
                        placeholder="Contoh: Unit tidak tersedia di lokasi tersebut, harga tidak sesuai komitmen, dll..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                     />
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">
                        Cancel
                     </button>
                     <button 
                        onClick={() => handleStatusUpdate(rejectTargetWOId!, 'rejected', rejectReason)}
                        disabled={!rejectReason || loading}
                        className="flex-[2] bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                     </button>
                  </div>
               </div>
            </div>
         </div>
       )}
      </main>

      <script dangerouslySetInnerHTML={{ __html: `
        if (typeof window !== 'undefined' && !window.staffFetched && ${showStaffModal}) {
            window.staffFetched = true;
            // This is a hack because we are inside JSX, better use a real useEffect
        }
      `}} />
    </div>
  );
}

