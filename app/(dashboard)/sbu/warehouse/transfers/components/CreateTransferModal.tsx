"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Loader2, X, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTransferModal({ onClose, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const sbuId = profile?.warehouse_id;
  
  const [destWarehouses, setDestWarehouses] = useState<any[]>([]);
  const [selectedDestId, setSelectedDestId] = useState('');
  
  const [products, setProducts] = useState<any[]>([]);
  
  const [items, setItems] = useState<Array<{ inventory_id: string, product_sku_id: string, quantity: number | '', maxQty: number }>>([
    { inventory_id: '', product_sku_id: '', quantity: '', maxQty: 0 }
  ]);
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantId && sbuId) {
      loadInitialData();
    }
  }, [tenantId, sbuId]);

  const loadInitialData = async () => {
    try {
      // Fetch destination warehouses
      const { data: whData } = await supabase
        .from('md_warehouses')
        .select('id, code, name')
        .eq('tenant_id', tenantId || '')
        .neq('id', sbuId || '')
        .eq('status', 'ACTIVE')
        .order('name');
        
      setDestWarehouses((whData as any[]) || []);

      // Fetch products in stock
      const { data: invData } = await supabase
        .from('wh_inventory')
        .select(`
          id,
          quantity,
          product:product_sku_id (id, name, sku_code)
        `)
        .eq('tenant_id', tenantId || '')
        .eq('warehouse_id', sbuId || '')
        .gt('quantity', 0);
        
      if (invData) {
        setProducts((invData as any[]) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { inventory_id: '', product_sku_id: '', quantity: '', maxQty: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'inventory_id') {
      const inv = products.find(p => p.id === value);
      newItems[index].inventory_id = value;
      if (inv) {
        newItems[index].product_sku_id = inv.product.id;
        newItems[index].maxQty = inv.quantity;
      } else {
        newItems[index].product_sku_id = '';
        newItems[index].maxQty = 0;
      }
      newItems[index].quantity = ''; // reset qty on product change
    } else if (field === 'quantity') {
      newItems[index].quantity = value;
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestId) return;
    if (!tenantId || !sbuId) {
      setError("Missing tenant or warehouse context.");
      return;
    }
    
    // Validate items
    const validItems = items.filter(i => i.inventory_id && i.quantity && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setError("Please add at least one valid item to transfer.");
      return;
    }

    const hasExceedingQty = validItems.some(i => Number(i.quantity) > i.maxQty);
    if (hasExceedingQty) {
      setError("One or more items exceed available quantity.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('create_warehouse_transfer', {
        p_tenant_id: tenantId,
        p_from_warehouse_id: sbuId,
        p_to_warehouse_id: selectedDestId,
        p_items: validItems.map(i => ({
          inventory_id: i.inventory_id,
          product_sku_id: i.product_sku_id,
          quantity: Number(i.quantity)
        })),
        p_notes: notes,
        p_user_id: (user?.id || null) as string
      });

      if (rpcError) throw rpcError;
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-black">New Warehouse Transfer</h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Transfer stock to another facility</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {initLoading ? (
          <div className="p-12 flex justify-center shrink-0">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Destination Warehouse
                </label>
                <select
                  required
                  value={selectedDestId}
                  onChange={(e) => setSelectedDestId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select destination...</option>
                  {destWarehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Items to Transfer
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          required
                          value={item.inventory_id}
                          onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                        >
                          <option value="">Select product in stock...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.product.name} (Qty: {p.quantity})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          max={item.maxQty || 1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder={`Max: ${item.maxQty}`}
                          className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional instructions..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedDestId || items.some(i => !i.inventory_id || !i.quantity)}
                className="bg-black hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Create Transfer Order
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
