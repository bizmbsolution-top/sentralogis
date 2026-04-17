"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  Users, UserPlus, Shield, ShieldCheck, 
  ShieldAlert, Lock, Search, Filter,
  MoreVertical, Edit2, Trash2, 
  CheckCircle2, XCircle, Mail, Clock,
  ChevronRight, LayoutGrid, HardHat, 
  Truck, Ship, Banknote, RefreshCw
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'superadmin' | 'admin_sbu' | 'finance' | 'viewer';
  sbu_access: string[];
  is_active: boolean;
  created_at: string;
};

const ROLE_CONFIG = {
  superadmin: {
    label: 'Super Admin',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/20',
    icon: ShieldAlert
  },
  admin_sbu: {
    label: 'Admin SBU',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    icon: ShieldCheck
  },
  finance: {
    label: 'Finance',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    icon: Banknote
  },
  viewer: {
    label: 'Viewer',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    icon: Shield
  }
};

// Placeholder for Globe2 since it might be missing in some lucide versions
const Globe2 = (props: any) => <LayoutGrid {...props} />;

const SBU_TYPES = [
  { id: 'trucking', label: 'Trucking', icon: Truck },
  { id: 'clearances', label: 'Clearances', icon: Ship },
  { id: 'warehouse', label: 'Warehouse', icon: LayoutGrid },
  { id: 'forwarding', label: 'Forwarding', icon: Globe2 }
];

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Gagal mengambil data user: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleUpdateRole = async (profileId: string, newRole: string, newSbuAccess: string[]) => {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          sbu_access: newSbuAccess,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success("Izin User Berhasil Diperbarui!");
      setShowEditModal(false);
      fetchProfiles();
    } catch (error: any) {
      toast.error("Gagal perbarui role: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white p-4 lg:p-10 font-sans selection:bg-emerald-500/30">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                <Users className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-4xl font-black italic tracking-tighter uppercase">Team Controls<span className="text-emerald-500">.</span></h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-1">Centralized RBAC Management System v1.0</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search user or role..."
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-emerald-500/50 outline-none w-full md:w-80 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchProfiles}
            className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* USER LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Decrypting User Data...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
            <Search className="w-12 h-12 text-slate-700" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm italic">No users matching search found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                  <th className="px-8 pb-4">Full Identity</th>
                  <th className="px-8 pb-4">System Role</th>
                  <th className="px-8 pb-4">Module Access</th>
                  <th className="px-8 pb-4 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => {
                  const r = ROLE_CONFIG[p.role];
                  return (
                    <tr key={p.id} className="group bg-white/5 hover:bg-white/10 transition-all rounded-3xl border border-white/5">
                      <td className="px-8 py-6 rounded-l-[2rem]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl font-black italic shadow-inner">
                            {p.full_name?.[0] || p.email?.[0]?.toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <p className="font-black text-white italic tracking-tight">{p.full_name || 'Guest User'}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Mail className="w-3 h-3" /> {p.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${r.bg} ${r.border} ${r.color}`}>
                          <r.icon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {(p.sbu_access || []).map(s => (
                            <span key={s} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-slate-400 tracking-widest">
                              {s}
                            </span>
                          ))}
                          {(!p.sbu_access || p.sbu_access.length === 0) && (
                            <span className="text-[9px] font-black text-slate-600 italic tracking-widest">RESTRICTED ACCESS</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 rounded-r-[2rem] text-right">
                        <button 
                          onClick={() => {
                            setSelectedProfile(p);
                            setShowEditModal(true);
                          }}
                          className="p-3 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10 pointer-events-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-2xl bg-[#111827] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-emerald-600/5 to-transparent flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase italic">Secure Role Assignment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Identity: {selectedProfile.email}</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
              >
                <XCircle className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Role Selection */}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Select Authority Level
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <button
                      key={role}
                      onClick={() => setSelectedProfile({...selectedProfile, role: role as any})}
                      className={`flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group ${
                        selectedProfile.role === role 
                          ? config.bg + ' ' + config.border + ' ' + config.color
                          : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      <config.icon className={`w-8 h-8 ${selectedProfile.role === role ? 'scale-110' : 'group-hover:scale-110'} transition-all`} />
                      <div>
                        <p className="font-black uppercase tracking-widest text-xs italic">{config.label}</p>
                        <p className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-tight">System Access Permission</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SBU Access Selection */}
              <div className="space-y-4 pt-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Configure SBU Permissions
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {SBU_TYPES.map(sbu => {
                    const isActive = selectedProfile.sbu_access.includes(sbu.id);
                    return (
                      <button
                        key={sbu.id}
                        onClick={() => {
                          const current = [...selectedProfile.sbu_access];
                          const idx = current.indexOf(sbu.id);
                          if (idx > -1) current.splice(idx, 1);
                          else current.push(sbu.id);
                          setSelectedProfile({...selectedProfile, sbu_access: current});
                        }}
                        className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 active:scale-95 ${
                          isActive 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                        }`}
                      >
                        <sbu.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-all`} />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">{sbu.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-8">
                <button 
                  disabled={updating}
                  onClick={() => handleUpdateRole(selectedProfile.id, selectedProfile.role, selectedProfile.sbu_access)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                >
                  {updating ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Finalizing Permissions...</>
                  ) : (
                    <><ShieldCheck className="w-5 h-5" /> Commit Permissions Change</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 p-8 bg-white/5 rounded-[3rem] border border-white/5">
        <div className="flex items-center gap-4 px-4 border-r border-white/5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Staff</p>
            <p className="text-xl font-black italic">{profiles.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-4 border-r border-white/5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Superadmins</p>
            <p className="text-xl font-black italic">{profiles.filter(p => p.role === 'superadmin').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-4 border-r border-white/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin SBUs</p>
            <p className="text-xl font-black italic">{profiles.filter(p => p.role === 'admin_sbu').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-4">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Config</p>
            <p className="text-xl font-black italic">{profiles.filter(p => p.role === 'viewer').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility Loader
const Loader2 = (props: any) => <RefreshCw {...props} />;
