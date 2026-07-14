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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

interface CostEntry {
  id: string;
  cost_type: string;
  amount: string;
  description: string;
  charge_type: "reimbursement" | "surcharge";
  paid_by_entity: "internal" | "vendor";
  proof_url?: string;
  cost_account_id?: string;
}

interface AddCostModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialJoId?: string | null;
  sbuType?: string;
}



export default function AddCostModal({
  onClose,
  onSuccess,
  initialJoId,
  sbuType = 'TRUCKING',
}: AddCostModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jos, setJos] = useState<any[]>([]);
  const [fetchingJos, setFetchingJos] = useState(true);
  const [selectedJoId, setSelectedJoId] = useState(initialJoId || "");
  const [selectedJoDetail, setSelectedJoDetail] = useState<any>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  useEffect(() => {
    if (initialJoId) {
      setSelectedJoId(initialJoId);
    }
  }, [initialJoId]);

  useEffect(() => {
    if (selectedJoId) {
      fetchDraftCosts(selectedJoId);
      fetchJoDetail(selectedJoId);
    } else {
      setSelectedJoDetail(null);
    }
  }, [selectedJoId]);

  // Multi-cost State
  const [costs, setCosts] = useState<CostEntry[]>([
    {
      id: Math.random().toString(),
      cost_type: "",
      amount: "",
      description: "",
      charge_type: "reimbursement",
      paid_by_entity: "internal",
    },
  ]);
  const [coaList, setCoaList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);

  const fetchCompletedJos = async () => {
    try {
      setFetchingJos(true);
      let query = supabase
        .from("job_orders")
        .select("id, jo_number, purchase_price, base_price, fleet_id, transporter_id, wo_item_id, tenant_id")
        .eq("status", "completed");

      if (sbuType) {
        query = query.eq("sbu_type", sbuType);
      }

      const { data, error } = await query.order("completed_at", { ascending: false });

      if (error) throw error;
      setJos(data || []);
    } catch (err) {
      console.error("Fetch Jobs Error:", err);
    } finally {
      setFetchingJos(false);
    }
  };

  const fetchJoDetail = async (joId: string) => {
    try {
      setFetchingDetail(true);
      const jo = jos.find(j => j.id === joId);
      if (!jo) return;

      const [fleetRes, transporterRes, woItemRes] = await Promise.all([
        jo.fleet_id
          ? supabase.from('md_fleets').select('id, plate_number, fleet_type_id, entity_id').eq('id', jo.fleet_id).maybeSingle()
          : { data: null, error: null },
        jo.transporter_id
          ? supabase.from('md_entities').select('id, name').eq('id', jo.transporter_id).maybeSingle()
          : { data: null, error: null },
        jo.wo_item_id
          ? supabase.from('wo_items').select('id, item_data, unit_price, total_revenue, wo_id').eq('id', jo.wo_item_id).maybeSingle()
          : { data: null, error: null },
      ]);

      let fleetWithType: any = fleetRes?.data || null;
      if (fleetWithType) {
        const [fleetTypeRes, fleetEntityRes] = await Promise.all([
          fleetWithType.fleet_type_id
            ? supabase.from('md_fleet_types').select('type_name').eq('id', fleetWithType.fleet_type_id).maybeSingle()
            : { data: null },
          fleetWithType.entity_id
            ? supabase.from('md_entities').select('name, is_vendor').eq('id', fleetWithType.entity_id).maybeSingle()
            : { data: null },
        ]);
        fleetWithType = {
          ...fleetWithType,
          md_fleet_types: fleetTypeRes?.data || null,
          md_entities: fleetEntityRes?.data || null,
        };
      }

      let woWithCustomer = null;
      if (woItemRes?.data?.wo_id) {
        const woData = await supabase
          .from('work_orders')
          .select('id, wo_number, customer_id')
          .eq('id', woItemRes.data.wo_id)
          .maybeSingle();
        const wo = woData?.data;
        if (wo?.customer_id) {
          const custRes = await supabase
            .from('md_entities')
            .select('name, legal_name')
            .eq('id', wo.customer_id)
            .maybeSingle();
          woWithCustomer = { ...wo, md_entities: custRes?.data || null };
        } else {
          woWithCustomer = wo;
        }
      }

      setSelectedJoDetail({
        ...jo,
        md_fleets: fleetWithType,
        transporter: transporterRes?.data || null,
        wo_items: woItemRes?.data ? { ...woItemRes.data, work_orders: woWithCustomer } : null,
      });
    } catch (err) {
      console.error('Fetch JO Detail Error:', err);
    } finally {
      setFetchingDetail(false);
    }
  };

  const fetchDraftCosts = async (joId: string) => {
    try {
      const { data, error } = await supabase
        .from("extra_costs")
        .select("*")
        .eq("jo_id", joId)
        .eq("status", "draft");

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedCosts = data.map((d) => ({
          id: d.id,
          cost_type: d.cost_type,
          amount: d.amount.toString(),
          description: d.description,
          charge_type: d.charge_type || "reimbursement",
          paid_by_entity: d.paid_by_entity || "internal",
          proof_url: d.description?.startsWith("http")
            ? d.description
            : undefined,
        }));
        setCosts(loadedCosts);
        toast.success(`Loaded ${data.length} draft cost(s)`);
      } else {
        if (
          costs.length > 1 ||
          (costs.length === 1 && costs[0].amount !== "")
        ) {
          setCosts([
            {
              id: Math.random().toString(),
              cost_type: "",
              amount: "",
              description: "",
              charge_type: "reimbursement",
              paid_by_entity: "internal",
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Fetch Drafts Error:", err);
    }
  };

  useEffect(() => {
    fetchCompletedJos();
    (async () => {
      const { data } = await supabase.from('finance_coa').select('id, account_number, account_name').order('account_number');
      if (data) setCoaList(data);
    })();
    (async () => {
      if (!profile?.tenant_id) return;
      const { data: expenseData } = await supabase.from('md_expense_items').select('id, expense_code, expense_name, expense_account_id').eq('tenant_id', profile?.tenant_id);
      if (expenseData) setExpenseList(expenseData);
    })();
  }, [profile?.tenant_id]);

  const addCostRow = () => {
    setCosts([
      ...costs,
      {
        id: Math.random().toString(),
        cost_type: "",
        amount: "",
        description: "",
        charge_type: "reimbursement",
        paid_by_entity: "internal",
      },
    ]);
  };

  const removeCostRow = (id: string) => {
    if (costs.length === 1) return;
    setCosts(costs.filter((c) => c.id !== id));
  };

  const updateCost = (id: string, field: keyof CostEntry, value: string) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (id: string, file: File) => {
    try {
      setUploadingMap((prev) => ({ ...prev, [id]: true }));
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedJoId || "temp"}_${id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `billing_proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      updateCost(id, "proof_url", publicUrl);
      toast.success("Billing uploaded successfully");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent,
    status: "draft" | "need_approval" = "need_approval",
  ) => {
    if (e) e.preventDefault();
    if (!selectedJoId) return toast.error("Pilih Job Order terlebih dahulu");

    const invalidCost = costs.find((c) => !c.amount || isNaN(Number(c.amount)));
    if (invalidCost) return toast.error("Pastikan semua jumlah biaya valid");
    const nonPositive = costs.find((c) => Number(c.amount) <= 0);
    if (nonPositive) return toast.error("Pastikan semua jumlah biaya positif");

    const missingProof = costs.find(
      (c) => !c.proof_url && status === "need_approval",
    );
    if (missingProof)
      return toast.error("Harap upload bukti billing untuk semua biaya");

    try {
      if (status === "draft") setSavingDraft(true);
      else setSubmitting(true);

      const { data: selectedJoData, error: selectedJoError } = await supabase
        .from("job_orders")
        .select("wo_item_id, transporter_id, vendor_id, tenant_id")
        .eq("id", selectedJoId)
        .single();

      if (selectedJoError) throw selectedJoError;

      let resolvedWoId = null;
      if (selectedJoData?.wo_item_id) {
        const { data: woItemData, error: woItemError } = await supabase
          .from("wo_items")
          .select("wo_id")
          .eq("id", selectedJoData.wo_item_id)
          .single();

        if (woItemError) throw woItemError;
        resolvedWoId = woItemData?.wo_id || null;
      }

      const resolvedVendorId =
        selectedJoData?.vendor_id || selectedJoData?.transporter_id || null;

      const payloads = costs.map((c) => ({
        jo_id: selectedJoId,
        cost_type: c.cost_type,
        charge_type: c.charge_type,
        amount: Number(c.amount),
        description: c.proof_url || c.cost_type.toUpperCase(),
        is_billable: true,
        paid_by_entity: c.paid_by_entity,
        status: status,
        wo_id: resolvedWoId,
        vendor_id: resolvedVendorId,
        cost_account_id: c.cost_account_id || null,
      }));

      await supabase
        .from("extra_costs")
        .delete()
        .eq("jo_id", selectedJoId)
        .in("status", ["draft", "need_approval"]);

      const { error } = await supabase.from("extra_costs").insert(payloads);
      if (error) throw error;

      if (status === "need_approval") {
        await supabase
          .from("job_orders")
          .update({ is_cost_finished: true })
          .eq("id", selectedJoId);

        try {
          const joObj = jos.find(j => j.id === selectedJoId);
          await supabase.from("notifications").insert({
            tenant_id: joObj?.tenant_id || selectedJoData?.tenant_id,
            role: "hq_finance",
            title: "Need Approval Add Cost",
            message: `Biaya tambahan baru diajukan untuk JO ${joObj?.jo_number || selectedJoId}`,
            type: "add_cost",
            is_read: false,
            metadata: { link: `/hq/finance/cost-audit?sbu=${sbuType}` }
          });
        } catch (e) {
          console.error("Notification insert error", e);
        }
      }

      toast.success(
        status === "draft"
          ? "Data biaya disimpan sebagai draft"
          : `${costs.length} Biaya Tambahan diajukan ke CS`,
      );
      onSuccess();
    } catch (err: any) {
      console.error("Submit Error:", err);
      toast.error(err.message || "Gagal memproses biaya");
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  const totalAmount = costs.reduce(
    (acc, c) => acc + (Number(c.amount) || 0),
    0,
  );

  const formatThousand = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseThousand = (val: string) => {
    return val.replace(/\./g, "");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-900 px-10 py-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-600/20">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter">
                SBU COST AUDIT
              </h3>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
                Submit additional charges to CS for verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 p-2 rounded-full text-slate-400 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={(e) => handleSubmit(e, "need_approval")}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            {/* Job Order Selection */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Truck size={14} className="text-blue-600" /> Reference Job
                Order
              </label>
              <select
                className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-6 text-sm font-black text-slate-900 focus:bg-white focus:border-blue-600/20 transition-all outline-none appearance-none cursor-pointer"
                value={selectedJoId}
                onChange={(e) => setSelectedJoId(e.target.value)}
                required
                disabled={fetchingJos || !!initialJoId}
              >
                <option value="">-- SELECT COMPLETED JO --</option>
                {jos.map((jo) => (
                  <option key={jo.id} value={jo.id}>
                    {jo.jo_number} (AUDIT READY)
                  </option>
                ))}
              </select>
            </div>

            {/* Job Order Detail Card */}
            {fetchingDetail ? (
              <div className="flex items-center justify-center py-6 bg-slate-50 rounded-3xl border border-slate-100">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : selectedJoDetail ? (
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Job Order Details
                  </p>
                  <span className="text-sm font-black text-slate-900">{selectedJoDetail.jo_number}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pelanggan</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedJoDetail.wo_items?.work_orders?.md_entities?.legal_name ||
                       selectedJoDetail.wo_items?.work_orders?.md_entities?.name || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Route</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedJoDetail.wo_items?.item_data?.origin_name ||
                       selectedJoDetail.wo_items?.item_data?.shipper_name ||
                       selectedJoDetail.wo_items?.item_data?.origin_city || '?'} → {selectedJoDetail.wo_items?.item_data?.destination_name ||
                       selectedJoDetail.wo_items?.item_data?.recipient_name ||
                       selectedJoDetail.wo_items?.item_data?.recipient_city || '?'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Armada</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedJoDetail.md_fleets?.md_fleet_types?.type_name || selectedJoDetail.md_fleets?.plate_number || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vendor/Internal</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedJoDetail.md_fleets?.md_entities?.is_vendor
                        ? (selectedJoDetail.transporter?.name || selectedJoDetail.md_fleets?.md_entities?.name || 'Vendor')
                        : 'Internal'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Qty</p>
                    <p className="text-xs font-bold text-slate-900">
                      {(() => {
                        const d = selectedJoDetail.wo_items?.item_data || {};
                        const qty = d.qty || d.quantity || d.total_qty || d.total_weight;
                        const uom = d.uom || d.unit || (d.total_weight ? 'kg' : '');
                        return qty ? `${qty} ${uom}`.trim() : '-';
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Plat Nomor</p>
                    <p className="text-xs font-bold text-slate-900">{selectedJoDetail.md_fleets?.plate_number || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Harga Jual</p>
                    <p className="text-xs font-black text-emerald-700">
                      {(() => {
                        const sellPrice = selectedJoDetail.base_price ||
                          selectedJoDetail.wo_items?.unit_price ||
                          selectedJoDetail.wo_items?.item_data?.deal_price ||
                          selectedJoDetail.wo_items?.total_revenue || 0;
                        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sellPrice);
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">Harga Beli</p>
                    <p className="text-xs font-black text-rose-700">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                        selectedJoDetail.purchase_price || 0
                      )}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  {(() => {
                    const sellPrice = selectedJoDetail.base_price ||
                      selectedJoDetail.wo_items?.unit_price ||
                      selectedJoDetail.wo_items?.item_data?.deal_price ||
                      selectedJoDetail.wo_items?.total_revenue || 0;
                    const buyPrice = selectedJoDetail.purchase_price || 0;
                    const margin = sellPrice - buyPrice;
                    return (
                      <span className={`text-[10px] font-black uppercase tracking-wider ${margin > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Margin: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(margin)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {/* Dynamic Costs Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" /> Additional
                  Costs List
                </h4>
                <p className="text-[10px] font-black text-slate-400 uppercase italic">
                  Row Count: {costs.length}
                </p>
              </div>

              <div className="space-y-4">
                {costs.map((cost, index) => (
                  <div
                    key={cost.id}
                    className="bg-slate-50 rounded-3xl p-6 border border-slate-100 relative group animate-in slide-in-from-right-4 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Cost Type
                        </label>
                        <select
                           className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-xs font-black text-slate-900 outline-none"
                           value={expenseList.find(e => e.expense_code === cost.cost_type)?.id || ''}
                           onChange={(e) => {
                             const selected = expenseList.find((exp) => exp.id === e.target.value);
                             if (selected) {
                               updateCost(cost.id, "cost_type", selected.expense_code);
                               updateCost(cost.id, "cost_account_id", selected.expense_account_id || '');
                             }
                           }}
                         >
                           <option value="">-- Select Expense --</option>
                           {expenseList.map((exp) => (
                             <option key={exp.id} value={exp.id}>
                               {exp.expense_code} - {exp.expense_name}
                             </option>
                           ))}
                         </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Payor
                        </label>
                        <select
                          className={`w-full h-12 border rounded-xl px-4 text-[10px] font-black uppercase outline-none transition-all ${
                            cost.paid_by_entity === "internal"
                              ? "bg-blue-50 border-blue-200 text-blue-600"
                              : "bg-orange-50 border-orange-200 text-orange-600"
                          }`}
                          value={cost.paid_by_entity}
                          onChange={(e) =>
                            updateCost(
                              cost.id,
                              "paid_by_entity",
                              e.target.value,
                            )
                          }
                        >
                          <option value="internal">SBU / INTERNAL</option>
                          <option value="vendor">VENDOR</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          COA
                        </label>
                        <select
                          value={cost.cost_account_id || ''}
                          onChange={(e) => updateCost(cost.id, 'cost_account_id', e.target.value)}
                          className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-[9px] font-black text-slate-800 outline-none"
                        >
                          <option value="">Beban Operasional (Default)</option>
                          {coaList.filter(c => c.account_number.startsWith('5-')).map(c => (
                            <option key={c.id} value={c.id}>{c.account_number} - {c.account_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Amount (IDR)
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          className="h-12 bg-white border-slate-200 rounded-xl px-4 font-black text-sm"
                          value={formatThousand(cost.amount)}
                          onChange={(e) =>
                            updateCost(
                              cost.id,
                              "amount",
                              parseThousand(e.target.value),
                            )
                          }
                          required
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Evidence / Proof
                        </label>
                        <div className="flex items-center gap-2">
                          {cost.proof_url ? (
                            <div className="flex-1 h-12 bg-emerald-50 border border-emerald-100 rounded-xl px-4 flex items-center justify-between overflow-hidden">
                              <span className="text-[9px] font-black text-emerald-600 truncate">
                                FILE ATTACHED
                              </span>
                              <CheckCircle
                                size={14}
                                className="text-emerald-500 shrink-0"
                              />
                            </div>
                          ) : (
                            <div className="flex-1 relative">
                              <input
                                type="file"
                                id={`file-${cost.id}`}
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(cost.id, file);
                                }}
                              />
                              <label
                                htmlFor={`file-${cost.id}`}
                                className="h-12 bg-white border-2 border-dashed border-slate-200 rounded-xl px-4 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 text-[9px] font-black uppercase tracking-widest"
                              >
                                {uploadingMap[cost.id] ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <>
                                    <Upload size={14} /> Select File
                                  </>
                                )}
                              </label>
                            </div>
                          )}
                          {cost.proof_url && (
                            <button
                              type="button"
                              onClick={() =>
                                updateCost(cost.id, "proof_url", "")
                              }
                              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-1 flex items-end h-full">
                        <button
                          type="button"
                          onClick={() => removeCostRow(cost.id)}
                          className="w-full h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addCostRow}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-black text-[11px] uppercase tracking-widest"
              >
                <Plus size={16} /> Add Another Cost Row
              </button>
            </div>
          </div>

          {/* Footer Summary */}
          <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                Total Additional Charges
              </p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter italic">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(totalAmount)}
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => handleSubmit(e, "draft")}
                disabled={submitting || savingDraft}
                className="h-16 px-8 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-900"
              >
                {savingDraft ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Save as Draft"
                )}
              </Button>
              <Button
                type="submit"
                disabled={submitting || savingDraft || !selectedJoId}
                className="h-16 px-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-3"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    SUBMIT TO CS <ChevronRight size={18} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
