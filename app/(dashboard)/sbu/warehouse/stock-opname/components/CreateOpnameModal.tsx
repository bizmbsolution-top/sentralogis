"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { X, Loader2, Calendar } from "lucide-react";

export default function CreateOpnameModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    warehouseId: profile?.warehouse_id || "",
    type: "FULL",
    locationId: "",
    scheduleDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  useEffect(() => {
    async function load() {
      if (!profile?.tenant_id) return;
      const { data } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', profile.tenant_id);
      if (data) setWarehouses(data);
    }
    load();
  }, [profile?.tenant_id]);

  useEffect(() => {
    async function loadLocs() {
      if (!form.warehouseId || form.type === 'FULL') {
        setLocations([]);
        setForm(f => ({ ...f, locationId: "" }));
        return;
      }
      const { data } = await supabase.from('md_warehouse_locations').select('id, code').eq('warehouse_id', form.warehouseId);
      if (data) setLocations(data);
    }
    loadLocs();
  }, [form.warehouseId, form.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouseId || !profile?.id || !profile?.tenant_id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_stock_opname", {
        p_tenant_id: profile.tenant_id,
        p_warehouse_id: form.warehouseId,
        p_opname_type: form.type,
        p_schedule_date: form.scheduleDate,
        p_user_id: profile.id,
        p_notes: (form.notes || null) as string,
        p_location_id: (form.locationId || null) as string
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to create stock opname");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Create Stock Opname</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Warehouse</label>
              <select
                value={form.warehouseId}
                onChange={e => setForm({ ...form, warehouseId: e.target.value })}
                required
                disabled={!!profile?.warehouse_id}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
              >
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Opname Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="FULL">Full Count</option>
                  <option value="PARTIAL">Partial / Zone</option>
                  <option value="CYCLE_COUNT">Cycle Count</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Schedule Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={form.scheduleDate}
                    onChange={e => setForm({ ...form, scheduleDate: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {form.type !== 'FULL' && locations.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Target Location (Optional)</label>
                <select
                  value={form.locationId}
                  onChange={e => setForm({ ...form, locationId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">All Locations</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="E.g., End of month audit..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.warehouseId}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
