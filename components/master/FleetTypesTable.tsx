'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, Truck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FleetTypesTableProps {
  refreshTrigger: number;
  onEdit: (type: any) => void;
}

export default function FleetTypesTable({ refreshTrigger, onEdit }: FleetTypesTableProps) {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchTypes();
  }, [refreshTrigger]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_fleet_types')
        .select('*')
        .order('type_name', { ascending: true });
      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This might affect existing fleets.')) return;
    try {
      const { error } = await supabase.from('md_fleet_types').delete().eq('id', id);
      if (error) throw error;
      toast.success('Type deleted');
      fetchTypes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filtered = types.filter(t => 
    t.type_name.toLowerCase().includes(search.toLowerCase()) || 
    t.type_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Code</th>
              <th className="table-header">Type Name</th>
              <th className="table-header">Capacity</th>
              <th className="table-header">Dimension (L/W/H)</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No fleet types found</td>
              </tr>
            ) : (
              filtered.map((type) => (
                <tr key={type.id} className="table-row">
                  <td className="table-cell font-mono font-medium">{type.type_code}</td>
                  <td className="table-cell font-semibold text-slate-900">{type.type_name}</td>
                  <td className="table-cell text-xs">
                    <div>{type.capacity_ton} Ton</div>
                    <div className="text-slate-400">{type.capacity_cbm} CBM</div>
                  </td>
                  <td className="table-cell text-xs text-slate-500">
                    {type.dimension?.length} x {type.dimension?.width} x {type.dimension?.height} cm
                  </td>
                  <td className="table-cell">
                    <span className={type.is_active ? 'badge-available' : 'badge-suspended'}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(type)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(type.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
