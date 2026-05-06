'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, Car, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FleetsTableProps {
  refreshTrigger: number;
  onEdit: (fleet: any) => void;
}

export default function FleetsTable({ refreshTrigger, onEdit }: FleetsTableProps) {
  const [fleets, setFleets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchFleets();
  }, [refreshTrigger]);

  const fetchFleets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_fleets')
        .select('*, md_fleet_types(type_name)')
        .order('plate_number', { ascending: true });
      if (error) throw error;
      setFleets(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const { error } = await supabase.from('md_fleets').delete().eq('id', id);
      if (error) throw error;
      toast.success('Fleet deleted');
      fetchFleets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isNearExpiry = (dateStr: string) => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return 'badge-available';
      case 'on_road': return 'badge-on-road';
      case 'maintenance': return 'badge-maintenance';
      case 'retired': return 'badge-suspended';
      default: return 'badge-suspended';
    }
  };

  const filtered = fleets.filter(f => 
    f.plate_number.toLowerCase().includes(search.toLowerCase()) || 
    f.fleet_code.toLowerCase().includes(search.toLowerCase()) ||
    f.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search by plate, code or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Plate Number</th>
              <th className="table-header">Type / Brand</th>
              <th className="table-header">Expiry (STNK/KIR)</th>
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
                <td colSpan={5} className="p-8 text-center text-slate-400">No vehicles found</td>
              </tr>
            ) : (
              filtered.map((fleet) => {
                const stnkWarning = isNearExpiry(fleet.stnk_expiry);
                const kirWarning = isNearExpiry(fleet.kir_expiry);
                
                return (
                  <tr key={fleet.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-bold text-slate-900 border border-slate-200 bg-slate-50 px-2 py-1 rounded inline-block">
                        {fleet.plate_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono uppercase">{fleet.fleet_code}</div>
                    </td>
                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{fleet.md_fleet_types?.type_name}</div>
                      <div className="text-xs text-slate-400">{fleet.brand} {fleet.model} ({fleet.year})</div>
                    </td>
                    <td className="table-cell text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 w-10">STNK:</span>
                        <span className={stnkWarning ? 'text-red-600 font-bold' : ''}>{fleet.stnk_expiry}</span>
                        {stnkWarning && <AlertCircle size={12} className="text-red-600" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-slate-400 w-10">KIR:</span>
                        <span className={kirWarning ? 'text-red-600 font-bold' : ''}>{fleet.kir_expiry}</span>
                        {kirWarning && <AlertCircle size={12} className="text-red-600" />}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(fleet.status)}>
                        {fleet.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onEdit(fleet)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(fleet.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
