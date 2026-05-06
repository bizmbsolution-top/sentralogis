'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2, Search, Filter, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContactsTableProps {
  refreshTrigger: number;
  onEdit: (contact: any) => void;
}

const ContactsTable: React.FC<ContactsTableProps> = ({ refreshTrigger, onEdit }) => {
  const supabase = createClient();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchContacts();
  }, [refreshTrigger, typeFilter]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('md_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'ALL') {
        query = query.eq('contact_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase.from('md_contacts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or code..."
            className="form-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="form-input py-1.5"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="CUSTOMER">Customer</option>
            <option value="VENDOR">Vendor</option>
            <option value="SHIPPER">Shipper</option>
            <option value="RECIPIENT">Recipient</option>
            <option value="BROKER">Broker</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Code</th>
                <th className="table-header">Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Location</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No contacts found</td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-mono font-medium text-slate-900">{contact.code}</td>
                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{contact.name}</div>
                      <div className="text-xs text-slate-400">{contact.legal_name || '-'}</div>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        contact.contact_type === 'CUSTOMER' ? 'bg-blue-50 text-blue-600' :
                        contact.contact_type === 'VENDOR' ? 'bg-orange-50 text-orange-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        {contact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="text-xs">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-xs">{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-start gap-1.5 max-w-[200px]">
                        <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs truncate">{contact.address?.street}, {contact.address?.city}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`flex items-center gap-1.5 text-xs ${contact.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${contact.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        {contact.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(contact)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default ContactsTable;
