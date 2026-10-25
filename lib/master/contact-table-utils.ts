/**
 * Sentralogis — Master Kontak / Master Customer Canonical Table Utilities
 * lib/master/contact-table-utils.ts
 *
 * Provides pure, deterministic, schema-aligned utilities for the Master Kontak table:
 * 1. Initial Name derivation (`deriveInitialName`) following existing Sentralogis rules
 *    without creating duplicate database columns.
 * 2. Canonical role resolution (`hasCustomerRole`, `getEntityRoles`) combining
 *    `public.party_roles` (canonical) and `is_*` compatibility flags on `public.md_entities`.
 * 3. Parent Company hierarchy resolution (`resolveParentCompany`) strictly from `parent_id`
 *    within the same tenant — never conflated with Bill-To or Ship-To addresses.
 * 4. Phone / WhatsApp sanitization (`sanitizeContactPhone`) preventing role-code leakage.
 * 5. Search, Role Filter, Status Filter, Sorting, and Pagination (`filterAndSortMasterContacts`).
 * 6. Copilot -> Master Kontak URL builder (`buildMasterKontakUrl`).
 */

export interface PartyRoleRecord {
  id?: string;
  tenant_id?: string;
  party_id?: string;
  role_type: string;
  context_type?: string | null;
  context_id?: string | null;
  is_primary?: boolean | null;
  is_active?: boolean | null;
}

export interface MasterContactEntity {
  id: string;
  tenant_id: string;
  entity_code?: string | null;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  tax_status?: string | null;
  email?: string | null;
  billing_email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  billing_address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  parent_id?: string | null;
  is_customer?: boolean | null;
  is_supplier?: boolean | null;
  is_vendor?: boolean | null;
  is_broker?: boolean | null;
  is_active?: boolean | null;
  payment_terms_days?: number | null;
  payment_terms_type?: string | null;
  credit_limit?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  party_roles?: PartyRoleRecord[] | null;
}

export interface ParentCompanySummary {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  label: string;
}

export type ContactRoleFilter = 'all' | 'customer' | 'supplier' | 'vendor' | 'broker';
export type ContactStatusFilter = 'all' | 'active' | 'inactive';
export type ContactSortField = 'updated_at' | 'created_at' | 'entity_code' | 'name' | 'legal_name' | 'initial_name';
export type ContactSortOrder = 'asc' | 'desc';

export interface ContactTableQueryOptions {
  tenantId: string;
  search?: string;
  roleFilter?: ContactRoleFilter;
  statusFilter?: ContactStatusFilter;
  sortField?: ContactSortField;
  sortOrder?: ContactSortOrder;
  page?: number;
  pageSize?: number;
}

export interface ContactTableQueryResult {
  items: MasterContactEntity[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  parentMap: Map<string, ParentCompanySummary>;
}

const LEGAL_ENTITY_PREFIXES = new Set([
  'PT',
  'CV',
  'UD',
  'TBK',
  'PERSERO',
  'PERUM',
  'FIRMA',
  'FA',
  'YAYASAN',
  'KOPERASI',
  'BUMN',
  'BUMD',
  'LTD',
  'INC',
  'CORP',
  'CO',
  'PTE',
]);

const INVALID_PHONE_PLACEHOLDERS = new Set([
  'CUS',
  'SPP',
  'VND',
  'BRO',
  'CUSTOMER',
  'SUPPLIER',
  'VENDOR',
  'BROKER',
  'NULL',
  'UNDEFINED',
  '-',
]);

/**
 * Derives the canonical Initial Name for a Master Contact / Customer entity
 * without introducing duplicate schema columns:
 *
 * Rule 1: If `name` contains an explicit parenthetical alias at the end, e.g.
 *         "PT TRADING PERDANA SUKSES (TPS)", extract "TPS".
 * Rule 2: If `name` is already stored as a short Initial / Brand / Alias
 *         (per MasterCustomerModal convention: 1 token, <= 10 chars, not a legal prefix,
 *         e.g. "ABC", "AJM", "MAU", "AMD", "TAM", "TPS"), return `name.toUpperCase()`.
 * Rule 3: Otherwise, strip legal entity prefixes/suffixes (PT, CV, UD, Tbk, Persero, etc.)
 *         from `name` (or `legal_name`) and take the uppercase initial letter of each
 *         significant word (e.g. "PT AMANAH TRANSPORTASI" -> "AT",
 *         "PT ANUGRAH BERKAT CEMERLANG" -> "ABC").
 */
export function deriveInitialName(
  entity: Pick<MasterContactEntity, 'name' | 'legal_name'> | null | undefined,
): string {
  if (!entity) return '-';
  const rawName = (entity.name || '').trim();
  const rawLegal = (entity.legal_name || '').trim();
  const source = rawName || rawLegal;
  if (!source) return '-';

  // Rule 1: Explicit parenthetical initial/alias at end of name or legal_name, e.g. "(TPS)"
  const parenMatch =
    rawName.match(/\(([A-Za-z0-9&-]{2,10})\)\s*$/) ||
    rawLegal.match(/\(([A-Za-z0-9&-]{2,10})\)\s*$/);
  if (parenMatch) {
    const token = parenMatch[1].toUpperCase();
    if (!LEGAL_ENTITY_PREFIXES.has(token)) {
      return token;
    }
  }

  // Rule 2: `name` is already a short single-token Initial / Brand / Alias (e.g. "ABC", "AJM", "MAU", "AMD")
  const nameTokens = rawName.split(/\s+/).filter(Boolean);
  if (
    nameTokens.length === 1 &&
    rawName.length >= 2 &&
    rawName.length <= 10 &&
    /^[A-Za-z0-9&._-]+$/.test(rawName) &&
    !LEGAL_ENTITY_PREFIXES.has(rawName.replace(/\./g, '').toUpperCase())
  ) {
    return rawName.toUpperCase();
  }

  // Rule 3: Derive acronym from significant company name words after stripping PT/CV/UD/Tbk
  const significantTokens = source
    .replace(/[(),.;:/\\'"-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !LEGAL_ENTITY_PREFIXES.has(t.toUpperCase()));

  if (significantTokens.length === 0) {
    return source.slice(0, 3).toUpperCase();
  }

  if (significantTokens.length === 1) {
    const single = significantTokens[0].toUpperCase();
    return single.length <= 6 ? single : single.slice(0, 4);
  }

  const initials = significantTokens
    .slice(0, 6)
    .map((t) => t[0].toUpperCase())
    .join('');

  return initials || '-';
}

/**
 * Sanitizes phone / mobile / WhatsApp values so role codes ("CUS", "SPP", etc.)
 * never render as phone numbers.
 */
export function sanitizeContactPhone(value?: string | null): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (INVALID_PHONE_PLACEHOLDERS.has(trimmed.toUpperCase())) {
    return '';
  }
  return trimmed;
}

/**
 * Determines whether an entity holds the canonical CUSTOMER role
 * via `party_roles` (`role_type = 'CUSTOMER'`) or the compatibility `is_customer` flag.
 */
export function hasCustomerRole(entity: MasterContactEntity | null | undefined): boolean {
  if (!entity) return false;
  if (entity.is_customer === true) return true;
  if (Array.isArray(entity.party_roles)) {
    return entity.party_roles.some(
      (r) =>
        r &&
        String(r.role_type || '').toUpperCase() === 'CUSTOMER' &&
        r.is_active !== false,
    );
  }
  return false;
}

/**
 * Returns the normalized list of active role badges for a contact entity.
 */
export function getEntityRoles(
  entity: MasterContactEntity | null | undefined,
): Array<'CUSTOMER' | 'SUPPLIER' | 'VENDOR' | 'BROKER'> {
  if (!entity) return [];
  const roles = new Set<'CUSTOMER' | 'SUPPLIER' | 'VENDOR' | 'BROKER'>();

  if (hasCustomerRole(entity)) roles.add('CUSTOMER');
  if (entity.is_supplier) roles.add('SUPPLIER');
  if (entity.is_vendor) roles.add('VENDOR');
  if (entity.is_broker) roles.add('BROKER');

  if (Array.isArray(entity.party_roles)) {
    for (const r of entity.party_roles) {
      if (!r || r.is_active === false) continue;
      const rt = String(r.role_type || '').toUpperCase();
      if (rt === 'CUSTOMER') roles.add('CUSTOMER');
      else if (rt === 'SUPPLIER') roles.add('SUPPLIER');
      else if (rt === 'VENDOR' || rt === 'CARRIER') roles.add('VENDOR');
      else if (rt === 'BROKER' || rt === 'AGENT') roles.add('BROKER');
    }
  }

  return Array.from(roles);
}

/**
 * Builds a tenant-scoped lookup map of parent companies and resolves `parent_id`
 * strictly from `md_entities` within the same tenant.
 * Never conflates Parent Company with Bill-To (`billing_address`) or Ship-To (`md_entity_addresses`).
 */
export function buildParentCompanyMap(
  entities: MasterContactEntity[],
  tenantId: string,
): Map<string, ParentCompanySummary> {
  const byId = new Map<string, MasterContactEntity>();
  for (const ent of entities) {
    if (ent && ent.id && ent.tenant_id === tenantId) {
      byId.set(ent.id, ent);
    }
  }

  const parentMap = new Map<string, ParentCompanySummary>();
  for (const ent of entities) {
    if (!ent || ent.tenant_id !== tenantId || !ent.parent_id) continue;
    const parent = byId.get(ent.parent_id);
    if (parent && parent.id !== ent.id) {
      const code = parent.entity_code || '-';
      const name = parent.name || parent.legal_name || '-';
      parentMap.set(ent.id, {
        id: parent.id,
        code,
        name,
        legalName: parent.legal_name || null,
        label: parent.entity_code ? `[${parent.entity_code}] ${name}` : name,
      });
    }
  }

  return parentMap;
}

/**
 * Resolves the Parent Company summary for a single entity.
 */
export function resolveParentCompany(
  entity: MasterContactEntity | null | undefined,
  parentMap: Map<string, ParentCompanySummary>,
): ParentCompanySummary | null {
  if (!entity || !entity.id || !entity.parent_id) return null;
  return parentMap.get(entity.id) || null;
}

/**
 * Attaches canonical `party_roles` rows to their corresponding `md_entities` records
 * within the same tenant.
 */
export function attachPartyRolesToEntities(
  entities: MasterContactEntity[],
  partyRoles: PartyRoleRecord[],
  tenantId: string,
): MasterContactEntity[] {
  const rolesByPartyId = new Map<string, PartyRoleRecord[]>();
  for (const role of partyRoles || []) {
    if (!role || !role.party_id) continue;
    if (role.tenant_id && role.tenant_id !== tenantId) continue;
    const list = rolesByPartyId.get(role.party_id) || [];
    list.push(role);
    rolesByPartyId.set(role.party_id, list);
  }

  return (entities || [])
    .filter((ent) => ent && ent.tenant_id === tenantId)
    .map((ent) => {
      const existingRoles = Array.isArray(ent.party_roles) ? ent.party_roles : [];
      const extraRoles = rolesByPartyId.get(ent.id) || [];
      const mergedRoles = [...existingRoles];
      for (const r of extraRoles) {
        const dup = mergedRoles.some(
          (er) =>
            (er.id && r.id && er.id === r.id) ||
            (er.role_type === r.role_type && (er.context_type || 'GLOBAL') === (r.context_type || 'GLOBAL')),
        );
        if (!dup) mergedRoles.push(r);
      }
      const isCust =
        ent.is_customer === true ||
        mergedRoles.some(
          (r) => String(r.role_type || '').toUpperCase() === 'CUSTOMER' && r.is_active !== false,
        );
      return {
        ...ent,
        is_customer: isCust,
        party_roles: mergedRoles,
      };
    });
}

/**
 * Filters, sorts, and paginates Master Kontak entities with strict tenant isolation.
 */
export function filterAndSortMasterContacts(
  allEntities: MasterContactEntity[],
  options: ContactTableQueryOptions,
): ContactTableQueryResult {
  const {
    tenantId,
    search = '',
    roleFilter = 'all',
    statusFilter = 'all',
    sortField = 'updated_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 25,
  } = options;

  // 1. Strict Tenant Isolation
  const tenantEntities = (allEntities || []).filter(
    (ent) => ent && Boolean(ent.tenant_id) && ent.tenant_id === tenantId,
  );

  // Build parent map across all entities of the tenant so parent lookups always succeed
  const parentMap = buildParentCompanyMap(tenantEntities, tenantId);

  // 2. Role Filter
  let filtered = tenantEntities.filter((ent) => {
    if (roleFilter === 'all') return true;
    const roles = getEntityRoles(ent);
    if (roleFilter === 'customer') return roles.includes('CUSTOMER');
    if (roleFilter === 'supplier') return roles.includes('SUPPLIER');
    if (roleFilter === 'vendor') return roles.includes('VENDOR');
    if (roleFilter === 'broker') return roles.includes('BROKER');
    return true;
  });

  // 3. Status Filter
  if (statusFilter === 'active') {
    filtered = filtered.filter((ent) => ent.is_active !== false);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter((ent) => ent.is_active === false);
  }

  // 4. Search Filter (Code, Initial Name, Contact/Trade Name, Legal Name, Parent Company, NPWP, Email, Phone/WA)
  const cleanSearch = search.trim().toLowerCase();
  if (cleanSearch.length > 0) {
    filtered = filtered.filter((ent) => {
      const code = (ent.entity_code || '').toLowerCase();
      const initial = deriveInitialName(ent).toLowerCase();
      const name = (ent.name || '').toLowerCase();
      const legalName = (ent.legal_name || '').toLowerCase();
      const taxId = (ent.tax_id || '').toLowerCase();
      const email = (ent.email || ent.billing_email || '').toLowerCase();
      const phone = sanitizeContactPhone(ent.phone).toLowerCase();
      const mobile = sanitizeContactPhone(ent.mobile).toLowerCase();
      const whatsapp = sanitizeContactPhone(ent.whatsapp).toLowerCase();
      const parent = parentMap.get(ent.id);
      const parentLabel = parent ? `${parent.code} ${parent.name} ${parent.legalName || ''}`.toLowerCase() : '';
      const idStr = (ent.id || '').toLowerCase();

      return (
        code.includes(cleanSearch) ||
        initial.includes(cleanSearch) ||
        name.includes(cleanSearch) ||
        legalName.includes(cleanSearch) ||
        taxId.includes(cleanSearch) ||
        email.includes(cleanSearch) ||
        phone.includes(cleanSearch) ||
        mobile.includes(cleanSearch) ||
        whatsapp.includes(cleanSearch) ||
        parentLabel.includes(cleanSearch) ||
        idStr === cleanSearch
      );
    });
  }

  // 5. Sorting
  const dir = sortOrder === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (sortField === 'entity_code') {
      return (a.entity_code || '').localeCompare(b.entity_code || '') * dir;
    }
    if (sortField === 'name') {
      return (a.name || '').localeCompare(b.name || '') * dir;
    }
    if (sortField === 'legal_name') {
      return (a.legal_name || a.name || '').localeCompare(b.legal_name || b.name || '') * dir;
    }
    if (sortField === 'initial_name') {
      return deriveInitialName(a).localeCompare(deriveInitialName(b)) * dir;
    }
    if (sortField === 'created_at') {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return (ta - tb) * dir;
      return (a.name || '').localeCompare(b.name || '');
    }
    // Default: updated_at (fallback to created_at, then entity_code)
    const ua = a.updated_at || a.created_at;
    const ub = b.updated_at || b.created_at;
    const ta = ua ? new Date(ua).getTime() : 0;
    const tb = ub ? new Date(ub).getTime() : 0;
    if (ta !== tb) return (ta - tb) * dir;
    return (b.entity_code || '').localeCompare(a.entity_code || '');
  });

  // 6. Pagination
  const safePageSize = Math.max(1, pageSize);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * safePageSize;
  const items = filtered.slice(startIdx, startIdx + safePageSize);

  return {
    items,
    totalItems,
    totalPages,
    currentPage,
    pageSize: safePageSize,
    parentMap,
  };
}

/**
 * Builds a canonical navigation URL from Copilot to Master Kontak with pre-populated search/filter.
 */
export function buildMasterKontakUrl(params?: {
  search?: string | null;
  customerId?: string | null;
  role?: ContactRoleFilter;
  action?: 'view' | 'edit';
  basePath?: '/tenant/master/contacts' | '/hq/master/contacts';
}): string {
  const basePath = params?.basePath || '/tenant/master/contacts';
  const query = new URLSearchParams();

  if (params?.role && params.role !== 'all') {
    query.set('tab', params.role);
  }
  if (params?.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.customerId && params.customerId.trim()) {
    query.set('customerId', params.customerId.trim());
  }
  if (params?.action) {
    query.set('action', params.action);
  }

  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
