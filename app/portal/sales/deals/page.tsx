'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Briefcase, Plus, X, Search, ChevronRight, Building } from 'lucide-react';
import Link from 'next/link';

export default function MobileDeals() {
  const { user, profile } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Deal State
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [newDeal, setNewDeal] = useState({ entity_id: '', title: '', sbu_target: '' });
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDeals();
      fetchLeads();
    }
  }, [user]);

  async function fetchDeals() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('crm_deals')
        .select(`id, title, stage, expected_revenue, sbu_target, md_entities(name)`)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });
        
      setDeals(data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeads() {
    try {
      const { data } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('sales_rep_id', user?.id)
        .order('name', { ascending: true });
      setLeads(data || []);
    } catch (err) {
      console.warn(err);
    }
  }

  const handleSaveNewDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.entity_id || !newDeal.title) return;
    setSavingNew(true);

    try {
      const { error } = await supabase.from('crm_deals').insert([{
        tenant_id: profile?.tenant_id,
        entity_id: newDeal.entity_id,
        title: newDeal.title,
        stage: 'PROSPECTING',
        sbu_target: newDeal.sbu_target,
        created_by: user?.id
      }]);

      if (error) throw error;
      setShowAddSheet(false);
      setNewDeal({ entity_id: '', title: '', sbu_target: '' });
      fetchDeals();
    } catch (err: any) {
      alert("Failed to save deal: " + err.message);
    } finally {
      setSavingNew(false);
    }
  };

  const filteredDeals = deals.filter(d => {
    const term = searchQuery.toLowerCase();
    const entityName = Array.isArray(d.md_entities) ? d.md_entities[0]?.name : (d.md_entities as any)?.name;
    return d.title.toLowerCase().includes(term) || (entityName || '').toLowerCase().includes(term);
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'PROSPECTING': return 'bg-slate-100 text-slate-600';
      case 'NEGOTIATION': return 'bg-blue-100 text-blue-700';
      case 'QUOTATION': return 'bg-amber-100 text-amber-700';
      case 'WON': return 'bg-emerald-100 text-emerald-700';
      case 'LOST': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative">
      <div className="bg-white px-6 pt-10 pb-4 border-b border-slate-100 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Pipeline</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search deals or customers..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-3 pb-24">
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading pipeline...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-10">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No active deals found.</p>
            <p className="text-xs text-slate-400 mt-1">Tap the + button to create a deal.</p>
          </div>
        ) : (
          filteredDeals.map(deal => {
            const entityName = Array.isArray(deal.md_entities) ? deal.md_entities[0]?.name : (deal.md_entities as any)?.name;

            return (
              <Link href={`/portal/sales/deals/${deal.id}`} key={deal.id} className="block bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{deal.title}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getStageColor(deal.stage)} ml-2 shrink-0`}>
                    {deal.stage}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <Building className="w-3.5 h-3.5" />
                  <span className="truncate">{entityName || 'Unknown Customer'}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Expected Revenue</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(deal.expected_revenue)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-[90px] right-6 w-14 h-14 bg-amber-500 rounded-full shadow-lg shadow-amber-200 flex items-center justify-center text-white active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Deal Bottom Sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddSheet(false)}></div>
          
          {/* Sheet */}
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">New Deal</h2>
              <button onClick={() => setShowAddSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prospect / Customer *</label>
                <select 
                  required 
                  value={newDeal.entity_id} 
                  onChange={e => setNewDeal({...newDeal, entity_id: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="" disabled>Select a customer...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Deal Title *</label>
                <input 
                  required 
                  type="text" 
                  value={newDeal.title} 
                  onChange={e => setNewDeal({...newDeal, title: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all" 
                  placeholder="e.g. Export Logistics Contract Q3" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Target SBU</label>
                <select 
                  value={newDeal.sbu_target} 
                  onChange={e => setNewDeal({...newDeal, sbu_target: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="">-- Select SBU --</option>
                  <option value="TRUCKING">Trucking</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="FORWARDING">Freight Forwarding</option>
                  <option value="CLEARANCE">Customs Clearance</option>
                </select>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={savingNew} className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-200 active:scale-95 transition-all disabled:opacity-50">
                  {savingNew ? 'Saving...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
