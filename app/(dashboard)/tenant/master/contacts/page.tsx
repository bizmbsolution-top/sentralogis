'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  X,
  Check,
  Loader2,
  Eye,
  GitMerge,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
  Clock,
} from 'lucide-react'
import GoogleMapsInput from '@/components/master/GoogleMapsInput'
import MasterCustomerModal from '@/components/master/MasterCustomerModal'
import { generateNextCustomerCode } from '@/lib/actions/customer-master-actions'
import {
  type MasterContactEntity,
  type PartyRoleRecord,
  type ContactRoleFilter,
  type ContactStatusFilter,
  type ContactSortField,
  type ContactSortOrder,
  deriveInitialName,
  sanitizeContactPhone,
  hasCustomerRole,
  getEntityRoles,
  attachPartyRolesToEntities,
  filterAndSortMasterContacts,
  resolveParentCompany,
} from '@/lib/master/contact-table-utils'

function formatUpdatedDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatUpdatedTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TenantContactsContent() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()

  const [allEntities, setAllEntities] = useState<MasterContactEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Filters, Sorting & Pagination
  const [activeTab, setActiveTab] = useState<ContactRoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<ContactStatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<ContactSortField>('updated_at')
  const [sortOrder, setSortOrder] = useState<ContactSortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [editingEntity, setEditingEntity] = useState<MasterContactEntity | null>(null)
  const [viewingEntity, setViewingEntity] = useState<MasterContactEntity | null>(null)
  const [saving, setSaving] = useState(false)

  // General Form State (for non-customer contacts: Supplier / Vendor / Broker)
  const [formData, setFormData] = useState({
    entity_code: '',
    name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Indonesia',
    latitude: 0,
    longitude: 0,
    parent_id: '',
    is_customer: false,
    is_supplier: false,
    is_vendor: false,
    is_broker: false,
    payment_terms_days: 30,
    credit_limit: 0,
    is_active: true,
  })

  // Apply URL query parameters (e.g. from Copilot navigation: ?search=CUS/018&customerId=...&tab=customer)
  useEffect(() => {
    if (!searchParams) return
    const qSearch =
      searchParams.get('search') ||
      searchParams.get('q') ||
      searchParams.get('code') ||
      searchParams.get('name')
    const qTab = (searchParams.get('tab') || searchParams.get('role') || '').toLowerCase()
    const qStatus = (searchParams.get('status') || '').toLowerCase()
    const qCustomerId = searchParams.get('customerId') || searchParams.get('id')

    if (qSearch !== null && qSearch.trim().length > 0) {
      setSearchTerm(qSearch.trim())
    }
    if (['all', 'customer', 'supplier', 'vendor', 'broker'].includes(qTab)) {
      setActiveTab(qTab as ContactRoleFilter)
    }
    if (['all', 'active', 'inactive'].includes(qStatus)) {
      setStatusFilter(qStatus as ContactStatusFilter)
    }
    if (qCustomerId) {
      setHighlightedId(qCustomerId.trim())
    }
  }, [searchParams])

  // Resolve authenticated user's canonical tenant_id
  useEffect(() => {
    const fetchUserTenant = async () => {
      if ((profile as any)?.tenant_id) {
        setTenantId((profile as any).tenant_id)
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (tenantData?.id) {
        setTenantId(tenantData.id)
      } else {
        setLoading(false)
      }
    }
    fetchUserTenant()
  }, [profile])

  // Fetch canonical entities from public.md_entities + public.party_roles scoped by tenant_id
  const fetchEntities = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)

    try {
      const [entitiesRes, rolesRes] = await Promise.all([
        supabase
          .from('md_entities')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false }),
        (supabase as any)
          .from('party_roles')
          .select('id, tenant_id, party_id, role_type, context_type, context_id, is_primary, is_active')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ])

      if (entitiesRes.error) {
        console.error('[MasterKontak] Error fetching md_entities:', entitiesRes.error)
      } else {
        const rawEntities = (entitiesRes.data || []) as MasterContactEntity[]
        const rawRoles = (rolesRes.data || []) as PartyRoleRecord[]
        const enriched = attachPartyRolesToEntities(rawEntities, rawRoles, tenantId)
        setAllEntities(enriched)
      }
    } catch (err) {
      console.error('[MasterKontak] Unexpected fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) {
      fetchEntities()
    }
  }, [tenantId, fetchEntities])

  // Handle deep-link action=edit or action=view once entities are loaded
  useEffect(() => {
    if (!searchParams || allEntities.length === 0) return
    const qCustomerId = searchParams.get('customerId') || searchParams.get('id')
    const qAction = (searchParams.get('action') || '').toLowerCase()
    if (!qCustomerId) return

    const target = allEntities.find((e) => e.id === qCustomerId)
    if (!target) return

    if (qAction === 'edit' && hasCustomerRole(target)) {
      setEditingCustomerId(target.id)
      setIsCustomerModalOpen(true)
    } else if (qAction === 'view') {
      setViewingEntity(target)
    }
  }, [searchParams, allEntities])

  // Reset pagination to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, statusFilter, searchTerm, sortField, sortOrder, pageSize])

  // Compute filtered, sorted, paginated table result & parent company map
  const tableResult = useMemo(() => {
    if (!tenantId) {
      return {
        items: [] as MasterContactEntity[],
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize,
        parentMap: new Map(),
      }
    }
    return filterAndSortMasterContacts(allEntities, {
      tenantId,
      search: searchTerm,
      roleFilter: activeTab,
      statusFilter,
      sortField,
      sortOrder,
      page: currentPage,
      pageSize,
    })
  }, [allEntities, tenantId, searchTerm, activeTab, statusFilter, sortField, sortOrder, currentPage, pageSize])

  // Role tab counts across current tenant
  const roleCounts = useMemo(() => {
    const counts = { all: 0, customer: 0, supplier: 0, vendor: 0, broker: 0 }
    for (const ent of allEntities) {
      if (!ent || ent.tenant_id !== tenantId) continue
      counts.all++
      const roles = getEntityRoles(ent)
      if (roles.includes('CUSTOMER')) counts.customer++
      if (roles.includes('SUPPLIER')) counts.supplier++
      if (roles.includes('VENDOR')) counts.vendor++
      if (roles.includes('BROKER')) counts.broker++
    }
    return counts
  }, [allEntities, tenantId])

  const generateEntityCode = async (
    isCust: boolean,
    isSupp: boolean,
    isVend: boolean,
    isBrok: boolean,
  ): Promise<string> => {
    let prefix = 'ENT'
    if (isCust) prefix = 'CUS'
    else if (isSupp) prefix = 'SPP'
    else if (isVend) prefix = 'VND'
    else if (isBrok) prefix = 'BRO'

    if (tenantId && prefix === 'CUS') {
      try {
        return await generateNextCustomerCode(tenantId)
      } catch (e) {
        console.error('[MasterKontak] generateNextCustomerCode error:', e)
      }
    }

    if (tenantId) {
      try {
        const { data } = await supabase
          .from('md_entities')
          .select('entity_code')
          .eq('tenant_id', tenantId)
          .ilike('entity_code', `${prefix}/%`)

        let maxSeq = 0
        for (const row of data || []) {
          const m = String(row.entity_code || '').match(/^[A-Za-z]+\/(\d+)$/)
          if (m) {
            const num = parseInt(m[1], 10)
            if (!Number.isNaN(num) && num > maxSeq) maxSeq = num
          }
        }
        return `${prefix}/${String(maxSeq + 1).padStart(3, '0')}`
      } catch (e) {
        console.error('[MasterKontak] Sequential code generation error:', e)
      }
    }
    return `${prefix}/001`
  }

  const handleOpenModal = async (entity?: MasterContactEntity) => {
    if (entity) {
      setEditingEntity(entity)
      setFormData({
        entity_code: entity.entity_code || '',
        name: entity.name || '',
        legal_name: entity.legal_name || entity.name || '',
        tax_id: entity.tax_id || '',
        email: entity.email || '',
        phone: sanitizeContactPhone(entity.phone),
        whatsapp: sanitizeContactPhone(entity.whatsapp),
        address: entity.address || entity.billing_address || '',
        city: entity.city || '',
        province: entity.province || '',
        postal_code: entity.postal_code || '',
        country: entity.country || 'Indonesia',
        latitude: (entity as any).latitude || (entity as any).billing_latitude || 0,
        longitude: (entity as any).longitude || (entity as any).billing_longitude || 0,
        parent_id: entity.parent_id || '',
        is_customer: hasCustomerRole(entity),
        is_supplier: Boolean(entity.is_supplier),
        is_vendor: Boolean(entity.is_vendor),
        is_broker: Boolean(entity.is_broker),
        payment_terms_days: entity.payment_terms_days || 30,
        credit_limit: entity.credit_limit || 0,
        is_active: entity.is_active ?? true,
      })
    } else {
      setEditingEntity(null)
      const isCust = activeTab === 'customer' || activeTab === 'all'
      const isSupp = activeTab === 'supplier'
      const isVend = activeTab === 'vendor'
      const isBrok = activeTab === 'broker'
      const code = await generateEntityCode(isCust, isSupp, isVend, isBrok)

      setFormData({
        entity_code: code,
        name: '',
        legal_name: '',
        tax_id: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Indonesia',
        latitude: 0,
        longitude: 0,
        parent_id: '',
        is_customer: isCust,
        is_supplier: isSupp,
        is_vendor: isVend,
        is_broker: isBrok,
        payment_terms_days: 30,
        credit_limit: 0,
        is_active: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleRoleChange = async (
    role: 'customer' | 'supplier' | 'vendor' | 'broker',
    checked: boolean,
  ) => {
    const newRoles = {
      is_customer: role === 'customer' ? checked : formData.is_customer,
      is_supplier: role === 'supplier' ? checked : formData.is_supplier,
      is_vendor: role === 'vendor' ? checked : formData.is_vendor,
      is_broker: role === 'broker' ? checked : formData.is_broker,
    }

    let newCode = formData.entity_code
    if (!editingEntity) {
      newCode = await generateEntityCode(
        newRoles.is_customer,
        newRoles.is_supplier,
        newRoles.is_vendor,
        newRoles.is_broker,
      )
    }

    setFormData((prev) => ({
      ...prev,
      ...newRoles,
      entity_code: newCode,
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return
    setSaving(true)

    const payload = {
      tenant_id: tenantId,
      entity_code: formData.entity_code,
      name: formData.name.trim(),
      legal_name: formData.legal_name.trim() || formData.name.trim(),
      tax_id: formData.tax_id || null,
      email: formData.email || null,
      phone: sanitizeContactPhone(formData.phone) || null,
      whatsapp: sanitizeContactPhone(formData.whatsapp) || null,
      billing_address: formData.address || null,
      billing_city: formData.city || null,
      billing_province: formData.province || null,
      billing_postal_code: formData.postal_code || null,
      billing_latitude: formData.latitude || null,
      billing_longitude: formData.longitude || null,
      parent_id: formData.parent_id ? formData.parent_id : null,
      is_customer: formData.is_customer,
      is_supplier: formData.is_supplier,
      is_vendor: formData.is_vendor,
      is_broker: formData.is_broker,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingEntity) {
      const { error } = await supabase
        .from('md_entities')
        .update(payload)
        .eq('id', editingEntity.id)
        .eq('tenant_id', tenantId)

      if (error) {
        alert('Error updating contact: ' + error.message)
      } else {
        if (formData.is_customer) {
          await (supabase as any).from('party_roles').upsert(
            {
              tenant_id: tenantId,
              party_id: editingEntity.id,
              role_type: 'CUSTOMER',
              context_type: 'GLOBAL',
              is_primary: true,
              is_active: true,
            },
            { onConflict: 'tenant_id,party_id,role_type,context_type' },
          )
        }
        setIsModalOpen(false)
        fetchEntities()
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('md_entities')
        .insert([payload])
        .select('id')
        .single()

      if (error) {
        alert('Error creating contact: ' + error.message)
      } else {
        if (inserted?.id && formData.is_customer) {
          await (supabase as any).from('party_roles').insert({
            tenant_id: tenantId,
            party_id: inserted.id,
            role_type: 'CUSTOMER',
            context_type: 'GLOBAL',
            is_primary: true,
            is_active: true,
          })
        }
        setIsModalOpen(false)
        fetchEntities()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!tenantId) return
    if (!confirm('Apakah Anda yakin ingin menghapus data kontak ini?')) return

    const { error } = await supabase
      .from('md_entities')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      alert('Gagal menghapus kontak: ' + error.message)
    } else {
      fetchEntities()
    }
  }

  const handleEditAction = (ent: MasterContactEntity) => {
    if (hasCustomerRole(ent)) {
      setEditingCustomerId(ent.id)
      setIsCustomerModalOpen(true)
    } else {
      handleOpenModal(ent)
    }
  }

  const toggleSort = (field: ContactSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder(field === 'updated_at' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" />
            Master Kontak & Pelanggan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola identitas resmi pelanggan (Customer), hierarki perusahaan induk, NPWP, kontak PIC, dan rekanan operasional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCustomerId(null)
              setIsCustomerModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors text-sm"
          >
            <Plus size={18} />
            Tambah Customer
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"
          >
            <Plus size={16} />
            Kontak Lainnya
          </button>
        </div>
      </div>

      {/* Role Filter Tabs + Search + Status & Sort Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {(
              [
                { key: 'all', label: 'Semua', count: roleCounts.all },
                { key: 'customer', label: 'Customer', count: roleCounts.customer },
                { key: 'supplier', label: 'Supplier', count: roleCounts.supplier },
                { key: 'vendor', label: 'Vendor', count: roleCounts.vendor },
                { key: 'broker', label: 'Broker', count: roleCounts.broker },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Status Filter + Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Cari Kode (CUS/018), Initial, Nama, Legal, NPWP, Induk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Reset pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ContactStatusFilter)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                aria-label="Filter Status Kontak"
              >
                <option value="all">Semua Status</option>
                <option value="active">Status: Aktif</option>
                <option value="inactive">Status: Nonaktif</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={`${sortField}:${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split(':') as [ContactSortField, ContactSortOrder]
                  setSortField(f)
                  setSortOrder(o)
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                aria-label="Urutkan Kontak"
              >
                <option value="updated_at:desc">Terbaru Diperbarui</option>
                <option value="entity_code:asc">Kode Contact (A-Z)</option>
                <option value="entity_code:desc">Kode Contact (Z-A)</option>
                <option value="initial_name:asc">Initial Name (A-Z)</option>
                <option value="name:asc">Nama Contact (A-Z)</option>
                <option value="legal_name:asc">Nama Legal (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Master Kontak Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Memuat data Master Kontak...</p>
          </div>
        ) : tableResult.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="text-lg font-medium text-slate-700">Data kontak tidak ditemukan</p>
            <p className="text-sm mt-1">
              {searchTerm
                ? `Tidak ada kontak untuk kata kunci "${searchTerm}".`
                : 'Silakan tambahkan Customer atau Kontak baru.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                    <th
                      className="p-3.5 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                      onClick={() => toggleSort('entity_code')}
                    >
                      Kode Contact
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                      onClick={() => toggleSort('initial_name')}
                      title="Inisial / Nama Singkat sesuai aturan pembentukan kode & alias perusahaan"
                    >
                      Initial Name
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:text-blue-600 select-none"
                      onClick={() => toggleSort('name')}
                    >
                      Nama Contact / Dagang
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:text-blue-600 select-none"
                      onClick={() => toggleSort('legal_name')}
                    >
                      Nama Legal
                    </th>
                    <th className="p-3.5 whitespace-nowrap">Parent Company (Induk)</th>
                    <th className="p-3.5 whitespace-nowrap">NPWP / Pajak</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5 whitespace-nowrap">Telepon / WhatsApp</th>
                    <th className="p-3.5 whitespace-nowrap">Status</th>
                    <th
                      className="p-3.5 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                      onClick={() => toggleSort('updated_at')}
                    >
                      Pembaruan
                    </th>
                    <th className="p-3.5 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {tableResult.items.map((ent) => {
                    const initialName = deriveInitialName(ent)
                    const roles = getEntityRoles(ent)
                    const parentSummary = resolveParentCompany(ent, tableResult.parentMap)
                    const cleanPhone = sanitizeContactPhone(ent.phone || ent.mobile)
                    const cleanWa = sanitizeContactPhone(ent.whatsapp)
                    const emailDisplay = ent.email || ent.billing_email || ''
                    const isHighlighted = highlightedId === ent.id

                    return (
                      <tr
                        key={ent.id}
                        className={`transition-colors ${
                          isHighlighted
                            ? 'bg-blue-50/70 hover:bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* 1. Kode Contact / Customer */}
                        <td className="p-3.5 font-mono text-slate-700 font-bold whitespace-nowrap">
                          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800">
                            {ent.entity_code || '-'}
                          </span>
                        </td>

                        {/* 2. Initial Name */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono"
                            title={`Initial Name: ${initialName}`}
                          >
                            {initialName}
                          </span>
                        </td>

                        {/* 3. Nama Contact / Nama Dagang + Role Badges */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {ent.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {roles.map((r) => {
                              const badgeStyles: Record<string, string> = {
                                CUSTOMER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                SUPPLIER: 'bg-purple-50 text-purple-700 border-purple-200',
                                VENDOR: 'bg-amber-50 text-amber-700 border-amber-200',
                                BROKER: 'bg-blue-50 text-blue-700 border-blue-200',
                              }
                              return (
                                <span
                                  key={r}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    badgeStyles[r] || 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {r}
                                </span>
                              )
                            })}
                            {ent.city && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 ml-1">
                                <MapPin size={10} /> {ent.city}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Nama Legal */}
                        <td className="p-3.5 text-slate-700 font-medium">
                          {ent.legal_name || ent.name || '-'}
                        </td>

                        {/* 5. Parent Company / Relasi Induk */}
                        <td className="p-3.5">
                          {parentSummary ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50/80 border border-blue-200 text-blue-800 text-[11px] font-medium">
                              <GitMerge size={12} className="text-blue-600 shrink-0" />
                              <span className="truncate max-w-[180px]" title={parentSummary.label}>
                                {parentSummary.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Mandiri</span>
                          )}
                        </td>

                        {/* 6. NPWP / Identitas Pajak */}
                        <td className="p-3.5 whitespace-nowrap">
                          {ent.tax_id ? (
                            <div>
                              <span className="font-mono text-slate-700 font-medium">
                                {ent.tax_id}
                              </span>
                              {ent.tax_status && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  {ent.tax_status}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 7. Email */}
                        <td className="p-3.5 text-slate-600">
                          {emailDisplay ? (
                            <div className="flex items-center gap-1.5">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]" title={emailDisplay}>
                                {emailDisplay}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 8. Telepon / WhatsApp */}
                        <td className="p-3.5 text-slate-600 whitespace-nowrap">
                          {cleanPhone || cleanWa ? (
                            <div className="space-y-0.5">
                              {cleanPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  <span>{cleanPhone}</span>
                                </div>
                              )}
                              {cleanWa && cleanWa !== cleanPhone && (
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                  <MessageSquare size={12} className="text-emerald-500 shrink-0" />
                                  <span>{cleanWa}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 9. Status Aktif / Nonaktif */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              ent.is_active !== false
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                ent.is_active !== false ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            {ent.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* 10. Tanggal Pembaruan / Aktivitas */}
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                            <Clock size={11} className="text-slate-400" />
                            <span>{formatUpdatedDate(ent.updated_at || ent.created_at)}</span>
                          </div>
                          {formatUpdatedTime(ent.updated_at || ent.created_at) && (
                            <div className="text-[10px] text-slate-400 pl-4">
                              {formatUpdatedTime(ent.updated_at || ent.created_at)} WIB
                            </div>
                          )}
                        </td>

                        {/* 11. Aksi: Lihat Detail, Edit, Hapus */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingEntity(ent)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Lihat Detail Kontak"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleEditAction(ent)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Data Kontak / Customer"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(ent.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Kontak"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan{' '}
                  <strong className="text-slate-800">{tableResult.items.length}</strong> dari{' '}
                  <strong className="text-slate-800">{tableResult.totalItems}</strong> kontak
                </span>
                <span className="text-slate-300">|</span>
                <label className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={tableResult.currentPage <= 1}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 font-medium"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="px-2.5 py-1 font-semibold text-slate-700">
                  Halaman {tableResult.currentPage} / {tableResult.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(tableResult.totalPages, p + 1))}
                  disabled={tableResult.currentPage >= tableResult.totalPages}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 font-medium"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Detail Modal */}
      {viewingEntity && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold">
                  {viewingEntity.entity_code || '-'}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{viewingEntity.name}</h2>
                  <p className="text-xs text-slate-500">
                    Initial Name: <strong className="font-mono">{deriveInitialName(viewingEntity)}</strong> • ID Kanonik:{' '}
                    <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{viewingEntity.id}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingEntity(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Nama Contact / Dagang</div>
                <div className="font-bold text-slate-800 mt-0.5">{viewingEntity.name}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Nama Legal Badan Usaha</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {viewingEntity.legal_name || viewingEntity.name || '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Parent Company (Induk)</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {resolveParentCompany(viewingEntity, tableResult.parentMap)?.label || 'Mandiri (Tidak ada induk)'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">NPWP / Identitas Pajak</div>
                <div className="font-mono font-medium text-slate-800 mt-0.5">
                  {viewingEntity.tax_id || '-'}{' '}
                  {viewingEntity.tax_status ? `(${viewingEntity.tax_status})` : ''}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Email & Penagihan</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingEntity.email || viewingEntity.billing_email || '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Telepon / WhatsApp</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {sanitizeContactPhone(viewingEntity.phone || viewingEntity.mobile) || '-'}
                  {sanitizeContactPhone(viewingEntity.whatsapp)
                    ? ` • WA: ${sanitizeContactPhone(viewingEntity.whatsapp)}`
                    : ''}
                </div>
              </div>
              <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold uppercase">Alamat Utama & Penagihan</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingEntity.address || viewingEntity.billing_address || '-'}
                  {viewingEntity.city ? `, ${viewingEntity.city}` : ''}
                  {viewingEntity.province ? `, ${viewingEntity.province}` : ''}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Terakhir diperbarui: <strong>{formatUpdatedDate(viewingEntity.updated_at || viewingEntity.created_at)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingEntity(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const target = viewingEntity
                    setViewingEntity(null)
                    handleEditAction(target)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                >
                  <Edit2 size={14} /> Edit Lengkap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved 5-Tab Master Customer Modal (Identitas, Hierarki, Penagihan, PIC, Ship-To) */}
      <MasterCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false)
          setEditingCustomerId(null)
        }}
        onSuccess={() => {
          setIsCustomerModalOpen(false)
          setEditingCustomerId(null)
          fetchEntities()
        }}
        selectedEntityId={editingCustomerId}
      />

      {/* General Contact Modal (for non-customer contacts: Supplier / Vendor / Broker) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="text-blue-600" />
                {editingEntity ? 'Edit Kontak Rekanan' : 'Tambah Kontak Rekanan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Role Selection */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Tipe Peran Kontak
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_customer}
                      onChange={(e) => handleRoleChange('customer', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_supplier}
                      onChange={(e) => handleRoleChange('supplier', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Supplier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_vendor}
                      onChange={(e) => handleRoleChange('vendor', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Vendor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_broker}
                      onChange={(e) => handleRoleChange('broker', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Broker</span>
                  </label>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kode Kontak *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.entity_code}
                    onChange={(e) => setFormData({ ...formData, entity_code: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    NPWP / Tax ID
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="00.000.000.0-000.000"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Contact / Singkat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: PT Maju Jaya Logistik"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Legal Badan Usaha
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Contoh: PT Maju Jaya Logistik"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="021-5551234"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="0812-3456-7890"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Address Info with Google Maps Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Alamat Utama (Cari via Google Maps)
                  </label>
                  <GoogleMapsInput
                    defaultValue={formData.address}
                    onPlaceSelect={(data) => {
                      setFormData((prev) => ({
                        ...prev,
                        address: data.address,
                        city: data.city || prev.city,
                        province: data.province || prev.province,
                        postal_code: data.postal_code || prev.postal_code,
                        latitude: data.latitude,
                        longitude: data.longitude,
                      }))
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Kota / Kabupaten
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Provinsi
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Status Kontak Aktif</span>
                </label>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200/50 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TenantContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p>Memuat halaman Master Kontak...</p>
        </div>
      }
    >
      <TenantContactsContent />
    </Suspense>
  )
}
