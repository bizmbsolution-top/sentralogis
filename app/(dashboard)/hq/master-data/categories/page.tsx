'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Package } from 'lucide-react';

export default function MasterCategoriesPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    parent_id: '',
    name: '',
    code: '',
    description: ''
  });

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('md_product_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const buildTree = (cats: any[], parentId: string | null = null): any[] => {
    return cats
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        children: buildTree(cats, c.id)
      }));
  };

  const categoryTree = buildTree(categories);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tenant_id: profile?.tenant_id,
      name: formData.name,
      code: formData.code,
      description: formData.description,
      parent_id: formData.parent_id || null
    };

    if (formData.id) {
      await supabase.from('md_product_categories').update(payload).eq('id', formData.id);
    } else {
      await supabase.from('md_product_categories').insert([payload]);
    }
    
    setIsModalOpen(false);
    fetchCategories();
  };

  const CategoryNode = ({ node, level = 0 }: { node: any, level?: number }) => {
    const [expanded, setExpanded] = useState(level < 1);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="flex flex-col">
        <div 
          className={`flex items-center gap-3 py-3 px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group`}
          style={{ paddingLeft: `${(level * 2) + 1}rem` }}
        >
          <button 
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded hover:bg-slate-200 text-slate-400 ${hasChildren ? '' : 'invisible'}`}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            {level === 0 ? <FolderTree size={16} /> : <Package size={16} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900">{node.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {node.code && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {node.code}
                </span>
              )}
              {node.description && (
                <span className="text-xs text-slate-500 truncate">{node.description}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => {
                setFormData({ id: '', parent_id: node.id, name: '', code: '', description: '' });
                setIsModalOpen(true);
              }}
              className="p-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
            >
              + Sub Category
            </button>
            <button 
              onClick={() => {
                setFormData({ id: node.id, parent_id: node.parent_id || '', name: node.name, code: node.code || '', description: node.description || '' });
                setIsModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>

        {expanded && hasChildren && (
          <div className="flex flex-col">
            {node.children.map((child: any) => (
              <CategoryNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage hierarchical product categories and groups</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', parent_id: '', name: '', code: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          <Plus size={16} />
          New Root Category
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading categories...</div>
        ) : categoryTree.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FolderTree size={48} className="text-slate-200 mb-4" />
            <h3 className="text-slate-900 font-bold">No Categories Found</h3>
            <p className="text-slate-500 text-sm mt-1">Start by creating a new root category</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {categoryTree.map(node => (
              <CategoryNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {formData.id ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Parent Category</label>
                <select 
                  value={formData.parent_id || ''}
                  onChange={e => setFormData({...formData, parent_id: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">-- None (Root) --</option>
                  {categories.filter(c => c.id !== formData.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Name <span className="text-red-500">*</span></label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g. Food & Beverages"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category Code</label>
                <input 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g. FNB"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
