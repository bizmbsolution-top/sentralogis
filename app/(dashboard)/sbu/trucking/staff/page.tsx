'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Users, Search, Plus, Loader2, ShieldAlert, MapPin, Phone, Power, PowerOff, Pencil, Trash2, KeyRound, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function TruckingGroundStaff() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  // Edit modal
  const [editStaff, setEditStaff] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Delete confirmation
  const [deleteStaff, setDeleteStaff] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password
  const [resetStaff, setResetStaff] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchStaff = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ground_staff_profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      setStaff(data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [profile?.tenant_id]);

  const isAllowed = profile && ['tenant_superadmin', 'sbu_manager_tr', 'sbu_ops_tr', 'sbu_admin_tr'].includes(profile.role);
  if (profile && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <ShieldAlert className="w-16 h-16 text-slate-200" />
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest italic">Access Restricted</h2>
        <p className="text-sm text-slate-500 font-medium">Only Trucking Management can manage ground staff.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      if (!formData.name.trim()) {
        toast.error('Nama harus diisi');
        setSaving(false);
        return;
      }
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        tenant_id: profile.tenant_id,
      };

      const res = await fetch('/api/ground/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun');

      toast.success(`Akun berhasil dibuat!\nUsername: ${data.user.email}\nPassword: ${data.user.password}`, { duration: 10000 });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '' });
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const toggleActive = async (staffId: string, current: boolean) => {
    try {
      await supabase.from('ground_staff_profiles').update({ is_active: !current }).eq('id', staffId);
      toast.success(current ? 'Dinonaktifkan' : 'Diaktifkan');
      fetchStaff();
    } catch { toast.error('Gagal update status'); }
  };

  const handleEdit = async () => {
    if (!editStaff || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ground/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editStaff.id, name: editName.trim(), phone: editPhone.trim() || null, user_id: editStaff.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal update');
      toast.success('Staff berhasil diupdate');
      setEditStaff(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteStaff) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/ground/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteStaff.id, user_id: deleteStaff.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal hapus');
      toast.success('Staff berhasil dihapus');
      setDeleteStaff(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleting(false);
  };

  const handleResetPassword = async () => {
    if (!resetStaff || !resetPassword) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetStaff.user_id, newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal reset password');
      toast.success(`Password berhasil direset!\nPassword baru: ${resetPassword}`, { duration: 10000 });
      setResetStaff(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setResetting(false);
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1 italic">Ground Staff</h1>
            <p className="text-sm font-medium text-slate-500 italic">Kelola staf lapangan untuk operasional trucking</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="h-11 px-5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-md">
          <Plus size={16} /> Tambah Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Staff</p>
              <h3 className="text-xl font-black text-blue-900">{staff.length} Orang</h3>
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Aktif</p>
              <h3 className="text-xl font-black text-emerald-900">{staff.filter(s => s.is_active).length} Orang</h3>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Tidak Aktif</p>
              <h3 className="text-xl font-black text-amber-900">{staff.filter(s => !s.is_active).length} Orang</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari nama atau no. HP..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-medium" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama / Kontak</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" size={32} /></td></tr>
              ) : filtered.length > 0 ? filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                    <p className="text-[10px] font-mono text-slate-500">{s.phone || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(s.id, s.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        s.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {s.is_active ? <Power size={12} /> : <PowerOff size={12} />}
                      {s.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditStaff(s); setEditName(s.name); setEditPhone(s.phone || ''); }}
                        className="h-8 w-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { setResetStaff(s); setResetPassword(''); }}
                        className="h-8 w-8 flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-all">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => setDeleteStaff(s)}
                        className="h-8 w-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="py-16 text-center">
                  <p className="text-slate-400 text-sm font-medium">Belum ada ground staff</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tambah Ground Staff</h2>
                <p className="text-xs text-slate-500">Buat akun untuk staf lapangan</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Nama Lengkap</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Nama staf lapangan"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">No. HP</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="08123456789"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Email (username login)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="Kosongi untuk auto-generate"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <p className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-200">
                Password akan digenerate otomatis dan ditampilkan setelah simpan.
              </p>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all">Batal</button>
                <button type="submit" disabled={saving || !formData.name}
                  className="h-11 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Ground Staff</h2>
                <p className="text-xs text-slate-500">Update data staf lapangan</p>
              </div>
              <button onClick={() => setEditStaff(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Nama Lengkap</label>
                <input required value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="Nama staf lapangan"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">No. HP</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditStaff(null)}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all">Batal</button>
                <button onClick={handleEdit} disabled={saving || !editName.trim()}
                  className="h-11 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hapus Staff</h2>
                <p className="text-xs text-slate-500">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Apakah Anda yakin ingin menghapus <span className="font-bold">{deleteStaff.name}</span>?
              Akun login dan data staf akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteStaff(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all">Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="h-11 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reset Password</h2>
                <p className="text-xs text-slate-500">{resetStaff.name}</p>
              </div>
              <button onClick={() => { setResetStaff(null); setResetPassword(''); }} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Password Baru</label>
                <input required value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  type="text"
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 focus:outline-none" />
              </div>
              <p className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-200">
                Password baru akan ditampilkan setelah reset. Catat dan simpan dengan aman.
              </p>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => { setResetStaff(null); setResetPassword(''); }}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all">Batal</button>
                <button onClick={handleResetPassword} disabled={resetting || !resetPassword}
                  className="h-11 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md">
                  {resetting ? <Loader2 size={14} className="animate-spin" /> : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}