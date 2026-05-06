'use client';

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Coins, 
  Users, 
  Search, 
  RefreshCw, 
  X,
  ShieldCheck,
  Zap,
  Building2,
  Mail,
  Phone,
  User as UserIcon,
  ChevronRight,
  Key,
  History,
  FileText
} from 'lucide-react'

import GrantTokenModal from '@/components/Owner/GrantTokenModal'
import RegisterTenantModal from '@/components/Owner/RegisterTenantModal'
import ResetPasswordModal from '@/components/Owner/ResetPasswordModal'
import TenantHistoryModal from '@/components/Owner/TenantHistoryModal'
import { fetchTenantsAdmin } from './actions'
import toast from 'react-hot-toast'

interface Tenant {
  id: string
  tenant_code: string
  name: string
  subscription_tier: string
  token_balance: number
  user_id: string
  admin_email: string
  admin_name: string
  whatsapp: string
  created_at: string
}

export default function OwnerDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
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

  useEffect(() => {
    fetchTenants()
  }, [])

  const filteredTenants = tenants.filter(t => 
    (t.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (t.tenant_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (t.whatsapp?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Console</h1>
          <p className="text-slate-500 text-sm mt-1">Manage network tenants and token allocation</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchTenants}
            className="p-2.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm"
          >
            <Plus size={18} />
            Register Tenant
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm shadow-sm"
            />
          </div>
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Table
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <RefreshCw className="animate-spin mx-auto mb-4 text-slate-400" size={32} />
            <p className="text-slate-500 font-medium">Loading tenant data...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
              <div key={tenant.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {tenant.name ? tenant.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{tenant.name || 'Unnamed Tenant'}</h3>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-tight">
                          {tenant.tenant_code}
                        </span>
                      </div>
                    </div>
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
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setIsResetModalOpen(true)
                          }}
                          className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all shadow-sm"
                          title="Reset Password"
                        >
                          <Key size={18} />
                        </button>
                        <a href={`/owner/statement/${tenant.tenant_code}`}>
                          <button 
                            className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                            title="Token Statement (Ledger)"
                          >
                            <FileText size={18} />
                          </button>
                        </a>
                        <button 
                          onClick={() => { setSelectedTenantHistory(tenant); setIsHistoryOpen(true); }}
                          className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                          title="View History"
                        >
                          <History size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setIsGrantModalOpen(true)
                          }}
                          className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Grant Tokens"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate">{tenant.admin_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-emerald-500" />
                        <span className="font-bold text-emerald-600">{tenant.whatsapp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <UserIcon size={14} className="text-slate-400" />
                        <span>{tenant.admin_name}</span>
                      </div>
                    </div>
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
                    <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-medium">{tenant.tenant_code}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{tenant.name || 'Unnamed'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{tenant.token_balance.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                          <Phone size={14} />
                          {tenant.whatsapp}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{tenant.admin_email}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setSelectedTenant(tenant); setIsResetModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Reset Password">
                            <Key size={16} />
                          </button>
                          <button onClick={() => { setSelectedTenantHistory(tenant); setIsHistoryOpen(true); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="View History">
                            <History size={16} />
                          </button>
                          <button onClick={() => { setSelectedTenant(tenant); setIsGrantModalOpen(true); }} className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 hover:bg-blue-50 rounded-lg">
                            Grant Token
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <GrantTokenModal isOpen={isGrantModalOpen} tenant={selectedTenant} onClose={() => setIsGrantModalOpen(false)} onSuccess={fetchTenants} />
      <RegisterTenantModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onSuccess={fetchTenants} />
      <ResetPasswordModal isOpen={isResetModalOpen} tenant={selectedTenant} onClose={() => setIsResetModalOpen(false)} />
      <TenantHistoryModal 
        isOpen={isHistoryOpen}
        tenant={selectedTenantHistory}
        onClose={() => { setIsHistoryOpen(false); setSelectedTenantHistory(null); }}
      />
    </div>
  )
}
