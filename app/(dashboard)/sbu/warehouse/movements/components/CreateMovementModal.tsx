"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, X, AlertCircle, Plus, Trash2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface RowData {
  key: number;
  productId: string;
  sourceId: string;
  qty: number | "";
  destId: string;
}

interface StockEntry {
  productId: string;
  productName: string;
  skuCode: string;
  locId: string;
  locCode: string;
  qty: number;
}

export default function CreateMovementModal({ onClose, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const sbuId = profile?.warehouse_id;

  const [stock, setStock] = useState<StockEntry[]>([]);
  const [locs, setLocs] = useState<{ id: string; code: string; remaining: number | null }[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<RowData[]>([
    { key: 1, productId: "", sourceId: "", qty: "", destId: "" },
  ]);
  const nextKey = useRef(2);

  useEffect(() => {
    if (!tenantId || !sbuId) return;
    (async () => {
      setBusy(true);
      try {
      // --- 1. Locations + capacity ---
      let capMap = new Map<string, { remaining_volume_m3: number }>();
      try {
        const capRes = await supabase
          .from("vw_location_capacity")
          .select("location_id, remaining_volume_m3")
          .eq("tenant_id", tenantId);
        if (capRes.data) {
          capMap = new Map(capRes.data.map((c: any) => [c.location_id, c]));
        }
      } catch { /* view may not exist */ }

      const locRes = await supabase
        .from("md_warehouse_locations")
        .select("id, code")
        .eq("tenant_id", tenantId)
        .eq("warehouse_id", sbuId)
        .eq("is_active", true)
        .order("code");

      const locMapByCode = new Map<string, string>();
      const locList = (locRes.data || []).map((l: any) => {
        locMapByCode.set(l.code, l.id);
        const cap = capMap.get(l.id);
        return { id: l.id, code: l.code, remaining: cap ? Number(cap.remaining_volume_m3) : null };
      });
      setLocs(locList);

      // --- 2. Build stock ledger: product → location → balance ---
      // Matches the approach in inventory/page.tsx (ledger-based)
      const bal = new Map<string, Map<string, number>>();
      const prodMeta = new Map<string, { name: string; sku: string }>();

      function addBal(skuId: string, locId: string, qty: number) {
        if (!bal.has(skuId)) bal.set(skuId, new Map());
        const locs = bal.get(skuId)!;
        locs.set(locId, (locs.get(locId) || 0) + qty);
      }

      // 2a. Inbound → adds stock  (match inventory/page.tsx exactly)
      const { data: inboundData } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          actual_good_qty, product_sku_id, putaway_entries, putaway_location_id,
          product_sku:product_sku_id(id, sku_code, name),
          wh_inbound_receipts!inner(tenant_id)
        `)
        .eq('wh_inbound_receipts.tenant_id', tenantId);

      (inboundData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId) return;
        if (!prodMeta.has(skuId) && item.product_sku)
          prodMeta.set(skuId, { name: item.product_sku.name || '-', sku: item.product_sku.sku_code || '-' });

        if (item.putaway_entries && Array.isArray(item.putaway_entries) && item.putaway_entries.length > 0) {
          item.putaway_entries.forEach((e: any) => {
            const loc = e.location_code || e.location_id || item.putaway_location_id || '-';
            const qty = Number(e.quantity || e.qty || 0);
            if (qty > 0) addBal(skuId, loc, qty);
          });
        } else {
          addBal(skuId, item.putaway_location_id || '-', Number(item.actual_good_qty || 0));
        }
      });

      // 2b. Outbound → subtracts stock
      const { data: outboundData } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          picked_qty, product_sku_id, picking_entries,
          product_sku:product_sku_id(id, sku_code, name),
          wh_outbound_shipments!inner(tenant_id)
        `)
        .eq('wh_outbound_shipments.tenant_id', tenantId);

      (outboundData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId) return;
        if (!prodMeta.has(skuId) && item.product_sku)
          prodMeta.set(skuId, { name: item.product_sku.name || '-', sku: item.product_sku.sku_code || '-' });

        if (item.picking_entries && Array.isArray(item.picking_entries) && item.picking_entries.length > 0) {
          item.picking_entries.forEach((e: any) => {
            const loc = e.location_code || e.location_id || '-';
            const qty = Number(e.qty || e.quantity || 0);
            if (qty > 0) addBal(skuId, loc, -qty);
          });
        } else {
          addBal(skuId, '-', -Number(item.picked_qty || 0));
        }
      });

      // 2c. Internal movements (COMPLETED) → subtract source, add destination
      const { data: internalData } = await supabase
        .from('wh_internal_movements')
        .select(`
          quantity, product_sku_id,
          from_location:from_location_id(code),
          to_location:to_location_id(code),
          product_sku:product_sku_id(id, sku_code, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED');

      (internalData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId) return;
        if (!prodMeta.has(skuId) && item.product_sku)
          prodMeta.set(skuId, { name: item.product_sku.name || '-', sku: item.product_sku.sku_code || '-' });

        const qty = Number(item.quantity || 0);
        if (qty <= 0) return;
        addBal(skuId, item.from_location?.code || '-', -qty);
        addBal(skuId, item.to_location?.code || '-', qty);
      });

      // --- 3. Flatten into StockEntry array (code → id) ---
      const result: StockEntry[] = [];
      bal.forEach((locMap, skuId) => {
        const meta = prodMeta.get(skuId) || { name: '-', sku: '-' };
        locMap.forEach((qty, locCode) => {
          if (qty <= 0) return;
          const loc = locList.find((l) => l.code === locCode);
          if (!loc) return; // skip unknown location
          result.push({
            productId: skuId,
            productName: meta.name,
            skuCode: meta.sku,
            locId: loc.id,
            locCode: loc.code,
            qty,
          });
        });
      });

      setStock(result);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
    })();
  }, [tenantId, sbuId]);

  const products = useMemo(() => {
    const map = new Map<string, { name: string; sku: string }>();
    stock.forEach((s) => {
      if (!map.has(s.productId)) map.set(s.productId, { name: s.productName, sku: s.skuCode });
    });
    return Array.from(map.entries()).map(([id, p]) => ({ id, ...p }));
  }, [stock]);

  const sourcesFor = useCallback(
    (pid: string) => stock.filter((s) => s.productId === pid),
    [stock]
  );

  const maxQty = useCallback(
    (pid: string, lid: string) => {
      const found = stock.find((s) => s.productId === pid && s.locId === lid);
      return found ? found.qty : 0;
    },
    [stock]
  );

  const update = (key: number, field: keyof RowData, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        if (field === "productId") return { key: r.key, productId: value, sourceId: "", qty: "", destId: "" };
        if (field === "qty") return { ...r, qty: value === "" ? "" : Number(value) };
        return { ...r, [field]: value };
      })
    );
  };

  const addRow = () => {
    const k = nextKey.current++;
    setRows((prev) => [...prev, { key: k, productId: "", sourceId: "", qty: "", destId: "" }]);
  };

  const removeRow = (key: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const validate = () => {
    for (const r of rows) {
      if (!r.productId) return "Each row must have a product.";
      if (!r.sourceId) return "Each row must have a source location.";
      if (!r.destId) return "Each row must have a destination.";
      if (r.sourceId === r.destId) return "Source and destination cannot be the same.";
      const q = Number(r.qty);
      if (!q || q <= 0) return "Quantity must be > 0.";
      if (q > maxQty(r.productId, r.sourceId)) return "Quantity exceeds available stock.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    setError("");

    const payload = rows.map((r) => ({
      tenant_id: tenantId,
      warehouse_id: sbuId,
      product_sku_id: r.productId,
      from_location_id: r.sourceId,
      to_location_id: r.destId,
      quantity: Number(r.qty),
      notes: "Movement order",
      reference_type: "MANUAL",
      created_by: user?.id || null,
    }));

    const { error: insErr } = await supabase.from("wh_internal_movements").insert(payload);
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    onSuccess();
  };

  if (busy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-black">New Movement Order</h2>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">{rows.length} item(s)</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-auto p-6 flex flex-col gap-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm flex items-start gap-2 font-medium">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border border-slate-200">
                <th className="text-left px-3 py-2.5 font-black text-slate-600 text-xs uppercase">Product / SKU</th>
                <th className="text-left px-3 py-2.5 font-black text-slate-600 text-xs uppercase">Source Location</th>
                <th className="text-center px-3 py-2.5 font-black text-slate-600 text-xs uppercase">Qty</th>
                <th className="text-left px-3 py-2.5 font-black text-slate-600 text-xs uppercase">Destination</th>
                <th className="text-center px-3 py-2.5 font-black text-slate-600 text-xs uppercase">Cap.</th>
                <th className="text-center px-3 py-2.5 font-black text-slate-600 text-xs uppercase w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(function (row, idx) {
                const pkey = "r-" + row.key;
                const srcOptions = sourcesFor(row.productId);
                return (
                  <tr key={pkey} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <select
                        value={row.productId}
                        onChange={(e) => update(row.key, "productId", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="">Select product...</option>
                        {products.map(function (p, pi) {
                          return (
                            <option key={"p-" + idx + "-" + pi} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.sourceId}
                        onChange={(e) => update(row.key, "sourceId", e.target.value)}
                        disabled={!row.productId}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-black outline-none disabled:opacity-40"
                      >
                        <option value="">From location...</option>
                        {srcOptions.map(function (s, si) {
                          return (
                            <option key={"s-" + idx + "-" + si} value={s.locId}>
                              {s.locCode} — sisa: {s.qty}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.01"
                        max={maxQty(row.productId, row.sourceId)}
                        value={row.qty}
                        onChange={(e) => update(row.key, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder={row.sourceId ? "Max " + maxQty(row.productId, row.sourceId) : "Qty"}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-center focus:ring-2 focus:ring-black outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.destId}
                        onChange={(e) => update(row.key, "destId", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="">To location...</option>
                        {locs
                          .filter((l) => l.id !== row.sourceId && (l.remaining === null || l.remaining > 0))
                          .map(function (l, li) {
                            return (
                              <option key={"d-" + idx + "-" + li} value={l.id}>
                                {l.code}{l.remaining !== null ? " (" + l.remaining.toFixed(1) + " m³)" : ""}
                              </option>
                            );
                          })}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-medium text-slate-400">
                      {(() => {
                        const dest = locs.find((l) => l.id === row.destId);
                        if (!dest || dest.remaining === null) return "-";
                        return dest.remaining <= 0 ? "FULL" : dest.remaining.toFixed(1) + " m³";
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={rows.length <= 1}
                        onClick={() => removeRow(row.key)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg disabled:opacity-20 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            type="button"
            onClick={addRow}
            className="self-start flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Row
          </button>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-black hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Execute {rows.length > 1 ? rows.length + " Movements" : "Movement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
