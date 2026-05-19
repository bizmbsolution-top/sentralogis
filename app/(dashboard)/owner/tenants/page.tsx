'use client';

import { useState, useEffect } from 'react'
import { 
  Plus, Coins, Search, RefreshCw, Mail, Phone,
  User as UserIcon, Key, History, FileText,
  Power, PowerOff, ShieldCheck, ShieldOff, AlertTriangle, X, Loader2
} from 'lucide-react'

import GrantTokenModal from '@/components/Owner/GrantTokenModal'
import RegisterTenantModal from '@/components/Owner/RegisterTenantModal'
import ResetPasswordModal from '@/components/Owner/ResetPasswordModal'
import TenantHistoryModal from '@/components/Owner/TenantHistoryModal'
import { fetchTenantsAdmin, toggleTenantStatus } from '../actions'
import toast from 'react-hot-toast'

interface Tenant {
  id: string
  tenant_code: string
  name: string
  subscription_tier: string
  token_balance: number
  user_id: string
  status: string
  admin_email: string
  admin_name: string
  whatsapp: string
  created_at: string
}

// [AI] Confirmation modal for activate/deactivate tenant
function ToggleStatusModal({ tenant, onClose, onConfirm, isSubmitting }: {
  tenant: Tenant;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  const isCurrentlyActive = tenant.status === 'active';
  const actionLabel = isCurrentlyActive ? 'Nonaktifkan' : 'Aktifkan';
  const newStatus = isCurrentlyActive ? 'inactive' : 'active';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className={`px-6 py-5 flex items-center gap-4 ${isCurrentlyActive ? 'bg-rose-50 border-b border-rose-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCurrentlyActive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isCurrentlyActive ? <PowerOff size={24} /> : <Power size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{actionLabel} Tenant</h3>
            <p className="text-xs text-slate-500 font-medium">{tenant.name} ({tenant.tenant_code})</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isCurrentlyActive ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Perhatian!</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tenant yang dinonaktifkan tidak akan bisa mengakses platform. Semua user di bawah tenant ini akan terpengaruh. Anda bisa mengaktifkan kembali kapan saja.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Aktivasi Tenant</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tenant akan kembali aktif dan semua user bisa mengakses platform. Token balance tetap terjaga.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Tenant</span><span className="font-bold text-slate-900">{tenant.name}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Code</span><span className="font-mono font-bold text-slate-700">{tenant.tenant_code}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Status Saat Ini</span>
              <span className={`font-bold uppercase ${tenant.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>{tenant.status}</span>
            </div>
            <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Status Baru</span>
              <span className={`font-bold uppercase ${newStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>{newStatus}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-[2] py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${
              isCurrentlyActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isCurrentlyActive ? <PowerOff size={16} /> : <Power size={16} />)}
            {isSubmitting ? 'Processing...' : `Ya, ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedTenantHistory, setSelectedTenantHistory] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const res = await fetchTenantsAdmin()
      if (!res.success) throw new Error(res.message)
      setTenants(res.data || [])
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error('Failed to fetch tenants: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTenants() }, [])

  const handleToggleStatus = async () => {
    if (!selectedTenant) return;
    setIsTogglingStatus(true);
    try {
      const newStatus = selectedTenant.status === 'active' ? 'inactive' : 'active';
      const res = await toggleTenantStatus(selectedTenant.id, newStatus as 'active' | 'inactive');
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      setIsToggleModalOpen(false);
      fetchTenants();
    } catch (error: any) {
      toast.error('Gagal mengubah status: ' + error.message);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status !== 'active').length,
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      (t.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.tenant_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.whatsapp?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'active') return t.status === 'active';
    if (statusFilter === 'inactive') return t.status !== 'active';
    return true;
  });

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
      status === 'active'
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        : 'bg-rose-50 text-rose-600 border border-rose-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage network tenants, status, and token allocation</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTenants} className="p-2.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsRegisterModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm">
            <Plus size={18} /> Register Tenant
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
        {([
          { id: 'all' as const, label: 'Semua', count: stats.total, color: 'text-slate-500' },
          { id: 'active' as const, label: 'Active', count: stats.active, color: 'text-emerald-500' },
          { id: 'inactive' as const, label: 'Inactive', count: stats.inactive, color: 'text-rose-500' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
              statusFilter === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
              statusFilter === tab.id ? 'bg-white/20 text-white' : `bg-slate-100 ${tab.color}`
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search tenants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm shadow-sm" />
        </div>
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Grid</button>
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Table</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="animate-spin mx-auto mb-4 text-slate-400" size={32} />
          <p className="text-slate-500 font-medium">Loading tenant data...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-sm">
          <ShieldOff size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No tenants found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <div key={tenant.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group relative ${tenant.status !== 'active' ? 'border-rose-200 opacity-75' : 'border-slate-200'}`}>
              {tenant.status !== 'active' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-400" />
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold border ${tenant.status === 'active' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-rose-50 text-rose-400 border-rose-200'}`}>
                      {tenant.name ? tenant.name.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{tenant.name || 'Unnamed Tenant'}</h3>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-tight">{tenant.tenant_code}</span>
                    </div>
                  </div>
                  <StatusBadge status={tenant.status} />
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Token Balance</p>
                      <div className="flex items-center gap-2">
                        <Coins size={18} className="text-amber-500" />
                        <span className="text-xl font-black text-slate-900">{tenant.token_balance.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedTenant(tenant); setIsResetModalOpen(true); }} className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all shadow-sm" title="Reset Password"><Key size={18} /></button>
                      <a href={`/owner/statement/${tenant.tenant_code}`}><button className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm" title="Token Statement"><FileText size={18} /></button></a>
                      <button onClick={() => { setSelectedTenantHistory(tenant); setIsHistoryOpen(true); }} className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm" title="View History"><History size={18} /></button>
                      <button onClick={() => { setSelectedTenant(tenant); setIsGrantModalOpen(true); }} className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Grant Tokens"><Plus size={20} /></button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={14} className="text-slate-400" /><span className="truncate">{tenant.admin_email}</span></div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-emerald-500" /><span className="font-bold text-emerald-600">{tenant.whatsapp}</span></div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><UserIcon size={14} className="text-slate-400" /><span>{tenant.admin_name}</span></div>
                  </div>

                  {/* Toggle Status Button */}
                  <button
                    onClick={() => { setSelectedTenant(tenant); setIsToggleModalOpen(true); }}
                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                      tenant.status === 'active'
                        ? 'bg-white border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300'
                        : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {tenant.status === 'active' ? <><PowerOff size={14} /> Nonaktifkan</> : <><Power size={14} /> Aktifkan</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Tenant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className={`hover:bg-slate-50/50 transition-colors ${tenant.status !== 'active' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4"><StatusBadge status={tenant.status} /></td>
                    <td className="px-6 py-4 font-mono text-xs font-medium">{tenant.tenant_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{tenant.name || 'Unnamed'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{tenant.token_balance.toLocaleString()}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-emerald-600 font-bold"><Phone size={14} />{tenant.whatsapp}</div></td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{tenant.admin_email}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedTenant(tenant); setIsToggleModalOpen(true); }}
                          className={`p-2 rounded-lg transition-colors ${tenant.status === 'active' ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={tenant.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
                          {tenant.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button onClick={() => { setSelectedTenant(tenant); setIsResetModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Reset Password"><Key size={16} /></button>
                        <button onClick={() => { setSelectedTenantHistory(tenant); setIsHistoryOpen(true); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="View History"><History size={16} /></button>
                        <button onClick={() => { setSelectedTenant(tenant); setIsGrantModalOpen(true); }} className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 hover:bg-blue-50 rounded-lg">Grant Token</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <GrantTokenModal isOpen={isGrantModalOpen} tenant={selectedTenant} onClose={() => setIsGrantModalOpen(false)} onSuccess={fetchTenants} />
      <RegisterTenantModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onSuccess={fetchTenants} />
      <ResetPasswordModal isOpen={isResetModalOpen} tenant={selectedTenant} onClose={() => setIsResetModalOpen(false)} />
      <TenantHistoryModal isOpen={isHistoryOpen} tenant={selectedTenantHistory} onClose={() => { setIsHistoryOpen(false); setSelectedTenantHistory(null); }} />
      
      {isToggleModalOpen && selectedTenant && (
        <ToggleStatusModal
          tenant={selectedTenant}
          onClose={() => setIsToggleModalOpen(false)}
          onConfirm={handleToggleStatus}
          isSubmitting={isTogglingStatus}
        />
      )}
    </div>
  )
}
