'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, User, Loader2, AlertCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface DriversTableProps {
  refreshTrigger: number;
  onEdit: (driver: any) => void;
}

export default function DriversTable({ refreshTrigger, onEdit }: DriversTableProps) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchDrivers();
  }, [refreshTrigger]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_drivers')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      const { error } = await supabase.from('md_drivers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Driver deleted');
      fetchDrivers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isNearExpiry = (dateStr: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return 'badge-available';
      case 'on_duty': return 'badge-on-road';
      case 'off_duty': return 'badge-maintenance';
      case 'suspended': return 'badge-suspended';
      default: return 'badge-suspended';
    }
  };

  const filtered = drivers.filter(d => 
    d.full_name.toLowerCase().includes(search.toLowerCase()) || 
    d.driver_code.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search by name, code or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Driver</th>
              <th className="table-header">Contact</th>
              <th className="table-header">License (SIM)</th>
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
                <td colSpan={5} className="p-8 text-center text-slate-400">No drivers found</td>
              </tr>
            ) : (
              filtered.map((driver) => {
                const simWarning = isNearExpiry(driver.sim_expiry);
                
                return (
                  <tr key={driver.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{driver.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">{driver.driver_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone size={12} className="text-slate-400" />
                        {driver.phone}
                      </div>
                      {driver.whatsapp && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">WA Available</div>
                      )}
                    </td>
                    <td className="table-cell text-xs">
                      <div className="font-bold text-slate-700">{driver.sim_class}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={simWarning ? 'text-red-600 font-bold' : 'text-slate-400'}>
                          Exp: {driver.sim_expiry}
                        </span>
                        {simWarning && <AlertCircle size={12} className="text-red-600" />}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(driver.status)}>
                        {driver.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onEdit(driver)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(driver.id)}
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
