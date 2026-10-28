"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import {
  Users, UserPlus, Shield, ShieldCheck,
  Search, Filter, Edit2, Trash2,
  CheckCircle2, Mail, RefreshCw, KeyRound,
  Building2, Briefcase, Plus, Loader2, HardHat
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import AddStaffModal from "@/components/Tenant/AddStaffModal";
import EditStaffModal from "@/components/Tenant/EditStaffModal";
import ResetPasswordModal from "@/components/Tenant/ResetPasswordModal";
import SBUManager from "@/components/Tenant/SBUManager";
import { deleteStaffAdmin } from "@/app/(dashboard)/tenant/staff/actions";

export default function AdminUsersPage() {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [sbus, setSbus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'hq' | 'sbu' | 'manage_sbu'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat daftar pengguna.');
      }

      const { data } = json;
      setStaff(data.staff || []);
      setSbus(data.sbus || []);
      setWarehouses(data.warehouses || []);
      setRegions(data.regions || []);
    } catch (err: any) {
      console.error('[AdminUsersPage] Error fetching users:', err);
      toast.error(err.message || "Gagal sinkronisasi data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteStaff = async (staffMember: any) => {
    const displayName = staffMember.profiles?.full_name || staffMember.full_name || 'pengguna';
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${displayName}" secara permanen?`)) {
      return;
    }

    try {
      const result = await deleteStaffAdmin(staffMember.user_id);
      if (!result.success) throw new Error(result.message);

      toast.success('Pengguna berhasil dihapus.');
      fetchUsers();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (s.full_name || s.profiles?.full_name || '').toLowerCase().includes(q);
    const emailMatch = (s.email || s.profiles?.email || '').toLowerCase().includes(q);
    const roleMatch = (s.role_code || s.tenant_roles?.role_name || '').toLowerCase().includes(q);
    const sbuMatch = (s.tenant_sbus?.name || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || roleMatch || sbuMatch;

    if (activeTab === 'hq') return matchesSearch && !s.sbu_id;
    if (activeTab === 'sbu') return matchesSearch && Boolean(s.sbu_id);
    return matchesSearch;
  });

  const hqStaffCount = staff.filter((s) => !s.sbu_id).length;
  const sbuStaffCount = staff.filter((s) => Boolean(s.sbu_id)).length;

  return (
    <div className="space-y-6 animate-slide-up pb-20">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            User & Organization Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola akun pengguna, tim kantor pusat (HQ), staf SBU operasional, dan hak akses tenant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="!bg-blue-600 hover:!bg-blue-700 text-white gap-2 text-xs font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{staff.length} User</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tim HQ / Pusat</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{hqStaffCount} User</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staf SBU Operasi</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{sbuStaffCount} User</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit SBU Aktif</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{sbus.length} SBU</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: `Semua (${staff.length})` },
            { id: 'hq', label: `Tim HQ (${hqStaffCount})` },
            { id: 'sbu', label: `Tim SBU (${sbuStaffCount})` },
            { id: 'manage_sbu', label: 'Unit SBU' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'manage_sbu' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau peran..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'manage_sbu' ? (
        <SBUManager sbus={sbus} onUpdate={fetchUsers} />
      ) : (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
              <TableRow>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5">Pengguna / Email</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5">Peran (Role)</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5">Penempatan SBU</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5">Gudang / Lokasi</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5">Status</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider py-3.5 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat daftar pengguna tenant...
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                    {searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada pengguna terdaftar di tenant ini.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((s) => {
                  const roleName = s.tenant_roles?.role_name || s.role_code || 'Staff';
                  const isHq = !s.sbu_id;

                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isHq
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          }`}>
                            {(s.full_name || s.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {s.full_name || s.profiles?.full_name || 'Tanpa Nama'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{s.email || s.profiles?.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.role_code?.includes('superadmin') || s.role_code?.includes('director')
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            : s.role_code?.includes('manager')
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : s.role_code?.includes('cs')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {roleName}
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        {s.tenant_sbus ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <Briefcase className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{s.tenant_sbus.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Kantor Pusat (HQ)</span>
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {s.warehouse?.name || '-'}
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        {s.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Nonaktif
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStaff(s);
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Pengguna"
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStaff(s);
                              setIsResetModalOpen(true);
                            }}
                            title="Reset Password"
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(s)}
                            title="Hapus Pengguna"
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchUsers();
        }}
        sbus={sbus}
        warehouses={warehouses}
        regions={regions}
      />

      {selectedStaff && (
        <>
          <EditStaffModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedStaff(null);
            }}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedStaff(null);
              fetchUsers();
            }}
            staff={selectedStaff}
            sbus={sbus}
            warehouses={warehouses}
            regions={regions}
          />

          <ResetPasswordModal
            isOpen={isResetModalOpen}
            onClose={() => {
              setIsResetModalOpen(false);
              setSelectedStaff(null);
            }}
            staff={selectedStaff}
          />
        </>
      )}
    </div>
  );
}
