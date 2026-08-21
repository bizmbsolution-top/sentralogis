"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Loader2, Plus, PackageOpen, Clock, CheckCircle2, XCircle, Play, UserPlus,
  Package, Box, Layers, Scissors, PackageCheck, PackagePlus, PackageMinus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import SmartRepackingModal from "./components/SmartRepackingModal";
import RepackingExecutionModal from "./components/RepackingExecutionModal";
import BarcodePrinter from "./components/BarcodePrinter";
import RepackingDetailModal from "./components/RepackingDetailModal";

interface RepackingOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  product_count: number;
  source_items: number;
  result_items: number;
  customer_id: string | null;
  customer: { name: string } | null;
}

export default function RepackingPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const sbuId = profile?.warehouse_id;
  const role = profile?.role;

  const [items, setItems] = useState<RepackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RepackingOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [printingOrder, setPrintingOrder] = useState<RepackingOrder | null>(null);
  const [printingItems, setPrintingItems] = useState<any[]>([]);

  const canCreate = role === "sbu_ops_wh" || role === "sbu_manager_wh" || role === "sbu_admin_wh";

  const load = useCallback(async () => {
    let tId = tenantId;
    if (!tId) {
       const { data: tData } = await supabase.from('tenants').select('id').limit(1);
       if (tData?.length) tId = tData[0].id;
    }
    if (!tId) return;
    setLoading(true);
    try {
      let whId: string = profile?.warehouse_id || '';
      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tId);
      if (whData) setWarehouses(whData);

      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id || '';
          setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from("wh_repacking_orders")
          .select(`
            id, order_number, order_type, status, priority, notes, created_at, updated_at, created_by, customer_id,
            customer:md_entities(name)
          `)
          .eq("tenant_id", tId)
          .eq("warehouse_id", whId)
          .order("created_at", { ascending: false }),
        supabase
          .from("wh_repacking_items")
          .select("repacking_order_id, item_type")
          .eq("tenant_id", tId)
        ]);

      if (ordersRes.error) {
        if (ordersRes.error.code === "42P01") { setItems([]); }
        else { console.error(ordersRes.error); }
        return;
      }

      const enriched = ordersRes.data?.map(order => {
        const sourceCount = itemsRes.data?.filter(i => i.repacking_order_id === order.id && i.item_type === 'SOURCE').length || 0;
        const resultCount = itemsRes.data?.filter(i => i.repacking_order_id === order.id && i.item_type === 'RESULT').length || 0;
        return {
          ...order,
          product_count: sourceCount + resultCount,
          source_items: sourceCount,
          result_items: resultCount,
        };
      }) || [];

      setItems((enriched as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, profile?.warehouse_id, selectedWarehouse]);

  useEffect(() => { load(); }, [load]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CREATED': return <Clock size={16} className="text-slate-500" />;
      case 'IN_PROGRESS': return <Play size={16} className="text-blue-600" />;
      case 'COMPLETED': return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'CANCELLED': return <XCircle size={16} className="text-rose-600" />;
      default: return <Clock size={16} className="text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'REPACKING': return <Scissors size={20} className="text-indigo-600" />;
      case 'BUNDLING': return <PackagePlus size={20} className="text-purple-600" />;
      case 'KITTING': return <PackageCheck size={20} className="text-amber-600" />;
      default: return <PackageOpen size={20} className="text-slate-600" />;
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'REPACKING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'BUNDLING': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'KITTING': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-rose-100 text-rose-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'NORMAL': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(i => i.order_type === activeTab || i.status === activeTab);

  const handleExecute = async (orderId: string) => {
    if (!profile?.id) return;
    setExecuting(orderId);
    try {
      const { error } = await supabase.rpc('activate_repacking_order', {
        p_order_id: orderId,
        p_user_id: profile.id
      });
      if (error) throw error;
      toast.success('Order activated successfully');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Activation failed');
    } finally {
      setExecuting(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Hapus order repacking ini?')) return;
    try {
      const { error } = await supabase.from('wh_repacking_orders').delete().eq('id', orderId);
      if (error) throw error;
      toast.success('Order berhasil dihapus');
      setItems(prev => prev.filter(item => item.id !== orderId));
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const handlePrint = async (order: RepackingOrder) => {
    try {
      toast.loading('Mempersiapkan barcode...', { id: 'print' });
      const { data, error } = await supabase
        .from('wh_repacking_items')
        .select(`
          quantity, batch_number, expiry_date,
          product:md_product_skus(sku_code, name)
        `)
        .eq('repacking_order_id', order.id)
        .eq('item_type', 'RESULT');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No result items found');

      const printData = data.map(d => ({
        sku_code: d.product?.sku_code,
        name: d.product?.name,
        quantity: d.quantity,
        batch_number: d.batch_number,
        expiry_date: d.expiry_date
      }));

      setPrintingItems(printData);
      setPrintingOrder(order);
      toast.success('Siap dicetak!', { id: 'print' });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengambil data cetak', { id: 'print' });
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Loading Repacking Orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
              <PackageOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-indigo-500 rounded-full"></span>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">Warehouse Operations</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Repacking & Bundling</h1>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Plus size={16} /> Create Order
            </button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'all', label: 'All Orders', count: items.length },
            { id: 'REPACKING', label: 'Repacking', count: items.filter(i => i.order_type === 'REPACKING').length },
            { id: 'BUNDLING', label: 'Bundling', count: items.filter(i => i.order_type === 'BUNDLING').length },
            { id: 'KITTING', label: 'Kitting', count: items.filter(i => i.order_type === 'KITTING').length },
            { id: 'CREATED', label: 'Created', count: items.filter(i => i.status === 'CREATED').length },
            { id: 'IN_PROGRESS', label: 'In Progress', count: items.filter(i => i.status === 'IN_PROGRESS').length },
            { id: 'COMPLETED', label: 'Completed', count: items.filter(i => i.status === 'COMPLETED').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {items.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <PackageOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">No Repacking Orders</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">No repacking, bundling, or kitting orders found.</p>
            {canCreate && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          filteredItems.map(order => (
            <div 
              key={order.id} 
              className="group border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl bg-white cursor-pointer"
              onClick={() => setViewingOrder(order)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm">
                    {getOrderTypeIcon(order.order_type)}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">
                      {order.order_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${getPriorityColor(order.priority)}`}>
                      {order.priority}
                    </span>
                    {order.customer && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-indigo-200">
                        <UserPlus size={10} /> {order.customer.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {order.order_type} Order
                  </h3>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <Package size={12} /> Source Items
                      <span className="ml-auto text-slate-900 font-black">{order.source_items}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <Box size={12} /> Result Items
                      <span className="ml-auto text-slate-900 font-black">{order.result_items}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>Created</span>
                    <span className="font-bold text-slate-900">
                      {format(new Date(order.created_at), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  {order.notes && (
                    <div className="text-[9px] text-slate-600 line-clamp-2">
                      {order.notes}
                    </div>
                  )}
                </div>

                {canCreate && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(order.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                    {order.status === 'CREATED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecute(order.id);
                        }}
                        disabled={executing === order.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {executing === order.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        Activate
                      </button>
                    )}
                    {order.status === 'IN_PROGRESS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open Process Modal
                          setSelectedOrder(order);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        <CheckCircle2 size={12} />
                        Process
                      </button>
                    )}
                    {order.status === 'COMPLETED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(order);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Print Barcodes
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <SmartRepackingModal
          warehouseId={selectedWarehouse}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            load();
          }}
        />
      )}

      {viewingOrder && (
        <RepackingDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}

      {selectedOrder && (
        <RepackingExecutionModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            setSelectedOrder(null);
            load();
          }}
        />
      )}

      {printingOrder && printingItems.length > 0 && (
        <BarcodePrinter
          orderNumber={printingOrder.order_number}
          items={printingItems}
          onClose={() => {
            setPrintingOrder(null);
            setPrintingItems([]);
          }}
        />
      )}
    </div>
  );
}
