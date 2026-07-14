'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Box, Building2, Package, Tag,
  Barcode, Layers, AlertTriangle, ThermometerSnowflake,
  Loader2, ClipboardList, Trash2, Edit
} from 'lucide-react';
import ProductFormModal from './components/ProductFormModal';
import BOMFormModal from './components/BOMFormModal';

export default function ProductsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'bom'>('catalog');
  
  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // BOM State
  const [boms, setBoms] = useState<any[]>([]);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [isBomFormOpen, setIsBomFormOpen] = useState(false);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);

  // Performance Optimization: Pagination limit
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, activeTab]);

  const fetchProducts = async () => {
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

  const fetchBoms = async () => {
    if (!profile?.tenant_id) return;
    setLoadingBoms(true);
    try {
      const { data, error } = await supabase
        .from('md_bill_of_materials')
        .select(`
          *,
          kit:kit_sku_id(name, sku_code),
          md_bom_items(id, quantity_required, component:component_sku_id(name, sku_code, unit))
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setBoms(data || []);
    } catch (err: any) {
      toast.error('Failed to load BOM specifications');
    } finally {
      setLoadingBoms(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchProducts();
    } else {
      fetchBoms();
    }
  }, [profile?.tenant_id, activeTab]);

  const handleDeleteBom = async (bomId: string, bomNumber: string) => {
    if (!confirm(`Are you sure you want to delete BOM ${bomNumber}?`)) return;
    try {
      const { error } = await supabase
        .from('md_bill_of_materials')
        .delete()
        .eq('id', bomId);
      if (error) throw error;
      toast.success(`BOM ${bomNumber} deleted`);
      fetchBoms();
    } catch (err: any) {
      toast.error('Failed to delete BOM: ' + err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.md_entities?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoms = boms.filter(b =>
    b.bom_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.name && b.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    b.kit?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.kit?.sku_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
            {activeTab === 'catalog' ? 'Master SKU' : 'Bill of Materials (BOM)'}
          </h1>
          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.3em]">
            {activeTab === 'catalog' ? 'International Standard Inventory Catalog' : 'Predefined Kitting & Bundling Component Recipes'}
          </p>
        </div>
        <div className="flex gap-4">
          {activeTab === 'catalog' ? (
            <button
              onClick={() => { setEditingId(null); setIsFormOpen(true); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> New Product
            </button>
          ) : (
            <button
              onClick={() => { setEditingBomId(null); setIsBomFormOpen(true); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> New BOM Specification
            </button>
          )}
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] w-fit shrink-0 gap-1 border border-slate-200/50">
        <button
          onClick={() => { setActiveTab('catalog'); setSearchTerm(''); }}
          className={`px-5 py-2.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Box size={14} /> SKU Catalog
        </button>
        <button
          onClick={() => { setActiveTab('bom'); setSearchTerm(''); }}
          className={`px-5 py-2.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'bom' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList size={14} /> Bill of Materials (BOM)
        </button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[2rem] shadow-sm border border-slate-100">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input 
          type="text"
          placeholder={activeTab === 'catalog' ? 'Search by SKU Code, Name, or Customer...' : 'Search by BOM Code, BOM Name, or Kit SKU...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300"
        />
      </div>

      {/* View switching */}
      {activeTab === 'catalog' ? (
        loading ? (
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
            {filteredProducts.slice(0, visibleCount).map(product => {
              const rules = typeof product.handling_rules === 'string' ? JSON.parse(product.handling_rules) : (product.handling_rules || {});
              const images = typeof product.image_urls === 'string' ? JSON.parse(product.image_urls) : (product.image_urls || []);
              
              return (
                <Card key={product.id} className="overflow-hidden border-slate-100/80 bg-white shadow-xl shadow-slate-200/40 !rounded-[2rem] group hover:border-blue-400/30 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {/* Image Container with uniform, clean frame */}
                    <div className="h-48 bg-slate-50/50 relative border-b border-slate-100/60 flex items-center justify-center p-4 overflow-hidden">
                      {images.length > 0 ? (
                        <img 
                          src={images[0]} 
                          alt={product.name} 
                          className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <Box size={36} className="mb-1.5 opacity-40 group-hover:scale-115 transition-transform duration-500 text-slate-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest">No Product Image</span>
                        </div>
                      )}
                      
                      {/* Floating Badges */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {rules.is_fragile && (
                          <div className="w-8 h-8 bg-rose-500/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 backdrop-blur-sm" title="Fragile">
                            <AlertTriangle size={14} />
                          </div>
                        )}
                        {product.requires_cold_storage && (
                          <div className="w-8 h-8 bg-cyan-500/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 backdrop-blur-sm" title="Cold Storage">
                            <ThermometerSnowflake size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* SKU & Brand */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100/50">
                          {product.sku_code}
                        </span>
                        {product.brand_name && (
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200/80 px-2 py-0.5 rounded-md bg-slate-50/50">
                            {product.brand_name}
                          </span>
                        )}
                      </div>

                      {/* Product Title */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <Building2 size={12} className="text-amber-500" />
                          {product.md_entities?.name || 'Shared / Internal'}
                        </div>
                      </div>

                      {/* Attributes Grid */}
                      <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Base UOM</p>
                          <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <Package size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{product.base_uom || product.unit}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Storage Rule</p>
                          <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <Layers size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{product.storage_rule}</span>
                          </p>
                        </div>
                        {(product.upc_code || product.ean_code) && (
                          <div className="col-span-2 mt-0.5 border-t border-slate-100 pt-2">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Barcode</p>
                             <p className="text-[10px] font-mono font-bold text-slate-600 flex items-center gap-1.5">
                               <Barcode size={12} className="text-slate-400 shrink-0" />
                               <span className="truncate">{product.upc_code || product.ean_code}</span>
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-6 pt-0">
                    <button 
                      onClick={() => { setEditingId(product.id); setIsFormOpen(true); }}
                      className="w-full py-3 bg-white border border-slate-200 hover:border-blue-600 text-slate-600 hover:text-blue-600 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-50/20 active:scale-95 transition-all duration-200"
                    >
                      Manage Specs
                    </button>
                  </div>
                </Card>
              );
            })}
            {filteredProducts.length > visibleCount && (
              <div className="col-span-full flex justify-center pt-6">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all"
                >
                  Load More Products ({filteredProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* BOM TAB View */
        loadingBoms ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading BOM Specs...</p>
          </div>
        ) : filteredBoms.length === 0 ? (
          <Card className="py-20 flex flex-col items-center text-center shadow-none border-dashed border-2 !rounded-[2.5rem]">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <ClipboardList size={24} />
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">No BOM Specifications Found</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click "New BOM Specification" to define a kitting recipe</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBoms.slice(0, visibleCount).map(bom => (
              <Card key={bom.id} className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 !rounded-[2rem] p-6 flex flex-col justify-between hover:border-blue-200 transition-all space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">
                      {bom.bom_number}
                    </span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${bom.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {bom.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">
                    {bom.name || bom.kit?.name || 'Unnamed BOM'}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    <Package size={12} className="text-blue-500" />
                    Kit Target: {bom.kit?.name} ({bom.kit?.sku_code})
                  </div>

                  {/* Components Summary */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Recipe Components</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {bom.md_bom_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                          <span className="font-bold text-slate-700 truncate w-40" title={item.component?.name}>
                            {item.component?.name || 'Unknown Item'}
                          </span>
                          <span className="font-black text-slate-900 shrink-0">
                            x{item.quantity_required} {item.component?.unit || 'PCS'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setEditingBomId(bom.id); setIsBomFormOpen(true); }}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit size={12} /> Edit Recipe
                  </button>
                  <button 
                    onClick={() => handleDeleteBom(bom.id, bom.bom_number)}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-xl transition-all border border-rose-100"
                    title="Delete BOM"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
            {filteredBoms.length > visibleCount && (
              <div className="col-span-full flex justify-center pt-6">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all"
                >
                  Load More Recipes ({filteredBoms.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Modals */}
      {isFormOpen && (
        <ProductFormModal
          editId={editingId}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); fetchProducts(); }}
        />
      )}

      {isBomFormOpen && (
        <BOMFormModal
          editId={editingBomId}
          onClose={() => setIsBomFormOpen(false)}
          onSuccess={() => { setIsBomFormOpen(false); fetchBoms(); }}
        />
      )}
    </div>
  );
}
