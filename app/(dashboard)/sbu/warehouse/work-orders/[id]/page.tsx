"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Clock,
  Camera,
  FileText,
  CheckCircle2,
  DollarSign,
  Loader2,
  Save,
  X,
  MessageCircle,
  Plus,
  Trash2,
  ShieldAlert,
  Edit2,
  Search,
  Eye,
  Warehouse,
  GripVertical,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import dayjs from "dayjs";
import ProductFormModal from "@/app/(dashboard)/hq/master-data/products/components/ProductFormModal";

// --- MANIFEST EDITOR MODAL ---
function ManifestEditorModal({ jo, profile, onClose, onRefresh }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuResults, setSkuResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const manifestsToUse = jo.wo_item_manifests?.length > 0
      ? jo.wo_item_manifests
      : jo.wo_item?.wo_item_manifests || [];

    if (manifestsToUse) {
      setRows(
        manifestsToUse.map((m: any) => ({
          id: m.id, // existing DB id or from wo_item fallback
          product_sku_id: m.product_sku_id,
          sku_code: m.md_product_skus?.sku_code,
          name: m.md_product_skus?.name,
          unit: m.md_product_skus?.unit,
          quantity: m.quantity,
          unit_weight_kg: m.unit_weight_kg,
          unit_volume_m3: m.unit_volume_m3,
        })),
      );
    }
  }, [jo.wo_item_manifests, jo.wo_item?.wo_item_manifests]);

  // Debounced search for the search bar
  useEffect(() => {
    const timer = setTimeout(async () => {
      const customerId = jo.wo_item?.wo?.customer_id;
      if (!skuSearch.trim() || !customerId) {
        setSkuResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("md_product_skus")
          .select("id, sku_code, name, brand_name, unit, volume_m3, weight_kg")
          .eq("customer_id", customerId)
          .ilike("name", `%${skuSearch}%`)
          .limit(10);
        if (!error && data) setSkuResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [skuSearch, jo.wo_item?.wo?.customer_id]);

  const addRowFromSku = (sku: any) => {
    // Check if already in rows to prevent duplicate lines if desired, or just add.
    // For manifest, adding a new line is fine.
    setRows([
      ...rows,
      {
        id: `temp-${Date.now()}`,
        product_sku_id: sku.id,
        sku_code: sku.sku_code,
        name: sku.name,
        unit: sku.unit,
        quantity: 1,
        unit_weight_kg: sku.weight_kg || 0,
        unit_volume_m3: sku.volume_m3 || 0,
      },
    ]);
    setSkuSearch("");
    setSkuResults([]);
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const updateRowQty = (index: number, qty: number) => {
    const newRows = [...rows];
    newRows[index].quantity = qty;
    setRows(newRows);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Delete all existing manifests for this JO
      const { error: delErr } = await supabase
        .from("wo_item_manifests")
        .delete()
        .eq("job_order_id", jo.id);
      if (delErr) throw delErr;

      // 2. Insert new rows
      if (rows.length > 0) {
        const payloads = rows.map((r) => ({
          tenant_id: profile?.tenant_id,
          wo_item_id: jo.wo_item_id,
          job_order_id: jo.id,
          product_sku_id: r.product_sku_id,
          quantity: r.quantity,
          unit_weight_kg: r.unit_weight_kg,
          unit_volume_m3: r.unit_volume_m3,
        }));
        const { error: insErr } = await supabase
          .from("wo_item_manifests")
          .insert(payloads);
        if (insErr) throw insErr;
      }
      toast.success("Manifest berhasil disimpan");
      onRefresh();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan manifest");
    } finally {
      setSaving(false);
    }
  };

  const totalQty = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  const totalKg = rows.reduce(
    (acc, r) =>
      acc + (Number(r.quantity) || 0) * (Number(r.unit_weight_kg) || 0),
    0,
  );
  const totalCbm = rows.reduce(
    (acc, r) =>
      acc + (Number(r.quantity) || 0) * (Number(r.unit_volume_m3) || 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-6xl bg-slate-50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                Manifest Editor
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {jo.jo_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder="Cari SKU untuk ditambahkan ke tabel..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              {isSearching && (
                <Loader2
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-amber-500"
                />
              )}
            </div>

            {/* Search Results Dropdown */}
            {(skuResults.length > 0 || skuSearch.trim().length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
                {skuResults.map((sku) => (
                  <button
                    key={sku.id}
                    onClick={() => addRowFromSku(sku)}
                    className="w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {sku.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        SKU: {sku.sku_code} | {sku.weight_kg}kg |{" "}
                        {sku.volume_m3}cbm
                      </p>
                    </div>
                    <Plus
                      size={16}
                      className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                ))}
                {!isSearching && skuSearch.trim().length > 0 && (
                  <div className="p-3 bg-amber-50/50 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Plus size={14} /> Buat Master Produk Baru
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Buka form Master Produk untuk melengkapi detail barang
                        ini
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddingProduct(true)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-[10px] font-black uppercase"
                    >
                      Buka Form
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Item Details</th>
                  <th className="p-4 w-32 text-center">Qty (Units)</th>
                  <th className="p-4 w-32 text-right">Total Berat</th>
                  <th className="p-4 w-32 text-right">Total Vol</th>
                  <th className="p-4 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">
                          Manifest Kosong
                        </p>
                        <p className="text-[10px] mt-1">
                          Cari dan tambahkan SKU melalui kolom pencarian di
                          atas.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 text-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">
                          {r.name}
                        </p>
                        <p className="text-[10px] font-medium text-slate-500">
                          SKU: {r.sku_code} | UOM: {r.unit} | @
                          {r.unit_weight_kg}kg | @{r.unit_volume_m3}cbm
                        </p>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="1"
                          value={r.quantity || ""}
                          onChange={(e) =>
                            updateRowQty(idx, Number(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {(
                            (Number(r.quantity) || 0) * Number(r.unit_weight_kg)
                          ).toFixed(2)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          KG
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {(
                            (Number(r.quantity) || 0) * Number(r.unit_volume_m3)
                          ).toFixed(3)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          CBM
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-50/30 border-t-2 border-amber-100">
                    <td
                      colSpan={2}
                      className="p-4 text-right text-[10px] font-black text-amber-800 uppercase tracking-widest"
                    >
                      Grand Total
                    </td>
                    <td className="p-4 text-center text-sm font-black text-amber-900">
                      {totalQty.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-sm font-black text-amber-900">
                      {totalKg.toFixed(2)} KG
                    </td>
                    <td className="p-4 text-right text-sm font-black text-amber-900">
                      {totalCbm.toFixed(3)} CBM
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-amber-600/20"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            Simpan Manifest
          </button>
        </div>
      </div>

      {isAddingProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsAddingProduct(false)}
          ></div>
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]">
            <ProductFormModal
              onClose={() => setIsAddingProduct(false)}
              onSuccess={(newSku) => {
                setIsAddingProduct(false);
                if (newSku) {
                  addRowFromSku(newSku);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- ALLOCATION EDITOR MODAL ---
function AllocationEditorModal({
  jo,
  locations,
  zones,
  dbAssignments = [],
  profile,
  warehouseId,
  onClose,
  onRefresh,
  isOutbound = false,
  isTransfer = false,
}: any) {
  const router = useRouter();

  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const manifestItems = jo.wo_item_manifests?.length > 0
      ? jo.wo_item_manifests
      : jo.wo_item?.wo_item_manifests || [];

  useEffect(() => {
    if (jo.jo_warehouse_assignments) {
      setRows(
        jo.jo_warehouse_assignments.map((a: any) => {
          const targetManifestId = a.wo_item_manifest_id || a.manifest_id || a.job_order_manifest_id || "";
          const manifest = manifestItems.find((m: any) => m.id === targetManifestId);
          return {
            id: a.id,
            warehouse_location_id: a.warehouse_location_id,
            manifest_id: targetManifestId,
            allocated_kg: Number(a.allocated_kg) || 0,
            allocated_cbm: Number(a.allocated_cbm) || 0,
            quantity: Number(a.quantity) || 0,
            sku_code: manifest?.md_product_skus?.sku_code || "",
            name: manifest?.md_product_skus?.name || "",
          };
        }),
      );
    }
  }, [jo.jo_warehouse_assignments, manifestItems]);


  // If there are no zones for this warehouse, guide the user to the master location page
  if (zones.length === 0) {
    return (
      <div className="p-8 bg-white rounded-2xl shadow-lg text-center">
        <p className="text-sm text-slate-600 mb-4">
          Tidak ada zona yang terdaftar untuk gudang ini.
        </p>
        <button
          onClick={() =>
            router.push(
              `/hq/warehouse/locations/${profile?.warehouse_id || ""}`,
            )
          }
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold"
        >
          Buka Master Lokasi & Zona
        </button>
        <button
          onClick={onClose}
          className="ml-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm"
        >
          Tutup
        </button>
      </div>
    );
  }


  const addRow = () => {
    setRows([
      ...rows,
      {
        id: `temp-${Date.now()}`,
        warehouse_location_id: "",
        selectedZone: "",
        manifest_id: "",
        product_sku_id: "",
        sku_code: "",
        product_name: "",
        jo_quantity: "",
        unit: "",
        unit_weight_kg: 0,
        unit_volume_m3: 0,
        quantity: "",
        allocated_kg: "",
        allocated_cbm: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const updateRow = (index: number, field: string, value: any) => {
    const newRows = [...rows];
    if (field === "manifest_id") {
      const manifest = manifestItems.find((m: any) => m.id === value);
      newRows[index] = {
        ...newRows[index],
        manifest_id: value,
        product_sku_id: manifest?.product_sku_id ?? "",
        sku_code: manifest?.md_product_skus?.sku_code ?? "",
        product_name: manifest?.md_product_skus?.name ?? "",
        jo_quantity: manifest?.quantity ?? "",
        unit: manifest?.md_product_skus?.unit ?? "",
        unit_weight_kg:
          manifest?.unit_weight_kg || manifest?.md_product_skus?.weight_kg || 0,
        unit_volume_m3:
          manifest?.unit_volume_m3 || manifest?.md_product_skus?.volume_m3 || 0,
      };
    } else {
      newRows[index][field] = value;
      // If zone changes, reset location selection
      if (field === "selectedZone") {
        newRows[index].warehouse_location_id = "";
      }
    }
    setRows(newRows);
  };

  const computeRowKg = (row: any) => {
    if (row.manifest_id) {
      return (Number(row.quantity) || 0) * (Number(row.unit_weight_kg) || 0);
    }
    return Number(row.allocated_kg) || 0;
  };
  const computeRowCbm = (row: any) => {
    if (row.manifest_id) {
      return (Number(row.quantity) || 0) * (Number(row.unit_volume_m3) || 0);
    }
    return Number(row.allocated_cbm) || 0;
  };

  const getAllocatedForLocation = (locationId: string, skipIndex = -1) => {
    // 1. Sum up in-memory allocations in the CURRENT modal for this location
    const currentAlloc = rows.reduce(
      (acc, row, rowIndex) => {
        if (rowIndex === skipIndex) return acc;
        if (row.warehouse_location_id === locationId) {
          acc.allocated_kg += computeRowKg(row);
          acc.allocated_cbm += computeRowCbm(row);
        }
        return acc;
      },
      { allocated_kg: 0, allocated_cbm: 0 },
    );

    // 2. Sum up database allocations from OTHER job orders
    const otherJOsAlloc = dbAssignments.reduce(
      (acc: any, assign: any) => {
        if (assign.warehouse_location_id === locationId && assign.job_order_id !== jo.id) {
          acc.allocated_kg += Number(assign.allocated_kg) || 0;
          acc.allocated_cbm += Number(assign.allocated_cbm) || 0;
        }
        return acc;
      },
      { allocated_kg: 0, allocated_cbm: 0 }
    );

    return {
      allocated_kg: currentAlloc.allocated_kg + otherJOsAlloc.allocated_kg,
      allocated_cbm: currentAlloc.allocated_cbm + otherJOsAlloc.allocated_cbm,
    };
  };

  const handleSave = async () => {
    // Validation
    if (
      rows.some(
        (r) =>
          !r.warehouse_location_id || !r.manifest_id || Number(r.quantity) <= 0,
      )
    ) {
      toast.error("Lengkapi semua kolom lokasi, produk, dan qty.");
      return;
    }
    setSaving(true);
    try {
      // 1. Delete all existing
      const { error: delErr } = await supabase
        .from("jo_warehouse_assignments")
        .delete()
        .eq("job_order_id", jo.id);
      if (delErr) throw delErr;

      // 2. Insert new
      if (rows.length > 0) {
        const payloads = rows.map((r) => ({
          tenant_id: profile?.tenant_id,
          job_order_id: jo.id,
          warehouse_location_id: r.warehouse_location_id,
          wo_item_manifest_id: r.manifest_id,
          quantity: Number(r.quantity),
          allocated_kg: computeRowKg(r),
          allocated_cbm: computeRowCbm(r),
        }));
        const { error: insErr } = await supabase
          .from("jo_warehouse_assignments")
          .insert(payloads);
        if (insErr) throw insErr;
      }

      // 3. Create wh_outbound_shipments or wh_transfer_orders
      const actualWarehouseId = jo.assigned_warehouse_id || warehouseId;
      if (isTransfer) {
        const { data: existingTransferShipment } = await supabase.from('wh_outbound_shipments').select('transfer_id').eq('wo_item_id', jo.wo_item_id).not('transfer_id', 'is', null).limit(1).maybeSingle();
        if (!existingTransferShipment && actualWarehouseId) {
           const transferNumber = jo.jo_number || `TRF-S${Date.now()}`;
           
           const { data: rawWoItem } = await (supabase.from('wo_items' as any) as any).select('item_data').eq('id', jo.wo_item_id).single();
           const toWarehouseId = (rawWoItem as any)?.item_data?.to_warehouse_id || null;

           const { data: newTransfer, error: trfErr } = await (supabase.from('wh_transfer_orders' as any) as any).insert({
              tenant_id: profile?.tenant_id,
              from_warehouse_id: actualWarehouseId, 
              to_warehouse_id: toWarehouseId,
              transfer_number: transferNumber,
              status: 'CREATED',
              notes: `Transfer shipment for JO ${jo.jo_number}`,
              created_by: profile?.id || undefined
           }).select('id').single();

           if (newTransfer && !trfErr) {
             // We do not create wh_transfer_details here because picking hasn't happened yet
             // and inventory_id is not known. We only create wh_outbound_shipment_items.

             // Also create the wh_outbound_shipment linking the transfer to the wo_item
             const { data: newShipment } = await supabase.from('wh_outbound_shipments').insert({
                tenant_id: profile?.tenant_id,
                warehouse_id: actualWarehouseId, 
                transfer_id: newTransfer.id,
                wo_item_id: jo.wo_item_id,
                shipment_number: `OUT-${transferNumber}`,
                status: 'PLANNED',
                notes: `Outbound shipment for Transfer JO ${jo.jo_number}`,
                created_by: profile?.id || null
             }).select('id').single();

             if (newShipment) {
               const shipItemPayloads = manifestItems.map((m: any) => ({
                 tenant_id: profile?.tenant_id,
                 shipment_id: newShipment.id,
                 product_sku_id: m.product_sku_id,
                 requested_qty: Number(m.quantity) || 0,
                 picked_qty: 0,
                 loaded_qty: 0
               }));
               if (shipItemPayloads.length > 0) {
                 await supabase.from('wh_outbound_shipment_items').insert(shipItemPayloads);
               }
             }
           }
        }
      } else if (isOutbound) {
        const { data: existingShipment } = await supabase.from('wh_outbound_shipments').select('id').eq('wo_item_id', jo.wo_item_id).single();
        if (!existingShipment && actualWarehouseId) {
           const shipmentNumber = jo.jo_number || `OUT-S${Date.now()}`;
           
           const { data: newShipment, error: shipErr } = await supabase.from('wh_outbound_shipments').insert({
              tenant_id: profile?.tenant_id,
              warehouse_id: actualWarehouseId, 
              wo_item_id: jo.wo_item_id,
              shipment_number: shipmentNumber,
              status: 'PLANNED',
              notes: `Outbound shipment for JO ${jo.jo_number}`,
              created_by: profile?.id || null
           }).select('id').single();

           if (newShipment && !shipErr) {
             const itemsPayload = manifestItems.map((m: any) => ({
               tenant_id: profile?.tenant_id,
               shipment_id: newShipment.id,
               product_sku_id: m.product_sku_id,
               requested_qty: Number(m.quantity) || 0,
               picked_qty: 0,
               loaded_qty: 0
             }));
             if (itemsPayload.length > 0) {
               await supabase.from('wh_outbound_shipment_items').insert(itemsPayload);
             }
           }
        }
      } else if (!isOutbound && !isTransfer && actualWarehouseId) {
        const { data: existingReceipt } = await supabase.from('wh_inbound_receipts').select('id').eq('wo_item_id', jo.wo_item_id).limit(1).maybeSingle();
        if (!existingReceipt) {
          const receiptNumber = jo.jo_number ? `RCV-${jo.jo_number}` : `RCV-S${Date.now()}`;
          const { data: newReceipt, error: recErr } = await supabase.from('wh_inbound_receipts').insert({
            tenant_id: profile?.tenant_id,
            warehouse_id: actualWarehouseId,
            wo_item_id: jo.wo_item_id,
            receipt_number: receiptNumber,
            status: 'EXPECTED',
            notes: `Inbound receipt for JO ${jo.jo_number}`,
            created_by: profile?.id || null,
          }).select('id').single();

          if (newReceipt && !recErr) {
            const itemsPayload = manifestItems.map((m: any) => ({
              receipt_id: newReceipt.id,
              product_sku_id: m.product_sku_id,
              expected_qty: Number(m.quantity) || 0,
              actual_good_qty: 0,
            }));
            if (itemsPayload.length > 0) {
              await supabase.from('wh_inbound_receipt_items').insert(itemsPayload);
            }
          }
        }
      }

      toast.success("Alokasi berhasil disimpan");
      onRefresh();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan alokasi");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAllocate = async () => {
    try {
      setSaving(true);
      const newRows: any[] = [];
      
      for (const m of manifestItems) {
        let remainingQty = Number(m.quantity) || 0;
        
        // Fetch inventory lots for this SKU, ordered by expiry_date (FEFO)
        const { data: lots, error } = await supabase
          .from('wh_inventory')
          .select('id, location_id, available_quantity, expiry_date, batch_number')
          .eq('tenant_id', profile?.tenant_id)
          .eq('product_sku_id', m.product_sku_id)
          .eq('status', 'AVAILABLE')
          .gt('available_quantity', 0)
          .order('expiry_date', { ascending: true })
          .order('created_at', { ascending: true });
          
        if (error) {
          console.error("Error fetching inventory for auto-allocate:", error);
          continue;
        }
        
        for (const lot of (lots || [])) {
          if (remainingQty <= 0) break;
          const pickQty = Math.min(remainingQty, Number(lot.available_quantity) || 0);
          
          // Find the location code from props
          const loc = locations.find((l: any) => l.id === lot.location_id);
          const zoneId = loc?.area?.area_code || "";
          
          newRows.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            manifest_id: m.id,
            product_sku_id: m.product_sku_id,
            sku_code: m.md_product_skus?.sku_code || "",
            product_name: m.md_product_skus?.name || "",
            jo_quantity: m.quantity || 0,
            quantity: pickQty,
            unit: m.md_product_skus?.unit || "",
            unit_weight_kg: m.unit_weight_kg || m.md_product_skus?.weight_kg || 0,
            unit_volume_m3: m.unit_volume_m3 || m.md_product_skus?.volume_m3 || 0,
            selectedZone: zoneId,
            warehouse_location_id: lot.location_id,
            batch_info: `Lot: ${lot.batch_number || '-'} | Exp: ${lot.expiry_date ? dayjs(lot.expiry_date).format('DD MMM YYYY') : '-'}`,
          });
          
          remainingQty -= pickQty;
        }
      }
      
      setRows(newRows);
      if (newRows.length > 0) {
        toast.success("Auto FEFO / FIFO berhasil menarik daftar lokasi!");
      } else {
        toast.error("Stok tidak ditemukan untuk produk di WO ini.");
      }
    } catch (err: any) {
      toast.error("Gagal melakukan auto-allocation: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalKg = rows.reduce((acc, r) => acc + computeRowKg(r), 0);
  const totalCbm = rows.reduce((acc, r) => acc + computeRowCbm(r), 0);
  const totalKgDisplay = totalKg ? `${totalKg.toFixed(2)} KG` : "-";
  const totalCbmDisplay = totalCbm ? `${totalCbm.toFixed(3)} CBM` : "-";

  const skuSummaries = manifestItems.map((m: any) => {
    // 1. Sum up in-memory allocations in the CURRENT modal for this manifestItem
    const currentAlloc = rows.reduce(
      (acc, row) => {
        if (row.manifest_id === m.id) {
          acc.allocated_kg += computeRowKg(row);
          acc.allocated_cbm += computeRowCbm(row);
        }
        return acc;
      },
      { allocated_kg: 0, allocated_cbm: 0 },
    );

    // 2. Sum up database allocations from OTHER Job Orders for this same manifest item
    const otherJOsAlloc = dbAssignments.reduce(
      (acc: any, assign: any) => {
        if (assign.job_order_id !== jo.id) {
          if (assign.wo_item_manifest_id === m.id) {
            acc.allocated_kg += Number(assign.allocated_kg) || 0;
            acc.allocated_cbm += Number(assign.allocated_cbm) || 0;
          }
        }
        return acc;
      },
      { allocated_kg: 0, allocated_cbm: 0 }
    );

    const totalAllocatedKg = currentAlloc.allocated_kg + otherJOsAlloc.allocated_kg;
    const totalAllocatedCbm = currentAlloc.allocated_cbm + otherJOsAlloc.allocated_cbm;

    const totalKgPerSku =
      (Number(m.quantity) || 0) *
      (Number(m.unit_weight_kg) || Number(m.md_product_skus?.weight_kg) || 0);
    const totalCbmPerSku =
      (Number(m.quantity) || 0) *
      (Number(m.unit_volume_m3) || Number(m.md_product_skus?.volume_m3) || 0);

    return {
      id: m.id,
      sku_code: m.md_product_skus?.sku_code || "-",
      name: m.md_product_skus?.name || "-",
      quantity: Number(m.quantity) || 0,
      totalKg: totalKgPerSku,
      totalCbm: totalCbmPerSku,
      allocatedKg: totalAllocatedKg,
      allocatedCbm: totalAllocatedCbm,
      remainingKg: totalKgPerSku - totalAllocatedKg,
      remainingCbm: totalCbmPerSku - totalAllocatedCbm,
    };
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-6xl bg-slate-50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Warehouse size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                Location Allocation
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {jo.jo_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-4">
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 grid sm:grid-cols-[1fr_auto] gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  SKU aktif
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {manifestItems.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Total SKU pada WO
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {manifestItems.reduce(
                    (acc: number, m: any) => acc + (Number(m.quantity) || 0),
                    0,
                  )}{" "}
                  item
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {skuSummaries.map((summary: any) => (
                <div
                  key={summary.id}
                  className="rounded-2xl bg-white border border-slate-200 p-4 grid gap-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {summary.sku_code} / {summary.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Qty WO: {summary.quantity}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Total
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {summary.totalKg.toFixed(2)} KG /{" "}
                      {summary.totalCbm.toFixed(3)} CBM
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Remaining
                    </p>
                    <p
                      className={`text-sm font-black ${
                        summary.remainingKg < 0 || summary.remainingCbm < 0
                          ? "text-rose-600"
                          : "text-slate-900"
                      }`}
                    >
                      {summary.remainingKg.toFixed(2)} KG /{" "}
                      {summary.remainingCbm.toFixed(3)} CBM
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Daftar Lokasi Penugasan
                </h3>
              </div>
              {isOutbound ? (
                <button
                  onClick={handleAutoAllocate}
                  disabled={saving}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-102 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <Zap size={14} className={saving ? "animate-pulse" : ""} /> Auto FEFO / FIFO
                </button>
              ) : (
                <button
                  onClick={addRow}
                  disabled={saving}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-102 shadow-md shadow-emerald-600/10 disabled:opacity-50"
                >
                  <Plus size={14} /> Tambah Lokasi
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-14 text-center">#</th>
                    <th className="px-6 py-4 w-3/12">Zona / Lokasi</th>
                    <th className="px-6 py-4 w-4/12">SKU / Produk</th>
                    <th className="px-4 py-4 w-60 text-right">Qty</th>
                    <th className="px-6 py-4 w-40 text-right">Total CBM & KG</th>
                    <th className="px-6 py-4 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Warehouse size={28} className="opacity-40 text-emerald-600" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                            Belum Ada Lokasi Dialokasikan
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                            Klik tombol "Tambah Lokasi" di kanan atas untuk menentukan area penyimpanan barang.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const computedCbm = computeRowCbm(r);
                      const computedKg = computeRowKg(r);

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-5 text-center text-xs font-bold text-slate-400">
                            <div className="flex flex-col items-center gap-1">
                              <GripVertical
                                size={14}
                                className="text-slate-300 group-hover:text-slate-400 transition-colors cursor-grab"
                              />
                              <span>{idx + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 space-y-2">
                            {/* Zone dropdown */}
                            <select
                              value={r.selectedZone || ""}
                              onChange={(e) =>
                                updateRow(idx, "selectedZone", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            >
                              <option value="">-- Pilih Zona --</option>
                              {zones.map((z: any) => (
                                <option key={z.area_code} value={z.area_code}>
                                  {z.area_name}
                                </option>
                              ))}
                            </select>
                            {/* Location dropdown filtered by selected zone */}
                            <select
                              value={r.warehouse_location_id}
                              onChange={(e) =>
                                updateRow(
                                  idx,
                                  "warehouse_location_id",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            >
                              <option value="">-- Pilih Lokasi --</option>
                              {locations
                                .filter((loc: any) => {
                                  if (!r.selectedZone) return true;
                                  return (
                                    loc.area &&
                                    loc.area.area_code === r.selectedZone
                                  );
                                })
                                .map((loc: any) => {
                                  const maxW = Number(loc.max_weight_kg || 0);
                                  const maxV = Number(loc.max_volume_m3 || 0);
                                  const allocatedOther = getAllocatedForLocation(
                                    loc.id,
                                    idx,
                                  );
                                  const availableW = Math.max(
                                    0,
                                    maxW - allocatedOther.allocated_kg,
                                  );
                                  const availableV = Math.max(
                                    0,
                                    maxV - allocatedOther.allocated_cbm,
                                  );
                                  return (
                                    <option key={loc.id} value={loc.id}>
                                      {loc.code} (Avail: {availableW.toFixed(1)}kg / {availableV.toFixed(2)}m³)
                                    </option>
                                  );
                                })}
                            </select>
                          </td>
                          <td className="px-6 py-5">
                            <select
                              value={r.manifest_id || ""}
                              onChange={(e) =>
                                updateRow(idx, "manifest_id", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            >
                              <option value="">-- Pilih Produk JO --</option>
                              {manifestItems.map((m: any) => (
                                <option key={m.id} value={m.id}>
                                  {m.md_product_skus?.sku_code || "-"} — {m.md_product_skus?.name || "-"}
                                </option>
                              ))}
                            </select>
                            {r.sku_code && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-black uppercase text-slate-500">
                                  JO Qty: {r.jo_quantity || "-"} {r.unit || ""}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-black uppercase text-slate-500">
                                  {r.unit_weight_kg} kg/u
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-5 text-right">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={r.quantity}
                              onChange={(e) =>
                                updateRow(idx, "quantity", e.target.value)
                              }
                              placeholder="Qty"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-right outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            />
                          </td>
                          <td className="px-6 py-5 text-right font-black">
                            <div className="text-xs text-slate-700">
                              {computedCbm.toFixed(3)}{" "}
                              <span className="text-[9px] text-slate-400 font-bold uppercase">CBM</span>
                            </div>
                            <div className="text-xs text-slate-500 font-bold mt-1">
                              {computedKg.toFixed(1)}{" "}
                              <span className="text-[9px] text-slate-400 font-bold uppercase">KG</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => removeRow(idx)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-emerald-50/20 border-t-2 border-emerald-100 text-xs font-black text-slate-800">
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-emerald-800"
                      >
                        Total Alokasi
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-950 font-black">
                        {rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-950">
                        <div className="text-xs font-black">{totalCbmDisplay}</div>
                        <div className="text-[10px] text-emerald-800/80 mt-0.5">{totalKgDisplay}</div>
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            Simpan Alokasi
          </button>
        </div>
      </div>
    </div>
  );
}

// --- JO CARD COMPONENT ---
function JOCard({
  jo,
  warehouseId,
  locations,
  zones,
  dbAssignments = [],
  profile,
  onRefresh,
  isOutbound,
  isTransfer,
  direction,
  woItemData,
}: any) {
  const [showManifestEditor, setShowManifestEditor] = useState(false);
  const [showAllocationEditor, setShowAllocationEditor] = useState(false);
  const [generatingTask, setGeneratingTask] = useState(false);
  const [hasPortalTask, setHasPortalTask] = useState(false);
  const [checkingPortalTask, setCheckingPortalTask] = useState(true);

  // [AI] Check if portal task already exists (from hybrid auto-generate or manual)
  useEffect(() => {
    const checkExisting = async () => {
      if (!jo.wo_item_id) { setCheckingPortalTask(false); return; }
      try {
        if (isTransfer && direction !== 'INBOUND') {
          const { data } = await supabase.from('wh_outbound_shipments').select('transfer_id').eq('wo_item_id', jo.wo_item_id).not('transfer_id', 'is', null).limit(1).maybeSingle();
          setHasPortalTask(!!data);
        } else if (isOutbound) {
          const { data } = await supabase.from('wh_outbound_shipments').select('id').eq('wo_item_id', jo.wo_item_id).limit(1).maybeSingle();
          setHasPortalTask(!!data);
        } else if (!isOutbound && !isTransfer) {
          const { data } = await supabase.from('wh_inbound_receipts').select('id').eq('wo_item_id', jo.wo_item_id).limit(1).maybeSingle();
          setHasPortalTask(!!data);
        }
      } catch {} finally { setCheckingPortalTask(false); }
    };
    checkExisting();
  }, [jo.wo_item_id, isTransfer, isOutbound, direction]);

  // Compute manifest totals
  const manifests = jo.wo_item_manifests?.length > 0 ? jo.wo_item_manifests : jo.wo_item?.wo_item_manifests || [];
  const totalManifestItems = manifests.length;
  const totalManifestKg = manifests.reduce(
    (s: number, m: any) => s + (m.quantity || 0) * (m.unit_weight_kg || 0),
    0,
  );
  const totalManifestCbm = manifests.reduce(
    (s: number, m: any) => s + (m.quantity || 0) * (m.unit_volume_m3 || 0),
    0,
  );

  // Compute allocation totals
  const assignments = jo.jo_warehouse_assignments || [];
  const totalAllocLocations = assignments.length;
  const totalAllocKg = assignments.reduce((s: number, a: any) => {
    const m = manifests.find((m: any) => m.id === a.wo_item_manifest_id);
    const unitWeight = m?.unit_weight_kg || m?.md_product_skus?.weight_kg || 0;
    return s + (Number(a.quantity) || 0) * unitWeight;
  }, 0);
  
  const totalAllocCbm = assignments.reduce((s: number, a: any) => {
    const m = manifests.find((m: any) => m.id === a.wo_item_manifest_id);
    const unitVol = m?.unit_volume_m3 || m?.md_product_skus?.volume_m3 || 0;
    return s + (Number(a.quantity) || 0) * unitVol;
  }, 0);

  const handleGeneratePortalTask = async () => {
    setGeneratingTask(true);
    try {
      if (isTransfer) {
        const { data: existingTransferShipment } = await supabase.from('wh_outbound_shipments').select('transfer_id').eq('wo_item_id', jo.wo_item_id).not('transfer_id', 'is', null).limit(1).maybeSingle();
        if (existingTransferShipment) {
          toast.error("Tugas transfer sudah ter-generate sebelumnya.");
          return;
        }
        const actualWarehouseId = jo.assigned_warehouse_id || warehouseId;
        if (!actualWarehouseId) {
          toast.error("Gudang asal belum terdefinisi untuk JO ini.");
          return;
        }

        // We need to fetch the original to_warehouse_id from wo_items since the item_data processing might have deleted it
        const { data: rawWoItem } = await (supabase.from('wo_items' as any) as any).select('item_data').eq('id', jo.wo_item_id).single();
        const toWarehouseId = (rawWoItem as any)?.item_data?.to_warehouse_id || null;

        if (!toWarehouseId) {
          toast.error("Gudang tujuan belum ditentukan di WO ini. Silakan edit Manifest/Alokasi untuk menetapkan tujuan.");
          setGeneratingTask(false);
          return;
        }

        const transferNumber = jo.jo_number || `TRF-S${Date.now()}`;
        const { data: newTransfer, error: trfErr } = await (supabase.from('wh_transfer_orders' as any) as any).insert({
            tenant_id: profile?.tenant_id,
            from_warehouse_id: actualWarehouseId,
            to_warehouse_id: toWarehouseId,
            transfer_number: transferNumber,
            status: 'CREATED',
            notes: `Transfer shipment for JO ${jo.jo_number}`,
            created_by: profile?.id || undefined
        }).select('id').single();

        if (trfErr) throw trfErr;

        if (newTransfer) {
          // We do not create wh_transfer_details here because picking hasn't happened yet
          // and inventory_id is not known. We only create wh_outbound_shipment_items.

          // Also create the wh_outbound_shipment linking the transfer to the wo_item
          const { data: newShipment, error: shipErr } = await supabase.from('wh_outbound_shipments').insert({
            tenant_id: profile?.tenant_id,
            warehouse_id: actualWarehouseId, 
            transfer_id: newTransfer.id,
            wo_item_id: jo.wo_item_id,
            shipment_number: `OUT-${transferNumber}`,
            status: 'PLANNED',
            notes: `Outbound shipment for Transfer JO ${jo.jo_number}`,
            created_by: profile?.id || null
          }).select('id').single();
          
          if (shipErr) throw shipErr;

          if (newShipment) {
            const shipItemPayloads = manifests.map((m: any) => ({
              tenant_id: profile?.tenant_id,
              shipment_id: newShipment.id,
              product_sku_id: m.product_sku_id,
              requested_qty: Number(m.quantity) || 0,
              picked_qty: 0,
              loaded_qty: 0
            }));
            if (shipItemPayloads.length > 0) {
              const { error: shipItemErr } = await supabase.from('wh_outbound_shipment_items').insert(shipItemPayloads);
              if (shipItemErr) throw shipItemErr;
            }
          }
        }
        toast.success("Tugas Transfer berhasil di-generate ke Portal WH!");
      } else if (isOutbound) {
        const { data: existingShipment } = await supabase.from('wh_outbound_shipments').select('id').eq('wo_item_id', jo.wo_item_id).single();
        if (existingShipment) {
          toast.error("Tugas portal (shipment) sudah ter-generate sebelumnya.");
          return;
        }
        const actualWarehouseId = jo.assigned_warehouse_id || warehouseId;
        if (!actualWarehouseId) {
          toast.error("Gudang asal belum terdefinisi untuk JO ini.");
          return;
        }
        
        const shipmentNumber = jo.jo_number || `OUT-S${Date.now()}`;
        const { data: newShipment, error: shipErr } = await supabase.from('wh_outbound_shipments').insert({
            tenant_id: profile?.tenant_id,
            warehouse_id: actualWarehouseId, 
            wo_item_id: jo.wo_item_id,
            shipment_number: shipmentNumber,
            status: 'PLANNED',
            notes: `Outbound shipment for JO ${jo.jo_number}`,
            created_by: profile?.id || null
        }).select('id').single();

        if (shipErr) throw shipErr;

        if (newShipment) {
          const itemsPayload = manifests.map((m: any) => ({
            tenant_id: profile?.tenant_id,
            shipment_id: newShipment.id,
            product_sku_id: m.product_sku_id,
            requested_qty: Number(m.quantity) || 0,
            picked_qty: 0,
            loaded_qty: 0
          }));
          if (itemsPayload.length > 0) {
            const { error: itemErr } = await supabase.from('wh_outbound_shipment_items').insert(itemsPayload);
            if (itemErr) throw itemErr;
          }
        }
        toast.success("Tugas Outbound berhasil di-generate ke Portal WH!");
      } else {
        // Standard Inbound
        const { data: existingReceipt } = await supabase.from('wh_inbound_receipts').select('id').eq('wo_item_id', jo.wo_item_id).limit(1).maybeSingle();
        if (existingReceipt) {
          toast.error("Tugas inbound sudah ter-generate sebelumnya.");
          return;
        }
        const actualWarehouseId = jo.assigned_warehouse_id || warehouseId;
        if (!actualWarehouseId) {
          toast.error("Gudang tujuan belum terdefinisi untuk JO ini.");
          return;
        }

        let expectedArrival = null;
        const execDate = woItemData?.wo?.execution_date;
        const execTime = woItemData?.wo?.execution_time || '00:00:00';
        if (execDate) {
          try {
            expectedArrival = new Date(`${execDate}T${execTime}`).toISOString();
          } catch (e) {
            console.error("Invalid date/time format", e);
          }
        }

        const receiptNumber = jo.jo_number ? `RCV-${jo.jo_number}` : `RCV-S${Date.now()}`;
        const { data: newReceipt, error: recErr } = await (supabase
          .from('wh_inbound_receipts' as any) as any)
          .insert({
            tenant_id: profile?.tenant_id,
            warehouse_id: actualWarehouseId,
            wo_item_id: jo.wo_item_id,
            receipt_number: receiptNumber,
            status: 'EXPECTED',
            expected_arrival: expectedArrival || undefined,
            notes: `Inbound receipt for JO ${jo.jo_number}`,
            created_by: profile?.id || undefined,
          }).select('id').single();

        if (recErr) throw recErr;

        if (newReceipt) {
          const itemsPayload = manifests.map((m: any) => ({
            receipt_id: newReceipt.id,
            product_sku_id: m.product_sku_id,
            expected_qty: Number(m.quantity) || 0,
            actual_good_qty: 0,
          }));
          if (itemsPayload.length > 0) {
            const { error: itemErr } = await (supabase.from('wh_inbound_receipt_items' as any) as any).insert(itemsPayload);
            if (itemErr) throw itemErr;
          }
        }
        toast.success("Tugas Inbound berhasil di-generate ke Portal WH!");
        setHasPortalTask(true);
      }
    } catch (err: any) {
      toast.error("Gagal generate tugas portal: " + err.message);
    } finally {
      setGeneratingTask(false);
    }
  };

  return (
    <Card className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        {/* JO Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Job Order
            </p>
            <h3 className="text-lg font-black text-slate-900 italic tracking-tighter">
              {jo.jo_number || "N/A"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Status:{" "}
              <span className="font-bold uppercase">
                {jo.status?.replace("_", " ")}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPortalTask ? (
              <span className="text-[10px] font-black uppercase px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={12} /> Task Sudah Dibuat
              </span>
            ) : checkingPortalTask ? (
              <span className="text-[10px] font-black uppercase px-4 py-2 rounded-xl bg-slate-100 text-slate-400 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Checking...
              </span>
            ) : (
              <button
                onClick={handleGeneratePortalTask}
                disabled={generatingTask}
                className="text-[10px] font-black uppercase px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-2 transition-all"
              >
                {generatingTask ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} 
                Aktifasi Job Order
              </button>
            )}
            <span
              className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                jo.status === "completed" || jo.status === "done"
                  ? "bg-emerald-100 text-emerald-700"
                  : jo.status === "in_progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {jo.status?.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Manifest Summary */}
          <div className={`rounded-2xl p-5 space-y-3 ${totalManifestItems > 0 && hasPortalTask ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Manifest Barang
              </h4>
              <div className="flex items-center gap-2">
                {totalManifestItems > 0 && hasPortalTask && (
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Terisi dari HQ
                  </span>
                )}
                <button
                  onClick={() => setShowManifestEditor(true)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                >
                  <Edit2 size={12} /> {totalManifestItems > 0 && hasPortalTask ? 'Lihat' : 'Edit'}
                </button>
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-slate-900 italic">
                {totalManifestItems}
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Items
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/50">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {totalManifestKg.toFixed(2)}{" "}
                  <span className="text-[9px] text-slate-400">KG</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {totalManifestCbm.toFixed(3)}{" "}
                  <span className="text-[9px] text-slate-400">CBM</span>
                </p>
              </div>
            </div>
          </div>

          {/* Allocation Summary */}
          <div className={`rounded-2xl p-5 space-y-3 ${totalAllocLocations > 0 && hasPortalTask ? 'bg-emerald-100/70 border border-emerald-300' : 'bg-emerald-50/50'}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} /> Alokasi Lokasi
              </h4>
              <div className="flex items-center gap-2">
                {totalAllocLocations > 0 && hasPortalTask && (
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1 bg-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Auto dari HQ
                  </span>
                )}
                <button
                  onClick={() => setShowAllocationEditor(true)}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1"
                >
                  <Eye size={12} /> Lihat
                </button>
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-emerald-600 italic">
                {totalAllocLocations}
              </span>
              <span className="text-[10px] font-black text-emerald-700/60 uppercase tracking-widest ml-2">
                Titik Lokasi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-100/50">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {totalAllocKg.toFixed(2)}{" "}
                  <span className="text-[9px] text-slate-400">KG</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {totalAllocCbm.toFixed(3)}{" "}
                  <span className="text-[9px] text-slate-400">CBM</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showManifestEditor && (
        <ManifestEditorModal
          jo={jo}
          profile={profile}
          onClose={() => setShowManifestEditor(false)}
          onRefresh={onRefresh}
        />
      )}

      {showAllocationEditor && (
        <AllocationEditorModal
          jo={jo}
          locations={locations}
          zones={zones}
          dbAssignments={dbAssignments}
          profile={profile}
          warehouseId={warehouseId}
          onClose={() => setShowAllocationEditor(false)}
          onRefresh={onRefresh}
          isOutbound={isOutbound}
          isTransfer={isTransfer}
        />
      )}
    </Card>
  );
}

// --- MAIN PAGE ---
export default function WarehouseExecutionPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemId");
  const router = useRouter();
  const { profile, profileLoading } = useAuth();

  const [woItemData, setWoItemData] = useState<any>(null);
  const [jos, setJos] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [dbAssignments, setDbAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!itemId || profileLoading) return;
    try {
      setLoading(true);

      const { data: rawItemData, error: itemErr } = await (supabase
        .from("wo_items" as any) as any)
        .select(
          `
          *,
          wo_item_manifests (*, md_product_skus(sku_code, name, brand_name, unit, weight_kg, volume_m3)),
          wo:work_orders!wo_id (
            id, wo_number, order_date, execution_date, execution_time, customer_id,
            customer:md_entities!customer_id ( name, legal_name, phone )
          )
        `,
        )
        .eq("id", itemId)
        .single();

      if (itemErr) throw itemErr;
      const itemData = rawItemData as any;

      if (itemData.item_data) {
         const resolved = { ...itemData.item_data };
         
         const fetchName = async (table: string, id: string) => {
            if (!id || id === 'null') return null;
            const { data } = await (supabase
              .from(table as never) as any)
              .select('name')
              .eq('id', id)
              .maybeSingle();
            return data ? data.name : null;
         };

         if (resolved.to_warehouse_id) {
            const name = await fetchName('md_warehouses', resolved.to_warehouse_id);
            if (name) resolved.to_warehouse_name = name;
            delete resolved.to_warehouse_id;
         }
         
         if (resolved.origin_location_id) {
            const name = await fetchName('md_locations', resolved.origin_location_id);
            if (name) resolved.origin_location_name = name;
            delete resolved.origin_location_id;
         }

         if (resolved.to_location_id) {
            const name = await fetchName('md_locations', resolved.to_location_id);
            if (name) resolved.to_location_name = name;
            delete resolved.to_location_id;
         }

         if (resolved.shipper_id) {
            const name = await fetchName('md_entities', resolved.shipper_id);
            if (name) resolved.shipper_name = name;
            delete resolved.shipper_id;
         }

         if (resolved.consignee_id) {
            const name = await fetchName('md_entities', resolved.consignee_id);
            if (name) resolved.consignee_name = name;
            delete resolved.consignee_id;
         }

         Object.keys(resolved).forEach(k => {
            if (resolved[k] === null || resolved[k] === 'null' || resolved[k] === '') {
               delete resolved[k];
            }
         });

         itemData.item_data = resolved;
      }

      setWoItemData(itemData);

      const { data: rawJoData, error: joErr } = await (supabase
        .from("job_orders" as any) as any)
        .select(
          `
          *,
          wo_item_manifests (*, md_product_skus(sku_code, name, brand_name, unit, weight_kg, volume_m3)),
          jo_warehouse_assignments (*, md_warehouse_locations(code, area:md_warehouse_areas!area_id(area_code, area_name)))
        `,
        )
        .eq("wo_item_id", itemId)
        .order("created_at", { ascending: true });

      if (joErr) throw joErr;
      const joData = (rawJoData as any[]) || [];

      // --- AUTO HEAL: If no job order exists for this WO item ---
      if (joData && joData.length === 0) {
        const unitCount = itemData.item_data?.unit_count || 1;
        const newJos = [];
        for (let i = 1; i <= unitCount; i++) {
          const joNumber = `${itemData.item_code}-${i.toString().padStart(2, '0')}`;
          newJos.push({
            tenant_id: itemData.tenant_id,
            jo_number: joNumber,
            wo_item_id: itemData.id,
            warehouse_id: itemData.item_data?.warehouse_id || null,
            status: itemData.status || 'pending',
            sbu_type: 'WAREHOUSE',
            tracking_token: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
          });
        }
        
        const { error: createJoErr } = await (supabase.from('job_orders' as any) as any).insert(newJos);
        if (!createJoErr) {
          return fetchData();
        }
      }
      // --- END AUTO HEAL ---

      // --- AUTO HEAL 2: If status is in_progress but no inbound receipt exists for standard inbound ---
      const opType = String(itemData?.item_data?.operation_type || itemData?.item_data?.task_type || "").toUpperCase();
      const woType = String(itemData?.wo?.wo_type || "").toUpperCase();
      const isTransfer = opType.includes("TRANSFER") || woType.includes("TRANSFER");
      const isInbound = (opType.includes("INBOUND") || woType.includes("INBOUND")) && !isTransfer;

      if (isInbound && itemData.status === 'in_progress' && joData && joData.length > 0) {
        const { data: existingReceipt } = await supabase
          .from('wh_inbound_receipts')
          .select('id')
          .eq('wo_item_id', itemData.id)
          .limit(1)
          .maybeSingle();

        if (!existingReceipt) {
          const firstJo = joData[0];
          const actualWhId = firstJo.warehouse_id || itemData.item_data?.warehouse_id || profile?.warehouse_id;
          if (actualWhId) {
            const receiptNumber = firstJo.jo_number ? `RCV-${firstJo.jo_number}` : `RCV-S${Date.now()}`;
            const { data: newReceipt, error: recErr } = await (supabase
              .from('wh_inbound_receipts' as any) as any)
              .insert({
                tenant_id: itemData.tenant_id,
                warehouse_id: actualWhId,
                wo_item_id: itemData.id,
                receipt_number: receiptNumber,
                status: 'EXPECTED',
                notes: `Auto-healed inbound receipt for JO ${firstJo.jo_number}`,
                created_by: profile?.id || undefined,
              })
              .select('id')
              .single();

            if (newReceipt && !recErr) {
              const manifests = itemData.wo_item_manifests || [];
              const itemsPayload = manifests.map((m: any) => ({
                receipt_id: newReceipt.id,
                product_sku_id: m.product_sku_id,
                expected_qty: Number(m.quantity) || 0,
                actual_good_qty: 0,
              }));
              if (itemsPayload.length > 0) {
                await (supabase.from('wh_inbound_receipt_items' as any) as any).insert(itemsPayload);
              }
            }
          }
        }
      }
      // --- END AUTO HEAL 2 ---

      const injectedJos = joData?.map((j: any) => ({
        ...j,
        wo_item: { 
          wo: itemData.wo,
          wo_item_manifests: itemData.wo_item_manifests 
        },
      }));
      setJos(injectedJos || []);

      const whId =
        itemData?.item_data?.assigned_warehouse_id ||
        itemData?.item_data?.warehouse_id ||
        profile?.warehouse_id ||
        itemData?.item_data?.destination_location_id;
      if (whId) {
        const { data: locData, error: locErr } = await supabase
          .from("md_warehouse_locations")
          .select(
            "id, code, max_weight_kg, max_volume_m3, area:md_warehouse_areas!area_id(area_code, area_name)",
          )
          .eq("warehouse_id", whId);

        const { data: areaData, error: areaErr } = await supabase
          .from("md_warehouse_areas")
          .select("area_code, area_name")
          .eq("warehouse_id", whId);

        if (locErr) throw locErr;
        if (areaErr) throw areaErr;

        setLocations(locData || []);
        setZones(areaData || []);

        // [AI] AUTO HYBRID ALLOCATION
        // If manifest already has location_code, but jo_warehouse_assignments is missing it, insert it.
        const manifestsToAutoAssign: any[] = [];
        for (const jo of injectedJos) {
           const existingManifestIds = new Set((jo.jo_warehouse_assignments || []).map((a: any) => a.wo_item_manifest_id));
           const manifests = jo.wo_item?.wo_item_manifests || [];
           for (const m of manifests) {
              if (!existingManifestIds.has(m.id)) {
                 const locCode = (m.location_code && m.location_code !== '-') ? m.location_code : (m.custom_fields?.location_code && m.custom_fields.location_code !== '-' ? m.custom_fields.location_code : null);
                 if (locCode) {
                    const matchedLoc = locData?.find((l: any) => l.code === locCode);
                    if (matchedLoc) {
                       manifestsToAutoAssign.push({
                          tenant_id: profile?.tenant_id || itemData?.tenant_id,
                          job_order_id: jo.id,
                          warehouse_location_id: matchedLoc.id,
                          wo_item_manifest_id: m.id,
                          quantity: Number(m.quantity) || 0,
                          allocated_kg: (Number(m.quantity) || 0) * (Number(m.unit_weight_kg) || 0),
                          allocated_cbm: (Number(m.quantity) || 0) * (Number(m.unit_volume_m3) || 0)
                       });
                    }
                 }
              }
           }
        }

        if (manifestsToAutoAssign.length > 0) {
           const { error: insertErr } = await supabase.from('jo_warehouse_assignments').insert(manifestsToAutoAssign);
           if (!insertErr) {
              const { data: updatedJoData } = await supabase
                .from("job_orders")
                .select(`
                  *,
                  wo_item_manifests (*, md_product_skus(sku_code, name, brand_name, unit, weight_kg, volume_m3)),
                  jo_warehouse_assignments (*, md_warehouse_locations(code, area:md_warehouse_areas!area_id(area_code, area_name)))
                `)
                .eq("wo_item_id", itemId)
                .order("created_at", { ascending: true });
                
              if (updatedJoData) {
                 const newInjectedJos = updatedJoData.map((j: any) => ({
                    ...j,
                    wo_item: { 
                      wo: itemData.wo,
                      wo_item_manifests: itemData.wo_item_manifests 
                    },
                 }));
                 setJos(newInjectedJos);
                 // Override injectedJos reference so locIds logic below uses updated assignments
                 injectedJos.length = 0;
                 injectedJos.push(...newInjectedJos);
              }
           }
        }

        // Query occupied capacity of these locations across other JOs in the warehouse
        const locIds = locData?.map((l: any) => l.id) || [];
        if (locIds.length > 0) {
          const { data: assignData } = await supabase
            .from("jo_warehouse_assignments")
            .select(`
              warehouse_location_id, allocated_kg, allocated_cbm, job_order_id, wo_item_manifest_id, quantity,
              wo_item_manifests!wo_item_manifest_id ( product_sku_id )
            `)
            .in("warehouse_location_id", locIds);
          setDbAssignments(assignData || []);
        } else {
          setDbAssignments([]);
        }

        // [AI] AUTO-HEAL: If status is still 'need_assignment' but all manifests are fully assigned (hybrid), upgrade to 'menunggu_wh_eksekusi'
        if (itemData.status === 'need_assignment') {
           const manifests = itemData.wo_item_manifests || [];
           if (manifests.length > 0) {
              const allAssigned = injectedJos.every((jo: any) => {
                 const assignments = jo.jo_warehouse_assignments || [];
                 return manifests.every((m: any) => assignments.some((a: any) => a.wo_item_manifest_id === m.id));
              });
              
              if (allAssigned) {
                 await supabase.from('wo_items').update({ status: 'menunggu_wh_eksekusi' }).eq('id', itemId);
                 await supabase.from('job_orders').update({ status: 'menunggu_wh_eksekusi' }).eq('wo_item_id', itemId).eq('status', 'pending');
                 itemData.status = 'menunggu_wh_eksekusi';
                 setWoItemData({...itemData});
                 
                 const updatedJos = injectedJos.map((j: any) => ({
                    ...j,
                    status: j.status === 'pending' ? 'menunggu_wh_eksekusi' : j.status
                 }));
                 setJos(updatedJos);
              }
           }
        }
      }
    } catch (e) {
      toast.error("Gagal memuat detail tugas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [itemId, profileLoading, profile?.warehouse_id]);

  const handleUpdateItemStatus = async (newStatus: string) => {
    try {
      // [AI] Auto-generate transfer/outbound portal records when activating to in_progress
      // This ensures activated WOs automatically appear on their respective job order pages
      if (newStatus === 'in_progress') {
        const opType = String(woItemData?.item_data?.operation_type || woItemData?.item_data?.task_type || "").toUpperCase();
        const woType = String(woItemData?.wo?.wo_type || "").toUpperCase();
        const isTransferType = opType.includes("TRANSFER") || woType.includes("TRANSFER");
        const isOutboundType = opType.includes("OUTBOUND") || woType.includes("OUTBOUND");

        for (const jo of jos) {
          if (!jo.assigned_warehouse_id) continue;

          // Fetch manifests for this JO
          const { data: manifestData } = await supabase
            .from('wo_item_manifests')
            .select('*, md_product_skus(sku_code, name)')
            .eq('wo_item_id', jo.wo_item_id);
          const manifests = manifestData || [];

          if (isTransferType) {
            // [AI] Check if transfer records already exist for this JO
            const { data: existingTransfer } = await supabase
              .from('wh_outbound_shipments')
              .select('transfer_id')
              .eq('wo_item_id', jo.wo_item_id)
              .not('transfer_id', 'is', null)
              .limit(1)
              .maybeSingle();

            if (!existingTransfer) {
              // [AI] reading from wo_items to get to_warehouse_id
              const { data: rawWoItem } = await (supabase
                .from('wo_items' as any) as any)
                .select('item_data')
                .eq('id', jo.wo_item_id)
                .single();
              const toWarehouseId = (rawWoItem as any)?.item_data?.to_warehouse_id || null;

              if (!toWarehouseId) {
                 console.warn("Skipping auto-generate transfer for JO", jo.jo_number, "because to_warehouse_id is missing");
                 continue;
              }

              const transferNumber = jo.jo_number || `TRF-S${Date.now()}`;
              const { data: newTransfer, error: trfErr } = await (supabase
                .from('wh_transfer_orders' as any) as any)
                .insert({
                  tenant_id: profile?.tenant_id,
                  from_warehouse_id: jo.assigned_warehouse_id,
                  to_warehouse_id: toWarehouseId,
                  transfer_number: transferNumber,
                  status: 'CREATED',
                  notes: `Transfer shipment for JO ${jo.jo_number}`,
                  created_by: profile?.id || undefined,
                })
                .select('id')
                .single();

              if (newTransfer && !trfErr) {
                // Create transfer detail items
                // We do not create wh_transfer_details here because picking hasn't happened yet
                // and inventory_id is not known. We only create wh_outbound_shipment_items.

                // Create linking outbound shipment
                const { data: newShipment } = await (supabase
                  .from('wh_outbound_shipments' as any) as any)
                  .insert({
                    tenant_id: profile?.tenant_id,
                    warehouse_id: jo.assigned_warehouse_id,
                    transfer_id: newTransfer.id,
                    wo_item_id: jo.wo_item_id,
                    shipment_number: `OUT-${transferNumber}`,
                    status: 'PLANNED',
                    notes: `Outbound shipment for Transfer JO ${jo.jo_number}`,
                    created_by: profile?.id || undefined,
                  })
                  .select('id')
                  .single();

                if (newShipment) {
                  const shipItemPayloads = manifests.map((m: any) => ({
                    tenant_id: profile?.tenant_id,
                    shipment_id: newShipment.id,
                    product_sku_id: m.product_sku_id,
                    requested_qty: Number(m.quantity) || 0,
                    picked_qty: 0,
                    loaded_qty: 0,
                  }));
                  if (shipItemPayloads.length > 0) {
                    await (supabase.from('wh_outbound_shipment_items' as any) as any).insert(shipItemPayloads);
                  }
                }

                // [AI] CREATE INBOUND SIDE FOR DESTINATION WAREHOUSE
                // Create inbound WO Item for destination warehouse
                const inboundWoItemNumber = `WO-${transferNumber}-IN`;
                const { data: newInboundWoItem } = await (supabase
                  .from('wo_items' as any) as any)
                  .insert({
                    tenant_id: profile?.tenant_id,
                    wo_id: jo.wo_id,
                    sbu_type: 'WAREHOUSE',
                    item_data: {
                      transfer_id: newTransfer.id,
                      direction: 'INBOUND',
                      warehouse_id: toWarehouseId,
                      operation_type: 'STOCK_TRANSFER'
                    },
                    status: 'need_assignment',
                  })
                  .select('id')
                  .single();

                if (newInboundWoItem) {
                  // Create inbound Job Order for destination warehouse
                  const inboundJoNumber = `JO-${transferNumber}-IN`;
                  const { data: newInboundJo } = await (supabase
                    .from('job_orders' as any) as any)
                    .insert({
                      tenant_id: profile?.tenant_id,
                      wo_item_id: newInboundWoItem.id,
                      jo_number: inboundJoNumber,
                      status: 'pending',
                      sbu_type: 'WAREHOUSE',
                      warehouse_id: toWarehouseId,
                      notes: `Transfer IN: ${transferNumber} for ${jo.jo_number}`,
                    })
                    .select('id')
                    .single();

                  if (newInboundJo) {
                    // Create inbound receipt for destination warehouse
                    const { data: newInboundReceipt } = await (supabase
                      .from('wh_inbound_receipts' as any) as any)
                      .insert({
                        tenant_id: profile?.tenant_id,
                        warehouse_id: toWarehouseId,
                        transfer_id: newTransfer.id,
                        wo_item_id: newInboundWoItem.id,
                        receipt_number: `RCV-${transferNumber}`,
                        status: 'EXPECTED',
                        notes: `Inbound receipt for Transfer ${transferNumber} (JO ${jo.jo_number})`,
                        created_by: profile?.id || undefined,
                      })
                      .select('id')
                      .single();

                    if (newInboundReceipt) {
                      // Create inbound receipt items
                      const receiptItemPayloads = manifests.map((m: any) => ({
                        receipt_id: newInboundReceipt.id,
                        product_sku_id: m.product_sku_id,
                        expected_qty: Number(m.quantity) || 0,
                        actual_good_qty: 0,
                      }));
                      if (receiptItemPayloads.length > 0) {
                        await (supabase.from('wh_inbound_receipt_items' as any) as any).insert(receiptItemPayloads);
                      }
                    }
                  }
                }
              }
            }
          } else if (isOutboundType) {
            // [AI] Check if outbound shipment already exists for this JO
            const { data: existingShipment } = await supabase
              .from('wh_outbound_shipments')
              .select('id')
              .eq('wo_item_id', jo.wo_item_id)
              .limit(1)
              .maybeSingle();

            if (!existingShipment) {
              const shipmentNumber = jo.jo_number || `OUT-S${Date.now()}`;
              const { data: newShipment, error: shipErr } = await (supabase
                .from('wh_outbound_shipments' as any) as any)
                .insert({
                  tenant_id: profile?.tenant_id,
                  warehouse_id: jo.assigned_warehouse_id,
                  wo_item_id: jo.wo_item_id,
                  shipment_number: shipmentNumber,
                  status: 'PLANNED',
                  notes: `Outbound shipment for JO ${jo.jo_number}`,
                  created_by: profile?.id || undefined,
                })
                .select('id')
                .single();

              if (newShipment && !shipErr) {
                const itemsPayload = manifests.map((m: any) => ({
                  tenant_id: profile?.tenant_id,
                  shipment_id: newShipment.id,
                  product_sku_id: m.product_sku_id,
                  requested_qty: Number(m.quantity) || 0,
                  picked_qty: 0,
                  loaded_qty: 0,
                }));
                if (itemsPayload.length > 0) {
                  await (supabase.from('wh_outbound_shipment_items' as any) as any).insert(itemsPayload);
                }
              }
            }
          } else {
            // Standard Inbound
            const opType = String(woItemData?.item_data?.operation_type || woItemData?.item_data?.task_type || "").toUpperCase();
            const woType = String(woItemData?.wo?.wo_type || "").toUpperCase();
            const isInbound = opType.includes("INBOUND") || woType.includes("INBOUND");

            if (isInbound) {
              const { data: existingReceipt } = await supabase
                .from('wh_inbound_receipts')
                .select('id')
                .eq('wo_item_id', jo.wo_item_id)
                .limit(1)
                .maybeSingle();

              if (!existingReceipt) {
                const receiptNumber = jo.jo_number ? `RCV-${jo.jo_number}` : `RCV-S${Date.now()}`;
                const { data: newReceipt, error: recErr } = await (supabase
                  .from('wh_inbound_receipts' as any) as any)
                  .insert({
                    tenant_id: profile?.tenant_id,
                    warehouse_id: jo.assigned_warehouse_id,
                    wo_item_id: jo.wo_item_id,
                    receipt_number: receiptNumber,
                    status: 'EXPECTED',
                    notes: `Inbound receipt for JO ${jo.jo_number}`,
                    created_by: profile?.id || undefined,
                  })
                  .select('id')
                  .single();

                if (newReceipt && !recErr) {
                  const itemsPayload = manifests.map((m: any) => ({
                    receipt_id: newReceipt.id,
                    product_sku_id: m.product_sku_id,
                    expected_qty: Number(m.quantity) || 0,
                    actual_good_qty: 0,
                  }));
                  if (itemsPayload.length > 0) {
                    await (supabase.from('wh_inbound_receipt_items' as any) as any).insert(itemsPayload);
                  }
                }
              }
            }
          }
        }
      }

      const { error: err1 } = await supabase
        .from("wo_items")
        .update({ status: newStatus })
        .eq("id", itemId || "");
      if (err1) throw err1;

      const joIds = jos.map((j) => j.id);
      if (joIds.length > 0) {
        await supabase
          .from("job_orders")
          .update({ status: newStatus })
          .in("id", joIds);
      }

      toast.success(
        `Status diperbarui ke ${newStatus.replace("_", " ").toUpperCase()}`,
      );
      fetchData();
    } catch (e) {
      toast.error("Gagal update status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Memuat Assignment Console...
        </p>
      </div>
    );
  }

  if (!woItemData) return null;

  const totalTrucks = woItemData.item_data?.unit_count || jos.length || 1;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-center" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-[0.2em] shadow-sm">
                WMS ASSIGNMENT CONSOLE
              </span>
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm ${
                  woItemData.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : woItemData.status === "in_progress"
                      ? "bg-blue-100 text-blue-700 animate-pulse"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {woItemData.status?.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">
              {woItemData.wo?.wo_number}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {woItemData.status === "pending" ||
          woItemData.status === "need_assignment" ||
          woItemData.status === "menunggu_wh_eksekusi" ? (
            <button
              onClick={() => handleUpdateItemStatus("in_progress")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-105 flex items-center gap-2"
            >
              <Truck size={14} /> Mulai Eksekusi (In Progress)
            </button>
          ) : woItemData.status === "in_progress" ? (
            <button
              onClick={() => handleUpdateItemStatus("completed")}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 hover:scale-105 flex items-center gap-2"
            >
              <CheckCircle2 size={14} /> Selesai Eksekusi (Done)
            </button>
          ) : null}
        </div>
      </div>

      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-none rounded-[2rem] shadow-xl shadow-amber-500/20 overflow-hidden text-white p-8 relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Package size={200} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div>
              <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">
                Customer / Bill To
              </p>
              <h2 className="text-2xl font-black italic">
                {woItemData.wo?.customer?.name}
              </h2>
              <p className="text-xs font-semibold text-amber-100">
                {woItemData.wo?.customer?.legal_name}
              </p>
              
              {woItemData.wo?.customer?.phone && (
                <button
                  onClick={() => {
                    const phone = woItemData.wo.customer.phone;
                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const link = `${origin}/track/warehouse/${woItemData.wo.id}`;
                    const msg = `Yth. Pelanggan ${woItemData.wo.customer.name},\n\nPesanan gudang Anda dengan referensi *${woItemData.wo.wo_number}* dapat dipantau secara real-time (live tracking) melalui tautan berikut:\n\n${link}\n\nTerima kasih.`;
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 w-fit transition-colors shadow-sm"
                >
                  <MessageCircle size={14} /> Kirim Resi via WA
                </button>
              )}
            </div>
            <div className="pt-4 border-t border-amber-400/30">
              <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">
                Target Gudang / Warehouse
              </p>
              <p className="text-lg font-bold">
                {woItemData.item_data?.warehouse_name || "Gudang Utama"}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">
                Schedule / Tanggal Eksekusi
              </p>
              <p className="text-xl font-bold flex items-center gap-2">
                <Clock size={18} />{" "}
                {dayjs(woItemData.wo?.execution_date).format("DD MMM YYYY")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">
                Operation / Task Type
              </p>
              <p className="text-xl font-bold uppercase">
                {woItemData.item_data?.operation_type ||
                  woItemData.item_data?.task_type ||
                  "INBOUND"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-white/10 rounded-3xl p-4 backdrop-blur-md border border-white/20 text-center">
            <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-2">
              Total Armada
            </p>
            <h1 className="text-6xl font-black italic">{totalTrucks}</h1>
            <p className="text-xs font-semibold text-amber-100 mt-2">
              TRUCKS / UNITS
            </p>
          </div>
        </div>
      </Card>

      {/* Master WO Manifest & Logistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-[2rem]">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package size={16} className="text-amber-500" /> Manifest Barang (Master)
          </h3>
          <div className="space-y-3">
            {woItemData.wo_item_manifests?.length > 0 ? (
              woItemData.wo_item_manifests.map((m: any, idx: number) => (
                <div key={m.id || idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">{m.md_product_skus?.name || '-'}</p>
                    <p className="text-[10px] font-medium text-slate-500">SKU: {m.md_product_skus?.sku_code || '-'}</p>
                    {(() => {
                      console.log('Manifest debug item:', m);
                      const locations = jos.flatMap(jo => jo.jo_warehouse_assignments || [])
                        .filter(a => a?.wo_item_manifest_id === m.id)
                        .map(a => a?.md_warehouse_locations?.code);
                      
                      if (m.location_code && m.location_code !== '-') {
                        locations.push(m.location_code);
                      }
                      if (m.custom_fields?.location_code && m.custom_fields.location_code !== '-') {
                        locations.push(m.custom_fields.location_code);
                      }
                      
                      const uniqueLocations = Array.from(new Set(locations)).filter(Boolean);

                      return uniqueLocations.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center">
                            <MapPin size={12} className="mr-0.5" /> Lokasi:
                          </span>
                          {uniqueLocations.map(loc => (
                            <span key={loc as string} className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded uppercase font-black shadow-sm">
                              {loc as string}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center">
                            <MapPin size={12} className="mr-0.5" /> Lokasi:
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded uppercase font-bold shadow-sm">
                            Belum Dialokasi
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-black text-slate-900">{m.quantity}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{m.md_product_skus?.unit || 'Unit'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Belum ada manifest tercatat.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-[2rem]">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Truck size={16} className="text-amber-500" /> Kebutuhan Logistik / SLA
          </h3>
          <div className="space-y-4">
             {woItemData.item_data && Object.keys(woItemData.item_data).length > 0 ? (
               <div className="grid grid-cols-2 gap-4">
                 {Object.entries(woItemData.item_data)
                   .filter(([k]) => !['warehouse_id', 'warehouse_name', 'destination_location_id', 'assigned_warehouse_id', 'unit_count', 'operation_type', 'task_type'].includes(k))
                   .map(([key, val]) => (
                     <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                       <p className="text-xs font-bold text-slate-900 break-words">{String(val)}</p>
                     </div>
                   ))
                 }
                 {Object.entries(woItemData.item_data).filter(([k]) => !['warehouse_id', 'warehouse_name', 'destination_location_id', 'assigned_warehouse_id', 'unit_count', 'operation_type', 'task_type'].includes(k)).length === 0 && (
                   <p className="text-xs text-slate-500 italic col-span-2">Tidak ada detail logistik khusus.</p>
                 )}
               </div>
             ) : (
               <p className="text-xs text-slate-500 italic">Tidak ada spesifikasi logistik tambahan.</p>
             )}
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6 pl-2">
          <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
            <Package size={16} />
          </div>
          <h2 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">
            List Job Orders ({jos.length})
          </h2>
        </div>

        {jos.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
            <Package size={32} className="text-slate-300 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tidak ada Job Order terdeteksi
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {jos.map((jo) => (
              <JOCard
                key={jo.id}
                jo={jo}
                warehouseId={woItemData.item_data?.warehouse_id}
                locations={locations}
                zones={zones}
                dbAssignments={dbAssignments}
                profile={profile}
                onRefresh={fetchData}
                isOutbound={
                  String(woItemData.item_data?.operation_type || woItemData.item_data?.task_type || "").toUpperCase().includes("OUTBOUND") ||
                  String(woItemData.wo?.wo_type || "").toUpperCase().includes("OUTBOUND")
                }
                isTransfer={
                  String(woItemData.item_data?.operation_type || woItemData.item_data?.task_type || "").toUpperCase().includes("TRANSFER") ||
                  String(woItemData.wo?.wo_type || "").toUpperCase().includes("TRANSFER")
                }
                direction={woItemData.item_data?.direction}
                woItemData={woItemData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
