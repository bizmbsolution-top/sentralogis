'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Box, Building2, Package, Tag,
  Barcode, Layers, AlertTriangle, ThermometerSnowflake,
  ShieldCheck, Loader2
} from 'lucide-react';
import ProductFormModal from './components/ProductFormModal';

export default function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_product_skus')
        .select(`
          *,
          md_entities(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  const filteredProducts = products.filter(p => 
    p.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.md_entities?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Master SKU</h1>
          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.3em]">International Standard Inventory Catalog</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => { setEditingId(null); setIsFormOpen(true); }}
            className="px-6 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[2rem] shadow-sm border border-slate-100">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input 
          type="text"
          placeholder="Search by SKU Code, Name, or Customer..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300"
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="py-20 flex flex-col items-center text-center shadow-none border-dashed border-2 !rounded-[2.5rem]">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <Box size={24} />
          </div>
          <h3 className="text-sm font-black text-slate-900 mb-1">No Products Found</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click "New Product" to register an SKU</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const rules = typeof product.handling_rules === 'string' ? JSON.parse(product.handling_rules) : (product.handling_rules || {});
            const images = typeof product.image_urls === 'string' ? JSON.parse(product.image_urls) : (product.image_urls || []);
            
            return (
              <Card key={product.id} className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 !rounded-[2rem] group hover:border-blue-200 transition-all">
                {/* Visual Header */}
                <div className="h-48 bg-slate-50 relative border-b border-slate-100">
                  {images.length > 0 ? (
                    <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Box size={40} className="mb-2 opacity-50" />
                      <span className="text-[9px] font-black uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {rules.is_fragile && (
                      <div className="w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg" title="Fragile">
                        <AlertTriangle size={14} />
                      </div>
                    )}
                    {product.requires_cold_storage && (
                      <div className="w-8 h-8 bg-cyan-500 text-white rounded-xl flex items-center justify-center shadow-lg" title="Cold Storage">
                        <ThermometerSnowflake size={14} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">
                        {product.sku_code}
                      </span>
                      {product.brand_name && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded">
                          {product.brand_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{product.name}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Building2 size={12} className="text-amber-500" />
                      {product.md_entities?.name || 'Shared / Internal'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base UOM</p>
                      <p className="text-xs font-black text-slate-700 flex items-center gap-1.5"><Package size={12} className="text-slate-400" /> {product.base_uom || product.unit}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Storage Rule</p>
                      <p className="text-xs font-black text-slate-700 flex items-center gap-1.5"><Layers size={12} className="text-slate-400" /> {product.storage_rule}</p>
                    </div>
                    {(product.upc_code || product.ean_code) && (
                      <div className="col-span-2 mt-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Barcode</p>
                         <p className="text-[10px] font-mono font-bold text-slate-600 flex items-center gap-1.5"><Barcode size={12} /> {product.upc_code || product.ean_code}</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => { setEditingId(product.id); setIsFormOpen(true); }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all"
                  >
                    Manage Specs
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <ProductFormModal
          editId={editingId}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); fetchData(); }}
        />
      )}
    </div>
  );
}
