'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Search, Plus, Phone, Mail, ChevronRight, MapPin, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MobileLeads() {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Lead Bottom Sheet State
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('md_entities')
        .select(`id, name, phone, email, crm_status, updated_at`)
        .eq('sales_rep_id', user?.id || '')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from('md_entities' as any) as any).insert([{
        tenant_id: profile?.tenant_id as string,
        entity_type: 'CUSTOMER',
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        sales_rep_id: user?.id,
        crm_status: 'NEW'
      }]);
      if (error) throw error;
      setShowAddSheet(false);
      setFormData({ name: '', phone: '', email: '' });
      fetchLeads();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative">
      
      {/* Header Sticky */}
      <div className="bg-white px-6 pt-10 pb-4 border-b border-slate-100 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">My Prospects</h1>
        
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search prospects..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading prospects...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-600">No prospects found.</p>
            <p className="text-xs text-slate-400 mt-1">Tap the + button to add a new lead.</p>
          </div>
        ) : (
          filteredLeads.map(lead => (
            <div key={lead.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{lead.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{lead.crm_status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                  {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                  {lead.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {lead.email}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-[90px] right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center text-white active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Lead Bottom Sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddSheet(false)}></div>
          
          {/* Sheet */}
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">New Prospect</h2>
              <button onClick={() => setShowAddSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Company / Person Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="e.g. PT Maju Bersama" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Phone Number (WhatsApp)</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="e.g. 0812345678" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="e.g. contact@maju.com" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={saving} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
