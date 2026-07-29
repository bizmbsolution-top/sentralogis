'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  MoreHorizontal,
  X,
  Send,
  Building2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';

// Types
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED';
type ActivityType = 'CALL' | 'MEETING' | 'WHATSAPP' | 'EMAIL' | 'NOTE';

interface Lead {
  id: string;
  name: string; // company_name mapping
  company_name: string;
  pic_name: string;
  phone: string;
  email: string;
  industry: string;
  billing_address: string;
  crm_status: LeadStatus;
  updated_at: string;
  hasNewChat?: boolean;
  upcomingMeeting?: string;
}

interface Activity {
  id: string;
  activity_type: ActivityType;
  activity_date: string;
  description: string;
  location?: string;
  performed_by_name?: string;
  profiles?: { full_name?: string } | null;
  photo_url?: string | null;
}

import ContactFormModal from '@/components/master/ContactFormModal';

// Modal Component for Edit Lead
function EditLeadModal({ 
  lead, 
  tenantId,
  onClose, 
  onSuccess 
}: { 
  lead: any, 
  tenantId: string,
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    sales_rep_id: lead.sales_rep_id || ''
  });

  useEffect(() => {
    async function fetchReps() {
      const { data } = await supabase.from('profiles')
        .select('id, full_name, role')
        .in('role', ['hq_sales_staff', 'hq_sales_manager', 'hq_commercial_director'])
        .eq('is_active', true);
      if (data) setSalesReps(data);
    }
    fetchReps();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('md_entities')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          sales_rep_id: formData.sales_rep_id || null
        })
        .eq('id', lead.id)
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert("Failed to update lead: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex-shrink-0 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Edit Lead</h2>
            <p className="text-sm text-slate-500 mt-1">Update customer details and sales assignment.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Company / Customer Name *</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Claimed By (Sales Rep)</label>
            <select 
              value={formData.sales_rep_id} 
              onChange={e => setFormData({...formData, sales_rep_id: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- Unassigned (Remove Claim) --</option>
              {salesReps.map(r => (
                <option key={r.id} value={r.id}>{r.full_name} ({r.role})</option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Component for Convert to Deal
function ConvertDealModal({ 
  lead, 
  tenantId,
  onClose, 
  onSuccess 
}: { 
  lead: any, 
  tenantId: string,
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: `Logistics Service for ${lead.name}`,
    expected_revenue: '',
    sbu_target: ['TRUCKING'], // Array of selected SBUs
    fee_type: 'PERCENTAGE',
    fee_value: '5'
  });

  const SBU_OPTIONS = [
    { id: 'TRUCKING', label: 'Trucking' },
    { id: 'WAREHOUSE', label: 'Warehouse' },
    { id: 'CLEARANCE', label: 'Clearance' },
    { id: 'FORWARDING', label: 'Forwarding' }
  ];

  const handleSbuToggle = (sbu: string) => {
    setFormData(prev => ({
      ...prev,
      sbu_target: prev.sbu_target.includes(sbu) 
        ? prev.sbu_target.filter(s => s !== sbu)
        : [...prev.sbu_target, sbu]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.sbu_target.length === 0) {
      alert("Please select at least one Target SBU");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('crm_deals')
        .insert([{
          tenant_id: tenantId,
          entity_id: lead.id,
          title: formData.title,
          stage: 'PROSPECTING',
          expected_revenue: Number(formData.expected_revenue) || 0,
          sbu_target: formData.sbu_target.join(','), // join as string
          fee_type: formData.fee_type,
          fee_value: Number(formData.fee_value) || 0
        }]);
      
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert("Failed to convert deal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[600px] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex-shrink-0 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Convert to Deal</h2>
            <p className="text-sm text-slate-500 mt-1">Move this lead into the Sales Pipeline.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Deal Title *</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Target SBU *</label>
            <div className="grid grid-cols-2 gap-3">
              {SBU_OPTIONS.map(sbu => (
                <label key={sbu.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.sbu_target.includes(sbu.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="checkbox" 
                    checked={formData.sbu_target.includes(sbu.id)}
                    onChange={() => handleSbuToggle(sbu.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{sbu.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Expected Rev (IDR)</label>
              <FormattedNumberInput required value={Number(formData.expected_revenue || 0)} onChange={val => setFormData({...formData, expected_revenue: String(val)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Fee Type</label>
              <select value={formData.fee_type} onChange={e => setFormData({...formData, fee_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="NOMINAL">Nominal (IDR)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Fee Value</label>
              <FormattedNumberInput required value={Number(formData.fee_value || 0)} onChange={val => setFormData({...formData, fee_value: String(val)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Converting...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Component for Schedule Meeting
function ScheduleMeetingModal({ 
  lead, 
  userProfile,
  onClose, 
  onSuccess 
}: { 
  lead: any, 
  userProfile: any,
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    activity_date: '',
    description: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('crm_activities')
        .insert([{
          tenant_id: userProfile?.tenant_id,
          entity_id: lead.id,
          activity_type: 'MEETING',
          activity_date: formData.activity_date,
          description: formData.title + (formData.description ? `\n\nAgenda: ${formData.description}` : ''),
          performed_by: userProfile?.id,
          status: 'SCHEDULED'
        }]);
      
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert("Failed to schedule meeting: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex-shrink-0 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Schedule Meeting</h2>
            <p className="text-sm text-slate-500 mt-1">Set a future meeting with {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Meeting Title *</label>
            <input required type="text" placeholder="e.g. First Introduction / Presentation" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Date & Time *</label>
            <input required type="datetime-local" value={formData.activity_date} onChange={e => setFormData({...formData, activity_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Agenda / Description</label>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Component for Add Lead
function AddLeadModal({ 
  onClose, 
  onSuccess,
  tenantId
}: { 
  onClose: () => void, 
  onSuccess: () => void,
  tenantId: string
}) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      let query = supabase
        .from('md_entities')
        .select('id, name, entity_code, phone, email, is_customer, crm_status, sales_rep_id')
        .eq('tenant_id', tenantId);

      if (searchTerm.trim() !== '') {
        query = query.or(`name.ilike.%${searchTerm.trim()}%,entity_code.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`);
      }

      const { data } = await query.order('name', { ascending: true }).limit(25);
      setContacts(data || []);
    };
    fetchContacts();
  }, [searchTerm, tenantId]);

  const handleAssignLead = async (contactId: string) => {
    setLoading(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('md_entities')
        .update({
          crm_status: 'NEW',
          sales_rep_id: userResp.user?.id
        })
        .eq('id', contactId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert("Failed to assign Lead: " + err.message);
      setLoading(false);
    }
  };

  const handleContactCreated = async (newContact: any) => {
    // Once the master contact is created, assign it as a lead
    await handleAssignLead(newContact.id);
  };

  if (showContactForm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in duration-200">
         <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative">
            <ContactFormModal
              tenantId={tenantId}
              initialName={searchTerm}
              onClose={() => setShowContactForm(false)}
              onSuccess={handleContactCreated}
            />
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[520px] overflow-hidden flex flex-col h-[620px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Select / Add Lead</h2>
              <p className="text-sm text-slate-500 mt-1">Select from existing master customers or add a new one.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          <div className="relative">
             <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
             <input 
                type="text" 
                placeholder="Search existing customer by name, code, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all shadow-inner"
             />
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 p-2 space-y-2">
             {contacts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm p-6 text-center gap-4 bg-white rounded-xl border border-dashed border-slate-200">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                     <Building2 size={24} />
                   </div>
                   <div>
                     <p className="font-bold text-slate-800 text-base">Customer Not Found</p>
                     <p className="text-slate-500 text-xs mt-1">
                       {searchTerm ? `No existing master contact matches "${searchTerm}".` : "No master contacts found."}
                     </p>
                   </div>
                   <button 
                      onClick={() => setShowContactForm(true)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                   >
                      <Plus size={16} />
                      Create New Master Contact {searchTerm ? `"${searchTerm}"` : ""}
                   </button>
                </div>
             ) : (
                contacts.map(c => {
                  const isAlreadyLead = !!c.sales_rep_id;
                  return (
                    <div key={c.id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-indigo-200 transition-all flex flex-col gap-2">
                      <div className="flex justify-between items-center gap-3">
                         <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 truncate">{c.name}</p>
                              {c.is_customer && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded uppercase border border-emerald-100">Customer</span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{c.entity_code || 'NO-CODE'} • {c.phone || c.email || 'No Contact Info'}</p>
                         </div>
                         {isAlreadyLead ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg shrink-0">Already Claimed</span>
                         ) : (
                            <button 
                               onClick={() => handleAssignLead(c.id)}
                               disabled={loading}
                               className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                               {loading ? '...' : 'Select & Claim'}
                            </button>
                         )}
                      </div>
                    </div>
                  );
                })
             )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Need to register a completely new entity?</span>
          <button 
             onClick={() => setShowContactForm(true)}
             className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
             <Plus size={15} />
             New Master Contact
          </button>
        </div>
      </div>
    </div>

  );
}

export default function LeadsPage() {
  const { profile, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatChannelId, setChatChannelId] = useState<string | null>(null);
  const [newChatMessage, setNewChatMessage] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (user && profile?.tenant_id) {
      fetchLeads();
    }
  }, [user, profile]);

  async function fetchLeads() {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('md_entities')
        .select(`
          id, name, phone, email, billing_address, crm_status, updated_at, sales_rep_id
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('sales_rep_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (profile?.role === 'hq_sales_staff' && user?.id) {
        query = query.eq('sales_rep_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (data) {
        const leadIds = data.map(d => d.id);
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const nowStr = now.toISOString();

        // 1. Fetch upcoming meetings
        const { data: upcomingMeetings } = await supabase
          .from('crm_activities')
          .select('entity_id, activity_date')
          .eq('activity_type', 'MEETING')
          .eq('status', 'SCHEDULED')
          .eq('tenant_id', profile.tenant_id)
          .gte('activity_date', nowStr)
          .lte('activity_date', twoHoursFromNow)
          .in('entity_id', leadIds);

        // 2. Fetch guest chat messages in last 24h
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: channels } = await supabase
          .from('chat_channels')
          .select('id, channel_id')
          .eq('channel_type', 'lead')
          .eq('tenant_id', profile.tenant_id)
          .in('channel_id', leadIds);

        let guestMessages: any[] = [];
        if (channels && channels.length > 0) {
          const channelIds = channels.map(c => c.id);
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('channel_id')
            .is('sender_id', null)
            .gte('created_at', yesterday)
            .in('channel_id', channelIds);
          guestMessages = msgs || [];
        }

        setLeads(data.map(d => {
          const meeting = upcomingMeetings?.find(m => m.entity_id === d.id);
          const channel = channels?.find(c => c.channel_id === d.id);
          const hasChat = channel && guestMessages.some(m => m.channel_id === channel.id);

          return {
            ...d,
            company_name: d.name,
            pic_name: '-',
            industry: '-',
            upcomingMeeting: meeting ? meeting.activity_date : null,
            hasNewChat: !!hasChat
          };
        }) as unknown as Lead[]);
      }
    } catch (err: any) {
      console.warn("CRM Leads DB Error:", err.message);
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchActivities(leadId: string) {
    if (!profile?.tenant_id) return;
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          id, activity_type, activity_date, description, location, photo_url,
          profiles(full_name)
        `)
        .eq('entity_id', leadId)
        .eq('tenant_id', profile.tenant_id)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.warn("CRM Activities DB Error:", err.message);
    } finally {
      setLoadingActivities(false);
    }
  }

  async function fetchChatMessages(leadId: string) {
    if (!profile?.tenant_id) return;
    try {
      // Find channel
      const { data: channel, error: channelErr } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('channel_type', 'lead')
        .eq('channel_id', leadId)
        .eq('tenant_id', profile.tenant_id)
        .single();
        
      if (channelErr || !channel) {
        setChatMessages([]);
        setChatChannelId(null);
        return;
      }
      
      setChatChannelId(channel.id);

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id, message, created_at, guest_sender_name, sender_id,
          profiles(full_name)
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err: any) {
      console.warn("Chat Fetch Error:", err.message);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatMessage.trim() || !selectedLead || !chatChannelId || !profile?.tenant_id) return;

    const msg = newChatMessage.trim();
    setNewChatMessage('');

    try {
      // 1. Insert message
      await supabase.from('chat_messages').insert([{
        channel_id: chatChannelId,
        sender_id: user?.id,
        message: msg
      }]);

      // 2. Also log to MOM timeline for institutional memory
      await supabase.from('crm_activities').insert([{
        tenant_id: profile.tenant_id,
        entity_id: selectedLead.id,
        activity_type: 'CHAT',
        activity_date: new Date().toISOString(),
        description: `Sent chat message:\n\n"${msg}"`,
        performed_by: profile?.id
      }]);

      fetchChatMessages(selectedLead.id);
      fetchActivities(selectedLead.id);
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
      setNewChatMessage(msg);
    }
  }

  // Subscribe to realtime chat messages
  useEffect(() => {
    if (chatChannelId) {
      const channel = supabase.channel(`internal-chat-${chatChannelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${chatChannelId}` },
          () => {
            fetchChatMessages(selectedLead?.id!);
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatChannelId, selectedLead]);

  useEffect(() => {
    if (selectedLead) {
      fetchActivities(selectedLead.id);
      fetchChatMessages(selectedLead.id);
      setActiveTab('timeline');
    }
  }, [selectedLead]);

  async function generateGuestLink(leadId: string) {
    if (!selectedLead || !profile?.tenant_id) return;
    try {
      const { data, error } = await supabase
        .from('crm_guest_links')
        .insert([{
          tenant_id: profile.tenant_id,
          entity_id: leadId,
          created_by: profile?.id
        }])
        .select('token')
        .single();
      
      if (error) throw error;
      
      const link = `${window.location.origin}/guest/chat/${data.token}`;
      
      if (selectedLead.phone) {
        let phone = selectedLead.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        }
        
        const message = `Halo ${selectedLead.name},\n\nTerima kasih atas ketertarikannya dengan layanan kami. Untuk kemudahan komunikasi, Anda dapat membalas pesan ini langsung, atau masuk ke portal chat realtime eksklusif kami melalui tautan berikut:\n${link}\n\nSalam,\n${profile?.full_name || 'Tim Sales Sentralogis'}`;
        
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
      } else {
        navigator.clipboard.writeText(link);
        alert(`Guest Chat Link generated and copied to clipboard!\n(No phone number available for WA)\n\n${link}`);
      }
    } catch (err: any) {
      alert("Failed to generate link: " + err.message);
    }
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    fetchActivities(lead.id);
  };

  useEffect(() => {
    if (selectedLead) fetchActivities(selectedLead.id);
  }, [selectedLead]);

  const advanceLeadStatus = async () => {
    if (!selectedLead || !profile?.tenant_id) return;
    const stages: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED'];
    const currentIndex = stages.indexOf(selectedLead.crm_status);
    if (currentIndex >= 2) return; // If Qualified, next step is Convert to Deal

    const nextStatus = stages[currentIndex + 1];
    
    try {
      const { error } = await supabase
        .from('md_entities')
        .update({ crm_status: nextStatus })
        .eq('id', selectedLead.id)
        .eq('tenant_id', profile?.tenant_id);
        
      if (error) throw error;
      
      setSelectedLead({ ...selectedLead, crm_status: nextStatus });
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, crm_status: nextStatus } : l));
    } catch (err: any) {
      alert('Failed to advance lead status: ' + err.message);
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'NEW': return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded text-xs font-semibold">New</span>;
      case 'CONTACTED': return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded text-xs font-semibold">Contacted</span>;
      case 'QUALIFIED': return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-xs font-semibold">Qualified</span>;
      case 'UNQUALIFIED': return <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded text-xs font-semibold">Unqualified</span>;
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'MEETING': return <Users className="w-4 h-4 text-emerald-600" />;
      case 'CALL': return <Phone className="w-4 h-4 text-blue-600" />;
      case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'EMAIL': return <Mail className="w-4 h-4 text-amber-600" />;
      case 'NOTE': return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL: LEADS DIRECTORY */}
      <div className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${selectedLead ? 'w-1/2' : 'w-full'}`}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Users className="w-7 h-7 text-indigo-600" />
                Leads & Prospects
              </h1>
              <p className="text-slate-500 mt-1">Manage your B2B contacts before they become customers.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search company or PIC name..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        {/* LEADS LIST */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="grid gap-3">
            {leads.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => handleLeadClick(lead)}
                className={`p-5 rounded-xl border transition-all cursor-pointer ${selectedLead?.id === lead.id ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 text-lg">{lead.name}</h3>
                  {getStatusBadge(lead.crm_status)}
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{lead.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{lead.email || '-'}</span>
                  </div>
                </div>

                {/* Notifications & Reminders */}
                {(lead.hasNewChat || lead.upcomingMeeting) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                    {lead.hasNewChat && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        <MessageSquare className="w-3 h-3" /> New Chat
                      </div>
                    )}
                    {lead.upcomingMeeting && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> Meeting in {formatDistanceToNow(new Date(lead.upcomingMeeting))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {leads.length === 0 && !loading && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No leads found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: INSTITUTIONAL MEMORY (MOM) */}
      {selectedLead && (
        <div className="w-1/2 flex flex-col bg-white h-full shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 relative">
          
          {/* PROFILE HEADER */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedLead.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowEditModal(true)} className="text-indigo-200 hover:text-white transition-colors text-sm font-medium bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/20">
                  Edit
                </button>
                <button onClick={() => setSelectedLead(null)} className="text-slate-300 hover:text-white transition-colors text-sm font-medium bg-white/5 px-3 py-1.5 rounded-lg">
                  Close
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-indigo-100">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-300" /> {selectedLead.phone || '-'}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-300" /> {selectedLead.email || '-'}
              </div>
            </div>
          </div>

          {/* ACTIVITY TRACKER / MOM & CHAT */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
            <div className="border-b border-slate-200 bg-white px-4 pt-4">
              <div className="flex justify-between items-center mb-[-1px]">
                <div className="flex gap-6">
                  <button 
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('timeline')}
                  >
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> MOM Timeline</div>
                  </button>
                  <button 
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'chat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('chat')}
                  >
                    <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Live Chat</div>
                  </button>
                </div>
                {/* Actions */}
                <div className="flex gap-2 pb-3">
                  {selectedLead.crm_status !== 'QUALIFIED' && selectedLead.crm_status !== 'UNQUALIFIED' && (
                    <button 
                      onClick={advanceLeadStatus}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                    >
                      Move to {selectedLead.crm_status === 'NEW' ? 'CONTACTED' : 'QUALIFIED'}
                    </button>
                  )}
                  <button 
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule
                  </button>
                  <button 
                    onClick={() => generateGuestLink(selectedLead.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Guest Link
                  </button>
                  <button 
                    onClick={() => setShowDealModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Deal
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'timeline' ? (
              <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative pl-8">
                    {/* Timeline Line */}
                    {index !== activities.length - 1 && (
                      <div className="absolute left-3.5 top-8 bottom-[-24px] w-[2px] bg-slate-200"></div>
                    )}
                    
                    {/* Timeline Icon */}
                    <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 shadow-sm">
                      {getActivityIcon(activity.activity_type)}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{activity.activity_type}</span>
                          <span className="text-xs text-slate-500">• {activity.profiles?.full_name || 'System'}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}
                        </span>
                      </div>

                      {activity.location && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mb-3 bg-indigo-50 px-2 py-1 rounded inline-flex">
                          <MapPin className="w-3.5 h-3.5" />
                          {activity.location}
                        </div>
                      )}

                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {activity.description}
                      </p>
                      
                      {activity.photo_url && (
                        <div className="mt-4">
                          <img 
                            src={activity.photo_url} 
                            alt="Meeting Proof" 
                            className="rounded-lg w-full max-w-sm border border-slate-200 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {activities.length === 0 && !loadingActivities && (
                  <div className="text-center py-10 bg-white border border-dashed border-slate-300 rounded-xl">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No activities recorded yet.</p>
                    <p className="text-slate-400 text-xs mt-1">Log calls, meetings, or WA chats to build institutional memory.</p>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="flex-1 flex flex-col bg-slate-100">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const senderName = isMe ? 'You' : (msg.profiles?.full_name || msg.guest_sender_name || 'Guest');
                    
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-slate-500 mb-1 px-1">
                          {senderName} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      No chat messages yet. Generate a Guest Link or send a message below.
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white border-t border-slate-200">
                  <form onSubmit={sendChatMessage} className="flex gap-2 relative">
                    <input 
                      type="text"
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-12"
                    />
                    <button 
                      type="submit"
                      disabled={!newChatMessage.trim() || !chatChannelId}
                      className="absolute right-1 top-1 bottom-1 aspect-square bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {showAddModal && profile?.tenant_id && (
        <AddLeadModal 
          tenantId={profile.tenant_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchLeads();
          }}
        />
      )}

      {showEditModal && selectedLead && profile?.tenant_id && (
        <EditLeadModal
          lead={selectedLead}
          tenantId={profile.tenant_id}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchLeads();
            setSelectedLead(null);
          }}
        />
      )}

      {showDealModal && selectedLead && profile?.tenant_id && (
        <ConvertDealModal
          lead={selectedLead}
          tenantId={profile.tenant_id}
          onClose={() => setShowDealModal(false)}
          onSuccess={() => {
            setShowDealModal(false);
            alert('Deal successfully created! It will now appear in your Sales Pipeline.');
          }}
        />
      )}

      {showScheduleModal && selectedLead && (
        <ScheduleMeetingModal
          lead={selectedLead}
          userProfile={profile}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchActivities(selectedLead.id);
            alert('Meeting scheduled successfully! You can view it in your Calendar.');
          }}
        />
      )}
    </div>
  );
}
