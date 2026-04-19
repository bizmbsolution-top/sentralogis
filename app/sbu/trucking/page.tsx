"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
    Loader2, ArrowLeft, ArrowRight, Home, LayoutGrid, Truck, Wallet, PlusCircle, AlertTriangle, CheckCircle2, MapPin, RotateCcw, XCircle, ShieldCheck
} from "lucide-react";
import { useGoogleMaps } from "@/lib/google-maps-context";
import Link from "next/link";

// Custom Modular Components
import WorkOrderCard from "./components/WorkOrderCard";
import AssignFleetModal from "./components/AssignFleetModal";
import JODetailDrawer from "./components/JODetailDrawer";
import HandoverSbuModal from "./components/HandoverSbuModal";
import HandoverModal from "./components/HandoverModal";
import TruckingHeader from "./components/TruckingHeader";
import TruckingHero from "./components/TruckingHero";
import MissionOverview from "./components/MissionOverview";
import CostModal from "./components/CostModal";
import VendorInvoiceModal from "./components/VendorInvoiceModal";
import AdvanceModal from "./components/AdvanceModal";
import PhysicalDocModal from "./components/PhysicalDocModal";

// Utils
import { formatThousand, getJOStatusBadge } from "./utils";

// =====================================================
// TYPE DEFINITIONS
// =====================================================
export type WorkOrderItem = {
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
    _category?: string;
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

export type TruckAssignment = {
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

type AssignmentRow = { 
    id?: string;
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
export default function SBUTruckingPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workOrderItems, setWorkOrderItems] = useState<WorkOrderItem[]>([]);
    const [allFleets, setAllFleets] = useState<any[]>([]);
    const [allDrivers, setAllDrivers] = useState<any[]>([]);
    const [allCompanies, setAllCompanies] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [truckTypes, setTruckTypes] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null);

    // Dynamic Branding State
    const [tenantInfo, setTenantInfo] = useState({ name: 'Subsidiary Loading...', logo: null as string | null, mission_credits: 0, id: '' });

    // UI State
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [stats, setStats] = useState({ 
        cat1_new_wo: 0, 
        cat2_handovers: 0, 
        cat3_approved: 0, 
        cat4_active_journey: 0, 
        cat5_settlement: 0, 
        cat6_rejected: 0,
        cat7_billing_revision: 0,
        ownJOs: 0, vendorJOs: 0, truckTypeStats: {} as Record<string, number>
    });
    const [searchTerm, setSearchTerm] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [showMap, setShowMap] = useState(false);
    const [selectedItemForHandover, setSelectedItemForHandover] = useState<WorkOrderItem | null>(null);
    const [showHandoverModal, setShowHandoverModal] = useState(false);

    const [selectedItemForSbuHandover, setSelectedItemForSbuHandover] = useState<WorkOrderItem | null>(null);
    const [showSbuHandoverModal, setShowSbuHandoverModal] = useState(false);
    const [submittingSbuHandover, setSubmittingSbuHandover] = useState(false);

    // Maps Context
    const { isLoaded } = useGoogleMaps();

    const [showJODetailDrawer, setShowJODetailDrawer] = useState(false);
    const [selectedJOForDetails, setSelectedJOForDetails] = useState<any>(null);

    const [showCostModal, setShowCostModal] = useState(false);
    const [costForm, setCostForm] = useState({ jo_id: "", cost_type: "Operational", amount: "", description: "", paid_to: "vendor" });

    const [showVendorInvoiceModal, setShowVendorInvoiceModal] = useState(false);
    const [vendorInvoiceForm, setVendorInvoiceForm] = useState({ jo_id: "", invoice_number: "", amount: "", file_url: "" });

    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceForm, setAdvanceForm] = useState<any>({ jo_id: "", amount: "", description: "", paid_by: "sbu_trucking", context: null });

    const [showPhysicalDocModal, setShowPhysicalDocModal] = useState(false);
    const [selectedJOForVerification, setSelectedJOForVerification] = useState<any>(null);

    // Modal States
    const [isSingleEdit, setIsSingleEdit] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WorkOrderItem | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [formRows, setFormRows] = useState<AssignmentRow[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = "/";
        } catch (error: any) {
            toast.error("Logout failed: " + error.message);
        }
    };

    // =====================================================
    // FETCH DATA logic
    // =====================================================
    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*, organizations(*)')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setUserProfile(profile);
                    const activeOrg = profile.organizations;

                if (activeOrg) {
                    setTenantInfo({
                        name: activeOrg.name || 'Enterprise Client',
                        logo: activeOrg.logo_url,
                        mission_credits: Number(activeOrg.mission_credits) || 0,
                        id: activeOrg.id
                    });

                    const [itemsRes, fleetsRes, driversRes, companiesRes, truckTypesRes]: any[] = await Promise.all([
                        supabase.from("work_order_items").select(`
                            *,
                            work_orders!inner (
                                id, wo_number, order_date, execution_date, notes, status, organization_id,
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
                        `).eq('work_orders.organization_id', activeOrg.id).order("created_at", { ascending: false }),
                        supabase.from("fleets").select("*").eq('organization_id', activeOrg.id),
                        supabase.from("drivers").select("*").eq('organization_id', activeOrg.id),
                        supabase.from("companies").select("*").eq('organization_id', activeOrg.id),
                        supabase.from("truck_types").select("*").order("name")
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
                            driver_name: jo.drivers?.name || jo.external_driver_name || "-",
                            vendor_price: jo.vendor_price,
                            physical_doc_received: jo.physical_doc_received || false,
                            billing_status: jo.billing_status || "none",
                            fleets: jo.fleets,
                            drivers: jo.drivers,
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

                    const newStats = { 
                        cat1_new_wo: 0, cat2_handovers: 0, cat3_approved: 0, cat4_active_journey: 0, cat5_settlement: 0, cat6_rejected: 0,
                        cat7_billing_revision: 0,
                        ownJOs: 0, vendorJOs: 0, truckTypeStats: {} as Record<string, number>
                    };
                    const ownCompanyId = companiesRes.data?.find((c: any) => c.type === 'company')?.id;

                    processedItems.forEach((item: any) => {
                        const status = item.work_orders?.status;
                        const assignments = item.assignments || [];
                        const nonDraftCount = assignments.filter((a: any) => a.status !== 'draft').length;

                        let hasActive = false;
                        let hasSettlement = false;
                        let hasRevision = false;
                        
                        assignments.forEach((jo: any) => {
                            if (jo.billing_status === 'rejected') hasRevision = true;
                            if (['accepted', 'picking_up', 'delivering'].includes(jo.status)) hasActive = true;
                            else if (jo.status === 'delivered') hasSettlement = true;
                        });

                        if (status === 'rejected') {
                            newStats.cat6_rejected++;
                            item._category = 'rejected';
                        } else if (hasRevision) {
                            newStats.cat7_billing_revision++;
                            item._category = 'billing_revision';
                        } else if (hasSettlement) {
                            newStats.cat5_settlement++;
                            item._category = 'settlement';
                        } else if (hasActive) {
                            newStats.cat4_active_journey++;
                            item._category = 'active_journey';
                        } else if (status === 'pending_armada_check') {
                            newStats.cat2_handovers++;
                            item._category = 'handovers';
                        } else if (status === 'approved' || (nonDraftCount > 0 && nonDraftCount >= item.quantity)) {
                            newStats.cat3_approved++;
                            item._category = 'approved';
                        } else {
                            newStats.cat1_new_wo++;
                            item._category = 'new_wo';
                        }
                        
                        (item.assignments || []).forEach((jo: any) => {
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
                } else {
                    setWorkOrderItems([]);
                }
            }
        }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssignUnits = async (mode: 'draft' | 'handover' | 'finalize') => {
        if (!selectedItem || !userProfile?.organizations) return;
        setAssigning(true);
        try {
            const newJOsCount = formRows.filter(r => r.fleet_id && !r.id).length;
            const currentCredits = userProfile.organizations.mission_credits || 0;

            // Define statuses based on mode
            const joStatus = mode === 'finalize' ? 'approved' : mode === 'draft' ? 'draft' : 'assigned';
            const woStatus = mode === 'handover' ? 'pending_armada_check' : mode === 'finalize' ? 'approved' : undefined;

            if (mode === 'finalize' && newJOsCount > 0 && currentCredits < newJOsCount) {
                throw new Error(`Saldo Kredit Tidak Cukup! Butuh ${newJOsCount} Kredit untuk Deploy, Saldo Anda ${currentCredits}.`);
            }

            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const upserts = formRows.filter(r => r.fleet_id).map((row) => ({
                ...(row.id ? { id: row.id } : { 
                    jo_number: `JO-${today}-${Math.random().toString(36).substring(7)}`,
                    driver_link_token: crypto.randomUUID()
                }),
                status: joStatus,
                work_order_id: selectedItem.work_order_id,
                work_order_item_id: selectedItem.id,
                fleet_id: row.fleet_id,
                driver_id: row.driver_id || null,
                vendor_price: row.vendor_price || 0,
                organization_id: userProfile.organization_id
            }));

            // 1. Upsert Job Orders
            const { error: joError } = await supabase.from("job_orders").upsert(upserts);
            if (joError) throw joError;

            // 2. Update Work Order status if needed
            if (woStatus) {
                const { error: woError } = await supabase.from("work_orders").update({ status: woStatus }).eq("id", selectedItem.work_order_id);
                if (woError) throw woError;
            }

            // 3. Deduct credits if finalizing
            if (mode === 'finalize' && newJOsCount > 0) {
                const { error: creditError } = await supabase.from('organizations').update({ mission_credits: currentCredits - newJOsCount }).eq('id', userProfile.organization_id);
                if (creditError) throw creditError;
            }

            toast.success(mode === 'draft' ? "Progress Saved as Draft!" : mode === 'handover' ? "Submitted to Admin WO!" : "Deployment Finalized & Approved!");
            setShowAssignModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleApproveJO = async (jo: any) => {
        if (!userProfile?.organizations) return;
        const currentCredits = userProfile.organizations.mission_credits || 0;

        if (currentCredits < 1) {
            toast.error("Saldo Kredit Tidak Cukup! Silakan Top-up.");
            return;
        }

        try {
            const { error: joError } = await supabase.from('job_orders').update({ status: 'approved' }).eq('id', jo.id);
            if (joError) throw joError;
            const { error: creditError } = await supabase.from('organizations').update({ mission_credits: currentCredits - 1 }).eq('id', userProfile.organization_id);
            if (creditError) throw creditError;

            toast.success("Job Order Approved & 1 Credit Deducted!");
            if (showJODetailDrawer) setShowJODetailDrawer(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleRejectJO = async (jo: any) => {
        try {
            const { error } = await supabase.from('job_orders').update({ status: 'rejected' }).eq('id', jo.id);
            if (error) throw error;
            toast.success("Job Order Rejected.");
            if (showJODetailDrawer) setShowJODetailDrawer(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSubmitSbuHandover = async (reason: string) => {
        if (!selectedItemForSbuHandover || !selectedItemForSbuHandover.work_orders?.id) return;
        setSubmittingSbuHandover(true);
        try {
            const wo = selectedItemForSbuHandover.work_orders;
            const existingNotes = wo.notes ? wo.notes + '\n\n' : '';
            const newNotes = existingNotes + `[SBU Handovers Negotiation]: ${reason}`;

            const { error } = await supabase.from('work_orders').update({ status: 'pending_armada_check', notes: newNotes }).eq('id', wo.id);
            if (error) throw error;
            toast.success("Return negosiasi dikirim ke Admin WO!");
            setShowSbuHandoverModal(false);
            fetchData();
        } catch (err: any) {
            toast.error("Gagal melakukan handover: " + err.message);
        } finally {
            setSubmittingSbuHandover(false);
        }
    };

    const handleSendDriverLinks = async (item: WorkOrderItem, specificJoId?: string) => {
        const targetJOs = specificJoId ? item.assignments.filter(a => a.id === specificJoId) : item.assignments.filter(a => !a.is_link_sent);
        if (targetJOs.length === 0) return;
        try {
            const baseUrl = window.location.origin;
            for (const jo of targetJOs) {
                const phone = jo.driver_phone?.replace(/\D/g, '');
                if (phone) {
                    const msg = encodeURIComponent(`Halo ${jo.driver_name}, link tracking Anda: ${baseUrl}/jo/${jo.driver_link_token}`);
                    window.open(`https://wa.me/${phone.startsWith('0') ? '62' + phone.slice(1) : phone}?text=${msg}`, '_blank');
                }
            }
            await (supabase.from("job_orders") as any).update({ is_link_sent: true }).in("id", targetJOs.map(j => j.id));
            fetchData();
        } catch (err: any) { console.error(err); }
    };

    const handleSaveCost = async (shouldClose = true) => {
        const rawAmount = Number(costForm.amount.replace(/\D/g, ''));
        try {
            const { error } = await supabase.from("extra_costs").insert([{ jo_id: costForm.jo_id, cost_type: costForm.cost_type, amount: rawAmount, description: costForm.description, paid_to: costForm.paid_to, status: 'draft' }]);
            if (error) throw error;
            toast.success("Settlement Payee ditambahkan.");
            if (shouldClose) setShowCostModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveVendorInvoice = async () => {
        const rawAmount = Number(vendorInvoiceForm.amount.replace(/\D/g, ''));
        try {
            const { error } = await supabase.from("job_orders").update({
                vendor_invoice_number: vendorInvoiceForm.invoice_number,
                vendor_invoice_amount: rawAmount,
                vendor_invoice_url: vendorInvoiceForm.file_url,
                finance_status: 'submitted'
            }).eq("id", vendorInvoiceForm.jo_id);
            if (error) throw error;
            toast.success("Invoice Vendor Diserahkan!");
            setShowVendorInvoiceModal(false);
            if (showJODetailDrawer) setShowJODetailDrawer(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSaveAdvance = async () => {
        const rawAmount = Number(advanceForm.amount.replace(/\D/g, ''));
        try {
            const { error } = await supabase.from("cash_advances").insert([{ job_order_id: advanceForm.jo_id, amount: rawAmount, description: advanceForm.description, paid_by: advanceForm.paid_by, status: 'pending' }]);
            if (error) throw error;
            toast.success("Pengajuan Kasbon dikirim.");
            setShowAdvanceModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSubmitToFinance = async (jo: any) => {
        try {
            const { error } = await supabase.from("job_orders").update({ physical_doc_received: true, billing_status: 'invoiced' }).eq("id", jo.id);
            if (error) throw error;
            toast.success("Settlement & Dokumen disubmit ke Finance!");
            fetchData();
            setShowJODetailDrawer(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleVerifyPhysicalDoc = async (data: { files: string[], notes: string }) => {
        if (!selectedJOForVerification) return;
        try {
            const { error } = await supabase.from("job_orders").update({
                physical_doc_received: true,
                physical_doc_files: data.files,
                physical_doc_notes: data.notes,
                physical_doc_collected_at: new Date().toISOString()
            }).eq("id", selectedJOForVerification.id);

            if (error) throw error;
            toast.success("Physical Documents Verified!");
            setShowPhysicalDocModal(false);
            if (showJODetailDrawer) {
                // Refresh local state for drawer
                setSelectedJOForDetails({
                    ...selectedJOForDetails,
                    physical_doc_received: true,
                    physical_doc_files: data.files,
                    physical_doc_notes: data.notes,
                    physical_doc_collected_at: new Date().toISOString()
                });
            }
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        </div>
    );

    const categories = [
        { id: 'new_wo', label: 'Awaiting Assignment', desc: 'WO Baru, Butuh Armada', count: stats.cat1_new_wo, text: 'text-orange-600', bg: 'bg-white', border: 'border-orange-500', icon: PlusCircle, dot: 'bg-orange-500' },
        { id: 'handovers', label: 'Handovers Approval', desc: 'Negosiasi via WO Admin', count: stats.cat2_handovers, text: 'text-amber-600', bg: 'bg-white', border: 'border-amber-400', icon: AlertTriangle, dot: 'bg-amber-400' },
        { id: 'approved', label: 'WO Approved', desc: 'Siap WA & Kasbon', count: stats.cat3_approved, text: 'text-purple-600', bg: 'bg-white', border: 'border-purple-400', icon: CheckCircle2, dot: 'bg-purple-500' },
        { id: 'active_journey', label: 'On Journey', desc: 'Driver Menerima Job', count: stats.cat4_active_journey, text: 'text-blue-600', bg: '#0F172A', border: 'border-slate-800', icon: MapPin, dot: 'bg-blue-500' },
        { id: 'settlement', label: 'Settlement & Docs', desc: 'Verifikasi JO Selesai', count: stats.cat5_settlement, text: 'text-emerald-600', bg: 'bg-white', border: 'border-emerald-400', icon: ShieldCheck, dot: 'bg-emerald-500' },
        { id: 'billing_revision', label: 'Billing Revision', desc: 'Finance Disputes', count: stats.cat7_billing_revision, text: 'text-rose-600', bg: 'bg-white', border: 'border-rose-500', icon: RotateCcw, dot: 'bg-rose-500' },
        { id: 'rejected', label: 'Rejected Operations', desc: 'Batal & Evaluasi', count: stats.cat6_rejected, text: 'text-slate-500', bg: 'bg-white', border: 'border-slate-300', icon: XCircle, dot: 'bg-slate-400' }
    ];

    const activeWidget = categories.find(c => c.id === activeCategory);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 md:pb-0 overflow-x-hidden">
            <Toaster position="top-right" />

            <TruckingHeader 
                tenantInfo={tenantInfo}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onShowMap={() => setShowMap(true)}
                onLogout={handleLogout}
                userProfile={userProfile}
            />

            <main className="max-w-7xl mx-auto px-6 py-6 md:px-10 md:py-8">
                <TruckingHero tenantInfo={tenantInfo} />

                {!activeCategory ? (
                    <MissionOverview 
                        categories={categories}
                        onSelectCategory={(id) => setActiveCategory(id)}
                        totalOperations={workOrderItems.length}
                    />
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className={`p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md ${activeWidget?.bg === '#0F172A' ? 'bg-[#0F172A] text-white shadow-blue-500/10' : 'bg-white border border-slate-200'}`}>
                            {activeWidget?.bg === '#0F172A' && <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>}
                            <div className="flex items-center gap-4 relative z-10">
                                <button onClick={() => setActiveCategory(null)} className={`p-3 rounded-full transition-all ${activeWidget?.bg === '#0F172A' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}><ArrowLeft className="w-5 h-5" /></button>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{activeWidget?.label}</h2>
                                    <p className={`text-xs font-bold uppercase tracking-widest ${activeWidget?.bg === '#0F172A' ? 'text-slate-400' : 'text-slate-500'}`}>{activeWidget?.desc}</p>
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-4 border-l border-slate-200/20 pl-6">
                                <div className="text-right">
                                    <span className="text-3xl font-black block leading-none">{activeWidget?.count}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${activeWidget?.bg === '#0F172A' ? 'text-blue-300' : 'text-slate-400'}`}>Tasks Open</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workOrderItems.filter(item => item._category === activeCategory).filter(item => {
                                if (!searchTerm) return true;
                                const term = searchTerm.toLowerCase();
                                return item.work_orders?.wo_number?.toLowerCase().includes(term) || item.work_orders?.customers?.company_name?.toLowerCase().includes(term) || item.origin_location?.name?.toLowerCase().includes(term);
                            }).map((item) => (
                                <div key={item.id} className="animate-in fade-in zoom-in-95 duration-500">
                                    <WorkOrderCard 
                                        item={item}
                                        formatThousand={formatThousand}
                                        onManageAssignments={(item) => {
                                            setSelectedItem(item);
                                            setIsSingleEdit(false);
                                            const needed = Math.max(1, item.quantity - (item.assignments?.length || 0));
                                            setFormRows(Array.from({ length: needed }, () => ({ fleet_id: '', driver_id: '', vendor_price: 0, fee_percentage: 10, type: 'own' })));
                                            setShowAssignModal(true);
                                        }}
                                        onHandoverSbuToAdmin={(item) => { setSelectedItemForSbuHandover(item); setShowSbuHandoverModal(true); }}
                                        onHandover={(item) => { setSelectedItemForHandover(item); setShowHandoverModal(true); }}
                                        onSendLinks={(item, joId) => handleSendDriverLinks(item, joId)}
                                        onViewMap={() => setShowMap(true)}
                                        onOpenDetails={(a) => { setSelectedJOForDetails({ ...a, parentWO: item }); setShowJODetailDrawer(true); }}
                                        onAddAdvance={(id) => { 
                                            const jobOrder = item.assignments?.find((a: any) => a.id === id);
                                            setAdvanceForm({ 
                                                ...advanceForm, jo_id: id, amount: formatThousand(jobOrder?.vendor_price || 0), description: "Uang Jalan Ops",
                                                context: {
                                                    route: `${item.origin_location?.name} → ${item.destination_location?.name}`,
                                                    planned_price: jobOrder?.vendor_price || 0,
                                                    deal_price: item.deal_price || 0,
                                                    is_internal: !jobOrder?.fleets?.company_id || jobOrder?.fleets?.company_id === allCompanies.find((c: any) => c.type === 'company')?.id
                                                }
                                            }); 
                                            setShowAdvanceModal(true); 
                                        }}
                                    />
                                </div>
                            ))}
                            {workOrderItems.filter(item => item._category === activeCategory).length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-50">
                                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest text-[#1E293B]">Inbox Zero</p>
                                    <p className="text-xs font-bold text-slate-400">All tasks in this category are cleared.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 w-full left-0 bg-white border-t border-slate-100 px-4 py-3 rounded-t-[2rem] shadow-[0_-15px_40px_rgba(0,0,0,0.06)] z-20 pb-safe md:hidden">
                <div className="flex justify-around items-center">
                  <Link href="/sbu-launchpad" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900"><Home className="w-6 h-6" /><span className="text-[10px] font-bold">Portal</span></Link>
                  <button onClick={() => setActiveCategory(null)} className={`flex flex-col items-center gap-1 p-2 ${!activeCategory ? 'text-orange-600' : 'text-slate-400 hover:text-slate-900'}`}><LayoutGrid className="w-6 h-6" /><span className="text-[10px] font-bold">Cockpit</span></button>
                  <Link href="/sbu/trucking/fleet" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900"><Truck className="w-6 h-6" /><span className="text-[10px] font-bold">Fleet</span></Link>
                  <Link href="/finance" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900"><Wallet className="w-6 h-6" /><span className="text-[10px] font-bold">Billing</span></Link>
                </div>
            </nav>

            {(() => {
                /* Calculate Busy Fleets & Drivers based on dates */
                const busyFleetDates = new Map<string, Set<string>>();
                const busyDriverDates = new Map<string, Set<string>>();

                workOrderItems.forEach(item => {
                    const date = item.work_orders?.execution_date?.split('T')[0];
                    if (date) {
                        item.assignments?.forEach((a: any) => {
                            // Check if status is active (not cancelled/rejected/rejected by finance)
                            if (a.status !== 'cancelled' && a.status !== 'rejected' && a.billing_status !== 'rejected') {
                                if (a.fleet_id) {
                                    if (!busyFleetDates.has(a.fleet_id)) busyFleetDates.set(a.fleet_id, new Set());
                                    busyFleetDates.get(a.fleet_id)?.add(date);
                                }
                                if (a.driver_id) {
                                    if (!busyDriverDates.has(a.driver_id)) busyDriverDates.set(a.driver_id, new Set());
                                    busyDriverDates.get(a.driver_id)?.add(date);
                                }
                            }
                        });
                    }
                });

                const targetDate = selectedItem?.work_orders?.execution_date?.split('T')[0];

                return (
                    <AssignFleetModal 
                        show={showAssignModal} onClose={() => setShowAssignModal(false)} selectedItem={selectedItem}
                        getRemainingUnits={(item) => Math.max(0, item.quantity - (item.assignments?.length || 0))}
                        formRows={formRows} setFormRows={setFormRows} allCompanies={allCompanies} allFleets={allFleets} allDrivers={allDrivers}
                        busyFleetDates={busyFleetDates} 
                        getAvailableFleets={(currentId) => {
                            return allFleets.filter(f => {
                                if (currentId && f.id === currentId) return true;
                                if (!targetDate) return true;
                                const bookings = busyFleetDates.get(f.id);
                                return !bookings || !bookings.has(targetDate);
                            });
                        }} 
                        getAvailableDrivers={(currentId) => {
                            return allDrivers.filter(d => {
                                if (currentId && d.id === currentId) return true;
                                if (!targetDate) return true;
                                const bookings = busyDriverDates.get(d.id);
                                return !bookings || !bookings.has(targetDate);
                            });
                        }}
                        fetchLastVendorPrice={async () => 0} handleAssignUnits={handleAssignUnits} assigning={assigning}
                        isSingleEdit={isSingleEdit}
                    />
                );
            })()}

            <JODetailDrawer 
                show={showJODetailDrawer} onClose={() => setShowJODetailDrawer(false)} jo={selectedJOForDetails} isLoaded={isLoaded}
                mapOptions={{ disableDefaultUI: true, zoomControl: true }} getJOStatusBadge={getJOStatusBadge}
                onAddCost={(id) => { setCostForm({ ...costForm, jo_id: id, amount: "", description: "" }); setShowCostModal(true); }}
                onAddAdvance={(id) => { 
                    const jobOrder = selectedJOForDetails;
                    setAdvanceForm({ 
                        ...advanceForm, jo_id: id, amount: formatThousand(jobOrder?.vendor_price || 0), description: "Uang Jalan Ops",
                        context: {
                            route: `${jobOrder?.parentWO?.origin_location?.name} → ${jobOrder?.parentWO?.destination_location?.name}`,
                            planned_price: jobOrder?.vendor_price || 0,
                            deal_price: jobOrder?.parentWO?.deal_price || 0,
                            is_internal: !jobOrder?.fleets?.company_id
                        }
                    }); 
                    setShowAdvanceModal(true); 
                }}
                onCollectDocs={handleSubmitToFinance}
                onSubmitVendorInvoice={(jo) => {
                    setVendorInvoiceForm({ jo_id: jo.id, invoice_number: jo.vendor_invoice_number || "", amount: String(jo.vendor_invoice_amount || jo.vendor_price || ""), file_url: jo.vendor_invoice_url || "" });
                    setShowVendorInvoiceModal(true);
                }}
                onSendLink={(id) => handleSendDriverLinks(selectedItem!, id)}
                onEdit={(item, joId) => { 
                    setSelectedItem(item); 
                    setIsSingleEdit(!!joId);
                    
                    // Filter logic for Single JO Edit
                    let assignments = item.assignments || [];
                    if (joId) {
                        assignments = assignments.filter((a: any) => a.id === joId);
                    }

                    const existingAssignments = assignments.map((a:any) => ({ 
                        ...a, 
                        type: a.fleets?.company_id ? 'vendor' : 'own' 
                    }));
                    
                    let finalRows = existingAssignments;
                    
                    // Only add empty rows if NOT in Single JO Edit mode (joId is null)
                    if (!joId) {
                        const remaining = Math.max(0, item.quantity - (item.assignments?.length || 0));
                        const emptyRows = Array.from({ length: remaining }, () => ({ 
                            fleet_id: '', 
                            driver_id: '', 
                            vendor_price: 0, 
                            fee_percentage: 10, 
                            type: 'own' 
                        }));
                        finalRows = [...existingAssignments, ...emptyRows];
                    }
                    
                    setFormRows(finalRows); 
                    setShowJODetailDrawer(false);
                    setShowAssignModal(true); 
                }}
                onApprove={handleApproveJO} onReject={handleRejectJO}
                onVerifyPhysicalDoc={(jo) => {
                    setSelectedJOForVerification(jo);
                    setShowPhysicalDocModal(true);
                }}
            />

            <PhysicalDocModal 
                show={showPhysicalDocModal}
                onClose={() => setShowPhysicalDocModal(false)}
                jo={selectedJOForVerification}
                onVerify={handleVerifyPhysicalDoc}
            />

            <HandoverSbuModal show={showSbuHandoverModal} onClose={() => setShowSbuHandoverModal(false)} workOrder={selectedItemForSbuHandover?.work_orders} onSubmit={handleSubmitSbuHandover} isSubmitting={submittingSbuHandover} />
            <HandoverModal show={showHandoverModal} onClose={() => setShowHandoverModal(false)} workOrder={selectedItemForHandover} onSuccess={fetchData} />

            <CostModal show={showCostModal} onClose={() => setShowCostModal(false)} costForm={costForm} setCostForm={setCostForm} onSave={() => handleSaveCost()} formatThousand={formatThousand} />
            <VendorInvoiceModal show={showVendorInvoiceModal} onClose={() => setShowVendorInvoiceModal(false)} form={vendorInvoiceForm} setForm={setVendorInvoiceForm} onSave={handleSaveVendorInvoice} formatThousand={formatThousand} />
            <AdvanceModal show={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} form={advanceForm} setForm={setAdvanceForm} onSave={handleSaveAdvance} formatThousand={formatThousand} missionCredits={tenantInfo.mission_credits} />
        </div>
    );
}
