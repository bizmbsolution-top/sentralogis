import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { X, Save, Plus, Trash2, Package, ArrowRightLeft, UploadCloud, DownloadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddWarehouseItemModal({ 
  onClose, 
  onAdd, 
  initialData,
  customerId
}: any) {
  const { profile } = useAuth();
  const [taskType, setTaskType] = useState(initialData?.item_data?.task_type || 'INBOUND');
  const [warehouseId, setWarehouseId] = useState(initialData?.item_data?.warehouse_id || '');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>(initialData?.item_data?.items || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchData = async () => {
      // Fetch SKUs
      const { data: skuData } = await supabase
        .from('md_product_skus')
        .select('id, sku_code, name, unit')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);
      setSkus(skuData || []);

      // Fetch Warehouses
      const { data: whData } = await supabase
        .from('md_warehouses')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);
      setWarehouses(whData || []);
      if (whData && whData.length > 0 && !initialData?.item_data?.warehouse_id) {
        setWarehouseId(whData[0].id);
      }
    };
    fetchData();
  }, [profile?.tenant_id, initialData]);

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { sku_id: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const handleSave = () => {
    if (!warehouseId) {
      toast.error('Pilih lokasi gudang terlebih dahulu.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Minimal tambahkan 1 SKU untuk diproses.');
      return;
    }
    
    // Validasi
    for (const item of selectedItems) {
      if (!item.sku_id) {
        toast.error('Pastikan semua baris SKU telah dipilih.');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Kuantitas harus lebih dari 0.');
        return;
      }
    }

    const payload = {
      sbu_type: 'WAREHOUSE',
      item_data: {
        warehouse_id: warehouseId,
        warehouse_name: warehouses.find(w => w.id === warehouseId)?.name || '',
        task_type: taskType,
        items: selectedItems,
        unit_count: selectedItems.length,
        est_revenue: 0 // Optional for warehouse
      }
    };
    
    onAdd(payload);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#05080F]/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#0F172A] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-amber-600/[0.05] to-transparent flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 text-amber-500 mb-2">
              <Package size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">WMS Component</span>
            </div>
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Warehouse Activity</h3>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Warehouse Selection */}
          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Pilih Lokasi Gudang (SBU)</label>
             <select 
               className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-amber-500/50"
               value={warehouseId}
               onChange={(e) => setWarehouseId(e.target.value)}
             >
               <option value="" className="text-slate-900">-- Pilih Lokasi Gudang --</option>
               {warehouses.map(w => (
                 <option key={w.id} value={w.id} className="text-slate-900">{w.name}</option>
               ))}
             </select>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Tipe Aktivitas Gudang</label>
             <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'INBOUND', label: 'Receiving (Inbound)', icon: DownloadCloud, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
                  { id: 'OUTBOUND', label: 'Shipping (Outbound)', icon: UploadCloud, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
                  { id: 'TRANSFER', label: 'Internal Transfer', icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/30' }
                ].map(type => (
                  <button 
                    key={type.id}
                    onClick={() => setTaskType(type.id)}
                    className={`h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${taskType === type.id ? type.bg : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20'}`}
                  >
                     <type.icon size={24} className={taskType === type.id ? type.color : 'text-slate-500'} />
                     <span className={`text-[10px] font-black uppercase tracking-widest ${taskType === type.id ? type.color : ''}`}>{type.label}</span>
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Daftar SKU (Barang)</label>
               <button onClick={handleAddItem} className="flex items-center gap-2 text-[10px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-colors bg-amber-500/10 px-3 py-1.5 rounded-full">
                  <Plus size={14} /> Tambah Baris
               </button>
            </div>

            <div className="space-y-3">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex-1">
                     <select 
                       className="w-full h-12 bg-transparent border-b border-white/10 text-sm font-bold text-white outline-none focus:border-amber-500/50"
                       value={item.sku_id}
                       onChange={(e) => handleItemChange(idx, 'sku_id', e.target.value)}
                     >
                       <option value="" className="text-slate-900">Pilih SKU...</option>
                       {skus.map(s => (
                         <option key={s.id} value={s.id} className="text-slate-900">[{s.sku_code}] {s.name}</option>
                       ))}
                     </select>
                  </div>
                  <div className="w-32">
                     <input 
                       type="number"
                       placeholder="Qty"
                       className="w-full h-12 bg-transparent border-b border-white/10 text-sm font-bold text-white outline-none focus:border-amber-500/50 text-center"
                       value={item.quantity}
                       onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                     />
                  </div>
                  <div className="flex-1">
                     <input 
                       type="text"
                       placeholder="Notes (optional)"
                       className="w-full h-12 bg-transparent border-b border-white/10 text-sm font-medium text-slate-300 outline-none focus:border-amber-500/50"
                       value={item.notes}
                       onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                     />
                  </div>
                  <button onClick={() => handleRemoveItem(idx)} className="w-12 h-12 shrink-0 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                     <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {selectedItems.length === 0 && (
                 <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                    <Package size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Belum ada barang dipilih.</p>
                 </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 shrink-0">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full h-16 bg-amber-600 hover:bg-amber-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-amber-600/20"
          >
            <Save size={20} />
            Simpan Konfigurasi
          </button>
        </div>
        
      </div>
    </div>
  );
}
