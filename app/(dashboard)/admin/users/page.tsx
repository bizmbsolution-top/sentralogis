"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import {
  Users, UserPlus, Shield, ShieldCheck, 
  ShieldAlert, Lock, Search, Filter,
  MoreVertical, Edit2, Trash2, 
  CheckCircle2, XCircle, Mail, Clock,
  ChevronRight, ChevronLeft, LayoutGrid, HardHat, 
  Truck, Ship, Banknote, RefreshCw, LogOut, User,
  Building2, Save, X
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'superadmin' | 'director' | 'admin_wo' | 'admin_sbu' | 'admin_finance' | 'viewer';
  organization_id: string | null;
  organizations?: { name: string } | null;
  sbu_access: string[];
  is_active: boolean;
  created_at: string;
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; desc: string }> = {
  superadmin: {
    label: 'System Superadmin',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/20',
    icon: ShieldAlert,
    desc: 'Otoritas tertinggi Corporate / Holding.'
  },
  director: {
    label: 'Superadmin (Director)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    icon: ShieldCheck,
    desc: 'Owner Apps / Direksi utama tenant.'
  },
  admin_wo: {
    label: 'Admin Work Order',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/20',
    icon: Mail,
    desc: 'Pengelola administrasi order & customer.'
  },
  admin_sbu: {
    label: 'Admin SBU (Operation)',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    icon: Truck,
    desc: 'Pengelola armada, supir, dan planning.'
  },
  admin_finance: {
    label: 'Admin Finance (AP/AR)',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    icon: Banknote,
    desc: 'Pengelola penagihan dan keuangan.'
  },
  viewer: {
    label: 'Standard Viewer',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    icon: Shield,
    desc: 'Akses baca data terbatas.'
  }
};

const SBU_TYPES = [
  { id: 'trucking', label: 'Trucking', icon: Truck },
  { id: 'warehouse', label: 'Warehouse', icon: LayoutGrid }
];

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    id: "",
    full_name: "",
    email: "",
    password: "", // Only for new users
    role: "viewer",
    organization_id: "",
    assigned_warehouse_id: "",
    sbu_access: []
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*, organizations(name)').eq('id', user.id).single();
        setUserProfile(data);
      }
    } catch (error) { console.error(error); }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get current user profile first to determine filter
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      // 2. Fetch Profiles with conditional filtering
      let profilesQuery = supabase
        .from('profiles')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false });

      if (currentProfile?.role !== 'superadmin') {
        profilesQuery = profilesQuery.eq('organization_id', currentProfile?.organization_id);
      }

      const { data: pData, error: pError } = await profilesQuery;
      if (pError) throw pError;
      setProfiles(pData || []);

      // 3. Fetch Organizations with conditional filtering
      let orgsQuery = supabase.from('organizations').select('id, name').order('name');
      
      if (currentProfile?.role !== 'superadmin') {
        orgsQuery = orgsQuery.eq('id', currentProfile?.organization_id);
      }

      const { data: oData } = await orgsQuery;
      setOrganizations(oData || []);

      // 4. Fetch Warehouses
      const whQuery = supabase.from('md_warehouses').select('id, name, organization_id').eq('is_active', true);
      const { data: wData } = await whQuery;
      setWarehouses(wData || []);

    } catch (error: unknown) {
      toast.error("Gagal sinkronisasi data kredensial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchUserProfile();
  }, [fetchInitialData, fetchUserProfile]);

  const handleSaveUser = async () => {
    if (!formData.email || !formData.full_name) return toast.error("Lengkapi data identitas.");
    setUpdating(true);
    try {
      if (isEdit) {
        // Update Profile
        const { error } = await supabase.from('profiles').update({
          full_name: formData.full_name,
          role: formData.role,
          organization_id: formData.organization_id || null,
          sbu_access: formData.sbu_access,
          updated_at: new Date().toISOString()
        }).eq('id', formData.id);
        if (error) throw error;

        // Sync to wo_organization_users via API
        if (formData.organization_id) {
           await fetch('/api/admin/update-user', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                userId: formData.id,
                full_name: formData.full_name,
                role: formData.role,
                organization_id: formData.organization_id,
                assigned_warehouse_id: formData.assigned_warehouse_id || null
             })
           });
        }
        
        toast.success("Informasi profil diperbarui.");
      } else {
        // Create User (Auth requires Edge Function or Admin Client generally)
        toast.loading("Memproses pendaftaran user baru...");
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Gagal membuat user");
        toast.dismiss();
        toast.success("User baru berhasil didaftarkan.");
      }
      setShowModal(false);
      fetchInitialData();
    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const openEdit = async (p: Profile) => {
    setFormData({
      id: p.id,
      full_name: p.full_name || "",
      email: p.email || "",
      role: p.role,
      organization_id: p.organization_id || "",
      assigned_warehouse_id: "", // Will need API to fetch if required
      sbu_access: p.sbu_access || []
    });
    setIsEdit(true);
    setShowModal(true);

    if (p.organization_id) {
       const { data } = await supabase.from('wo_organization_users').select('assigned_warehouse_id').eq('user_id', p.id).maybeSingle();
       if (data?.assigned_warehouse_id) {
          setFormData(prev => ({...prev, assigned_warehouse_id: data.assigned_warehouse_id}));
       }
    }
  };

  const openAdd = () => {
    setFormData({
      id: "",
      full_name: "",
      email: "",
      password: "",
      role: "viewer",
      organization_id: userProfile?.role === 'superadmin' ? "" : userProfile?.organization_id,
      assigned_warehouse_id: "",
      sbu_access: []
    });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === userProfile?.id) return toast.error("Anda tidak bisa menghapus diri sendiri.");
    if (!confirm(`Hapus personel ${name}? Akses user ini akan dicabut permanen.`)) return;
    
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Gagal menghapus user");
      
      toast.success("Personel berhasil dihapus.");
      fetchInitialData();
    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900 italic tracking-tight uppercase leading-none">User Management</h1>
                <p className="text-xs text-slate-400 mt-1">Identity & Access Management</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
            {(userProfile?.role === 'superadmin' || userProfile?.role === 'director') && (
              <button 
                onClick={openAdd}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
           <div className="flex items-center gap-3 w-full md:w-auto">
              <Link href="/admin" className="h-10 px-4 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-50 transition-all">
                 <ChevronLeft className="w-4 h-4" /> Back
              </Link>
           </div>
           <div className="relative group w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search user, email, or org..."
                className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </div>

      {/* User Table */}
      <div className="max-w-7xl mx-auto">
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4">
                 <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
                 <p className="text-xs text-slate-400">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200">
                        <th className="px-4 py-3">Profile</th>
                        <th className="px-4 py-3">Organization</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredProfiles.map((p) => {
                        const r = ROLE_CONFIG[p.role] || ROLE_CONFIG.viewer;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-5">
                               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg font-black italic shadow-inner">
                                  {p.full_name?.[0] || p.email?.[0]?.toUpperCase()}
                               </div>
                               <div>
                                  <p className="text-sm font-black italic uppercase tracking-tight text-white">{p.full_name || 'Tanpa Nama'}</p>
                                  <p className="text-[10px] font-bold text-slate-500 tracking-wider lowercase mt-1">{p.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-3">
                               <Building2 className="w-4 h-4 text-slate-600" />
                               <span className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-wider">
                                  {p.organizations?.name || 'SENTRALOGIS Holding'}
                               </span>
                            </div>
                         </td>
                          <td className="px-10 py-8">
                             <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${r.bg} ${r.border} ${r.color}`}>
                                <r.icon className="w-4 h-4" />
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                                   {p.role === 'director' && (
                                     <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-0.5 animate-pulse">Owner Apps</span>
                                   )}
                                </div>
                             </div>
                          </td>
                         <td className="px-10 py-8 text-right">
                            {(userProfile?.role === 'superadmin' || userProfile?.role === 'director') && (
                               <div className="flex items-center justify-end gap-3">
                                  <button 
                                    onClick={() => openEdit(p)}
                                    className="w-10 h-10 bg-white/5 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-90"
                                    title="Edit Profile"
                                  >
                                     <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(p.id, p.full_name || p.email || 'User')}
                                    className="w-10 h-10 bg-white/5 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-90"
                                    title="Hapus Personel"
                                  >
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            )}
                         </td>
                      </tr>
                    );
                 })}
               </tbody>
            </table>
            </div>
          )}
       </div>

      {/* ≡ƒÜÇ FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-[#05080F]/80 backdrop-blur-xl" onClick={() => setShowModal(false)} />
           <div className="relative w-full max-w-3xl bg-[#0F172A] rounded-[3.5rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="p-10 border-b border-white/5 bg-gradient-to-r from-emerald-600/[0.03] to-transparent flex justify-between items-center">
                 <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter italic">Kredensial Personel</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">ID: {isEdit ? formData.id : 'Pendaftaran Baru'}</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto">
                 {/* ID & Org */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Nama Lengkap</label>
                       <input 
                         type="text" 
                         className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                         value={formData.full_name}
                         onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Email Akun</label>
                       <input 
                         type="email" 
                         disabled={isEdit}
                         className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none disabled:opacity-30"
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                       />
                    </div>
                 </div>

                 {!isEdit && (
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Kata Sandi Awal</label>
                      <input 
                        type="password" 
                        className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50 tracking-widest"
                        placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                   </div>
                 )}

                 {/* Role & Org Selector */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Afiliasi Organisasi</label>
                       <select 
                         disabled={userProfile?.role !== 'superadmin'}
                         className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none"
                         value={formData.organization_id}
                         onChange={(e) => setFormData({...formData, organization_id: e.target.value})}
                       >
                          <option value="">Holding / Internal</option>
                          {organizations.map(o => (
                            <option key={o.id} value={o.id} className="text-slate-900">{o.name}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Level Akses</label>
                       <select 
                         className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none"
                         value={formData.role}
                         onChange={(e) => setFormData({...formData, role: e.target.value})}
                       >
                          {Object.entries(ROLE_CONFIG)
                            .filter(([key]) => userProfile?.role === 'superadmin' || key !== 'superadmin')
                            .map(([key, cfg]: any) => (
                             <option key={key} value={key} className="text-slate-900">{cfg.label}</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 {/* SBU ACCESS */}
                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Izin Akses Modul SBU</label>
                    <div className="grid grid-cols-2 gap-4">
                       {SBU_TYPES.map(sbu => {
                          const active = formData.sbu_access.includes(sbu.id);
                          return (
                            <button 
                              key={sbu.id}
                              onClick={() => {
                                 let updated = [...formData.sbu_access];
                                 if (active) updated = updated.filter(x => x !== sbu.id);
                                 else updated.push(sbu.id);
                                 setFormData({...formData, sbu_access: updated});
                              }}
                              className={`h-20 rounded-3xl border flex items-center justify-center gap-4 transition-all ${active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/5 text-slate-500'}`}
                            >
                               <sbu.icon className="w-5 h-5" />
                               <span className="text-[11px] font-black uppercase tracking-widest">{sbu.label}</span>
                            </button>
                          )
                       })}
                    </div>
                 </div>

                 {/* WAREHOUSE SELECTOR */}
                 {formData.sbu_access.includes('warehouse') && (
                   <div className="space-y-3 mt-4">
                     <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 italic">Lokasi Gudang Penugasan</label>
                     <select 
                       className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none"
                       value={formData.assigned_warehouse_id}
                       onChange={(e) => setFormData({...formData, assigned_warehouse_id: e.target.value})}
                     >
                       <option value="">Semua Lokasi Gudang (Manager/Admin)</option>
                       {warehouses
                         .filter(w => !formData.organization_id || w.organization_id === formData.organization_id)
                         .map(w => (
                           <option key={w.id} value={w.id} className="text-slate-900">{w.name}</option>
                         ))
                       }
                     </select>
                     <p className="text-[10px] font-medium text-slate-500 px-1">Biarkan kosong jika staf ini menangani semua gudang dalam organisasi.</p>
                   </div>
                 )}

                 {/* SUBMIT */}
                 <button 
                   onClick={handleSaveUser}
                   disabled={updating}
                   className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-4 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95"
                 >
                    {updating ? <RefreshCw className="animate-spin" /> : <Save className="w-6 h-6" />}
                    {isEdit ? "Perbarui Kredensial" : "Daftarkan Personel Baru"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ≡ƒôè FOOTER STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-20 p-10 bg-white/5 rounded-[3.5rem] border border-white/5">
         {[
          { label: 'Total Personel', val: profiles.length, icon: Users, color: 'text-blue-500' },
          { label: 'Holding Super', val: profiles.filter(p => p.role === 'superadmin').length, icon: ShieldAlert, color: 'text-rose-500' },
          { label: 'Owners / Directors', val: profiles.filter(p => p.role === 'director').length, icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Finance Team', val: profiles.filter(p => p.role === 'admin_finance').length, icon: Banknote, color: 'text-indigo-500' }
         ].map((stat, i) => (
           <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                 <stat.icon className={`w-4 h-4 ${stat.color}`} />
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
              <p className="text-4xl font-black italic tracking-tighter">{stat.val}</p>
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}
