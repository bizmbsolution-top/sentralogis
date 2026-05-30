"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Loader2,
  DollarSign,
  FileText,
  Truck,
  CheckCircle,
  TrendingDown,
  Info,
  ChevronRight,
  ArrowRight,
  Upload,
  Calendar,
  MapPin,
  Building,
  Banknote,
  Receipt,
  FileCheck,
  ShieldCheck,
  Trash2,
  CreditCard,
  CheckSquare,
  Eye,
  Save,
  Send,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { printCashAdvanceSlip } from "@/app/(dashboard)/sbu/trucking/utils";
import { createJournalEntry } from "@/lib/finance/journaling";
import { useAuth } from "@/lib/hooks/useAuth";

interface ExtraCostRow {
  id: string;
  name: string;
  amount: string;
  paid_by_entity: "internal" | "vendor";
  status?: string;
  paid_by_sbu?: boolean;
  wo_id?: string | null;
  vendor_id?: string | null;
}

interface DocRow {
  id: string;
  name: string;
  description: string;
  file: File | null;
  url: string | null;
}

interface SBUFinanceHybridModalProps {
  job: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SBUFinanceHybridModal({
  job,
  onClose,
  onSuccess,
}: SBUFinanceHybridModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isLocked = ["invoiced", "paid", "INVOICED", "PAID"].includes(
    job.status,
  );

  // Base Payout State
  const [transferAmount, setTransferAmount] = useState("");
  const [transferProof, setTransferProof] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Advance Payout State
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceStatus, setAdvanceStatus] = useState("unpaid");

  // Extra Costs State
  const [extraCosts, setExtraCosts] = useState<ExtraCostRow[]>([]);

  // Documents State
  const [docs, setDocs] = useState<DocRow[]>([
    {
      id: Math.random().toString(),
      name: "",
      description: "",
      file: null,
      url: null,
    },
  ]);

  useEffect(() => {
    refreshData();
  }, [job.id]);

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchJobDetails(), fetchExistingCosts()]);
    setLoading(false);
  };

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("job_orders")
        .select("*")
        .eq("id", job.id)
        .single();

      if (error) throw error;
      if (data) {
        setTransferAmount(data.driver_payment_amount?.toString() || "");
        setTransferProof(
          data.advance_receipt_url || data.transfer_proof_url || null,
        );
        setAdvanceAmount(data.advance_amount?.toString() || "");
        setAdvanceStatus(data.advance_status || "unpaid");

        // Fetch existing POD docs
        if (data.pod_photo_url) {
          try {
            const urls = JSON.parse(data.pod_photo_url);
            if (Array.isArray(urls)) {
              setDocs(
                urls.map((url: string, index: number) => ({
                  id: `existing-${index}`,
                  name: `Document ${index + 1}`,
                  description: "",
                  file: null,
                  url,
                })),
              );
            }
          } catch (e) {
            if (data.pod_photo_url.length > 5) {
              setDocs([
                {
                  id: "existing-0",
                  name: "Existing Document",
                  description: "",
                  file: null,
                  url: data.pod_photo_url,
                },
              ]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching job details:", err);
    }
  };

  const fetchExistingCosts = async () => {
    try {
      const { data, error } = await supabase
        .from("extra_costs")
        .select("*")
        .eq("jo_id", job.id);

      if (error) throw error;
      if (data && data.length > 0) {
        setExtraCosts(
          data.map((c) => ({
            id: c.id,
            name: c.description || c.cost_type,
            amount: c.amount.toString(),
            paid_by_entity: c.paid_by_entity || "internal",
            status: c.status,
            paid_by_sbu: c.paid_by_sbu,
            wo_id: c.wo_id || null,
            vendor_id: c.vendor_id || null,
          })),
        );
      } else {
        setExtraCosts([
          {
            id: `new-${Date.now()}`,
            name: "",
            amount: "",
            paid_by_entity: "internal",
            status: "draft",
            wo_id: null,
            vendor_id: null,
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching costs:", err);
    }
  };

  const resolveCostContext = async () => {
    const { data: joData, error: joError } = await supabase
      .from("job_orders")
      .select("wo_item_id, transporter_id, vendor_id")
      .eq("id", job.id)
      .single();

    if (joError) throw joError;

    let resolvedWoId = null;
    if (joData?.wo_item_id) {
      const { data: woItemData, error: woItemError } = await supabase
        .from("wo_items")
        .select("wo_id")
        .eq("id", joData.wo_item_id)
        .single();

      if (woItemError) throw woItemError;
      resolvedWoId = woItemData?.wo_id || null;
    }

    return {
      wo_id: resolvedWoId,
      vendor_id: joData?.vendor_id || joData?.transporter_id || null,
    };
  };

  const formatThousand = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseThousand = (val: string) => {
    return val.replace(/\./g, "");
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleProofUpload = async (file: File) => {
    try {
      setUploadingProof(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `payout_${job.id}_${Date.now()}.${fileExt}`;
      const filePath = `payouts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      setTransferProof(publicUrl);
      toast.success("Transfer proof uploaded");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDocUpload = async (id: string, file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `doc_${id}_${Date.now()}.${fileExt}`;
      const filePath = `operational_docs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      // Preserve description while adding url and file
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, url: publicUrl, file } : d)),
      );
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error("Doc upload failed: " + err.message);
    }
  };

  const totalExtra = extraCosts.reduce(
    (acc, c) => acc + (Number(parseThousand(c.amount)) || 0),
    0,
  );

  const targetAmount = job.md_fleets?.md_entities?.is_vendor
    ? job.purchase_price || 0
    : job.advance_amount || 0;
  const remainingBalance =
    targetAmount - (Number(parseThousand(transferAmount)) || 0);

  const handleCompleteDocs = async () => {
    try {
      setLoading(true);
      const validDocs = docs.filter((d) => d.url);
      if (validDocs.length === 0)
        return toast.error("Harap upload setidaknya satu dokumen");

      const urls = validDocs.map((d) => d.url);
      const { error } = await supabase
        .from("job_orders")
        .update({
          pod_photo_url: JSON.stringify(urls),
          pod_status: "received_sbu",
          is_doc_finished: true,
        })
        .eq("id", job.id);

      if (error) throw error;
      toast.success(`${validDocs.length} Documents finalized successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error("Failed to finalize docs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = async () => {
    try {
      setSubmitting(true);
      const transferValue = Number(parseThousand(transferAmount)) || 0;

      // Check if this is first payment (advance) or final payment
      const isFirstPayment = job.advance_status !== "paid";

      const updateData: any = {};

      if (isFirstPayment) {
        // First payment - save to advance_amount
        updateData.advance_status = "paid";
        updateData.advance_amount = transferValue;
        if (transferProof) updateData.advance_receipt_url = transferProof;
      } else {
        // Final payment - save to driver_payment_amount
        updateData.driver_payment_status = "paid";
        updateData.driver_payment_amount = transferValue;
        if (transferProof) updateData.transfer_proof_url = transferProof;
      }

      const { error } = await supabase
        .from("job_orders")
        .update(updateData)
        .eq("id", job.id);

      if (error) throw error;

      if (transferValue > 0) {
        try {
          await createJournalEntry({
            jobOrderId: job.id,
            amount: transferValue,
            description: `${isFirstPayment ? 'Uang Jalan (Advance)' : 'Pelunasan Driver'} untuk ${job.jo_number}`,
            sourceType: 'driver_payment'
          });
        } catch (journalErr) {
          console.error('Journal entry failed (non-blocking):', journalErr);
        }

        // [AI] Record payment to job_order_payments for hybrid tracking
        const isVendor = job.md_fleets?.md_entities?.is_vendor;
        const paymentType = isFirstPayment
          ? (isVendor ? 'advance_vendor' : 'advance_driver')
          : (isVendor ? 'pelunasan_vendor' : 'pelunasan_driver');
        try {
          await supabase.from('job_order_payments').insert({
            job_order_id: job.id,
            payment_type: paymentType,
            amount: transferValue,
            paid_by: 'sbu',
            paid_by_user: profile?.id,
            paid_at: new Date().toISOString(),
            transfer_proof_url: transferProof,
            notes: isFirstPayment ? 'Uang Jalan (Advance)' : 'Pelunasan Driver',
          });
        } catch (payErr) {
          console.error('Payment record failed (non-blocking):', payErr);
        }
      }

      toast.success(
        isFirstPayment
          ? "Pembayaran uang jalan berhasil! Driver akan menerima notifikasi."
          : "Pelunasan berhasil! Driver akan menerima notifikasi.",
      );
      onSuccess?.();
    } catch (err: any) {
      console.error("Paid Error:", err);
      toast.error(err.message || "Gagal proses pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      console.log("Attempting to save draft for JO:", job.id);

      // 1. Save Base Payout & Docs
      const validDocs = docs.filter((d) => d.url);
      const updatePayload: any = {
        driver_payment_amount: Number(parseThousand(transferAmount)) || 0,
        advance_receipt_url: transferProof,
      };
      if (validDocs.length > 0) {
        updatePayload.pod_photo_url = JSON.stringify(
          validDocs.map((d) => d.url),
        );
      }

      const { error: payoutError } = await supabase
        .from("job_orders")
        .update(updatePayload)
        .eq("id", job.id);

      if (payoutError) {
        console.error("Payout Update Error:", payoutError);
        throw new Error("Gagal update pembayaran: " + payoutError.message);
      }

      // 2. Upsert Extra Costs as Draft
      const validExtra = extraCosts.filter(
        (c) => c.name && c.name.trim() !== "" && c.amount,
      );
      console.log("Valid costs to save:", validExtra.length);
      const costContext = await resolveCostContext();

      for (const cost of validExtra) {
        const payload: any = {
          jo_id: job.id,
          description: cost.name,
          amount: Number(parseThousand(cost.amount)),
          status: "draft",
          paid_by_entity: cost.paid_by_entity || "internal",
          cost_type: "operational",
          is_billable: true,
          wo_id: costContext.wo_id,
          vendor_id: costContext.vendor_id,
        };

        let result;
        if (cost.id.includes("new-")) {
          console.log("Inserting new cost row...");
          result = await supabase.from("extra_costs").insert(payload);
        } else {
          console.log("Updating existing cost row:", cost.id);
          result = await supabase
            .from("extra_costs")
            .update(payload)
            .eq("id", cost.id);
        }

        if (result.error) {
          console.error("Extra Cost DB Error:", result.error);
          throw new Error(
            `Gagal simpan biaya "${cost.name}": ${result.error.message}`,
          );
        }
      }

      toast.success("Draft berhasil disimpan");
      // Non-blocking refresh
      refreshData().catch((err) =>
        console.error("Silent refresh failed:", err),
      );
    } catch (err: any) {
      console.error("Main Save Draft Error:", err);
      toast.error(err.message || "Gagal menyimpan draft. Cek koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      console.log("Attempting to submit for JO:", job.id);

      // 1. Update Base Payout
      const { error: payoutError } = await supabase
        .from("job_orders")
        .update({
          driver_payment_amount: Number(parseThousand(transferAmount)) || 0,
          advance_receipt_url: transferProof,
          advance_status: transferProof ? "paid" : job.advance_status,
        })
        .eq("id", job.id);

      if (payoutError) throw payoutError;

      // 2. Upsert Extra Costs as need_approval
      const validExtra = extraCosts.filter(
        (c) => c.name && c.name.trim() !== "" && c.amount,
      );
      const costContext = await resolveCostContext();
      for (const cost of validExtra) {
        const payload: any = {
          jo_id: job.id,
          description: cost.name,
          amount: Number(parseThousand(cost.amount)),
          status: "need_approval",
          paid_by_entity: cost.paid_by_entity || "internal",
          cost_type: "operational",
          is_billable: true,
          wo_id: costContext.wo_id,
          vendor_id: costContext.vendor_id,
        };

        let res;
        if (cost.id.includes("new-")) {
          res = await supabase.from("extra_costs").insert(payload);
        } else {
          res = await supabase
            .from("extra_costs")
            .update(payload)
            .eq("id", cost.id);
        }
        if (res.error) throw res.error;
      }

      // 3. Update Docs
      const validDocs = docs.filter((d) => d.url);
      if (validDocs.length > 0) {
        const urls = validDocs.map((d) => d.url);
        const { error: docErr } = await supabase
          .from("job_orders")
          .update({ pod_photo_url: JSON.stringify(urls) })
          .eq("id", job.id);
        if (docErr) throw docErr;
      }

      // 4. Update Status to Live Mission if proof uploaded
      if (
        transferProof &&
        (job.status === "accepted" || job.status === "ORDER DITERIMA")
      ) {
        const { error: statErr } = await supabase
          .from("job_orders")
          .update({ status: "MENUNGGU BERANGKAT" })
          .eq("id", job.id);
        if (statErr) throw statErr;
      }

      toast.success("Finance data submitted to CS");
      onSuccess();
    } catch (err: any) {
      console.error("Main Submit Error:", err);
      toast.error(
        "Gagal submit: " + (err.message || "Terjadi kesalahan sistem"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (costId.startsWith("new-")) {
      setExtraCosts((prev) => prev.filter((c) => c.id !== costId));
      return;
    }

    try {
      const { error } = await supabase
        .from("extra_costs")
        .delete()
        .eq("id", costId);
      if (error) throw error;
      setExtraCosts((prev) => prev.filter((c) => c.id !== costId));
      toast.success("Biaya berhasil dihapus");
    } catch (err) {
      toast.error("Gagal menghapus biaya");
    }
  };

  const handleFinalizeToHQ = async () => {
    try {
      setSubmitting(true);
      console.log("Finalizing mission to HQ for JO:", job.id);

      // 1. Check if docs are uploaded
      const validDocs = docs.filter((d) => d.url);
      if (validDocs.length === 0) {
        throw new Error("Harap upload dokumen POD sebelum finalisasi");
      }

      // 2. Update Job Order status & Docs
      const urls = validDocs.map((d) => d.url);
      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "awaiting_audit",
          is_doc_finished: true,
          is_cost_finished: true,
          pod_status: "received_sbu",
          pod_photo_url: JSON.stringify(urls),
        })
        .eq("id", job.id);

      if (error) throw error;

      toast.success("Mission finalized! Data submitted to HQ Finances.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-900 px-10 py-8 flex justify-between items-center shrink-0 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20 rotate-3">
              <Banknote size={28} />
            </div>
            <div>
              <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter leading-none">
                Finances Hybrid Hub
              </h3>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                <ShieldCheck size={12} /> Unified Operational & Financial Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {/* Section 1: Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-blue-500/20 transition-all">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                <Info size={12} className="text-blue-500" /> Mission Reference
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    Job Order ID
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {job.jo_number}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    Customer (Pelanggan)
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {job.wo_items?.work_orders?.md_entities?.name ||
                      "DIRECT CUSTOMER"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-blue-500/20 transition-all">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                <Truck size={12} className="text-blue-500" /> Fleet Deployment
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                      Execution Date
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {job.wo_items?.work_orders?.execution_date
                        ? new Date(
                            job.wo_items.work_orders.execution_date,
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                      Truck Type
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {job.md_fleets?.md_fleet_types?.type_name ||
                        job.md_fleets?.truck_type ||
                        "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    Transporter
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {job.md_fleets?.md_entities?.name || "INTERNAL SBU"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-blue-500/20 transition-all">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                <MapPin size={12} className="text-blue-500" /> Deployment Route
              </p>
              <div className="flex items-center gap-4 h-full pb-6">
                <div className="flex-1">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    Origin
                  </p>
                  <p className="text-xs font-black text-slate-900 uppercase truncate">
                    {job.wo_items?.item_data?.origin?.name || "HUB SBU"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
                <div className="flex-1">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    Destination
                  </p>
                  <p className="text-xs font-black text-slate-900 uppercase truncate">
                    {job.wo_items?.item_data?.destination?.name ||
                      "DESTINATION"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Part 1: Cash Advances */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                    Part 1: Cash Advances
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Settlement by SBU Finance
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Payout Method
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest italic ${job.md_fleets?.md_entities?.is_vendor ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
                      >
                        {job.md_fleets?.md_entities?.is_vendor
                          ? "Vendor Invoice"
                          : "Internal Bagi Hasil"}
                      </Badge>

                      {/* [AI] Print cash advance slip button */}
                      <Button
                        onClick={() =>
                          printCashAdvanceSlip(job, {
                            amount:
                              Number(transferAmount) || job.advance_amount || 0,
                            description: "Uang Jalan / Kasbon Driver",
                            paid_by: job.md_fleets?.md_entities?.is_vendor
                              ? "Vendor Invoice"
                              : "SBU Trucking (Operational)",
                            paid_at: new Date(),
                          })
                        }
                        variant="ghost"
                        className="h-8 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-50 transition-all"
                      >
                        <Printer size={12} />
                        Cetak Slip
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Total Amount Due
                    </p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
                      {formatRupiah(targetAmount)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">
                        Remaining:
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase ${remainingBalance > 0 ? "text-rose-500" : "text-emerald-500"}`}
                      >
                        {formatRupiah(remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Nominal Transfer
                  </label>
                  <Input
                    className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-lg text-slate-900 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="0"
                    value={formatThousand(transferAmount)}
                    onChange={(e) =>
                      setTransferAmount(parseThousand(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Proof of Transfer
                  </p>
                  {transferProof ? (
                    <div className="h-48 rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex flex-col items-center justify-center group relative overflow-hidden">
                      <FileCheck size={48} className="text-emerald-500 mb-2" />
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Receipt Uploaded
                      </p>
                      <button
                        onClick={() => setTransferProof(null)}
                        className="absolute inset-0 bg-rose-500 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">
                          Replace File
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        id="transfer-proof"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(file);
                        }}
                      />
                      <label
                        htmlFor="transfer-proof"
                        className="h-48 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                      >
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                          {uploadingProof ? (
                            <Loader2 className="animate-spin text-blue-500" />
                          ) : (
                            <Upload size={32} className="text-slate-300" />
                          )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Select Image / PDF
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Part 2: Add Cost & Billing Audit */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                      Part 2: Add Cost & Billing Audit
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Requires CS Approval for Invoicing
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setExtraCosts([
                      ...extraCosts,
                      {
                        id: `new-${Date.now()}`,
                        name: "",
                        amount: "",
                        paid_by_entity: "internal",
                      },
                    ])
                  }
                  className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50"
                >
                  <Plus size={14} className="mr-2" /> Add Cost
                </Button>
              </div>

              <div className="space-y-4">
                {extraCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden group"
                  >
                    {/* Status Ribbon/Badge */}
                    {cost.status && cost.status !== "draft" && (
                      <div
                        className={`absolute top-0 right-0 px-4 py-1 text-[7px] font-black uppercase tracking-tighter italic ${
                          cost.status === "approved"
                            ? "bg-emerald-500 text-white"
                            : cost.status === "need_approval"
                              ? "bg-amber-400 text-white animate-pulse"
                              : "bg-rose-500 text-white"
                        }`}
                      >
                        {cost.status === "need_approval"
                          ? "Waiting CS"
                          : cost.status}
                      </div>
                    )}

                    <div className="flex-1 space-y-4">
                      <Input
                        placeholder="Description (e.g. Uang Kuli)"
                        className="h-12 bg-white border-slate-200 rounded-xl text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        value={cost.name}
                        disabled={cost.status === "approved"}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setExtraCosts((prev) =>
                            prev.map((c) =>
                              c.id === cost.id ? { ...c, name: newVal } : c,
                            ),
                          );
                        }}
                      />
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Amount"
                          className="h-12 bg-white border-slate-200 rounded-xl text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          value={formatThousand(cost.amount)}
                          disabled={cost.status === "approved"}
                          onChange={(e) => {
                            const newVal = parseThousand(e.target.value);
                            setExtraCosts((prev) =>
                              prev.map((c) =>
                                c.id === cost.id ? { ...c, amount: newVal } : c,
                              ),
                            );
                          }}
                        />
                        <select
                          className={`h-12 px-3 rounded-xl text-[9px] font-black uppercase outline-none border-2 ${
                            cost.paid_by_entity === "internal"
                              ? "bg-blue-50 border-blue-100 text-blue-600"
                              : "bg-orange-50 border-orange-100 text-orange-600"
                          }`}
                          value={cost.paid_by_entity}
                          disabled={cost.status === "approved"}
                          onChange={(e) =>
                            setExtraCosts((prev) =>
                              prev.map((c) =>
                                c.id === cost.id
                                  ? {
                                      ...c,
                                      paid_by_entity: e.target.value as any,
                                    }
                                  : c,
                              ),
                            )
                          }
                        >
                          <option value="internal">SBU</option>
                          <option value="vendor">VENDOR</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleDeleteCost(cost.id)}
                        disabled={
                          cost.status === "approved" ||
                          (cost.status === "rejected_as_cogs" &&
                            cost.paid_by_sbu)
                        }
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-20"
                        title={
                          cost.status === "approved"
                            ? "Approved items cannot be deleted"
                            : "Delete Item"
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-xl shadow-slate-900/20">
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">
                      Total Extra Costs
                    </p>
                    <p className="text-2xl font-black text-white tracking-tighter italic">
                      {formatRupiah(totalExtra)}
                    </p>
                  </div>
                  <ShieldCheck size={40} className="text-white/10" />
                </div>
              </div>

              {/* Part 3: Documents */}
              <div className="space-y-6 pt-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                        Part 3: Documents & Finalization
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Settlement by Ops SBU (Submit to HQ)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDocs([
                        ...docs,
                        {
                          id: Math.random().toString(),
                          name: "",
                          description: "",
                          file: null,
                          url: null,
                        },
                      ])
                    }
                    className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50"
                  >
                    <Plus size={14} className="mr-2" /> Add Docs
                  </Button>
                </div>

                <div className="space-y-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4"
                    >
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Document Name (e.g. Surat Jalan)"
                          className="h-10 bg-slate-50 border-none rounded-xl text-[11px] font-black"
                          value={doc.name}
                          onChange={(e) =>
                            setDocs((prev) =>
                              prev.map((d) =>
                                d.id === doc.id
                                  ? { ...d, name: e.target.value }
                                  : d,
                              ),
                            )
                          }
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`doc-${doc.id}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(doc.id, file);
                            }}
                          />
                          <label
                            htmlFor={`doc-${doc.id}`}
                            className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border-2 border-dashed ${
                              doc.url
                                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-400"
                            }`}
                          >
                            {doc.url ? (
                              <>
                                <FileCheck size={14} /> Ready
                              </>
                            ) : (
                              <>
                                <Upload size={14} /> Upload
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setDocs((prev) => prev.filter((d) => d.id !== doc.id))
                        }
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-10 py-8 border-t border-slate-100 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Status: <span className="text-slate-900">{job.status}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-16 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancel
            </Button>

            {/* [AI] Print Cash Advance Slip Button in Footer */}
            <Button
              onClick={() =>
                printCashAdvanceSlip(job, {
                  amount: Number(transferAmount) || job.advance_amount || 0,
                  description: "Uang Jalan / Kasbon Driver",
                  paid_by: job.md_fleets?.md_entities?.is_vendor
                    ? "Vendor Invoice"
                    : "SBU Trucking (Operational)",
                  paid_at: new Date(),
                })
              }
              variant="ghost"
              className="h-16 px-6 rounded-[1.5rem] border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
            >
              <Printer size={16} />
              Cetak Slip Kasbon
            </Button>

            {!isLocked ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="h-16 px-6 rounded-[1.5rem] border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Draft
                </Button>

                <Button
                  onClick={handlePaid}
                  disabled={submitting || advanceStatus === "paid"}
                  className="h-16 px-8 bg-green-600 text-white hover:bg-green-700 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-green-100/50"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <DollarSign size={16} />
                  )}
                  {advanceStatus === "paid" ? "Paid ✓" : "Mark Paid"}
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-16 px-8 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-100/50"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  Submit to CS
                </Button>

                <Button
                  onClick={handleFinalizeToHQ}
                  disabled={submitting}
                  className="h-16 px-10 bg-indigo-600 text-white hover:bg-indigo-700 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-2xl shadow-indigo-200/50"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckSquare size={18} />
                  )}
                  COMPLETED & SUBMIT TO HQ
                </Button>
              </>
            ) : (
              <div className="bg-emerald-50 text-emerald-600 px-8 h-16 rounded-[1.5rem] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest italic border border-emerald-100">
                <ShieldCheck size={20} /> MISSION ARCHIVED & PAID
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
