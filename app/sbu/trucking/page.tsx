"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
    Truck, Package, MapPin, Calendar,
    Loader2, Search,
    CheckCircle2, AlertCircle, Users, Navigation,
    Clock, Activity, Inbox, XCircle, Send,
    Building2, RefreshCw, Plus, Globe, Save, Download,
    Shield, AlertTriangle, Printer, Layers, ChevronRight,
    Map as MapIcon, List, LayoutGrid, PlusCircle, X, Banknote, FileText, Upload,
    Trash2, ShieldCheck, FilePlus2, ArrowRight, ScanLine, Image as ImageIcon, ExternalLink,
    LogOut, User
} from "lucide-react";
import { GoogleMap, MarkerF, DirectionsRenderer } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/google-maps-context";

// Custom Modular Components
import WorkOrderCard from "./components/WorkOrderCard";
import AssignFleetModal from "./components/AssignFleetModal";
import JODetailDrawer from "./components/JODetailDrawer";

// Utils
import { formatThousand, getStatusConfig, getJOStatusBadge, getOperationalStatus } from "./utils";

// =====================================================
// STATIC MAP CONSTANTS
// =====================================================
const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

const MAP_OPTIONS = {
    styles: DARK_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
};

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type WorkOrderItem = {
    id: string;
    work_order_id: string;
    truck_type: string;
    origin_location_id: string;
    destination_location_id: string;
    quantity: number;
    deal_price: number;
    notes?: string;
    assigned_units?: number;
    created_at?: string;
    work_orders?: {
        id: string;
        wo_number: string;
        order_date: string;
        execution_date: string;
        notes: string;
        status?: string;
        physical_doc_received?: boolean;
        customers?: { id: string; name: string; company_name: string; phone: string; billing_method?: 'epod' | 'hardcopy'; };
    };
    origin_location?: {
        id: string; name: string; address: string; city: string;
        district?: string; province?: string;
        latitude?: number | null; longitude?: number | null;
    };
    destination_location?: {
        id: string; name: string; address: string; city: string;
        district?: string; province?: string;
        latitude?: number | null; longitude?: number | null;
    };
    assignments: TruckAssignment[];
};

type TruckAssignment = {
    id: string;
    work_order_item_id: string;
    fleet_id: string;
    driver_id: string;
    jo_number: string;
    driver_link_token: string;
    status: string;
    is_link_sent: boolean;
    assigned_at: string;
    fleet_number: string;
    driver_name: string;
    driver_phone: string;
    vendor_price: number;
    extra_costs: any[];
    cash_advances: any[];
    tracking_updates: any[];
    documents: any[];
    physical_doc_received: boolean;
    physical_doc_files: string[];
    physical_doc_notes: string;
    billing_status: 'none' | 'pending' | 'invoiced' | 'paid';
    latitude?: number;
    longitude?: number;
    dest_lat?: number;
    dest_lng?: number;
    fleets?: any;
    drivers?: any;
    origin?: string;
    destination?: string;
    last_tracking?: {
        id: string;
        location: string;
        status_update: string;
        created_at: string;
    };
};

type FleetMaster = {
    id: string; plate_number: string; truck_type: string;
    truck_brand: string; status: string; company_id: string;
};

type DriverMaster = {
    id: string; name: string; phone: string;
    license_type: string; status: string; company_id: string;
};

type Company = { id: string; name: string; type: string; };

type AssignmentRow = { 
    fleet_id: string; 
    driver_id: string; 
    external_driver_name?: string; 
    external_driver_phone?: string;
    vendor_price: number;
    fee_percentage?: number;
    type: 'own' | 'vendor';
    vendor_id?: string;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function SBUTruckingPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workOrderItems, setWorkOrderItems] = useState<WorkOrderItem[]>([]);
    const [allFleets, setAllFleets] = useState<FleetMaster[]>([]);
    const [allDrivers, setAllDrivers] = useState<DriverMaster[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [truckTypes, setTruckTypes] = useState<{id: string, name: string}[]>([]);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [activeFilter, setActiveFilter] = useState<string>("active");
     const [stats, setStats] = useState({ 
        draft: 0, 
        need_approval: 0, 
        rejected: 0, 
        approved: 0, 
        on_journey: 0, 
        finished: 0, 
        thisWeek: 0,
        ownJOs: 0,
        vendorJOs: 0,
        truckTypeStats: {} as Record<string, number>
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [showMap, setShowMap] = useState(false);
    const [selectedWOItemId, setSelectedWOItemId] = useState<string | null>(null);
    const [handoverWOId, setHandoverWOId] = useState<string | null>(null);
    const [handoverNotes, setHandoverNotes] = useState("");
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 106.8456 });

    // Maps Context
    const { isLoaded } = useGoogleMaps();

    // Modal States
    const [selectedItem, setSelectedItem] = useState<WorkOrderItem | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [formRows, setFormRows] = useState<AssignmentRow[]>([]);
    const [showTransporterModal, setShowTransporterModal] = useState(false);
    const [savingTransporter, setSavingTransporter] = useState(false);
    const [transporterTab, setTransporterTab] = useState<'fleet' | 'driver'>('fleet');
    const [transporterOwner, setTransporterOwner] = useState<'own' | 'vendor'>('own');
    const [transporterView, setTransporterView] = useState<'form' | 'list'>('form');
    const [isTransporterEdit, setIsTransporterEdit] = useState(false);
    const [editingTransporterId, setEditingTransporterId] = useState<string | null>(null);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [transporterSearch, setTransporterSearch] = useState("");
    const [userProfile, setUserProfile] = useState<any>(null);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success("Berhasil keluar!");
            window.location.href = "/login";
        } catch (error: any) {
            toast.error("Gagal keluar: " + error.message);
        }
    };

    const fetchUserProfile = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setUserProfile(data || { email: user.email, role: 'admin_sbu' });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }, []);
    
    // Extra Cost & Advance State
    const [showCostModal, setShowCostModal] = useState(false);
    const [savingCost, setSavingCost] = useState(false);
    const [costForm, setCostForm] = useState({ jo_id: "", cost_type: "Operational", amount: "", description: "", paid_by: "driver" });

    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [savingAdvance, setSavingAdvance] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ jo_id: "", amount: "", description: "" });

    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [selectedJOForCollection, setSelectedJOForCollection] = useState<any>(null);
    const [collectionFiles, setCollectionFiles] = useState<string[]>([]);
    const [collectionNotes, setCollectionNotes] = useState("");
    const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);

    const [showJODetailDrawer, setShowJODetailDrawer] = useState(false);
    const [selectedJOForDetails, setSelectedJOForDetails] = useState<any>(null);

    // Form states for Fleet/Driver
    const [fleetForm, setFleetForm] = useState({ plate_number: "", truck_type: "", truck_brand: "", truck_color: "", year_manufacture: new Date().getFullYear(), status: "active", stnk_expiry: "", plate_expiry: "" });
    const [driverForm, setDriverForm] = useState({ name: "", address: "", phone: "", license_number: "", nik: "", license_type: "B1", license_expiry: "", status: "active" });

    // =====================================================
    // FETCH DATA
    // =====================================================
    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const [itemsRes, fleetsRes, driversRes, companiesRes, truckTypesRes]: any[] = await Promise.all([
                supabase.from("work_order_items").select(`
                    *,
                    work_orders!inner (
                        id, wo_number, order_date, execution_date, notes, status, 
                        physical_doc_received, physical_doc_files, physical_doc_notes, physical_doc_collected_at,
                        customers (id, name, company_name, phone, billing_method)
                    ),
                    origin_location:origin_location_id (id, name, address, city, district, province, latitude, longitude),
                    destination_location:destination_location_id (id, name, address, city, district, province, latitude, longitude),
                    job_orders (
                        id, work_order_item_id, fleet_id, driver_id, jo_number, driver_link_token, status, is_link_sent, created_at,
                        vendor_price, physical_doc_received, billing_status,
                        external_driver_name, external_driver_phone,
                        fleets (plate_number, company_id, truck_type),
                        drivers (id, name, phone, license_type),
                        tracking_updates (*),
                        documents (*),
                        extra_costs (*),
                        cash_advances (*)
                    )
                `).order("created_at", { ascending: false }),
                supabase.from("fleets").select("*") as any,
                supabase.from("drivers").select("*") as any,
                supabase.from("companies").select("*") as any,
                supabase.from("truck_types").select("*").order("name") as any
            ]);

            if (itemsRes.error) throw itemsRes.error;

            const processedItems = (itemsRes.data || []).map((item: any) => {
                const assignments: TruckAssignment[] = (item.job_orders || []).map((jo: any) => ({
                    id: jo.id,
                    work_order_item_id: jo.work_order_item_id,
                    fleet_id: jo.fleet_id,
                    driver_id: jo.driver_id,
                    jo_number: jo.jo_number,
                    driver_link_token: jo.driver_link_token,
                    status: jo.status,
                    is_link_sent: jo.is_link_sent || false,
                    assigned_at: jo.created_at,
                    fleet_number: jo.fleets?.plate_number || "-",
                    driver_name: jo.drivers?.name || "-",
                    vendor_price: jo.vendor_price,
                    physical_doc_received: jo.physical_doc_received || false,
                    billing_status: jo.billing_status || "none",
                    fleets: jo.fleets,
                    drivers: jo.drivers,
                    fleet_number: jo.fleets?.plate_number,
                    driver_name: jo.drivers?.name || jo.external_driver_name || "-",
                    driver_phone: jo.drivers?.phone || jo.external_driver_phone,
                    tracking_updates: jo.tracking_updates || [],
                    documents: jo.documents || [],
                    extra_costs: jo.extra_costs || [],
                    cash_advances: jo.cash_advances || [],
                    origin: item.origin_location?.name,
                    destination: item.destination_location?.name,
                    latitude: item.origin_location?.latitude,
                    longitude: item.origin_location?.longitude,
                    dest_lat: item.destination_location?.latitude,
                    dest_lng: item.destination_location?.longitude,
                    last_tracking: jo.tracking_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null,
                }));
                return { ...item, assignments, assigned_units: assignments.length };
            });

             // BI Stats
            const newStats = { 
                draft: 0, need_approval: 0, approved: 0, on_journey: 0, finished: 0, rejected: 0, thisWeek: 0,
                ownJOs: 0, vendorJOs: 0,
                truckTypeStats: {} as Record<string, number>
            };
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const ownCompanyId = companiesRes.data?.find((c: any) => c.type === 'company')?.id;

            processedItems.forEach((item: any) => {
                const opStatus = getOperationalStatus(item) as keyof typeof newStats;
                if (newStats[opStatus] !== undefined) (newStats[opStatus] as number)++;
                if (item.work_orders?.execution_date && new Date(item.work_orders.execution_date) >= oneWeekAgo) newStats.thisWeek++;

                // JO Assignments Level Stats
                (item.job_orders || []).forEach((jo: any) => {
                    const isOwn = !jo.fleets?.company_id || jo.fleets?.company_id === ownCompanyId;
                    if (isOwn) newStats.ownJOs++;
                    else newStats.vendorJOs++;

                    const tType = item.truck_type || 'Unknown';
                    newStats.truckTypeStats[tType] = (newStats.truckTypeStats[tType] || 0) + 1;
                });
            });

            setWorkOrderItems(processedItems);
            setStats(newStats);
            setAllFleets(fleetsRes.data || []);
            setAllDrivers(driversRes.data || []);
            setAllCompanies(companiesRes.data || []);
            setTruckTypes(truckTypesRes.data || []);
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const protectRoute = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = "/login";
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, sbu_access')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'superadmin' && !(profile?.role === 'admin_sbu' && profile.sbu_access?.includes('trucking'))) {
                toast.error("Akses Ditolak: Anda tidak memiliki otoritas untuk SBU Trucking.");
                window.location.href = "/sbu-launchpad";
            }
        };

        protectRoute();
        fetchData();
        fetchUserProfile();
    }, [fetchData, fetchUserProfile]);

    // =====================================================
    // HANDLERS
    // =====================================================
    const handleAssignUnits = async () => {
        if (!selectedItem) return;
        const validRows = formRows.filter(r => r.fleet_id);
        if (validRows.length === 0) return;

        setAssigning(true);
        try {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const { data: existingJOs } = await supabase.from("job_orders").select("jo_number").like("jo_number", `JO-${today}-%`);
            let seq = (existingJOs?.length || 0) + 1;

            const upserts = validRows.map(row => ({
                ...(row.id ? { id: row.id } : { 
                    jo_number: `JO-${today}-${String(seq++).padStart(3, '0')}`,
                    driver_link_token: crypto.randomUUID(),
                    status: 'assigned'
                }),
                work_order_id: selectedItem.work_order_id,
                work_order_item_id: selectedItem.id,
                fleet_id: row.fleet_id,
                driver_id: row.driver_id || null,
                vendor_price: row.vendor_price || 0,
            }));

            // Use upsert to handle both new and existing entries
            const { error } = await supabase.from("job_orders").upsert(upserts);
            if (error) throw error;
            
            toast.success("Penugasan diperbarui!");
            setShowAssignModal(false);
            fetchData();
        } catch (err: any) {
            toast.error("Gagal: " + err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleSendDriverLinks = async (item: WorkOrderItem, specificJoId?: string) => {
        const targetJOs = specificJoId ? item.assignments.filter(a => a.id === specificJoId) : item.assignments.filter(a => !a.is_link_sent);
        if (targetJOs.length === 0) return;
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
            for (const jo of targetJOs) {
                const phone = jo.driver_phone?.replace(/\D/g, '');
                if (phone) {
                    const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
                    const msg = encodeURIComponent(`Halo ${jo.driver_name}, link tracking Anda: ${baseUrl}/jo/${jo.driver_link_token}`);
                    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
                }
            }
            await (supabase.from("job_orders") as any).update({ is_link_sent: true }).in("id", targetJOs.map(j => j.id));
            if (item.work_orders?.status === 'draft' || item.work_orders?.status === 'pending_sbu') {
                await supabase.from("work_orders").update({ status: 'approved' }).eq("id", item.work_order_id);
            }
            fetchData();
        } catch (err: any) {
            console.error("Link update failed:", err.message);
        }
    };

    const handleHandoverToAdmin = async () => {
        if (!handoverWOId) return;
        try {
            const { error } = await supabase.from("work_orders").update({ status: "pending_armada_check", sbu_handover_notes: handoverNotes }).eq("id", handoverWOId);
            if (error) throw error;
            toast.success("Handover berhasil!");
            setShowHandoverModal(false);
            fetchData();
        } catch (err: any) {
            toast.error("Gagal: " + err.message);
        }
    };

    const handleSaveTransporter = async () => {
        setSavingTransporter(true);
        try {
            const table = transporterTab === 'fleet' ? 'fleets' : 'drivers';
            const formData = transporterTab === 'fleet' ? fleetForm : driverForm;
            const targetCompanyId = transporterOwner === 'vendor' ? selectedVendorId : null;
            let res;
            if (isTransporterEdit && editingTransporterId) {
                res = await (supabase.from(table) as any).update({ ...formData, company_id: targetCompanyId }).eq('id', editingTransporterId);
            } else {
                res = await (supabase.from(table) as any).insert({ ...formData, company_id: targetCompanyId });
            }
            if (res.error) throw res.error;
            toast.success("Data disimpan!");
            setShowTransporterModal(false);
            fetchData();
        } catch (err: any) {
            toast.error("Error: " + err.message);
        } finally {
            setSavingTransporter(false);
        }
    };

    const handleSaveCost = async (shouldClose = true) => {
        const rawAmount = Number(costForm.amount.replace(/\./g, ''));
        try {
            const { error } = await supabase.from("extra_costs").insert([{ jo_id: costForm.jo_id, cost_type: costForm.cost_type, amount: rawAmount, description: costForm.description, paid_by: costForm.paid_by, status: 'draft' }]);
            if (error) throw error;
            toast.success("Biaya masuk draft");
            if (shouldClose) setShowCostModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveAdvance = async () => {
        const rawAmount = Number(advanceForm.amount.replace(/\./g, ''));
        try {
            const { error } = await supabase.from("cash_advances").insert([{ job_order_id: advanceForm.jo_id, amount: rawAmount, description: advanceForm.description, status: 'pending' }]);
            if (error) throw error;
            toast.success("Advance diajukan!");
            setShowAdvanceModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveCollection = async (isFinal: boolean) => {
        if (!selectedJOForCollection) return;
        setIsSubmittingCollection(true);
        try {
            const data: any = { physical_doc_files: collectionFiles, physical_doc_notes: collectionNotes, physical_doc_received: collectionFiles.length > 0 };
            if (isFinal) data.billing_status = 'pending_verification';
            const { error } = await supabase.from("job_orders").update(data).eq("id", selectedJOForCollection.id);
            if (error) throw error;
            toast.success("Dokumen disimpan!");
            setShowCollectionModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmittingCollection(false);
        }
    };

    const fetchLastVendorPrice = async (cid: string, type: string, _orig: string, _dest: string) => {
        // Find a job order that used a fleet from this company with this truck type
        const { data } = await supabase
            .from("job_orders")
            .select("vendor_price")
            .eq("fleets.company_id", cid)
            .eq("work_order_items.truck_type", type)
            .order("created_at", { ascending: false })
            .limit(1);
        return data?.[0]?.vendor_price || 0;
    };

    const getRemainingUnits = (item: WorkOrderItem) => Math.max(0, item.quantity - (item.assigned_units || 0));
    const getAvailableFleets = () => allFleets; // Let the modal handle filtering/status
    const getAvailableDrivers = () => allDrivers;
    const busyFleetDates = new Map<string, Set<string>>();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans pb-32 overflow-x-hidden">
            <Toaster position="top-center" />

            {/* STICKY HEADER */}
            <header className="sticky top-0 z-40 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/5 p-4 md:p-6 transition-all">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform -rotate-12 group">
                            <Truck className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:rotate-12 transition-transform" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">OPS CENTER</h1>
                            <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase opacity-60">SBU Trucking Live Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* SBU Floating Profile */}
                        <div className="hidden md:flex items-center gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 py-2 pl-2 pr-6 rounded-full shadow-2xl mr-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-white uppercase tracking-tighter line-clamp-1">{userProfile?.full_name || 'Operator SBU'}</p>
                                    <p className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">{userProfile?.role?.replace('_', ' ') || 'SBU Trucking'}</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <button
                                onClick={handleLogout}
                                className="group flex items-center gap-2 text-slate-500 hover:text-red-400 transition-all font-bold active:scale-95 text-[10px] uppercase tracking-widest"
                            >
                                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                Logout
                            </button>
                        </div>

                        <button 
                            onClick={() => setShowMap(true)} 
                            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                        >
                            <MapIcon className="w-4 h-4" /> Live Tracking
                        </button>
                        <button 
                            onClick={() => setShowTransporterModal(true)} 
                            className="hidden md:flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest transition-all"
                        >
                            <Users className="w-4 h-4" /> Manage Armada
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                
                {/* BI ANALYTICS HEADER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Mission Execution Funnel */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-white/10 transition-all shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                                    <Activity className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Mission Execution</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase">Approved vs Rejected</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-3xl font-black text-white italic">{stats.approved + stats.on_journey + stats.finished}</span>
                                <span className="text-xs font-black text-rose-500 italic">Rejected: {stats.rejected}</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden flex">
                                {(() => {
                                    const total = (stats.approved + stats.on_journey + stats.finished) + stats.rejected || 1;
                                    const execPerc = ((stats.approved + stats.on_journey + stats.finished) / total) * 100;
                                    return (
                                        <>
                                            <div className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ width: `${execPerc}%` }} />
                                            <div className="h-full bg-rose-500/30" style={{ width: `${100 - execPerc}%` }} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span>Success Rate</span>
                                <span className="text-emerald-400 italic">
                                    {Math.round(((stats.approved + stats.on_journey + stats.finished) / ((stats.approved + stats.on_journey + stats.finished) + stats.rejected || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Transporter Resource Mix */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-white/10 transition-all shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/20 rounded-2xl">
                                    <Layers className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Resource Mix</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase">Own vs Vendor Trucks</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    {(() => {
                                        const total = stats.ownJOs + stats.vendorJOs || 1;
                                        const ownPerc = (stats.ownJOs / total) * 100;
                                        const dashArray = 226; // 2 * pi * 36
                                        const dashOffset = dashArray - (dashArray * ownPerc) / 100;
                                        return (
                                            <>
                                                <circle cx="48" cy="48" r="36" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                                <circle cx="48" cy="48" r="36" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-1000" />
                                            </>
                                        );
                                    })()}
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-lg font-black text-white italic">{stats.ownJOs + stats.vendorJOs}</span>
                                    <span className="text-[8px] font-black text-slate-500 uppercase">JO Units</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span className="text-blue-400">Own Trucks</span>
                                        <span className="text-white italic">{stats.ownJOs}</span>
                                    </div>
                                    <div className="h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(stats.ownJOs / (stats.ownJOs + stats.vendorJOs || 1)) * 100}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span className="text-slate-400">Vendors</span>
                                        <span className="text-white italic">{stats.vendorJOs}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-white/40" style={{ width: `${(stats.vendorJOs / (stats.ownJOs + stats.vendorJOs || 1)) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fleet Utilization - Truck Types */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-white/10 transition-all shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/20 rounded-2xl">
                                    <Truck className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Truck Distribution</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase">Fleet Productivity by Type</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries(stats.truckTypeStats || {}).sort((a, b) => b[1] - a[1]).map(([type, count], idx) => (
                                <div key={type} className="flex items-center gap-4">
                                    <span className="w-12 text-[10px] font-black uppercase text-slate-500">{type}</span>
                                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full opacity-80 ${idx === 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : idx === 1 ? 'bg-amber-500' : 'bg-slate-500'}`} 
                                            style={{ width: `${(count / (Object.values(stats.truckTypeStats).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} 
                                        />
                                    </div>
                                    <span className="w-4 text-[10px] font-black text-white italic text-right">{count}</span>
                                </div>
                            ))}
                            {Object.keys(stats.truckTypeStats).length === 0 && (
                                <p className="text-center py-8 text-[10px] uppercase font-black text-slate-700 italic">No JO Data Found</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* FILTERS & SEARCH */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari WO, Lokasi, atau Customer..."
                            className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all placeholder:text-slate-600 text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                        {['active', 'approved', 'on_journey', 'need_approval', 'finished', 'draft'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`whitespace-nowrap px-6 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${activeFilter === f ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}
                            >
                                {f.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workOrderItems
                        .filter(item => {
                            const term = searchTerm.toLowerCase();
                            const matchesSearch = 
                                item.work_orders?.wo_number?.toLowerCase().includes(term) || 
                                item.work_orders?.customers?.company_name?.toLowerCase().includes(term) ||
                                item.origin_location?.name?.toLowerCase().includes(term) ||
                                item.destination_location?.name?.toLowerCase().includes(term);
                            
                            const opStatus = getOperationalStatus(item);
                            const matchesFilter = activeFilter === 'active' 
                                ? ['draft', 'on_journey', 'need_approval', 'approved'].includes(opStatus) 
                                : opStatus === activeFilter;
                            
                            return matchesSearch && matchesFilter;
                        })
                        .map((item) => (
                            <WorkOrderCard 
                                key={item.id}
                                item={item}
                                formatThousand={formatThousand}
                                onManageAssignments={(item) => {
                                    setSelectedItem(item);
                                    const needed = Math.max(1, item.quantity - (item.assignments?.length || 0));
                                    setFormRows(Array.from({ length: needed }, () => ({ fleet_id: '', driver_id: '', vendor_price: 0, fee_percentage: 10, type: 'own' })));
                                    setShowAssignModal(true);
                                }}
                                onHandover={(item) => {
                                    setHandoverWOId(item.work_order_id);
                                    setShowHandoverModal(true);
                                }}
                                onSendLinks={(item, joId) => handleSendDriverLinks(item, joId)}
                                onViewMap={() => setShowMap(true)}
                                onOpenDetails={(a) => {
                                    setSelectedJOForDetails({ ...a, parentWO: item });
                                    setShowJODetailDrawer(true);
                                }}
                            />
                        ))}
                </div>
            </main>

            {/* BOTTOM NAV */}
            <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50 md:hidden">
                <button onClick={() => setActiveFilter('active')} className={`flex flex-col items-center gap-1.5 ${activeFilter === 'active' ? 'text-emerald-500' : 'text-slate-600'}`}>
                    <LayoutGrid className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Cockpit</span>
                </button>
                <button onClick={() => setShowTransporterModal(true)} className="flex flex-col items-center gap-1.5 text-slate-600">
                    <Truck className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Armada</span>
                </button>
                <div className="-mt-14 relative">
                    <button onClick={() => fetchData()} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl text-white border-4 border-[#0a0f1e]">
                        <RefreshCw className={`w-8 h-8 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <button onClick={() => setActiveFilter('on_journey')} className={`flex flex-col items-center gap-1.5 ${activeFilter === 'on_journey' ? 'text-blue-500' : 'text-slate-600'}`}>
                    <Activity className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Journey</span>
                </button>
                <button onClick={() => setActiveFilter('finished')} className={`flex flex-col items-center gap-1.5 ${activeFilter === 'finished' ? 'text-emerald-500' : 'text-slate-600'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">History</span>
                </button>
            </nav>

            {/* MODALS */}
            <AssignFleetModal 
                show={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                selectedItem={selectedItem}
                getRemainingUnits={getRemainingUnits}
                formRows={formRows}
                setFormRows={setFormRows}
                allCompanies={allCompanies}
                allFleets={allFleets}
                allDrivers={allDrivers}
                busyFleetDates={busyFleetDates}
                getAvailableFleets={getAvailableFleets}
                getAvailableDrivers={getAvailableDrivers}
                fetchLastVendorPrice={fetchLastVendorPrice}
                handleAssignUnits={handleAssignUnits}
                assigning={assigning}
            />

            <JODetailDrawer 
                show={showJODetailDrawer}
                onClose={() => setShowJODetailDrawer(false)}
                jo={selectedJOForDetails}
                isLoaded={isLoaded}
                mapOptions={MAP_OPTIONS}
                getJOStatusBadge={getJOStatusBadge}
                onAddCost={(id) => { setCostForm({ ...costForm, jo_id: id }); setShowCostModal(true); }}
                onAddAdvance={(id) => { setAdvanceForm({ ...advanceForm, jo_id: id }); setShowAdvanceModal(true); }}
                onCollectDocs={(jo) => { setSelectedJOForCollection(jo); setCollectionFiles(jo.physical_doc_files || []); setCollectionNotes(jo.physical_doc_notes || ""); setShowCollectionModal(true); }}
                onSendLink={(joId) => handleSendDriverLinks(selectedJOForDetails?.parentWO, joId)}
                onEdit={(item, joId) => {
                    setSelectedItem(item);
                    // Filter assignments to only the specific JO if joId is provided
                    const targetAssignments = joId 
                        ? item.assignments?.filter((a: any) => a.id === joId) 
                        : item.assignments;

                    const rows = targetAssignments?.map((a: any) => ({
                        id: a.id,
                        fleet_id: a.fleet_id || '',
                        driver_id: a.driver_id || '',
                        external_driver_name: a.external_driver_name || '',
                        external_driver_phone: a.external_driver_phone || '',
                        vendor_price: a.vendor_price || 0,
                        fee_percentage: 10,
                        type: (a.driver_id?.startsWith('ext_') || a.external_driver_name) ? 'vendor' : 'own'
                    })) || [];
                    setFormRows(rows);
                    setShowAssignModal(true);
                }}
            />

            {/* TRANSPORTER MODAL */}
            {showTransporterModal && (
                <div className="fixed inset-0 bg-[#0a0f1e]/95 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#151f32] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative">
                        <button onClick={() => setShowTransporterModal(false)} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors">
                            <XCircle className="w-7 h-7" />
                        </button>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase italic text-white">Manage Armada / Driver</h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setTransporterView('form'); setIsTransporterEdit(false); setEditingTransporterId(null); setFleetForm({ plate_number: "", truck_type: "", truck_brand: "", truck_color: "", year_manufacture: new Date().getFullYear(), status: "active", stnk_expiry: "", plate_expiry: "" }); setDriverForm({ name: "", address: "", phone: "", license_number: "", nik: "", license_type: "B1", license_expiry: "", status: "active" }); }} 
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${transporterView === 'form' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                >
                                    {isTransporterEdit ? 'Edit Form' : 'Buat Baru'}
                                </button>
                                <button 
                                    onClick={() => setTransporterView('list')} 
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${transporterView === 'list' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                >
                                    Lihat List
                                </button>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder={`Cari ${transporterTab === 'fleet' ? 'Armada' : 'Driver'}...`}
                                className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
                                value={transporterSearch}
                                onChange={e => setTransporterSearch(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
                                {[{ k: 'own', l: 'Sendiri' }, { k: 'vendor', l: 'Vendor' }].map(({ k, l }) => (
                                    <button key={k} onClick={() => setTransporterOwner(k as 'own' | 'vendor')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${transporterOwner === k ? (k === 'own' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white') : 'text-slate-600'}`}>{l}</button>
                                ))}
                            </div>

                            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
                                {[{ k: 'fleet', l: 'Armada' }, { k: 'driver', l: 'Driver' }].map(({ k, l }) => (
                                    <button key={k} onClick={() => { setTransporterTab(k as 'fleet' | 'driver'); setTransporterSearch(""); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${transporterTab === k ? (k === 'fleet' ? 'bg-amber-500 text-black' : 'bg-purple-600 text-white') : 'text-slate-600'}`}>{l}</button>
                                ))}
                            </div>
                        </div>

                        {transporterView === 'form' ? (
                            <>
                                {transporterOwner === 'vendor' && (
                                    <div className="mb-6">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Pilih Vendor</label>
                                        <select 
                                            value={selectedVendorId} 
                                            onChange={e => setSelectedVendorId(e.target.value)}
                                            className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-black uppercase text-xs"
                                        >
                                            <option value="">-- Semua Vendor --</option>
                                            {allCompanies.filter(c => c.type === 'vendor').map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {transporterTab === 'fleet' ? (
                                        <>
                                            <div className="space-y-4">
                                                <input type="text" placeholder="Plat Nomor (ex: B 1234 ABC)" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={fleetForm.plate_number} onChange={e => setFleetForm({...fleetForm, plate_number: e.target.value.toUpperCase()})} />
                                                <input type="text" placeholder="Tipe Truk (ex: CDE, Fuso)" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={fleetForm.truck_type} onChange={e => setFleetForm({...fleetForm, truck_type: e.target.value})} />
                                                <input type="text" placeholder="Merk (ex: Hino, Isuzu)" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={fleetForm.truck_brand} onChange={e => setFleetForm({...fleetForm, truck_brand: e.target.value})} />
                                            </div>
                                            <div className="space-y-4">
                                                <input type="text" placeholder="Warna" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={fleetForm.truck_color} onChange={e => setFleetForm({...fleetForm, truck_color: e.target.value})} />
                                                <input type="number" placeholder="Tahun" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={fleetForm.year_manufacture} onChange={e => setFleetForm({...fleetForm, year_manufacture: parseInt(e.target.value)})} />
                                                <select value={fleetForm.status} onChange={e => setFleetForm({...fleetForm, status: e.target.value})} className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white">
                                                    <option value="active">Active</option>
                                                    <option value="maintenance">Maintenance</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-4">
                                                <input type="text" placeholder="Nama Lengkap" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                                                <input type="text" placeholder="Nomor HP" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
                                                <input type="text" placeholder="Alamat" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={driverForm.address} onChange={e => setDriverForm({...driverForm, address: e.target.value})} />
                                            </div>
                                            <div className="space-y-4">
                                                <input type="text" placeholder="Nomor SIM" className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-700" value={driverForm.license_number} onChange={e => setDriverForm({...driverForm, license_number: e.target.value})} />
                                                <select value={driverForm.license_type} onChange={e => setDriverForm({...driverForm, license_type: e.target.value})} className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white">
                                                    <option value="A">SIM A</option>
                                                    <option value="B1">SIM B1</option>
                                                    <option value="B2">SIM B2</option>
                                                </select>
                                                <select value={driverForm.status} onChange={e => setDriverForm({...driverForm, status: e.target.value})} className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 text-white">
                                                    <option value="active">Active</option>
                                                    <option value="off">Off Duty</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button onClick={handleSaveTransporter} className={`mt-8 w-full ${isTransporterEdit ? 'bg-amber-600' : 'bg-emerald-600'} py-4 rounded-xl font-black uppercase text-white shadow-lg transition-all active:scale-[0.98]`}>
                                    {savingTransporter ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : (isTransporterEdit ? "Update Data" : "Simpan Data")}
                                </button>
                            </>
                        ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {transporterTab === 'fleet' ? (
                                    allFleets
                                        .filter(f => {
                                            const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
                                            const isInternal = !f.company_id || f.company_id === ownCompanyId;
                                            const matchesSearch = f.plate_number.toLowerCase().includes(transporterSearch.toLowerCase()) || 
                                                                 (f.truck_type || '').toLowerCase().includes(transporterSearch.toLowerCase());
                                            
                                            if (transporterOwner === 'own') return isInternal && matchesSearch;
                                            
                                            // Vendor Mode logic
                                            if (selectedVendorId) {
                                                return f.company_id === selectedVendorId && matchesSearch;
                                            }
                                            return !isInternal && matchesSearch;
                                        }).length > 0 ? (
                                            allFleets
                                                .filter(f => {
                                                    const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
                                                    const isInternal = !f.company_id || f.company_id === ownCompanyId;
                                                    const matchesSearch = f.plate_number.toLowerCase().includes(transporterSearch.toLowerCase()) || 
                                                                        (f.truck_type || '').toLowerCase().includes(transporterSearch.toLowerCase());
                                                    
                                                    if (transporterOwner === 'own') return isInternal && matchesSearch;
                                                    if (selectedVendorId) return f.company_id === selectedVendorId && matchesSearch;
                                                    return !isInternal && matchesSearch;
                                                })
                                                .map(f => (
                                                    <div key={f.id} className="flex justify-between items-center bg-[#0a0f1e] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                                <Truck className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white">{f.plate_number}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{f.truck_type} • {f.status}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setFleetForm({ ...f } as any);
                                                                setEditingTransporterId(f.id);
                                                                setIsTransporterEdit(true);
                                                                setTransporterView('form');
                                                                setSelectedVendorId(f.company_id || "");
                                                            }}
                                                            className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase rounded-lg"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="text-center py-12 text-slate-600">
                                                <Truck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                <p className="text-xs font-black uppercase italic">Tidak ada armada ditemukan</p>
                                            </div>
                                        )
                                ) : (
                                    allDrivers
                                        .filter(d => {
                                            const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
                                            const isInternal = !d.company_id || d.company_id === ownCompanyId;
                                            const matchesSearch = d.name.toLowerCase().includes(transporterSearch.toLowerCase()) || 
                                                                (d.phone || '').includes(transporterSearch);
                                            
                                            if (transporterOwner === 'own') return isInternal && matchesSearch;
                                            
                                            if (selectedVendorId) return d.company_id === selectedVendorId && matchesSearch;
                                            return !isInternal && matchesSearch;
                                        }).length > 0 ? (
                                            allDrivers
                                                .filter(d => {
                                                    const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
                                                    const isInternal = !d.company_id || d.company_id === ownCompanyId;
                                                    const matchesSearch = d.name.toLowerCase().includes(transporterSearch.toLowerCase()) || 
                                                                        (d.phone || '').includes(transporterSearch);
                                                    
                                                    if (transporterOwner === 'own') return isInternal && matchesSearch;
                                                    if (selectedVendorId) return d.company_id === selectedVendorId && matchesSearch;
                                                    return !isInternal && matchesSearch;
                                                })
                                                .map(d => (
                                                    <div key={d.id} className="flex justify-between items-center bg-[#0a0f1e] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white">{d.name}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{d.phone} • {d.license_type}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setDriverForm({ ...d } as any);
                                                                setEditingTransporterId(d.id);
                                                                setIsTransporterEdit(true);
                                                                setTransporterView('form');
                                                                setSelectedVendorId(d.company_id || "");
                                                            }}
                                                            className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase rounded-lg"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="text-center py-12 text-slate-600">
                                                <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                <p className="text-xs font-black uppercase italic">Tidak ada driver ditemukan</p>
                                            </div>
                                        )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* EXTRA COST MODAL */}
            {showCostModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
                    <div className="bg-[#151f32] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative">
                        <button onClick={() => setShowCostModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                        <h2 className="text-xl font-black uppercase italic text-white mb-6">Pengajuan Biaya</h2>
                        <div className="space-y-4">
                            <select value={costForm.cost_type} onChange={e => setCostForm({...costForm, cost_type: e.target.value})} className="w-full bg-[#0a0f1e] text-white border border-white/10 p-4 rounded-xl">
                                {['Operational', 'Overtime', 'Toll/Parkir', 'Lain-lain'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input type="text" placeholder="Rp 0" value={costForm.amount} onChange={e => setCostForm({...costForm, amount: formatThousand(e.target.value)})} className="w-full bg-[#0a0f1e] text-white border border-white/10 p-4 rounded-xl font-black" />
                            <textarea placeholder="Keterangan..." value={costForm.description} onChange={e => setCostForm({...costForm, description: e.target.value})} className="w-full bg-[#0a0f1e] text-white border border-white/10 p-4 rounded-xl h-24" />
                            <button onClick={() => handleSaveCost()} className="w-full bg-emerald-600 py-4 rounded-xl font-black uppercase text-white shadow-lg">Submit Biaya</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HANDOVER MODAL */}
            {showHandoverModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
                    <div className="bg-[#151f32] border border-white/10 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
                        <h2 className="text-xl font-black uppercase italic mb-6">Handover ke Admin</h2>
                        <textarea value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Catatan handover..." className="w-full bg-[#0a0f1e] border border-white/10 rounded-2xl p-4 text-xs text-white h-32 mb-6" />
                        <div className="flex gap-4">
                            <button onClick={() => setShowHandoverModal(false)} className="flex-1 py-3 text-slate-500 uppercase font-black">Batal</button>
                            <button onClick={handleHandoverToAdmin} className="flex-2 bg-amber-500 py-3 px-8 rounded-xl font-black text-black uppercase shadow-lg shadow-amber-500/20">Konfirmasi</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* CASH ADVANCE MODAL */}
            {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
                    <div className="bg-[#151f32] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setShowAdvanceModal(false)} className="absolute top-6 right-6 text-slate-500"><XCircle className="w-8 h-8" /></button>
                        <h2 className="text-xl font-black uppercase italic text-white mb-6">Cash Advance</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Rp 0" value={advanceForm.amount} onChange={e => setAdvanceForm({...advanceForm, amount: formatThousand(e.target.value)})} className="w-full bg-[#0a0f1e] text-white border border-white/10 p-4 rounded-xl font-black" />
                            <textarea placeholder="Keterangan..." value={advanceForm.description} onChange={e => setAdvanceForm({...advanceForm, description: e.target.value})} className="w-full bg-[#0a0f1e] text-white border border-white/10 p-4 rounded-xl h-24" />
                            <button onClick={handleSaveAdvance} className="w-full bg-emerald-600 py-4 rounded-xl font-black uppercase text-white shadow-lg">Ajukan Advance</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* COLLECTION MODAL */}
            {showCollectionModal && selectedJOForCollection && (
                <div className="fixed inset-0 bg-[#0a0f1e]/98 backdrop-blur-xl flex items-center justify-center z-[500] p-4">
                    <div className="bg-[#151f32] border border-white/10 p-10 rounded-[3.5rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
                        <button onClick={() => setShowCollectionModal(false)} className="absolute top-10 right-10 text-slate-600 hover:text-white"><XCircle className="w-10 h-10" /></button>
                        <h2 className="text-2xl font-black uppercase italic text-center mb-10 text-white">Proof of Delivery (Hardcopy)</h2>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                            {collectionFiles.map((url, idx) => (
                                <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-black">
                                    <img src={url} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all">
                                <Plus className="w-8 h-8 text-slate-500" />
                                <span className="text-[10px] font-black uppercase text-slate-500">Add Photo</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                                    const files = e.target.files; if (!files) return;
                                    const newUrls = [];
                                    for (let i = 0; i < files.length; i++) {
                                        const file = files[i];
                                        const { data, error } = await supabase.storage.from('pod_documents').upload(`phys_${Date.now()}_${i}`, file);
                                        if (data) {
                                            const { data: { publicUrl } } = supabase.storage.from('pod_documents').getPublicUrl(data.path);
                                            newUrls.push(publicUrl);
                                        }
                                    }
                                    setCollectionFiles([...collectionFiles, ...newUrls]);
                                }} />
                            </label>
                        </div>

                        <textarea value={collectionNotes} onChange={e => setCollectionNotes(e.target.value)} placeholder="Catatan dokumen..." className="w-full bg-[#0a0f1e] border border-white/10 rounded-2xl p-4 text-white mb-8 h-24" />
                        
                        <div className="flex gap-4">
                            <button onClick={() => handleSaveCollection(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase">Simpan Draft</button>
                            <button onClick={() => handleSaveCollection(true)} className="flex-1 py-4 bg-amber-500 text-black rounded-2xl font-black uppercase shadow-lg shadow-amber-500/20">Finalize & Submit</button>
                        </div>
                    </div>
                </div>
            )}
             {/* LIVE TRACKING MODAL */}
            {showMap && (
                <div className="fixed inset-0 z-[600] bg-[#0a0f1e]">
                    <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center bg-[#151f32]/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-2xl">
                                <Activity className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase italic">Fleet Live Tracking</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    Monitoring {workOrderItems.flatMap(i => i.assignments).filter(a => a.status === 'on_journey').length} Units Active
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowMap(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="w-full h-full">
                        {!isLoaded ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Initializing Map Interface...</p>
                            </div>
                        ) : (
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                center={{ lat: -6.2088, lng: 106.8456 }}
                                zoom={11}
                                options={{
                                    styles: [
                                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                                        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                                        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                                        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                                        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                                    ],
                                    disableDefaultUI: true,
                                    zoomControl: true,
                                }}
                            >
                                {workOrderItems.flatMap(i => i.assignments || []).filter(a => a.status === 'on_journey').map(a => {
                                    const latestPoint = a.tracking_updates?.sort((x: any, y: any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];
                                    if (!latestPoint || !latestPoint.location) return null;
                                    const [lat, lng] = latestPoint.location.split(',').map((c: any) => parseFloat(c.trim()));
                                    if (isNaN(lat) || isNaN(lng)) return null;

                                    return (
                                        <MarkerF
                                            key={a.id}
                                            position={{ lat, lng }}
                                            label={{
                                                text: a.fleets?.plate_number || 'Unknown',
                                                color: 'white',
                                                fontSize: '10px',
                                                fontWeight: '900',
                                                className: 'mb-8 bg-black/80 px-2 py-1 rounded shadow-lg border border-white/20'
                                            }}
                                            icon={{
                                                path: "M20 7h-9l-3-3h-5c-1.104 0-2 .896-2 2v10c0 1.104.896 2 2 2h17l3-3v-8c0-1.104-.896-2-2-2z", // Simple folder-like path but used as proxy for truck
                                                fillColor: "#3b82f6",
                                                fillOpacity: 1,
                                                scale: 1,
                                                strokeColor: "white",
                                                strokeWeight: 1,
                                            }}
                                        />
                                    );
                                })}
                            </GoogleMap>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
