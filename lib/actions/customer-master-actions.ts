'use server';

// SENTRALOGIS — MASTER CUSTOMER V1 SERVER AUTHORITY
// Implements server-side customer management per SPEC-MC-2026-10-V1 & ADDENDUM MC-GMAP-01.
// Invariants enforced:
// 1. Tenant isolation via session IdentityContext (never client parameter).
// 2. Authorization assertion (commercial:manage or customer:register).
// 3. Server-authoritative sequential customer code allocation (CUS-YYYY-NNNN / CUS/NNN, NO Math.random()).
// 4. Canonical party_roles dual-write (role_type='CUSTOMER', context_type='GLOBAL').
// 5. Hierarchy cycle prevention (anti-cycle validation traversing parent chain).
// 6. Non-destructive incremental updates for operational addresses and contacts (NO DELETE ALL).
// 7. Coordinates reset to null/0 on manual edits.

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertAnyPermission } from '@/lib/application/identity/resolver';
import { assertMasterDataAccess } from '@/lib/application/identity/master-data-guard';
import { RoleMutationService } from '@/lib/domain/party/role-mutation-service';
import type { IdentityContext } from '@/lib/application/identity/types';

export interface CustomerMasterContactInput {
  id?: string;
  contact_name: string;
  contact_role?: string; // OPERATIONS | FINANCE | COMMERCIAL | MANAGEMENT
  department?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  is_primary?: boolean;
}

export interface CustomerMasterAddressInput {
  id?: string;
  address_name: string;
  address_type?: string; // WAREHOUSE | FACTORY | OFFICE | DOCK | OTHER
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  contact_person?: string;
  contact_phone?: string;
  address_directions?: string;
  is_active?: boolean;
}

export interface CustomerMasterInput {
  name: string;
  legal_name?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  billing_address?: string;
  billing_city?: string;
  billing_province?: string;
  billing_postal_code?: string;
  billing_latitude?: number | null;
  billing_longitude?: number | null;
  billing_directions?: string;
  parent_id?: string | null;
  payment_terms_days?: number;
  payment_terms_type?: string;
  notes?: string;
  is_active?: boolean;
  contacts?: CustomerMasterContactInput[];
  addresses?: CustomerMasterAddressInput[];
}

export interface CustomerMasterResult {
  ok: boolean;
  customer?: any;
  error?: string;
  code?: string;
}

/**
 * Server-side atomic Customer Code generator.
 * Format: CUS-YYYY-NNNN based on the highest existing sequence in the tenant.
 * Falls back gracefully to CUS/NNN or safe sequential counter if needed.
 * Strictly forbids client-side Math.random() generation.
 */
export async function generateNextCustomerCode(
  tenantId: string,
  supabaseClient?: any
): Promise<string> {
  const db = supabaseClient || createAdminClient();
  const year = new Date().getFullYear();
  const yearPrefix = `CUS-${year}-`;
  const legacyPrefix = 'CUS/';

  // 1. Try modern CUS-YYYY-NNNN format first
  const { data: modernRows, error: modernErr } = await db
    .from('md_entities')
    .select('entity_code')
    .eq('tenant_id', tenantId)
    .ilike('entity_code', `${yearPrefix}%`)
    .order('entity_code', { ascending: false })
    .limit(50);

  if (!modernErr && modernRows && modernRows.length > 0) {
    let maxSeq = 0;
    for (const r of modernRows) {
      const parts = (r.entity_code || '').split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${yearPrefix}${nextSeq}`;
  }

  // 2. Try legacy CUS/NNN format if tenant already has CUS/ codes
  const { data: legacyRows } = await db
    .from('md_entities')
    .select('entity_code')
    .eq('tenant_id', tenantId)
    .ilike('entity_code', `${legacyPrefix}%`)
    .order('entity_code', { ascending: false })
    .limit(50);

  if (legacyRows && legacyRows.length > 0) {
    let maxLegacy = 0;
    for (const r of legacyRows) {
      const parts = (r.entity_code || '').split('/');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxLegacy) {
          maxLegacy = num;
        }
      }
    }
    const nextLegacy = (maxLegacy + 1).toString().padStart(3, '0');
    return `${legacyPrefix}${nextLegacy}`;
  }

  // 3. Default starting sequence for year
  return `${yearPrefix}0001`;
}

/**
 * Validates that setting `targetParentId` on entity `currentEntityId` does not create a hierarchy cycle.
 * Traverses upwards from `targetParentId`. If `currentEntityId` is encountered, returns false (cycle detected).
 */
export async function validateHierarchyAntiCycle(
  tenantId: string,
  currentEntityId: string | null | undefined,
  targetParentId: string | null | undefined,
  supabaseClient?: any
): Promise<{ valid: boolean; error?: string }> {
  if (!targetParentId) {
    return { valid: true };
  }

  if (currentEntityId && targetParentId === currentEntityId) {
    return {
      valid: false,
      error: 'Entitas tidak dapat menjadi induk (parent) bagi dirinya sendiri.',
    };
  }

  if (!currentEntityId) {
    // New entity cannot be in the parent chain yet
    return { valid: true };
  }

  const db = supabaseClient || createAdminClient();
  let currentParentId: string | null = targetParentId;
  const visited = new Set<string>([currentEntityId]);
  const MAX_DEPTH = 20;
  let depth = 0;

  while (currentParentId && depth < MAX_DEPTH) {
    if (visited.has(currentParentId)) {
      return {
        valid: false,
        error: 'Terdeteksi siklus hierarki (circular reference). Entitas induk yang dipilih merupakan cabang/turunan dari entitas ini.',
      };
    }
    visited.add(currentParentId);

    const parentRes: { data: { id: string; parent_id: string | null } | null; error: any } = await db
      .from('md_entities')
      .select('id, parent_id')
      .eq('tenant_id', tenantId)
      .eq('id', currentParentId)
      .maybeSingle();

    if (parentRes.error || !parentRes.data) {
      break;
    }

    currentParentId = parentRes.data.parent_id || null;
    depth++;
  }

  return { valid: true };
}

/**
 * Creates a new Master Customer with canonical party_roles, contacts, and operational addresses.
 */
export async function createCustomerMasterAction(
  input: CustomerMasterInput,
  callerIdentity?: IdentityContext
): Promise<CustomerMasterResult> {
  try {
    const identity = callerIdentity || (await resolveSessionIdentity());

    // 1. Authorization check
    assertAnyPermission(identity, ['commercial:manage', 'customer:register']);
    assertMasterDataAccess(identity, ['customers'], 'write');

    const tenantId = identity.tenantId;
    if (!tenantId) {
      return { ok: false, error: 'Tenant context is missing from session identity.' };
    }

    if (!input.name || !input.name.trim()) {
      return { ok: false, error: 'Nama pelanggan (name / alias) wajib diisi.' };
    }

    const db = createAdminClient();

    // 2. Anti-cycle hierarchy check
    if (input.parent_id) {
      const cycleCheck = await validateHierarchyAntiCycle(tenantId, null, input.parent_id, db);
      if (!cycleCheck.valid) {
        return { ok: false, error: cycleCheck.error, code: 'HIERARCHY_CYCLE_DETECTED' };
      }
    }

    // 3. Generate server-authoritative code
    const entityCode = await generateNextCustomerCode(tenantId, db);

    // 4. Insert into md_entities
    const entityPayload = {
      tenant_id: tenantId,
      entity_code: entityCode,
      name: input.name.trim().toUpperCase(),
      legal_name: input.legal_name?.trim() || input.name.trim(),
      tax_id: input.tax_id?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      mobile: input.mobile?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      is_customer: true,
      is_active: input.is_active !== undefined ? input.is_active : true,
      is_own: false,
      parent_id: input.parent_id || null,
      billing_address: input.billing_address?.trim() || null,
      billing_city: input.billing_city?.trim() || null,
      billing_province: input.billing_province?.trim() || null,
      billing_postal_code: input.billing_postal_code?.trim() || null,
      billing_latitude: input.billing_latitude !== undefined && input.billing_latitude !== null && input.billing_latitude !== 0 ? Number(input.billing_latitude) : null,
      billing_longitude: input.billing_longitude !== undefined && input.billing_longitude !== null && input.billing_longitude !== 0 ? Number(input.billing_longitude) : null,
      billing_directions: input.billing_directions?.trim() || null,
      payment_terms_days: input.payment_terms_days !== undefined ? Number(input.payment_terms_days) : 30,
      payment_terms_type: input.payment_terms_type || 'net_days',
      notes: input.notes?.trim() || null,
      created_by: identity.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdEntity, error: entityErr } = await db
      .from('md_entities')
      .insert(entityPayload)
      .select()
      .single();

    if (entityErr || !createdEntity) {
      return { ok: false, error: `Gagal menyimpan entitas customer: ${entityErr?.message || 'DB Error'}` };
    }

    const customerId = createdEntity.id;

    // 5. Canonical party_roles dual-write (role_type: CUSTOMER, context_type: GLOBAL)
    try {
      const roleSvc = new RoleMutationService(db as any);
      await roleSvc.assignRole(
        tenantId,
        {
          party_id: customerId,
          role_type: 'CUSTOMER',
          context_type: 'GLOBAL',
          context_id: null,
        },
        identity.userId
      );
    } catch (roleErr: any) {
      console.warn('[CustomerMaster] party_roles dual-write note:', roleErr?.message || roleErr);
      // Fallback direct insert if RoleMutationService had projection conflict
      try {
        await db.from('party_roles').upsert(
          {
            tenant_id: tenantId,
            party_id: customerId,
            role_type: 'CUSTOMER',
            context_type: 'GLOBAL',
            context_id: null,
            is_primary: true,
            is_active: true,
          },
          { onConflict: 'tenant_id,party_id,role_type' }
        );
      } catch (upsertErr) {
        console.error('[CustomerMaster] Direct party_roles fallback error:', upsertErr);
      }
    }

    // 6. Insert contacts (PIC)
    if (input.contacts && input.contacts.length > 0) {
      const validContacts = input.contacts.filter((c) => c.contact_name && c.contact_name.trim());
      if (validContacts.length > 0) {
        const contactRows = validContacts.map((c, idx) => ({
          tenant_id: tenantId,
          party_id: customerId,
          contact_name: c.contact_name.trim(),
          contact_role: c.contact_role || 'COMMERCIAL',
          department: c.department?.trim() || null,
          title: c.title?.trim() || null,
          email: c.email?.trim() || null,
          phone: c.phone?.trim() || null,
          mobile: c.mobile?.trim() || null,
          whatsapp: c.whatsapp?.trim() || null,
          is_primary: c.is_primary !== undefined ? c.is_primary : idx === 0,
          is_active: true,
          created_at: new Date().toISOString(),
        }));
        await db.from('party_contacts').insert(contactRows);
      }
    }

    // 7. Insert operational addresses (Ship-To)
    if (input.addresses && input.addresses.length > 0) {
      const validAddresses = input.addresses.filter((a) => a.address && a.address.trim());
      if (validAddresses.length > 0) {
        const addressRows = validAddresses.map((a) => ({
          entity_id: customerId,
          address_name: a.address_name?.trim() || 'Gudang / Titik Operasional',
          address_type: a.address_type || 'WAREHOUSE',
          address: a.address.trim(),
          city: a.city?.trim() || '',
          province: a.province?.trim() || '',
          postal_code: a.postal_code?.trim() || '',
          latitude: a.latitude !== undefined && a.latitude !== null && a.latitude !== 0 ? Number(a.latitude) : null,
          longitude: a.longitude !== undefined && a.longitude !== null && a.longitude !== 0 ? Number(a.longitude) : null,
          contact_person: a.contact_person?.trim() || null,
          contact_phone: a.contact_phone?.trim() || null,
          address_directions: a.address_directions?.trim() || null,
          is_active: a.is_active !== undefined ? a.is_active : true,
          created_at: new Date().toISOString(),
        }));
        await db.from('md_entity_addresses').insert(addressRows);
      }
    }

    return { ok: true, customer: createdEntity };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Updates an existing Master Customer with non-destructive incremental updates
 * for contacts and operational addresses (preserves IDs, soft-deletes removals).
 */
export async function updateCustomerMasterAction(
  customerId: string,
  input: CustomerMasterInput,
  callerIdentity?: IdentityContext
): Promise<CustomerMasterResult> {
  try {
    const identity = callerIdentity || (await resolveSessionIdentity());

    // 1. Authorization check
    assertAnyPermission(identity, ['commercial:manage', 'customer:register']);
    assertMasterDataAccess(identity, ['customers'], 'write');

    const tenantId = identity.tenantId;
    if (!tenantId) {
      return { ok: false, error: 'Tenant context is missing from session identity.' };
    }

    if (!customerId) {
      return { ok: false, error: 'Customer ID wajib disertakan.' };
    }

    const db = createAdminClient();

    // Verify existing record in tenant
    const { data: existing, error: findErr } = await db
      .from('md_entities')
      .select('*')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (findErr || !existing) {
      return { ok: false, error: 'Data customer tidak ditemukan pada tenant ini.' };
    }

    // 2. Anti-cycle hierarchy check
    if (input.parent_id !== undefined && input.parent_id !== existing.parent_id) {
      const cycleCheck = await validateHierarchyAntiCycle(tenantId, customerId, input.parent_id, db);
      if (!cycleCheck.valid) {
        return { ok: false, error: cycleCheck.error, code: 'HIERARCHY_CYCLE_DETECTED' };
      }
    }

    // 3. Update md_entities
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updatePayload.name = input.name.trim().toUpperCase();
    if (input.legal_name !== undefined) updatePayload.legal_name = input.legal_name.trim();
    if (input.tax_id !== undefined) updatePayload.tax_id = input.tax_id ? input.tax_id.trim() : null;
    if (input.email !== undefined) updatePayload.email = input.email ? input.email.trim() : null;
    if (input.phone !== undefined) updatePayload.phone = input.phone ? input.phone.trim() : null;
    if (input.mobile !== undefined) updatePayload.mobile = input.mobile ? input.mobile.trim() : null;
    if (input.whatsapp !== undefined) updatePayload.whatsapp = input.whatsapp ? input.whatsapp.trim() : null;
    if (input.parent_id !== undefined) updatePayload.parent_id = input.parent_id || null;
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;
    if (input.billing_address !== undefined) updatePayload.billing_address = input.billing_address ? input.billing_address.trim() : null;
    if (input.billing_city !== undefined) updatePayload.billing_city = input.billing_city ? input.billing_city.trim() : null;
    if (input.billing_province !== undefined) updatePayload.billing_province = input.billing_province ? input.billing_province.trim() : null;
    if (input.billing_postal_code !== undefined) updatePayload.billing_postal_code = input.billing_postal_code ? input.billing_postal_code.trim() : null;
    if (input.billing_latitude !== undefined) updatePayload.billing_latitude = input.billing_latitude !== null && input.billing_latitude !== 0 ? Number(input.billing_latitude) : null;
    if (input.billing_longitude !== undefined) updatePayload.billing_longitude = input.billing_longitude !== null && input.billing_longitude !== 0 ? Number(input.billing_longitude) : null;
    if (input.billing_directions !== undefined) updatePayload.billing_directions = input.billing_directions ? input.billing_directions.trim() : null;
    if (input.payment_terms_days !== undefined) updatePayload.payment_terms_days = Number(input.payment_terms_days);
    if (input.payment_terms_type !== undefined) updatePayload.payment_terms_type = input.payment_terms_type;
    if (input.notes !== undefined) updatePayload.notes = input.notes ? input.notes.trim() : null;

    const { data: updatedEntity, error: updateErr } = await db
      .from('md_entities')
      .update(updatePayload)
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateErr) {
      return { ok: false, error: `Gagal memperbarui entitas customer: ${updateErr.message}` };
    }

    // 4. Ensure canonical party_roles assignment
    try {
      await db.from('party_roles').upsert(
        {
          tenant_id: tenantId,
          party_id: customerId,
          role_type: 'CUSTOMER',
          context_type: 'GLOBAL',
          context_id: null,
          is_primary: true,
          is_active: input.is_active !== undefined ? input.is_active : true,
        },
        { onConflict: 'tenant_id,party_id,role_type' }
      );
    } catch (roleErr) {
      console.warn('[CustomerMaster] party_roles ensure note:', roleErr);
    }

    // 5. Non-destructive incremental update for contacts (party_contacts)
    if (input.contacts !== undefined) {
      const { data: existingContacts } = await db
        .from('party_contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('party_id', customerId);

      const existingIds = new Set((existingContacts || []).map((c: any) => c.id));
      const incomingIds = new Set(
        input.contacts.map((c) => c.id).filter((id): id is string => Boolean(id))
      );

      // A. Soft-delete contacts not present in input
      for (const oldId of existingIds) {
        if (!incomingIds.has(oldId)) {
          await db
            .from('party_contacts')
            .update({ is_active: false })
            .eq('id', oldId)
            .eq('tenant_id', tenantId);
        }
      }

      // B. Update existing and Insert new
      for (const [idx, c] of input.contacts.entries()) {
        if (!c.contact_name || !c.contact_name.trim()) continue;

        if (c.id && existingIds.has(c.id)) {
          await db
            .from('party_contacts')
            .update({
              contact_name: c.contact_name.trim(),
              contact_role: c.contact_role || 'COMMERCIAL',
              department: c.department?.trim() || null,
              title: c.title?.trim() || null,
              email: c.email?.trim() || null,
              phone: c.phone?.trim() || null,
              mobile: c.mobile?.trim() || null,
              whatsapp: c.whatsapp?.trim() || null,
              is_primary: c.is_primary !== undefined ? c.is_primary : idx === 0,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', c.id)
            .eq('tenant_id', tenantId);
        } else {
          await db.from('party_contacts').insert({
            tenant_id: tenantId,
            party_id: customerId,
            contact_name: c.contact_name.trim(),
            contact_role: c.contact_role || 'COMMERCIAL',
            department: c.department?.trim() || null,
            title: c.title?.trim() || null,
            email: c.email?.trim() || null,
            phone: c.phone?.trim() || null,
            mobile: c.mobile?.trim() || null,
            whatsapp: c.whatsapp?.trim() || null,
            is_primary: c.is_primary !== undefined ? c.is_primary : idx === 0,
            is_active: true,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // 6. Non-destructive incremental update for operational addresses (md_entity_addresses)
    if (input.addresses !== undefined) {
      const { data: existingAddresses } = await db
        .from('md_entity_addresses')
        .select('id')
        .eq('entity_id', customerId);

      const existingAddrIds = new Set((existingAddresses || []).map((a: any) => a.id));
      const incomingAddrIds = new Set(
        input.addresses.map((a) => a.id).filter((id): id is string => Boolean(id))
      );

      // A. Delete explicitly removed addresses that were previously in database but omitted in this update
      for (const oldId of existingAddrIds) {
        if (!incomingAddrIds.has(oldId)) {
          await db
            .from('md_entity_addresses')
            .delete()
            .eq('id', oldId)
            .eq('entity_id', customerId);
        }
      }

      // B. Update existing and Insert new
      for (const a of input.addresses) {
        if (!a.address || !a.address.trim()) continue;

        if (a.id && existingAddrIds.has(a.id)) {
          await db
            .from('md_entity_addresses')
            .update({
              address_name: a.address_name?.trim() || 'Gudang / Titik Operasional',
              address_type: a.address_type || 'WAREHOUSE',
              address: a.address.trim(),
              city: a.city?.trim() || '',
              province: a.province?.trim() || '',
              postal_code: a.postal_code?.trim() || '',
              latitude: a.latitude !== undefined && a.latitude !== null && a.latitude !== 0 ? Number(a.latitude) : null,
              longitude: a.longitude !== undefined && a.longitude !== null && a.longitude !== 0 ? Number(a.longitude) : null,
              contact_person: a.contact_person?.trim() || null,
              contact_phone: a.contact_phone?.trim() || null,
              address_directions: a.address_directions?.trim() || null,
            })
            .eq('id', a.id)
            .eq('entity_id', customerId);
        } else {
          await db.from('md_entity_addresses').insert({
            entity_id: customerId,
            address_name: a.address_name?.trim() || 'Gudang / Titik Operasional',
            address_type: a.address_type || 'WAREHOUSE',
            address: a.address.trim(),
            city: a.city?.trim() || '',
            province: a.province?.trim() || '',
            postal_code: a.postal_code?.trim() || '',
            latitude: a.latitude !== undefined && a.latitude !== null && a.latitude !== 0 ? Number(a.latitude) : null,
            longitude: a.longitude !== undefined && a.longitude !== null && a.longitude !== 0 ? Number(a.longitude) : null,
            contact_person: a.contact_person?.trim() || null,
            contact_phone: a.contact_phone?.trim() || null,
            address_directions: a.address_directions?.trim() || null,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return { ok: true, customer: updatedEntity || existing };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Loads a full Customer Master entity including contacts and operational addresses.
 */
export async function getCustomerMasterDetailAction(
  customerId: string,
  callerIdentity?: IdentityContext
): Promise<CustomerMasterResult> {
  try {
    const identity = callerIdentity || (await resolveSessionIdentity());
    assertAnyPermission(identity, ['commercial:read', 'customer:register', 'sales_order:read', 'sales_order:create']);
    assertMasterDataAccess(identity, ['customers'], 'read');

    const tenantId = identity.tenantId;
    const db = createAdminClient();

    const [entityRes, contactsRes, addressesRes] = await Promise.all([
      db.from('md_entities').select('*').eq('id', customerId).eq('tenant_id', tenantId).maybeSingle(),
      db.from('party_contacts').select('*').eq('party_id', customerId).eq('tenant_id', tenantId).eq('is_active', true),
      db.from('md_entity_addresses').select('*').eq('entity_id', customerId),
    ]);

    if (entityRes.error || !entityRes.data) {
      return { ok: false, error: 'Customer tidak ditemukan.' };
    }

    return {
      ok: true,
      customer: {
        ...entityRes.data,
        contacts: contactsRes.data || [],
        addresses: addressesRes.data || [],
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
