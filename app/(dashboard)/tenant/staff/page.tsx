'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Users, Building2, Briefcase, Search, 
  Plus, Filter, MoreVertical, Shield,
  CheckCircle2, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import AddStaffModal from '@/components/Tenant/AddStaffModal';
import EditStaffModal from '@/components/Tenant/EditStaffModal';
import ResetPasswordModal from '@/components/Tenant/ResetPasswordModal';
import SBUManager from '@/components/Tenant/SBUManager';
import toast, { Toaster } from 'react-hot-toast';
import { fetchTenantById } from '@/lib/actions/tenantActions';

export default function TenantOrganizationPage() {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [sbus, setSbus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'hq' | 'sbu' | 'manage_sbu'>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Permission Check
  const isSuperadmin = profile?.role === 'tenant_superadmin' || profile?.role === 'tenant_admin';

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tid = profile?.tenant_id;
      if (!tid) { setLoading(false); return; }
      const tenant = await fetchTenantById(tid);
      
      if (!tenant) {
        console.warn('[OrganizationPage] No tenant found');
        setLoading(false);
        return;
      }

      // 2. Fetch Raw Data (Decoupled to prevent join failures)
      const [staffRes, sbuRes, roleRes, profileRes, whRes] = await Promise.all([
        supabase.from('tenant_users').select('*').eq('tenant_id', tenant.id),
        supabase.from('tenant_sbus').select('*').eq('tenant_id', tenant.id),
        supabase.from('tenant_roles').select('*'),
        supabase.from('profiles').select('id, email, full_name, role'),
        supabase.from('md_warehouses').select('*').eq('tenant_id', tenant.id)
      ]);

      if (staffRes.error) throw staffRes.error;

      // 3. Map Data Manually
      const sbuMap = (sbuRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});
      const roleMap = (roleRes.data || []).reduce((acc: any, r: any) => ({ ...acc, [r.role_code]: r }), {});
      const profileMap = (profileRes.data || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
      const whMap = (whRes.data || []).reduce((acc: any, w: any) => ({ ...acc, [w.id]: w }), {});

      const enrichedStaff = (staffRes.data || []).map((s: any) => ({
        ...s,
        tenant_roles: roleMap[s.role_code] || { role_name: s.role_code },
        tenant_sbus: sbuMap[s.sbu_id] || null,
        profiles: profileMap[s.user_id] || { email: 'N/A', full_name: s.full_name },
        warehouse: s.warehouse_id ? whMap[s.warehouse_id] : null
      }));

      setStaff(enrichedStaff);
      setSbus(sbuRes.data || []);
      setWarehouses(whRes.data || []);
      
      console.log('[OrganizationPage] Loaded:', enrichedStaff.length, 'staff members');
    } catch (err: any) {
      console.error('[OrganizationPage] Error:', err);
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, profile?.tenant_id]);

  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Shield className="w-16 h-16 text-slate-200" />
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest italic">Access Restricted</h2>
        <p className="text-sm text-slate-500 font-medium">Only Tenant Superadmins can manage the organization structure.</p>
      </div>
    );
  }

  const filteredStaff = staff.filter(s => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'hq') return matchesSearch && !s.sbu_id;
    if (activeTab === 'sbu') return matchesSearch && s.sbu_id;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      <Toaster position="top-right" />
      
      {/* DEBUG INFO */}
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[10px] font-mono text-amber-700 flex gap-4">
         <span>UID: {user?.id}</span>
         <span>Role: {profile?.role}</span>
         <span>Staff: {staff.length}</span>
         <span>SBUs: {sbus.length}</span>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1 italic">Organization Management</h1>
          <p className="text-sm font-medium text-slate-500 italic">Manage your HQ team, SBU clusters, and staff permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="!bg-slate-900 hover:!bg-slate-800 gap-2"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={18} />}
          >
            Add New Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-slate-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm"><Users size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</p>
                  <h3 className="text-xl font-black">{staff.length} Staff</h3>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-blue-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><Building2 size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Units</p>
                  <h3 className="text-xl font-black text-blue-900">{sbus.length} SBUs</h3>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-emerald-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><CheckCircle2 size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">HQ Directs</p>
                  <h3 className="text-xl font-black text-emerald-900">{staff.filter(s => !s.sbu_id).length} Members</h3>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-px">
        {[
          { id: 'all', label: 'All Staff', icon: <Users size={16}/> },
          { id: 'hq', label: 'HQ Team', icon: <Building2 size={16}/> },
          { id: 'sbu', label: 'SBU Teams', icon: <Briefcase size={16}/> },
          { id: 'manage_sbu', label: 'Manage Units (SBU)', icon: <Filter size={16}/> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 animate-in fade-in slide-in-from-bottom-1" />}
          </button>
        ))}
      </div>

      {activeTab === 'manage_sbu' ? (
        <SBUManager sbus={sbus} onUpdate={fetchData} />
      ) : (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 text-sm transition-all shadow-sm italic"
            />
          </div>

          <Card className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/50">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-5">Full Name</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-5">Position</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-5">SBU Allocation</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-5">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest py-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" size={32}/></TableCell></TableRow>
                ) : filteredStaff.length > 0 ? filteredStaff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900 tracking-tight">{s.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-bold italic">{s.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="default" className="!bg-white !text-slate-900 !border-slate-200 uppercase !text-[9px] font-black italic tracking-widest shadow-sm">
                        {s.tenant_roles?.role_name || s.role_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.tenant_sbus ? (
                        <div className="flex flex-col gap-0.5">
                           <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter">{s.tenant_sbus.sbu_name}</span>
                           <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{s.tenant_sbus.sbu_code}</span>
                           {s.warehouse && (
                             <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100 max-w-max">
                               📍 WH: {s.warehouse.code}
                             </span>
                           )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 uppercase italic tracking-widest">Central HQ</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${s.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.is_active ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                           <Button 
                             variant="secondary" 
                             className="!p-2 !h-8 !w-8 border-slate-200 text-slate-400 hover:text-slate-900"
                             onClick={() => { setSelectedStaff(s); setIsEditModalOpen(true); }}
                           >
                             <MoreVertical size={14}/>
                           </Button>
                           <Button 
                             variant="secondary" 
                             className="!p-2 !h-8 !w-8 border-slate-200 text-slate-400 hover:text-rose-600"
                             onClick={() => { setSelectedStaff(s); setIsResetModalOpen(true); }}
                           >
                            <Shield size={14}/>
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">No staff detected</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <AddStaffModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchData}
        sbus={sbus}
        warehouses={warehouses}
      />

      {selectedStaff && (
        <>
          <EditStaffModal 
            isOpen={isEditModalOpen}
            staff={selectedStaff}
            onClose={() => { setIsEditModalOpen(false); setSelectedStaff(null); }}
            onSuccess={fetchData}
            sbus={sbus}
            warehouses={warehouses}
          />
          <ResetPasswordModal
            isOpen={isResetModalOpen}
            staff={selectedStaff}
            onClose={() => { setIsResetModalOpen(false); setSelectedStaff(null); }}
          />
        </>
      )}
    </div>
  );
}
