'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Scale, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterUomPage() {
  const { profile } = useAuth();
  const [uoms, setUoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: ''
  });

  const fetchUoms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('md_uoms')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setUoms(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUoms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    const payload = {
      tenant_id: profile.tenant_id,
      name: formData.name.toUpperCase().trim(),
      description: formData.description
    };

    try {
      if (formData.id) {
        const { error } = await supabase.from('md_uoms').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast.success('UOM updated successfully');
      } else {
        const { error } = await supabase.from('md_uoms').insert([payload]);
        if (error) throw error;
        toast.success('UOM created successfully');
      }
      setIsModalOpen(false);
      fetchUoms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save UOM');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this UOM?')) return;
    try {
      const { error } = await supabase.from('md_uoms').delete().eq('id', id);
      if (error) throw error;
      toast.success('UOM deleted successfully');
      fetchUoms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete UOM');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master UOM (Unit of Measurement)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage standardized units for inventory tracking</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          <Plus size={16} />
          New UOM
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading UOMs...</div>
        ) : uoms.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Scale size={48} className="text-slate-200 mb-4" />
            <h3 className="text-slate-900 font-bold">No UOMs Found</h3>
            <p className="text-slate-500 text-sm mt-1">Start by adding standard units like PCS, BOX, or PALLET</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-slate-50">
            {uoms.map((uom) => (
              <div key={uom.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black text-sm rounded-lg uppercase tracking-wider">
                      {uom.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setFormData({ id: uom.id, name: uom.name, description: uom.description || '' });
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit UOM"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(uom.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete UOM"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{uom.description || 'No description provided.'}</p>
                </div>
              </div>
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
                {formData.id ? 'Edit UOM' : 'New UOM'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">UOM Name <span className="text-red-500">*</span></label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g. PCS, BOX, LITER"
                />
                <p className="text-[10px] text-slate-400 mt-1">Short standardized name/code.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <input 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g. Pieces, Carton Box, Liter"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">Save UOM</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
