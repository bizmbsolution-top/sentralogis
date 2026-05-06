'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationsTableProps {
  refreshTrigger: number;
  onEdit: (location: any) => void;
}

export default function LocationsTable({ refreshTrigger, onEdit }: LocationsTableProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchLocations();
  }, [refreshTrigger]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_locations')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      const { error } = await supabase.from('md_locations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Location deleted');
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filtered = locations.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.location_code.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search by name, code or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Code</th>
              <th className="table-header">Name</th>
              <th className="table-header">City / Province</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">No locations found</td>
              </tr>
            ) : (
              filtered.map((location) => (
                <tr key={location.id} className="table-row">
                  <td className="table-cell font-mono font-medium">{location.location_code}</td>
                  <td className="table-cell">
                    <div className="font-semibold text-slate-900">{location.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[250px]">{location.address}</div>
                  </td>
                  <td className="table-cell">
                    <div>{location.city}</div>
                    <div className="text-xs text-slate-400">{location.province}</div>
                  </td>
                  <td className="table-cell">
                    <span className={location.is_active ? 'badge-available' : 'badge-suspended'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(location)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(location.id)}
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
