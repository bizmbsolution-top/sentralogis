"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import {
  Truck,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  User,
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Navigation,
  ExternalLink,
  Activity,
  FileText,
  Plus,
  DollarSign,
  Search,
  Printer,
  Box,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import AssignmentModal from "../components/AssignmentModal";

interface WorkOrder {
  id: string;
  wo_number: string;
  order_date: string;
  execution_date: string;
  execution_time: string;
  status: string;
  notes: string;
  customer: {
    name: string;
    legal_name: string;
  };
}

interface WOItem {
  id: string;
  item_code: string;
  sbu_type: string;
  item_data: any;
  status: string;
  job_orders: {
    id: string;
    jo_number: string;
    status: string;
    transporter: { name: string };
    md_fleets: { plate_number: string; md_fleet_types: { type_name: string } };
    md_drivers: { name: string; phone: string };
  }[];
}

const recomputeVendorInvoiceAmount = async (
  vendorId: string,
  joIds: string[],
) => {
  if (!vendorId || joIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("extra_costs")
    .select("amount")
    .in("jo_id", joIds)
    .eq("status", "approved")
    .eq("paid_by_entity", "vendor")
    .eq("vendor_id", vendorId);

  if (error) throw error;

  return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
};

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    vendor_id: "",
    invoice_number: "",
    invoice_amount: "",
    jo_ids: [] as string[],
    notes: "",
  });
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);
  const [allJOs, setAllJOs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!id || !profile?.tenant_id || id === "[id]") return;
    setLoading(true);

    try {
      // 1. Fetch WO Header
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select(
          `
          *,
          customer:md_entities!customer_id(name, legal_name)
        `,
        )
        .eq("id", id)
        .single();

      if (woError) throw woError;
      setWo(woData);

      // 2. Fetch WO Items
      const { data: itemsData, error: itemsError } = await supabase
        .from("wo_items")
        .select("*")
        .eq("wo_id", id)
        .eq("sbu_type", "TRUCKING");

      if (itemsError) throw itemsError;
      const baseItems = itemsData || [];

      // 3. Fetch all Job Orders for these items
      const itemIds = baseItems.map((i) => i.id);
      if (itemIds.length > 0) {
        // AMBIL DATA JO TANPA JOIN (MANUAL FETCH UNTUK STABILITAS TOTAL)
        const { data: joData, error: joError } = await supabase
          .from("job_orders")
          .select("*")
          .in("wo_item_id", itemIds);

        if (joError) throw joError;
        const baseJOs = joData || [];

        // 4. Manual Fetch Relasi untuk menghindari "Schema Cache" error
        const transporterIds = [
          ...new Set(baseJOs.map((j) => j.transporter_id).filter(Boolean)),
        ];
        const fleetIds = [
          ...new Set(baseJOs.map((j) => j.fleet_id).filter(Boolean)),
        ];
        const driverIds = [
          ...new Set(baseJOs.map((j) => j.driver_id).filter(Boolean)),
        ];

        const [transporters, fleets, drivers] = await Promise.all([
          transporterIds.length > 0
            ? supabase
                .from("md_entities")
                .select("id, name")
                .in("id", transporterIds)
            : { data: [] },
          fleetIds.length > 0
            ? supabase
                .from("md_fleets")
                .select("id, plate_number")
                .in("id", fleetIds)
            : { data: [] },
          driverIds.length > 0
            ? supabase
                .from("md_drivers")
                .select("id, name, phone")
                .in("id", driverIds)
            : { data: [] },
        ]);

        // Map relasi kembali ke JO
        const enrichedJOs = baseJOs.map((jo) => ({
          ...jo,
          transporter: transporters.data?.find(
            (t) => t.id === jo.transporter_id,
          ),
          md_fleets: fleets.data?.find((f) => f.id === jo.fleet_id),
          md_drivers: drivers.data?.find((d) => d.id === jo.driver_id),
        }));

        // Map JOs back to items
        const itemsWithJOs = baseItems.map((item) => ({
          ...item,
          job_orders: enrichedJOs.filter((jo) => jo.wo_item_id === item.id),
        }));
        setItems(itemsWithJOs);
      } else {
        setItems(baseItems);
      }
    } catch (error: any) {
      console.error("Error fetching WO details:", error);
      toast.error("Gagal mengambil detail Work Order: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchVendorInvoices = useCallback(async () => {
    if (!id) return;
    setVendorLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendor_invoices")
        .select(
          `
          *,
          vendor:md_entities!vendor_id(name, vendor_type)
        `,
        )
        .eq("wo_id", id)
        .order("received_at", { ascending: false });

      if (error) throw error;
      setVendorInvoices(data || []);
    } catch (err: any) {
      console.error("Fetch vendor invoices error:", err);
    } finally {
      setVendorLoading(false);
    }
  }, [id]);

  const fetchAvailableVendors = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const { data } = await supabase
        .from("md_entities")
        .select("id, name, vendor_type")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_vendor", true)
        .eq("is_active", true)
        .order("name", { ascending: true });

      setAvailableVendors(data || []);
    } catch (err: any) {
      console.error("Fetch vendors error:", err);
    }
  }, [profile]);

  useEffect(() => {
    if (id && id !== "[id]") {
      fetchVendorInvoices();
      fetchAvailableVendors();
    }
  }, [id, fetchVendorInvoices, fetchAvailableVendors]);

  useEffect(() => {
    if (!createFormData.vendor_id || createFormData.jo_ids.length === 0) return;

    let ignore = false;
    const refreshInvoiceAmount = async () => {
      try {
        const total = await recomputeVendorInvoiceAmount(
          createFormData.vendor_id,
          createFormData.jo_ids,
        );
        if (ignore) return;

        setCreateFormData((prev) =>
          prev.invoice_amount === total.toString()
            ? prev
            : { ...prev, invoice_amount: total.toString() },
        );
      } catch (err) {
        console.error("Recompute vendor invoice amount error:", err);
      }
    };

    refreshInvoiceAmount();
    return () => {
      ignore = true;
    };
  }, [createFormData.vendor_id, createFormData.jo_ids]);

  const collectAllJOs = useCallback(() => {
    const jos: any[] = [];
    items.forEach((item) => {
      (item.job_orders || []).forEach((jo) => {
        const joRecord = jo as any;
        jos.push({
          id: joRecord.id,
          jo_number: joRecord.jo_number,
          status: joRecord.status,
          transporter_id: joRecord.transporter_id,
          transporter_name: joRecord.transporter?.name || "Unknown",
          base_price: joRecord.base_price,
          purchase_price: joRecord.purchase_price,
        });
      });
    });
    setAllJOs(jos);
  }, [items]);

  useEffect(() => {
    collectAllJOs();
  }, [items, collectAllJOs]);

  const handleCreateVendorInvoice = async () => {
    if (
      !createFormData.vendor_id ||
      !createFormData.invoice_amount ||
      createFormData.jo_ids.length === 0
    ) {
      toast.error(
        "Please fill in all required fields and select at least one JO",
      );
      return;
    }

    try {
      const { error } = await supabase.from("vendor_invoices").insert({
        wo_id: id,
        tenant_id: profile?.tenant_id,
        vendor_id: createFormData.vendor_id,
        invoice_number: createFormData.invoice_number || `VEND-${Date.now()}`,
        invoice_amount: Number(createFormData.invoice_amount),
        jo_ids: createFormData.jo_ids,
        notes: createFormData.notes,
        status: "pending",
        received_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Vendor invoice created");
      setShowCreateInvoice(false);
      setCreateFormData({
        vendor_id: "",
        invoice_number: "",
        invoice_amount: "",
        jo_ids: [],
        notes: "",
      });
      fetchVendorInvoices();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const toggleJOSelection = (joId: string) => {
    setCreateFormData((prev) => ({
      ...prev,
      jo_ids: prev.jo_ids.includes(joId)
        ? prev.jo_ids.filter((id) => id !== joId)
        : [...prev.jo_ids, joId],
    }));
  };

  const handleVendorSelect = (vendorId: string) => {
    const selectedVendor = availableVendors.find((v) => v.id === vendorId);
    if (selectedVendor) {
      const vendorJOs = allJOs.filter((jo) => jo.transporter_id === vendorId);
      setCreateFormData((prev) => ({
        ...prev,
        vendor_id: vendorId,
        jo_ids: vendorJOs.map((jo) => jo.id),
        invoice_amount: "0",
      }));
    } else {
      setCreateFormData((prev) => ({
        ...prev,
        vendor_id: vendorId,
        jo_ids: [],
        invoice_amount: "0",
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse italic">
            Synchronizing Operational Data...
          </p>
        </div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">
          Work Order Not Found
        </h2>
        <Button onClick={() => router.back()} variant="secondary">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {wo.wo_number}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${wo.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {wo.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <h1 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">
            Work Order Cockpit
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Customer
              </p>
              <p className="text-[11px] font-black text-slate-900 uppercase">
                {wo.customer.name}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
              <Building2 size={16} />
            </div>
          </div>

          {/* Vendor Invoice Matching Panel */}
          <div className="lg:col-span-12 mt-8">
            <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Vendor Invoice Matching
                    </h3>
                    <p className="text-xs text-slate-400">
                      Track vendor invoices for this WO
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setShowCreateInvoice(true);
                    setCreateFormData({
                      vendor_id: "",
                      invoice_number: "",
                      invoice_amount: "",
                      jo_ids: [],
                      notes: "",
                    });
                  }}
                  className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg"
                >
                  <Plus size={14} className="mr-1" /> Create Invoice
                </Button>
              </div>

              {vendorLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-rose-600 animate-spin mr-2" />
                  <p className="text-xs text-slate-400">
                    Loading vendor invoices...
                  </p>
                </div>
              ) : vendorInvoices.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                  <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    No vendor invoices yet. Create one to start tracking.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          Invoice #
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          Vendor
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide text-right">
                          Amount
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          JOs
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          Received
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vendorInvoices.map((inv: any) => {
                        const statusColors: Record<string, string> = {
                          pending: "bg-amber-50 text-amber-700",
                          submitted: "bg-blue-50 text-blue-700",
                          verified: "bg-emerald-50 text-emerald-700",
                          approved: "bg-purple-50 text-purple-700",
                          paid: "bg-slate-100 text-slate-700",
                          rejected: "bg-rose-50 text-rose-700",
                        };
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-xs font-mono text-slate-900">
                              {inv.invoice_number || "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-slate-900">
                                {inv.vendor?.name || "Unknown"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {inv.vendor?.vendor_type || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900">
                              Rp{" "}
                              {Number(inv.invoice_amount || 0).toLocaleString(
                                "id-ID",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}
                              >
                                {inv.status || "pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(inv.jo_ids || []).map((joId: string) => {
                                  const jo = allJOs.find((j) => j.id === joId);
                                  return jo ? (
                                    <span
                                      key={joId}
                                      className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-mono rounded"
                                    >
                                      {jo.jo_number}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {inv.received_at
                                ? new Date(inv.received_at).toLocaleDateString(
                                    "id-ID",
                                    { day: "2-digit", month: "short" },
                                  )
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Create Vendor Invoice Modal */}
        {showCreateInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Create Vendor Invoice
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Match vendor costs to this WO
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateInvoice(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Vendor Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Vendor *
                  </label>
                  <select
                    value={createFormData.vendor_id}
                    onChange={(e) => handleVendorSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                  >
                    <option value="">Select vendor...</option>
                    {availableVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        [{v.vendor_type}] {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={createFormData.invoice_number}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        invoice_number: e.target.value,
                      }))
                    }
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>

                {/* Invoice Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Total Amount (Rp) *
                  </label>
                  <input
                    type="number"
                    value={createFormData.invoice_amount}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        invoice_amount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>

                {/* JO Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Link to Job Orders *
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
                    {allJOs.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center">
                        No JOs available
                      </div>
                    ) : (
                      allJOs.map((jo) => (
                        <label
                          key={jo.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            createFormData.jo_ids.includes(jo.id)
                              ? "bg-rose-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={createFormData.jo_ids.includes(jo.id)}
                            onChange={() => toggleJOSelection(jo.id)}
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-medium text-slate-900">
                                {jo.jo_number}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {jo.transporter_name}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Purchase: Rp{" "}
                              {Number(jo.purchase_price || 0).toLocaleString(
                                "id-ID",
                              )}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {createFormData.jo_ids.length} JO(s) selected
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Notes
                  </label>
                  <textarea
                    value={createFormData.notes}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <Button
                  onClick={() => setShowCreateInvoice(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateVendorInvoice}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-lg"
                >
                  <Plus size={14} className="mr-1" /> Create Invoice
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quick Stats & Info */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm space-y-6 bg-white rounded-2xl">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                Schedule & Logistics
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">
                      Execution Date
                    </p>
                    <p className="text-xs font-black text-slate-900">
                      {new Date(wo.execution_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">
                      Dispatch Time
                    </p>
                    <p className="text-xs font-black text-slate-900">
                      {wo.execution_time}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {wo.notes && (
              <div className="pt-5 border-t border-slate-100">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Notes
                </label>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                  "{wo.notes}"
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-2xl space-y-4">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
              Operational Progress
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 uppercase">
                  Total Items
                </span>
                <span className="text-sm font-black text-slate-900">
                  {items.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-600/70 uppercase">
                  In Progress
                </span>
                <span className="text-sm font-black text-blue-600">
                  {
                    items.filter((i) =>
                      ["assigned", "in_progress"].includes(i.status),
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600/70 uppercase">
                  Completed
                </span>
                <span className="text-sm font-black text-emerald-600">
                  {items.filter((i) => i.status === "completed").length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Detailed Manifest */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-2">
              <Package size={14} className="text-slate-400" /> Manifest
              Breakdown
            </h2>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="p-0 border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl group"
              >
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-[10px] font-black shadow-lg shadow-slate-900/10">
                        {item.item_code.split("-").pop()}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">
                          {item.item_data.vehicle_type_name}
                        </h4>
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span>{item.item_code}</span>
                          <span className="text-slate-200">/</span>
                          <span>Units: {item.item_data.unit_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Route */}
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 max-w-md w-full">
                      <div className="flex-1 min-w-0">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                          Origin
                        </p>
                        <p className="text-[10px] font-black text-slate-900 truncate uppercase italic">
                          {item.item_data.shipper_name}
                        </p>
                      </div>
                      <ArrowLeft
                        size={12}
                        className="text-slate-300 rotate-180"
                      />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                          Destination
                        </p>
                        <p className="text-[10px] font-black text-slate-900 truncate uppercase italic">
                          {item.item_data.recipient_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[8px] font-black px-2.5 py-1 rounded uppercase tracking-widest ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : ["assigned", "in_progress"].includes(item.status)
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all shadow-sm border border-slate-100"
                      >
                        <Truck size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Job Orders List - More Compact */}
                  {item.job_orders && item.job_orders.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {item.job_orders.map((jo) => {
                        const containerNo = jo.container_number || (jo.sbu_metadata ? jo.sbu_metadata.container_number : null);
                        return (
                          <div
                            key={jo.id}
                            className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl space-y-2 hover:bg-white hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-900 tracking-tighter">
                                {jo.jo_number}
                              </span>
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${jo.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-700 uppercase">
                                <Building2 size={10} className="text-slate-400" />
                                <span className="truncate">
                                  {jo.transporter?.name || "Vendor"}
                                </span>
                                <span className="text-blue-600 bg-blue-50 px-1 rounded">
                                  {jo.md_fleets?.plate_number}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                                <User size={10} className="text-slate-400" />
                                <span className="truncate">
                                  {jo.md_drivers?.name || "No Pilot"}
                                </span>
                              </div>
                              {containerNo && (
                                <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100">
                                  <Box size={10} className="text-indigo-500 shrink-0" />
                                  <span className="truncate">CONT: {containerNo}</span>
                                </div>
                              )}
                              {jo.notes && (
                                <div className="flex items-start gap-1.5 text-[9px] font-medium text-slate-600 italic bg-amber-50/60 p-1 rounded border border-amber-100/80">
                                  <FileText size={10} className="text-amber-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">"{jo.notes}"</span>
                                </div>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                              <Link
                                href={`/sbu/trucking/delivery-note/${jo.id}`}
                                target="_blank"
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center gap-1 text-[9px] font-black transition-all shadow-sm"
                                title="Cetak Surat Jalan untuk JO ini"
                              >
                                <Printer size={10} /> SURAT JALAN / DN
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <AssignmentModal
          item={{ ...selectedItem, work_orders: wo }}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => {
            setSelectedItem(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
