"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, CheckCircle2, MapPin, ArrowRight, User, Package, Box, Layers } from "lucide-react";
import { toast } from "react-hot-toast";

interface RepackingExecutionModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RepackingExecutionModal({ order, onClose, onSuccess }: RepackingExecutionModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [resultItems, setResultItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  // Pipeline state
  // 1: Outbound/Picking, 2: Repacking/Processing, 3: Inbound/Putaway
  const [currentStage, setCurrentStage] = useState(1);
  
  // Assignments
  const [pickerId, setPickerId] = useState<string>("");
  const [processorId, setProcessorId] = useState<string>("");
  const [putawayId, setPutawayId] = useState<string>("");

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [targetLocations, setTargetLocations] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [order.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, locRes, staffRes] = await Promise.all([
        supabase
          .from("wh_repacking_items")
          .select(`
            id, item_type, quantity, batch_number, expiry_date, source_location_id, target_location_id,
            product:md_product_skus(id, sku_code, name, uom:unit),
            source_loc:md_warehouse_locations!wh_repacking_items_source_location_id_fkey(id, code)
          `)
          .eq("repacking_order_id", order.id),
        supabase
          .from("md_warehouse_locations")
          .select("id, code")
          .order("code"),
        supabase
          .from("md_warehouse_staff")
          .select("id, name, role")
          .eq("tenant_id", order.tenant_id)
          .eq("warehouse_id", order.warehouse_id)
          .eq("is_active", true)
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (locRes.data) setLocations(locRes.data);
      if (staffRes.data) setStaff(staffRes.data);

      const items = itemsRes.data || [];
      const sources = items.filter(i => i.item_type === "SOURCE");
      const results = items.filter(i => i.item_type === "RESULT");
      
      setSourceItems(sources);
      setResultItems(results);
      
      const initialTargets: Record<string, string> = {};
      results.forEach(r => {
        if (r.target_location_id) initialTargets[r.id] = r.target_location_id;
      });
      setTargetLocations(initialTargets);

    } catch (err: any) {
      toast.error(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const allPicked = sourceItems.length > 0 && sourceItems.every(s => picked[s.id]);
  const allChecked = resultItems.length > 0 && resultItems.every(r => checked[r.id]);
  const allLocated = resultItems.length > 0 && resultItems.every(r => targetLocations[r.id]);

  const handleNextStage = () => {
    if (currentStage === 1) {
      if (!pickerId) return toast.error("Pilih staff Picker terlebih dahulu");
      if (!allPicked) return toast.error("Semua item source harus di-pick");
      setCurrentStage(2);
    } else if (currentStage === 2) {
      if (!processorId) return toast.error("Pilih staff Repacking terlebih dahulu");
      if (!allChecked) return toast.error("Semua item result harus di-check");
      setCurrentStage(3);
    } else if (currentStage === 3) {
      if (!putawayId) return toast.error("Pilih staff Putaway terlebih dahulu");
      if (!allLocated) return toast.error("Semua item result harus memiliki lokasi tujuan");
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      for (const res of resultItems) {
        if (targetLocations[res.id] !== res.target_location_id) {
          await supabase.from("wh_repacking_items").update({ target_location_id: targetLocations[res.id] }).eq("id", res.id);
        }
      }

      const staffNotes = `Staff Picking: ${staff.find(s => s.id === pickerId)?.name || ""}, Staff Repacking: ${staff.find(s => s.id === processorId)?.name || ""}, Staff Putaway: ${staff.find(s => s.id === putawayId)?.name || ""}`;
      
      await supabase.from("wh_repacking_orders").update({ 
        notes: (order.notes ? order.notes + "\\n" : "") + staffNotes 
      }).eq("id", order.id);

      const { error } = await supabase.rpc("complete_repacking_order", {
        p_order_id: order.id,
        p_user_id: profile.id
      });
      
      if (error) throw error;
      toast.success("Repacking Lifecycle Completed Successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-white shadow-2xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh] animate-in zoom-in-95 duration-300 border border-slate-200">
        
        {/* Left Sidebar: Timeline */}
        <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-8 flex flex-col">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
              Operations Lifecycle
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Layers size={14} /> {order.order_number}
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute left-6 top-6 bottom-12 w-0.5 bg-slate-200"></div>

            <div className="space-y-12 relative">
              {/* STAGE 1 */}
              <div className="relative flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border-2 ${currentStage === 1 ? "bg-indigo-600 border-indigo-200 text-white" : currentStage > 1 ? "bg-emerald-500 border-emerald-200 text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                  {currentStage > 1 ? <CheckCircle2 size={24} /> : <Package size={24} />}
                </div>
                <div className="pt-2">
                  <h3 className={`text-base font-black uppercase tracking-tight ${currentStage >= 1 ? "text-slate-900" : "text-slate-400"}`}>1. Outbound</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Picking Source</p>
                </div>
              </div>

              {/* STAGE 2 */}
              <div className="relative flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border-2 ${currentStage === 2 ? "bg-amber-500 border-amber-200 text-white" : currentStage > 2 ? "bg-emerald-500 border-emerald-200 text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                  {currentStage > 2 ? <CheckCircle2 size={24} /> : <Layers size={24} />}
                </div>
                <div className="pt-2">
                  <h3 className={`text-base font-black uppercase tracking-tight ${currentStage >= 2 ? "text-slate-900" : "text-slate-400"}`}>2. Process</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Repacking & Check</p>
                </div>
              </div>

              {/* STAGE 3 */}
              <div className="relative flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border-2 ${currentStage === 3 ? "bg-indigo-600 border-indigo-200 text-white" : currentStage > 3 ? "bg-emerald-500 border-emerald-200 text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                  {currentStage > 3 ? <CheckCircle2 size={24} /> : <Box size={24} />}
                </div>
                <div className="pt-2">
                  <h3 className={`text-base font-black uppercase tracking-tight ${currentStage >= 3 ? "text-slate-900" : "text-slate-400"}`}>3. Inbound</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Putaway Result</p>
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="mt-8 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest text-center">
            Tutup & Simpan Sementara
          </button>
        </div>

        {/* Right Pane: Content */}
        <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              {/* Header Context */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    {currentStage === 1 ? "Outbound / Picking Task" : currentStage === 2 ? "Repacking Process Task" : "Inbound / Putaway Task"}
                  </h1>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                    Tahap {currentStage} dari 3
                  </p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                {currentStage === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={14} className="text-indigo-500"/> Assign Picker Staff
                      </label>
                      <select
                        value={pickerId}
                        onChange={(e) => setPickerId(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- Pilih Staff Picking --</option>
                        {staff.filter(s => s.role === 'PUTAWAY' || s.role === 'TALLY').map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Items Checklist</h4>
                      {sourceItems.map(item => (
                        <label key={item.id} className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${picked[item.id] ? "border-indigo-300 bg-indigo-50/50 shadow-inner" : "border-slate-200 bg-white hover:border-indigo-200"}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${picked[item.id] ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>
                              {picked[item.id] && <CheckCircle2 size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{item.product?.name || item.product?.sku_code}</p>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Target Ambil: {item.quantity} {item.product?.uom}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-indigo-600"><MapPin size={10}/> Rak Asal: {item.source_loc?.code || "-"}</span>
                              </div>
                            </div>
                          </div>
                          <input type="checkbox" className="hidden" checked={picked[item.id] || false} onChange={(e) => setPicked(prev => ({...prev, [item.id]: e.target.checked}))} />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {currentStage === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={14} className="text-amber-500"/> Assign Processing Staff
                      </label>
                      <select
                        value={processorId}
                        onChange={(e) => setProcessorId(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">-- Pilih Staff Repacking / Kitting --</option>
                        {staff.filter(s => s.role === 'ADD_SERVICE' || s.role === 'TALLY').map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Result Items Quality Check</h4>
                      {resultItems.map(item => (
                        <label key={item.id} className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${checked[item.id] ? "border-amber-300 bg-amber-50/50 shadow-inner" : "border-slate-200 bg-white hover:border-amber-200"}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${checked[item.id] ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300 bg-white"}`}>
                              {checked[item.id] && <CheckCircle2 size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{item.product?.name || item.product?.sku_code}</p>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Hasil Rakitan: {item.quantity} {item.product?.uom}</span>
                                {item.batch_number && <span>• Batch: {item.batch_number}</span>}
                              </div>
                            </div>
                          </div>
                          <input type="checkbox" className="hidden" checked={checked[item.id] || false} onChange={(e) => setChecked(prev => ({...prev, [item.id]: e.target.checked}))} />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {currentStage === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={14} className="text-emerald-500"/> Assign Putaway Staff
                      </label>
                      <select
                        value={putawayId}
                        onChange={(e) => setPutawayId(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Pilih Staff Putaway --</option>
                        {staff.filter(s => s.role === 'PUTAWAY').map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Location Mapping</h4>
                      {resultItems.map(item => (
                        <div key={item.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                              <Box size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{item.product?.name || item.product?.sku_code}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          
                          <select
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                            value={targetLocations[item.id] || ""}
                            onChange={(e) => setTargetLocations(prev => ({ ...prev, [item.id]: e.target.value }))}
                          >
                            <option value="">Pilih Rak/Lokasi Inbound...</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.code}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <button
                  onClick={handleNextStage}
                  disabled={submitting}
                  className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 
                    currentStage === 1 ? <>Complete Outbound <ArrowRight size={16}/></> :
                    currentStage === 2 ? <>Complete Processing <ArrowRight size={16}/></> :
                    <>Complete Order <CheckCircle2 size={16}/></>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}