'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Building2, 
  Mail, 
  Phone, 
  AlertCircle,
  Copy,
  RefreshCw,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SbuWarehouseClientsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customerUsers, setCustomerUsers] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Password visibility tracking per row ID
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  // Modal State (Create vs Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    id: '',
    customer_id: '',
    email: '',
    full_name: '',
    whatsapp: '',
    portal_password: 'Password123!',
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id;

      // 1. Fetch md_customer_users including portal_password
      let query = supabase
        .from('md_customer_users')
        .select(`
          id,
          tenant_id,
          customer_id,
          email,
          full_name,
          whatsapp,
          portal_password,
          is_active,
          user_id,
          created_at,
          md_entities (name, entity_code)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: usersData, error: uErr } = await query;
      if (uErr) throw uErr;

      // 2. Fetch customer entities from md_entities
      let entQuery = supabase
        .from('md_entities')
        .select('id, name, entity_code, is_customer')
        .eq('is_active', true)
        .order('name');

      if (tenantId) {
        entQuery = entQuery.eq('tenant_id', tenantId);
      }

      const { data: entData } = await entQuery;

      setCustomerUsers(usersData || []);
      setEntities(entData || []);
    } catch (err: any) {
      console.error('Error fetching customer portal users:', err);
      toast.error('Gagal memuat daftar akses portal pelanggan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile?.tenant_id]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setForm({
      id: '',
      customer_id: '',
      email: '',
      full_name: '',
      whatsapp: '',
      portal_password: 'Password123!',
      is_active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setForm({
      id: user.id,
      customer_id: user.customer_id || '',
      email: user.email || '',
      full_name: user.full_name || '',
      whatsapp: user.whatsapp || '',
      portal_password: user.portal_password || 'Password123!',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id || !form.email || !form.full_name || !form.portal_password) {
      toast.error('Silakan lengkapi Perusahaan, Nama, Email, dan Password PIC');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        action: isEditing ? 'update' : 'create',
        id: form.id,
        tenant_id: profile?.tenant_id || null,
        customer_id: form.customer_id,
        email: form.email,
        full_name: form.full_name,
        whatsapp: form.whatsapp,
        portal_password: form.portal_password,
        is_active: form.is_active
      };

      const res = await fetch('/api/portal/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menyimpan data PIC');
      }

      toast.success(isEditing ? 'Data PIC & Password berhasil diperbarui!' : 'Akun Portal PIC berhasil dibuat & langsung siap login!');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/portal/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: id,
          is_active: !currentActive
        })
      });

      if (!res.ok) throw new Error();
      toast.success(`Akses portal berhasil ${!currentActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      setCustomerUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: !currentActive } : u))
      );
    } catch (e: any) {
      toast.error('Gagal memperbarui status akses');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus hak akses portal pelanggan untuk "${name}" beserta akun loginnya?`)) return;
    try {
      const res = await fetch('/api/portal/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: id })
      });
      if (!res.ok) throw new Error();
      toast.success('Akses portal pelanggan berhasil dihapus');
      setCustomerUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      toast.error('Gagal menghapus akses portal');
    }
  };

  const copyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd || 'Password123!');
    toast.success('Password login berhasil disalin ke clipboard!');
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUsers = customerUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.md_entities?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" /> B2B Client Management
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Akses Portal Pelanggan (B2B Portal Users)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Kelola PIC, atur password login, serta pantau akses klien ke Portal B2B (`/customer/warehouse`) secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan PIC Baru</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-white">Tips Admin:</span> Klik tombol <span className="font-bold text-cyan-600 dark:text-cyan-400">✏️ Edit</span> pada tiap kartu/tabel untuk mengubah data PIC ataupun mereset/mengganti password login portal mereka. Klien dapat masuk dari <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono">/login</code>.
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari email PIC, nama, atau perusahaan pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 uppercase">
          Total Terdaftar: <span className="text-cyan-600 dark:text-cyan-400 font-black">{filteredUsers.length}</span> PIC
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Memuat daftar akun portal pelanggan...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Belum ada pengguna portal B2B yang didaftarkan. Klik tombol "Daftarkan PIC Baru" di atas untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-5">Perusahaan Pelanggan</th>
                  <th className="py-4 px-5">PIC & Email Login</th>
                  <th className="py-4 px-5">No. WhatsApp</th>
                  <th className="py-4 px-5">Password Login</th>
                  <th className="py-4 px-5">Status Akun Auth</th>
                  <th className="py-4 px-5">Akses Portal</th>
                  <th className="py-4 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredUsers.map((u) => {
                  const ent = u.md_entities || {};
                  const isVisible = visiblePasswords[u.id];
                  const pwd = u.portal_password || 'Password123!';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-xs shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                              {ent.name || 'Unknown Client'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold">
                              {ent.entity_code || u.customer_id?.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                          <Mail className="w-3 h-3 text-cyan-500 shrink-0" /> {u.email}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 font-bold font-mono">
                        {u.whatsapp ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-emerald-500" /> {u.whatsapp}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl w-fit border border-slate-200 dark:border-slate-700/60">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-black text-slate-900 dark:text-white tracking-wider text-[11px]">
                            {isVisible ? pwd : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors ml-1"
                            title={isVisible ? "Sembunyikan Password" : "Lihat Password"}
                          >
                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => copyPassword(pwd)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Salin Password"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {u.user_id ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Linked & Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                            Pending First Login
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {u.is_active ? 'Aktif' : 'Dinonaktifkan'}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 transition-colors"
                            title="Edit Data / Ubah Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.full_name)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                            title="Hapus Akses"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal (Create/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  {isEditing ? 'Ubah Informasi PIC & Password' : 'Registrasi Akses Portal'}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isEditing ? `Edit Akun: ${form.full_name}` : 'Daftarkan PIC Pelanggan Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Perusahaan Pelanggan (Entity) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Pilih Entitas Pelanggan --</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} {e.entity_code ? `(${e.entity_code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Hanya data stok & transaksi atas nama entitas ini yang akan dapat diakses.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap PIC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bony (Logistics PIC)"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Login Portal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="pic.logistics@clientcompany.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={isEditing} // Email disarankan tidak diubah agar tidak memutus sesi ID
                  className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500 ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isEditing ? 'Email login tidak dapat diubah setelah terdaftar.' : 'Client dapat login menggunakan email ini di /login.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  No. WhatsApp / HP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password Login Portal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.portal_password}
                    onChange={(e) => setForm({ ...form, portal_password: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, portal_password: 'Password123!' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Set Default (Password123!)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Password ini langsung disinkronkan ke server Supabase Auth dan dapat digunakan klien untuk masuk.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isEditing ? 'Simpan Perubahan' : 'Daftarkan & Buat Password'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
