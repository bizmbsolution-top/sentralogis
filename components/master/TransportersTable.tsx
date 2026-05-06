'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, Building2, Loader2, Calendar, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransportersTableProps {
  refreshTrigger: number;
  onEdit: (transporter: any) => void;
}

export default function TransportersTable({ refreshTrigger, onEdit }: TransportersTableProps) {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchTransporters();
  }, [refreshTrigger]);

  const fetchTransporters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_transporters')
        .select('*')
        .order('transporter_name', { ascending: true });
      if (error) throw error;
      setTransporters(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transporter?')) return;
    try {
      const { error } = await supabase.from('md_transporters').delete().eq('id', id);
      if (error) throw error;
      toast.success('Transporter deleted');
      fetchTransporters();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filtered = transporters.filter(t => 
    t.transporter_name.toLowerCase().includes(search.toLowerCase()) || 
    t.transporter_code.toLowerCase().includes(search.toLowerCase()) ||
    t.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search by name, code or CP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Code</th>
              <th className="table-header">Transporter Name</th>
              <th className="table-header">Type</th>
              <th className="table-header">Contact / Phone</th>
              <th className="table-header">Contract Period</th>
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
                <td colSpan={6} className="p-8 text-center text-slate-400">No transporters found</td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell font-mono font-medium">{t.transporter_code}</td>
                  <td className="table-cell font-semibold text-slate-900">{t.transporter_name}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.transporter_type === 'OWN' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t.transporter_type}
                    </span>
                  </td>
                  <td className="table-cell text-xs">
                    <div className="font-medium text-slate-700">{t.contact_person}</div>
                    <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                      <Phone size={12} />
                      {t.phone}
                    </div>
                  </td>
                  <td className="table-cell text-xs">
                    {t.transporter_type === 'VENDOR' ? (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {t.contract_start_date} to {t.contract_end_date}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Internal</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
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
