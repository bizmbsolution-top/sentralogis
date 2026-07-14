"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Loader2, Plus, PackageOpen, Clock, CheckCircle2, XCircle, Play, UserPlus
} from "lucide-react";
import { format } from "date-fns";
import CreateMovementModal from "./components/CreateMovementModal";

interface Movement {
  id: string;
  quantity: number;
  movement_date: string;
  reference_type: string | null;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  product: { name: string; sku_code: string } | null;
  from_location: { code: string } | null;
  to_location: { code: string } | null;
  staff: { name: string } | null;
}

interface Staff {
  id: string;
  name: string;
  whatsapp: string;
}

export default function MovementsPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const sbuId = profile?.warehouse_id;
  const role = profile?.role;

  const [items, setItems] = useState<Movement[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const canExecute = role === "sbu_ops_wh" || role === "sbu_manager_wh" || role === "sbu_admin_wh";

  const load = useCallback(async () => {
    let tId = tenantId;
    if (!tId) {
       const { data: tData } = await supabase.from('tenants').select('id').limit(1);
       if (tData?.length) tId = tData[0].id;
    }
    if (!tId) return;
    setLoading(true);
    try {
      let whId = profile?.warehouse_id;
      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tId);
      if (whData) setWarehouses(whData);

      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id;
          setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const [movRes, staffRes] = await Promise.all([
        supabase
          .from("wh_internal_movements")
          .select(`
            id, quantity, movement_date, reference_type, status, notes, assigned_to,
            product:product_sku_id(name, sku_code),
            from_location:from_location_id(code),
            to_location:to_location_id(code),
            staff:assigned_to(name)
          `)
          .eq("tenant_id", tId)
          .eq("warehouse_id", whId)
          .order("movement_date", { ascending: false }),
        supabase
          .from("md_warehouse_staff")
          .select("id, name, whatsapp")
          .eq("tenant_id", tId)
          .eq("warehouse_id", whId)
          .in("role", ["TALLY", "PUTAWAY", "WAREHOUSE_STAFF"])
          .eq("is_active", true),
      ]);

      if (movRes.error) {
        if (movRes.error.code === "42P01") { setItems([]); }
        else { console.error(movRes.error); }
      } else {
        setItems(movRes.data || []);
      }

      setStaffList(staffRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, profile?.warehouse_id, selectedWarehouse]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (movId: string, staffId: string) => {
    setAssigning(movId);
    try {
      const { error } = await supabase
        .from("wh_internal_movements")
        .update({ assigned_to: staffId || null })
        .eq("id", movId);
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(err.message || "Assign failed");
    } finally {
      setAssigning(null);
    }
  };

  const handleExecute = async (movId: string) => {
    setExecuting(movId);
    try {
      const { error } = await supabase.rpc("execute_internal_movement", {
        p_movement_id: movId,
      });
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(err.message || "Execute failed");
    } finally {
      setExecuting(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "COMPLETED")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-700"><CheckCircle2 size={10} /> completed</span>;
    if (status === "PENDING")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-700"><Clock size={10} /> pending</span>;
    if (status === "CANCELLED")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700"><XCircle size={10} /> cancelled</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">{status}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Internal Movements</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Manage stock relocations within the warehouse.</p>
          </div>
          {!profile?.warehouse_id && warehouses.length > 0 && (
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="ml-4 px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md"
        >
          <Plus size={18} />
          New Movement
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <PackageOpen size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Movements Yet</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              You haven&apos;t recorded any internal stock movements. Click &ldquo;New Movement&rdquo; to relocate items between racks.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-black">
                <th className="px-6 py-4 font-black">Date &amp; Time</th>
                <th className="px-6 py-4 font-black">Product / SKU</th>
                <th className="px-6 py-4 font-black">From</th>
                <th className="px-6 py-4 font-black text-center">Qty</th>
                <th className="px-6 py-4 font-black">To</th>
                <th className="px-6 py-4 font-black">Type</th>
                <th className="px-6 py-4 font-black">Notes</th>
                <th className="px-6 py-4 font-black">PIC</th>
                <th className="px-6 py-4 font-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(function(row, idx) {
                return (
                  <tr key={"mvt-" + idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {format(new Date(row.movement_date), "dd MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.product?.name || "-"}</div>
                      <div className="text-xs font-mono text-slate-500">{row.product?.sku_code || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                        {row.from_location?.code || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-emerald-600">
                      {row.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700">
                        {row.to_location?.code || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                      {row.reference_type?.replace(/_/g, " ") || "MANUAL"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={row.notes || ""}>
                      {row.notes || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {row.status === "PENDING" && canExecute ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={row.assigned_to || ""}
                            onChange={(e) => handleAssign(row.id, e.target.value)}
                            disabled={assigning === row.id}
                            className="max-w-[130px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
                          >
                            <option value="">Unassigned</option>
                            {staffList.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          {assigning === row.id && <Loader2 size={10} className="animate-spin text-slate-400" />}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-600">
                          {row.staff?.name || "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {statusBadge(row.status)}
                        {row.status === "PENDING" && canExecute && (
                          <button
                            onClick={() => handleExecute(row.id)}
                            disabled={executing === row.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-black text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {executing === row.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                            Execute
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CreateMovementModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
