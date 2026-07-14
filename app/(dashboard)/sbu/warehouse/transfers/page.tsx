"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  Loader2, TrendingUp, Search, Plus, Filter,
  Package, CheckCircle2, Clock, ClipboardList, X,
  AlertTriangle, Truck, ArrowRight, Minus, ShoppingCart
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import TransferDetailModal from "./components/TransferDetailModal";

interface TaskItem {
  id: string;
  task_number: string;
  transfer_number?: string;
  task_type: string;
  status: string;
  effective_status?: string;
  priority: string;
  notes: string;
  created_at: string;
  assigned_to?: string;
  wo_item?: {
    wo_id?: string;
    job_orders?: { jo_number: string }[];
  };
}

interface InventoryItem {
  id: string;
  sku_code: string;
  product_name: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  batch_number: string;
  expiry_date: string;
  location_code: string;
  status: string;
  storage_rule: string;
}

interface TransferLine {
  sku_id: string;
  sku_code: string;
  product_name: string;
  requested_qty: number;
  available_qty: number;
  storage_rule: string;
}

const statusColor: Record<string, string> = {
  PLANNED: "bg-violet-100 text-violet-700 border-violet-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ASSIGNED: "bg-blue-100 text-blue-700 border-blue-200",
  PICKING: "bg-cyan-100 text-cyan-700 border-cyan-200",
  READY_FOR_CHECKING: "bg-orange-100 text-orange-700 border-orange-200",
  CHECKING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  READY_FOR_LOADING: "bg-indigo-100 text-indigo-700 border-indigo-200",
  LOADING: "bg-sky-100 text-sky-700 border-sky-200",
  READY_FOR_DOCUMENTS: "bg-teal-100 text-teal-700 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const statusLabel: Record<string, string> = {
  ALL: "Semua",
  PLANNED: "Planned",
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  PICKING: "Picking",
  READY_FOR_CHECKING: "Ready Check",
  CHECKING: "Checking",
  READY_FOR_LOADING: "Ready Load",
  LOADING: "Loading",
  READY_FOR_DOCUMENTS: "Ready Docs",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const priorityColor: Record<string, string> = {
  LOW: "text-slate-500",
  NORMAL: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
};

export default function SBUTransferPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "stock">("tasks");

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Stock state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("ALL");

  // Create Transfer state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [transferLines, setTransferLines] = useState<TransferLine[]>([]);
  const [transferNotes, setTransferNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  
  // Modal State
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const tenantId = useMemo(() => {
    let tid = profile?.tenant_id;
    if (!tid && (profile?.role?.startsWith('hq_') || profile?.role === 'owner_sentralogis')) {
      return null;
    }
    return tid;
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    fetchTasks();
    fetchInventory();

    const channel = supabase
      .channel('sbu-transfer-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wh_transfer_orders' },
        () => fetchTasks()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wh_outbound_shipments' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedWarehouse]);

  async function fetchTasks() {
    try {
      setLoading(true);
      let tid = tenantId;
      if (!tid) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tid = data[0].id;
      }
      if (!tid) return;

      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tid);
      if (whData) setWarehouses(whData);

      const profileWhId = profile?.warehouse_id;
      let whId: string | undefined = profileWhId;
      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id;
          if (whId) setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const { data, error } = await supabase
        .from('wh_transfer_orders')
        .select('*')
        .eq('tenant_id', tid)
        .eq('from_warehouse_id', whId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      let finalData = data || [];
      const transferIds = [...new Set(finalData.map((d: any) => d.id).filter(Boolean))];
      
      if (transferIds.length > 0) {
         const { data: outShipments } = await supabase.from('wh_outbound_shipments').select('transfer_id, wo_item_id, status').in('transfer_id', transferIds);
         
         const woItemIds = [...new Set((outShipments || []).map((s: any) => s.wo_item_id).filter(Boolean))];
         
         let joData: any[] = [];
         let woItemData: any[] = [];
         if (woItemIds.length > 0) {
            const { data: _joData } = await supabase.from('job_orders').select('jo_number, wo_item_id').in('wo_item_id', woItemIds);
            const { data: _woItemData } = await supabase.from('wo_items').select('id, wo_id').in('id', woItemIds);
            joData = _joData || [];
            woItemData = _woItemData || [];
         }
         
         finalData = finalData.map((d: any) => {
            const outShipment = (outShipments || []).find((s: any) => s.transfer_id === d.id);
            const woItemId = outShipment?.wo_item_id;
            const jo = joData.find((j: any) => j.wo_item_id === woItemId);
            const wo = woItemData.find((w: any) => w.id === woItemId);
            return {
               ...d,
               effective_status: outShipment?.status || d.status,
               wo_item: {
                  wo_id: wo?.wo_id,
                  job_orders: jo ? [jo] : []
               }
            };
         });
      }
      setTasks(finalData);
    } catch (e) {
      console.error('Failed to fetch transfer tasks:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInventory() {
    try {
      let tid = tenantId;
      if (!tid) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tid = data[0].id;
      }
      if (!tid) return;

      let whId = profile?.warehouse_id;
      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (warehouses && warehouses.length > 0) {
          whId = warehouses[0].id;
        } else {
          return;
        }
      }

      const { data, error } = await (supabase as any)
        .from('wh_inventory')
        .select(`
          id, quantity, available_quantity, reserved_quantity,
          batch_number, expiry_date, status,
          product_sku:product_sku_id(sku_code, name, storage_rule),
          location:location_id(code)
        `)
        .eq('tenant_id', tid)
        .eq('warehouse_id', whId)
        .gt('available_quantity', 0)
        .order('expiry_date', { ascending: true })
        .limit(100);

      if (error) throw error;

      const mapped = (data || []).map((i: any) => ({
        id: i.id,
        sku_code: i.product_sku?.sku_code || '',
        product_name: i.product_sku?.name || '',
        quantity: i.quantity || 0,
        available_quantity: i.available_quantity || 0,
        reserved_quantity: i.reserved_quantity || 0,
        batch_number: i.batch_number || '-',
        expiry_date: i.expiry_date || '',
        location_code: i.location?.code || '-',
        status: i.status || 'AVAILABLE',
        storage_rule: i.product_sku?.storage_rule || 'FIFO',
      }));

      setInventory(mapped);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== "ALL" && (t.effective_status || t.status) !== statusFilter) return false;
    if (search && !(
      t.task_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const filteredStock = inventory.filter(i => {
    if (stockFilter === "FIFO" && i.storage_rule !== "FIFO") return false;
    if (stockFilter === "FEFO" && i.storage_rule !== "FEFO") return false;
    if (stockFilter === "LOW_STOCK" && i.available_quantity > 5) return false;
    if (stockSearch) {
      const q = stockSearch.toLowerCase();
      if (!i.sku_code.toLowerCase().includes(q) && !i.product_name.toLowerCase().includes(q) && !i.batch_number.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Group stock by SKU for summary
  const stockSummary = useMemo(() => {
    const map = new Map<string, { sku_code: string; product_name: string; total_available: number; storage_rule: string; batches: number }>();
    inventory.forEach(i => {
      const key = i.sku_code;
      if (!map.has(key)) {
        map.set(key, { sku_code: i.sku_code, product_name: i.product_name, total_available: 0, storage_rule: i.storage_rule, batches: 0 });
      }
      const s = map.get(key)!;
      s.total_available += i.available_quantity;
      s.batches += 1;
    });
    return Array.from(map.values());
  }, [inventory]);

  const taskStats = {
    total: tasks.length,
    planned: tasks.filter(t => (t.effective_status || t.status) === "PLANNED").length,
    inProcess: tasks.filter(t => ["PENDING", "ASSIGNED", "PICKING", "READY_FOR_CHECKING", "CHECKING"].includes(t.effective_status || t.status)).length,
    loading: tasks.filter(t => ["READY_FOR_LOADING", "LOADING", "READY_FOR_DOCUMENTS"].includes(t.effective_status || t.status)).length,
    completed: tasks.filter(t => (t.effective_status || t.status) === "COMPLETED").length,
  };

  // Create Transfer helpers
  function addTransferLine(sku: typeof stockSummary[0]) {
    if (transferLines.find(l => l.sku_id === sku.sku_code)) return;
    setTransferLines(prev => [...prev, {
      sku_id: sku.sku_code,
      sku_code: sku.sku_code,
      product_name: sku.product_name,
      requested_qty: 0,
      available_qty: sku.total_available,
      storage_rule: sku.storage_rule,
    }]);
  }

  function updateLineQty(skuCode: string, qty: number) {
    setTransferLines(prev => prev.map(l => {
      if (l.sku_id !== skuCode) return l;
      const clamped = Math.max(0, Math.min(qty, l.available_qty));
      return { ...l, requested_qty: clamped };
    }));
  }

  function removeLine(skuCode: string) {
    setTransferLines(prev => prev.filter(l => l.sku_id !== skuCode));
  }

  async function handleSubmitTransfer() {
    const validLines = transferLines.filter(l => l.requested_qty > 0);
    if (validLines.length === 0) {
      toast.error("Tambahkan minimal 1 item dengan qty > 0");
      return;
    }

    setSubmitting(true);
    try {
      let tid = tenantId;
      if (!tid) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tid = data[0].id;
      }
      if (!tid) throw new Error("Tenant tidak ditemukan");

      // Get warehouse_id from wh_inventory
      const { data: whData } = await supabase.from('wh_inventory').select('warehouse_id').eq('tenant_id', tid).limit(1).single();
      const warehouseId = whData?.warehouse_id;
      if (!warehouseId) throw new Error("Warehouse tidak ditemukan");

      // Generate shipment number
      const now = new Date();
      const shipmentNumber = `OUT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

      // 1. Create shipment
      const { data: shipment, error: shipErr } = await supabase
        .from('wh_transfer_orders')
        .insert({
          tenant_id: tid,
          from_warehouse_id: warehouseId,
          transfer_number: shipmentNumber,
          status: 'CREATED',
          notes: transferNotes || null,
          created_by: profile?.id || null,
        })
        .select()
        .single();

      if (shipErr) throw shipErr;

      // 2. Auto-allocate inventory (FIFO/FEFO) and create shipment items
      for (const line of validLines) {
        let remaining = line.requested_qty;

        // Fetch inventory lots for this SKU, ordered by storage rule
        const isFEFO = line.storage_rule === 'FEFO';
        const { data: lots } = await supabase
          .from('wh_inventory')
          .select('id, available_quantity, expiry_date, batch_number, location_id')
          .eq('tenant_id', tid)
          .eq('warehouse_id', warehouseId)
          .eq('status', 'AVAILABLE')
          .gt('available_quantity', 0)
          .order('expiry_date', { ascending: isFEFO })
          .order('created_at', { ascending: true });

        // Filter by SKU code (need to join product_sku)
        const skuLots = (lots || []).filter((l: any) => {
          // We need to match by product_sku - but we only have sku_code
          // This is a simplification - in production, we'd query by product_sku_id
          return true;
        });

        // For now, use a simpler approach: reserve from available inventory
        const { data: skuInventory } = await (supabase as any)
          .from('wh_inventory')
          .select('id, available_quantity')
          .eq('tenant_id', tid)
          .eq('warehouse_id', warehouseId)
          .eq('status', 'AVAILABLE')
          .gt('available_quantity', 0)
          .order('expiry_date', { ascending: isFEFO })
          .order('created_at', { ascending: true });

        // We need to filter by product_sku_id - let's get it first
        const { data: sku } = await supabase.from('md_product_skus').select('id').eq('sku_code', line.sku_code).single();
        if (!sku) continue;

        const { data: skuLots2 } = await (supabase as any)
          .from('wh_inventory')
          .select('id, available_quantity')
          .eq('tenant_id', tid)
          .eq('warehouse_id', warehouseId)
          .eq('product_sku_id', sku.id)
          .eq('status', 'AVAILABLE')
          .gt('available_quantity', 0)
          .order('expiry_date', { ascending: isFEFO })
          .order('created_at', { ascending: true });

        for (const lot of (skuLots2 || [])) {
          if (remaining <= 0) break;
          const pickQty = Math.min(remaining, lot.available_quantity);

          // Reserve inventory
          await supabase.from('wh_inventory').update({
            reserved_quantity: (lot as any).reserved_quantity + pickQty,
          }).eq('id', lot.id);

          // Log movement
          await supabase.from('wh_inventory_movements').insert({
            tenant_id: tid,
            inventory_id: lot.id,
            movement_type: 'TRANSFER',
            quantity: pickQty,
            reference_type: 'TRANSFER_SHIPMENT',
            reference_id: shipment.id,
            notes: `Auto-allocated via ${line.storage_rule}`,
            created_by: profile?.id || null,
          });

          remaining -= pickQty;
        }

        // Create shipment item
        await supabase.from('wh_transfer_details').insert({
          transfer_id: shipment.id,
          product_sku_id: sku.id,
          requested_qty: line.requested_qty,
          picked_qty: line.requested_qty - remaining,
        });
      }

      // 3. Create task
      const { data: taskCount } = await supabase.from('wh_tasks').select('id', { count: 'exact', head: true }).eq('tenant_id', tid);
      const taskNumber = `OUT-T${String((taskCount?.length || 0) + 1).padStart(4, '0')}`;

      await supabase.from('wh_tasks').insert({
        tenant_id: tid,
        warehouse_id: warehouseId,
        task_number: taskNumber,
        task_type: 'TRANSFER',
        status: 'PENDING',
        priority: 'NORMAL',
        notes: `Shipment ${shipmentNumber} - ${validLines.length} item(s)`,
        created_by: profile?.id || null,
      });

      toast.success(`Transfer order ${shipmentNumber} berhasil dibuat!`);
      setShowCreateModal(false);
      setTransferLines([]);
      setTransferNotes("");
      fetchInventory();
      fetchTasks();
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transfer</h1>
            <p className="text-slate-500 text-sm mt-1">Shipment, Picking & Stock</p>
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
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold min-h-[40px]"
        >
          <Plus size={16} />
          Buat Transfer
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[40px] ${
            activeTab === "tasks" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList size={16} className="inline mr-2" />
          Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[40px] ${
            activeTab === "stock" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package size={16} className="inline mr-2" />
          Stock ({inventory.length})
        </button>
      </div>

      {/* ==================== TASKS TAB ==================== */}
      {activeTab === "tasks" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-2xl font-bold text-slate-900">{taskStats.total}</p>
              <p className="text-xs text-slate-500">Total Shipments</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-violet-600">{taskStats.planned}</p>
              <p className="text-xs text-slate-500">Planned</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-cyan-600">{taskStats.inProcess}</p>
              <p className="text-xs text-slate-500">Proses (Pick/Check)</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-teal-600">{taskStats.loading}</p>
              <p className="text-xs text-slate-500">Loading / Docs</p>
            </Card>
          </div>

          <Card className="p-3 md:p-4 border-slate-200 shadow-none">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
                {["ALL", "PLANNED", "PENDING", "ASSIGNED", "PICKING", "READY_FOR_CHECKING", "CHECKING", "READY_FOR_LOADING", "LOADING", "READY_FOR_DOCUMENTS", "COMPLETED", "CANCELLED"].map(s => {
                  const count = s === 'ALL' ? tasks.length : tasks.filter(t => t.status === s).length;
                  return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap min-h-[36px] flex items-center gap-2 ${
                      statusFilter === s
                        ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {statusLabel[s] || s}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                      statusFilter === s 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                )})}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase min-w-[40px]">Date:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(""); setDateTo(""); }}
                      className="p-2.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search task number or notes..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {filteredTasks.length === 0 && (
              <Card className="p-12 text-center">
                <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No transfer tasks found</p>
              </Card>
            )}
            {filteredTasks.map((task) => (
              <div onClick={() => setSelectedShipmentId(task.id)} key={task.id} className="cursor-pointer">
                <Card className="p-4 hover:shadow-md transition-all hover:border-amber-300 group h-full">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      (task.effective_status || task.status) === "COMPLETED" ? "bg-emerald-100" :
                      ["PENDING", "ASSIGNED", "PICKING", "READY_FOR_CHECKING", "CHECKING", "READY_FOR_LOADING", "LOADING", "READY_FOR_DOCUMENTS"].includes(task.effective_status || task.status) ? "bg-cyan-100" : "bg-amber-100"
                    }`}>
                      {(task.effective_status || task.status) === "COMPLETED" ? (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      ) : ["PENDING", "ASSIGNED", "PICKING", "READY_FOR_CHECKING", "CHECKING", "READY_FOR_LOADING", "LOADING", "READY_FOR_DOCUMENTS"].includes(task.effective_status || task.status) ? (
                        <Loader2 size={20} className="text-cyan-600 animate-spin" />
                      ) : (
                        <Clock size={20} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{task.wo_item?.job_orders?.[0]?.jo_number || task.transfer_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusColor[task.effective_status || task.status] || "bg-slate-100 text-slate-600"}`}>
                          {(task.effective_status || task.status).replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-slate-400 font-bold ml-2">TRANSFER SHIPMENT</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {new Date(task.created_at).toLocaleDateString()}
                  </div>
                </div>
                {task.notes && (
                  <p className="text-xs text-slate-500 mt-2 ml-12">{task.notes}</p>
                )}
                </Card>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==================== STOCK TAB ==================== */}
      {activeTab === "stock" && (
        <>
          {/* Stock Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-2xl font-bold text-slate-900">{stockSummary.length}</p>
              <p className="text-xs text-slate-500">Unique SKU</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-blue-600">{inventory.reduce((s, i) => s + i.available_quantity, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Available</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-amber-600">{inventory.reduce((s, i) => s + i.reserved_quantity, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Reserved</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-emerald-600">{inventory.filter(i => i.expiry_date && new Date(i.expiry_date) > new Date()).length}</p>
              <p className="text-xs text-slate-500">Non-Expired Batches</p>
            </Card>
          </div>

          {/* Stock Filters */}
          <Card className="p-3 md:p-4 border-slate-200 shadow-none">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase min-w-[40px]">Rule:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["ALL", "FIFO", "FEFO", "LOW_STOCK"].map(f => (
                    <button
                      key={f}
                      onClick={() => setStockFilter(f)}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors min-h-[40px] ${
                        stockFilter === f
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f === "ALL" ? "All" : f === "LOW_STOCK" ? "Low Stock" : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU, product name, or batch..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>
          </Card>

          {/* Stock Summary by SKU */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Ringkasan per SKU</h3>
            {stockSummary.length === 0 && (
              <Card className="p-12 text-center">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">Tidak ada stock tersedia</p>
              </Card>
            )}
            {stockSummary
              .filter(s => {
                if (stockFilter === "FIFO" && s.storage_rule !== "FIFO") return false;
                if (stockFilter === "FEFO" && s.storage_rule !== "FEFO") return false;
                if (stockFilter === "LOW_STOCK" && s.total_available > 5) return false;
                if (stockSearch) {
                  const q = stockSearch.toLowerCase();
                  if (!s.sku_code.toLowerCase().includes(q) && !s.product_name.toLowerCase().includes(q)) return false;
                }
                return true;
              })
              .map(sku => (
                <Card key={sku.sku_code} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${sku.storage_rule === 'FEFO' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        <Package size={20} className={sku.storage_rule === 'FEFO' ? 'text-amber-600' : 'text-blue-600'} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{sku.sku_code}</p>
                        <p className="text-xs text-slate-500">{sku.product_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{sku.total_available.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500">tersedia ({sku.batches} batch)</p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        sku.storage_rule === 'FEFO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sku.storage_rule}
                      </span>
                    </div>
                  </div>

                  {/* Show batches detail */}
                  <div className="mt-3 space-y-1.5">
                    {inventory
                      .filter(i => i.sku_code === sku.sku_code)
                      .slice(0, 5)
                      .map(batch => {
                        const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();
                        const isNearExpiry = batch.expiry_date && !isExpired && (new Date(batch.expiry_date).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                        return (
                          <div key={batch.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-600">{batch.batch_number}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-500">{batch.location_code}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {batch.expiry_date && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isExpired ? 'bg-red-100 text-red-600' :
                                  isNearExpiry ? 'bg-amber-100 text-amber-600' :
                                  'bg-emerald-100 text-emerald-600'
                                }`}>
                                  {isExpired ? 'EXPIRED' : `Exp: ${new Date(batch.expiry_date).toLocaleDateString('id-ID')}`}
                                </span>
                              )}
                              <span className="font-bold text-slate-700">{batch.available_quantity} / {batch.quantity}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {/* ==================== CREATE TRANSFER MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Buat Transfer Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pilih SKU dan jumlah yang akan dikirim</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setTransferLines([]); }} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="Contoh: Delivery ke Customer ABC"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* SKU Selection */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pilih SKU</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {stockSummary
                    .filter(s => !transferLines.find(l => l.sku_id === s.sku_code))
                    .map(sku => (
                      <button
                        key={sku.sku_code}
                        onClick={() => addTransferLine(sku)}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{sku.sku_code}</p>
                          <p className="text-[10px] text-slate-500">{sku.product_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">{sku.total_available}</p>
                          <p className="text-[10px] text-slate-400">tersedia</p>
                        </div>
                      </button>
                    ))}
                  {stockSummary.filter(s => !transferLines.find(l => l.sku_id === s.sku_code)).length === 0 && (
                    <p className="text-xs text-slate-400 col-span-2 text-center py-4">Semua SKU sudah ditambahkan</p>
                  )}
                </div>
              </div>

              {/* Transfer Lines */}
              {transferLines.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Item Transfer</label>
                  <div className="space-y-2">
                    {transferLines.map(line => (
                      <div key={line.sku_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{line.sku_code}</p>
                          <p className="text-[10px] text-slate-500">
                            Tersedia: <span className="font-bold text-blue-600">{line.available_qty}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">{line.storage_rule}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateLineQty(line.sku_id, line.requested_qty - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={line.requested_qty}
                            onChange={e => updateLineQty(line.sku_id, parseInt(e.target.value) || 0)}
                            className="w-16 text-center py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            min={0}
                            max={line.available_qty}
                          />
                          <button
                            onClick={() => updateLineQty(line.sku_id, line.requested_qty + 1)}
                            className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeLine(line.sku_id)}
                          className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setTransferLines([]); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitTransfer}
                disabled={submitting || transferLines.filter(l => l.requested_qty > 0).length === 0}
                className="flex-[2] py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                {submitting ? "Membuat..." : "Buat Transfer Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedShipmentId && (
        <TransferDetailModal 
          shipmentId={selectedShipmentId} 
          onClose={() => { setSelectedShipmentId(null); fetchTasks(); }} 
        />
      )}
    </div>
  );
}
