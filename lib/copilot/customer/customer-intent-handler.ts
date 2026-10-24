/**
 * Sentralogis — AI Copilot Customer Intent Handler
 * lib/copilot/customer/customer-intent-handler.ts
 *
 * Implements canonical Customer Intent routing and handling:
 * - CUSTOMER_SEARCH: Search customer master entities with server-derived tenant isolation
 * - CUSTOMER_CREATE: Guided registration flow with authorization checks, duplicate detection & review
 * - STANDALONE_CUSTOMER_NAME: Company/entity names sent without active context
 * - CUSTOMER_NAME_INPUT: Contextual integration with ConversationalOrderWorkspace
 *
 * Invariants:
 * - Never calls OperationalLiveReadGateway for customer operations.
 * - Never produces 'Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid.'
 * - Strict server-side authorization: hq_cs has customer search and draft order authoring,
 *   while master customer persistence requires commercial:manage.
 * - Multi-tenant isolation: always filters md_entities by tenant_id.
 * - Testable: supports database client injection.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface CustomerHandlingResult {
  handled: boolean;
  type: 'text' | 'action_proposal' | 'clarification';
  content: string;
  proposal?: any;
  status: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'REQUIRES_CLARIFICATION';
  results?: Array<{ id: string; name: string; code?: string | null; is_active?: boolean }>;
}

let _customerDbClient: any = null;

export function _setCustomerDbClient(client: any): void {
  _customerDbClient = client;
}

export interface PendingCustomerRegistration {
  candidateName: string;
  lastUpdated: number;
}

// In-memory pending registrations cache keyed by tenantId:userId:conversationId
const pendingRegistrations = new Map<string, PendingCustomerRegistration>();

function getPendingKey(identity: IdentityContext, conversationId?: string): string {
  const cId = (!conversationId || conversationId === 'default' || conversationId === 'default-session') ? 'default' : conversationId;
  return `${identity.tenantId}:${identity.userId}:${cId}`;
}

function getDb(): any {
  if (_customerDbClient) return _customerDbClient;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !url.startsWith('http') || url.includes('256')) {
      throw new Error('Supabase client unconfigured in environment');
    }
    return supabaseAdmin;
  } catch {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            ilike: () => ({
              limit: async () => ({ data: [], error: null }),
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: new Error('Database unavailable') }),
          }),
        }),
      }),
    };
  }
}

export class CustomerIntentHandler {
  /**
   * Resets all pending registrations (useful for tests).
   */
  static resetPendingRegistrations(): void {
    pendingRegistrations.clear();
  }

  /**
   * Retrieves any pending customer registration candidate for this session.
   */
  static getPendingRegistration(identity: IdentityContext, conversationId?: string): PendingCustomerRegistration | null {
    const key = getPendingKey(identity, conversationId);
    let pending = pendingRegistrations.get(key);
    if (!pending) {
      pending = pendingRegistrations.get(`${identity.tenantId}:${identity.userId}:default`);
    }
    if (pending && Date.now() - pending.lastUpdated > 15 * 60 * 1000) {
      pendingRegistrations.delete(key);
      pendingRegistrations.delete(`${identity.tenantId}:${identity.userId}:default`);
      return null;
    }
    return pending || null;
  }

  /**
   * Saves a pending customer registration candidate for this session.
   */
  static savePendingRegistration(identity: IdentityContext, candidateName: string, conversationId?: string): void {
    const item: PendingCustomerRegistration = { candidateName, lastUpdated: Date.now() };
    const key = getPendingKey(identity, conversationId);
    pendingRegistrations.set(key, item);
    pendingRegistrations.set(`${identity.tenantId}:${identity.userId}:default`, item);
  }

  /**
   * Clears any pending customer registration candidate for this session.
   */
  static clearPendingRegistration(identity: IdentityContext, conversationId?: string): void {
    const key = getPendingKey(identity, conversationId);
    pendingRegistrations.delete(key);
    pendingRegistrations.delete(`${identity.tenantId}:${identity.userId}:default`);
  }

  /**
   * Evaluates if the user input expresses an intent to search customers.
   */
  static isCustomerSearchIntent(input: string): boolean {
    const trimmed = input.trim().toLowerCase();
    
    // Explicit customer search phrasing
    if (
      /\b(cari|cek|lihat|temukan|daftar|list)\s+(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /^(apakah\s+ada|ada)\s+(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /^(pelanggan|customer|klien)\s+/i.test(trimmed) ||
      /^daftar\s+(pelanggan|customer)$/i.test(trimmed) ||
      /^customer$/i.test(trimmed) ||
      /^pelanggan$/i.test(trimmed)
    ) {
      return true;
    }

    // Pattern: "apakah ada customer ABC?" or "apakah ada pelanggan ABC?"
    if (/apakah\s+ada\s+(?:customer|pelanggan)\b/i.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates if the user input expresses an intent to create a new customer entity.
   */
  static isCustomerCreateIntent(input: string, identity?: IdentityContext, conversationId?: string): boolean {
    const trimmed = input.trim().toLowerCase();

    // Must not be an order creation intent (e.g. "buat order pelanggan")
    if (/\b(order|pesanan|so|sales order)\b/i.test(trimmed)) {
      return false;
    }

    // Check if there is a pending registration waiting for confirmation
    if (identity) {
      const pending = this.getPendingRegistration(identity, conversationId);
      if (pending) {
        // Affirmative confirmation ("YA", "ya", "setuju", "ok", "daftarkan", "simpan", "lanjut")
        if (/^(ya|ya,?\s*daftarkan|daftarkan|setuju|ok|yes|simpan|lanjut|lanjutkan)$/i.test(trimmed)) {
          return true;
        }
        // Cancellation of pending registration
        if (/^(batal|batalkan|cancel|tidak|jangan|hentikan)$/i.test(trimmed)) {
          return true;
        }
      }
    }

    return (
      /\b(ya,?\s*)?(buat|tambah|daftarkan|registrasi|bikin)\s+(pelanggan|customer|klien)\s+baru\b/i.test(trimmed) ||
      /\b(ya,?\s*)?(buat|tambah|daftarkan|registrasi|bikin)\s+(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /\bya,?\s*daftarkan\b/i.test(trimmed) ||
      /\b(pelanggan|customer|klien)\s+baru\b/i.test(trimmed) ||
      /\bdaftarkan\s+(pelanggan|customer)\b/i.test(trimmed)
    );
  }

  /**
   * Evaluates if the input looks like a company or standalone customer name
   * sent without an active command context.
   */
  static isStandaloneCustomerName(input: string): boolean {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Reject operational numbers, commands, and keywords
    if (/^(jo|wo|so|shp|inv)[-_0-9]/i.test(trimmed)) return false;
    if (/^(halo|hai|pagi|siang|sore|malam|batal|cancel|assign|ganti|tampilkan|lihat|cari|cek|status|buka|open|detail)\b/i.test(trimmed)) return false;
    if (/\b(job order|work order|sales order|shipment|invoice|driver|supir|truk|armada)\b/i.test(lower)) return false;

    // Corporate entity prefixes (PT, CV, UD, TBK, LTD, INC)
    if (/^(pt|cv|ud|tbk|ltd|inc)\.?\s+[A-Za-z0-9\s.,-]{3,60}$/i.test(trimmed)) {
      return true;
    }

    // Common corporate keywords in logistics / trading / manufacturing
    const corporateKeywords = [
      'logistik', 'logistics', 'transport', 'transporter', 'kargo', 'cargo',
      'trading', 'perdana', 'sukses', 'makmur', 'sejahtera', 'abadi', 'sentosa',
      'mandiri', 'persada', 'jaya', 'pratama', 'aneka', 'bangun', 'cemerlang',
      'utama', 'samudera', 'nusantara', 'berkah', 'mitra'
    ];

    const tokens = lower.split(/\s+/);
    if (tokens.length >= 2 && tokens.length <= 6) {
      const hasCorpKeyword = corporateKeywords.some((k) => lower.includes(k));
      if (hasCorpKeyword) return true;
    }

    return false;
  }

  /**
   * Extracts search term from customer search query.
   */
  static extractSearchTerm(input: string): string {
    const clean = input.trim()
      .replace(/^[\s,.;!?-]+|[\s,.;!?-]+$/g, '')
      .replace(/^(apakah\s+ada|tolong\s+)?(cari|cek|lihat|temukan|daftar)\s+(pelanggan|customer|klien)\s*/i, '')
      .replace(/^(pelanggan|customer|klien)\s*/i, '')
      .replace(/^(apakah\s+ada)\s+(pelanggan|customer|klien)\s*/i, '')
      .replace(/\?+$/, '')
      .trim();

    return clean;
  }

  /**
   * Handles customer search queries.
   */
  static async handleCustomerSearch(
    input: string,
    identity: IdentityContext,
  ): Promise<CustomerHandlingResult> {
    // 1. Authorization Gate: require commercial:read or sales_order permissions
    try {
      assertAnyPermission(identity, [
        'commercial:read',
        'sales_order:read',
        'sales_order:create',
      ]);
    } catch {
      const role = identity.role || 'user';
      return {
        handled: true,
        type: 'text',
        status: 'BLOCKED',
        content: `Akses ditolak: Pencarian master Customer memerlukan izin 'commercial:read'. Akun Anda dengan role **${role}** tidak memiliki izin komersial tersebut. Silakan hubungi administrator komersial jika Anda memerlukan akses data pelanggan.`,
      };
    }

    const term = this.extractSearchTerm(input);
    const cleanCore = term
      .replace(/^(PT|CV|UD|TBK|LTD|INC)\.?\s+/i, '')
      .replace(/[\s,.-]+/g, ' ')
      .trim();

    const db = getDb();

    let query = db
      .from('md_entities')
      .select('id, name, entity_code, legal_name, is_active')
      .eq('tenant_id', identity.tenantId);

    if (term.length > 0) {
      if (typeof query.or === 'function' && cleanCore.length > 0) {
        query = query.or(
          `name.ilike.%${cleanCore}%,legal_name.ilike.%${cleanCore}%,entity_code.ilike.%${cleanCore}%,name.ilike.%${term}%`
        );
      } else {
        query = query.ilike('name', `%${cleanCore || term}%`);
      }
    }

    let rows: any[] = [];
    try {
      const qOrdered = typeof query.order === 'function' ? query.order('name', { ascending: true }) : query;
      const { data, error } = await qOrdered.limit(10);
      if (error) {
        console.error('[CustomerIntentHandler] Search error:', error);
      }
      rows = data || [];
    } catch (err) {
      console.error('[CustomerIntentHandler] Search query exception:', err);
    }

    // Zero matches
    if (rows.length === 0) {
      const displayTerm = term || 'yang dicari';
      return {
        handled: true,
        type: 'text',
        status: 'NOT_FOUND',
        content:
          `Customer **${displayTerm}** tidak ditemukan pada data master.\n\n` +
          `Apakah Anda ingin mendaftarkan customer baru atau mencari dengan kata kunci lain?\n\n` +
          `- [Buka Form Buat Sales Order](/commercial/sales-orders/create) • [Buka Master Kontak](/hq/master/contacts)`,
        results: [],
      };
    }

    // Exactly 1 match
    if (rows.length === 1) {
      const c = rows[0];
      const statusLabel = c.is_active !== false ? 'AKTIF' : 'NON-AKTIF';
      const codeLabel = c.entity_code ? ` (Kode: \`${c.entity_code}\`)` : '';
      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content:
          `Ditemukan data customer master:\n\n` +
          `- **${c.name}**${codeLabel}\n` +
          `  - ID Kanonik: \`${c.id}\`\n` +
          `  - Status: **${statusLabel}**\n\n` +
          `*Apakah Anda ingin membuat pesanan untuk customer ini?*\n` +
          `Ketik **"buat order untuk ${c.name}"** atau buka [Form Buat Sales Order](/commercial/sales-orders/create?customerId=${c.id}&customer=${encodeURIComponent(c.name)}).`,
        results: rows,
      };
    }

    // Multiple matches
    const listItems = rows
      .map((c: any) => `- **${c.name}**${c.entity_code ? ` (Kode: \`${c.entity_code}\`)` : ''} — ID: \`${c.id}\``)
      .join('\n');

    return {
      handled: true,
      type: 'text',
      status: 'SUCCESS',
      content:
        `Ditemukan **${rows.length}** customer pada data master:\n\n` +
        `${listItems}\n\n` +
        `*Silakan sebutkan nama lengkap customer untuk memilih atau memulai pembuatan order.*`,
      results: rows,
    };
  }

  /**
   * Handles standalone customer name queries sent without active flow.
   */
  static async handleStandaloneCustomerName(
    input: string,
    identity: IdentityContext,
  ): Promise<CustomerHandlingResult> {
    const rawName = input.trim();

    // Check permission to read customer data
    let canReadCustomer = false;
    try {
      assertAnyPermission(identity, [
        'commercial:read',
        'customer_visibility:read',
        'sales_order:read',
        'sales_order:create',
      ]);
      canReadCustomer = true;
    } catch {
      canReadCustomer = false;
    }

    if (!canReadCustomer) {
      return {
        handled: true,
        type: 'text',
        status: 'BLOCKED',
        content:
          `Entitas **"${rawName}"** terdeteksi sebagai nama pelanggan / rekanan.\n\n` +
          `Akun Anda saat ini tidak memiliki izin pembacaan data komersial pelanggan. Silakan hubungi administrator komersial untuk bantuan lebih lanjut.`,
      };
    }

    const db = getDb();
    const cleanCore = rawName
      .replace(/^(PT|CV|UD|TBK|LTD|INC)\.?\s+/i, '')
      .replace(/[\s,.-]+/g, ' ')
      .trim();

    let rows: any[] = [];
    try {
      let query = db
        .from('md_entities')
        .select('id, name, entity_code, legal_name, is_active')
        .eq('tenant_id', identity.tenantId);

      if (typeof query.or === 'function' && cleanCore.length > 0) {
        query = query.or(
          `name.ilike.%${cleanCore}%,legal_name.ilike.%${cleanCore}%,entity_code.ilike.%${cleanCore}%,name.ilike.%${rawName}%`
        );
      } else {
        query = query.ilike('name', `%${cleanCore || rawName}%`);
      }

      const { data } = await query.limit(5);
      rows = data || [];
    } catch (err) {
      console.error('[CustomerIntentHandler] Standalone name lookup error:', err);
    }

    if (rows.length === 1) {
      const c = rows[0];
      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content:
          `Ditemukan data customer master untuk **"${rawName}":**\n\n` +
          `- **${c.name}** (Kode: \`${c.entity_code || '-'}\`, ID: \`${c.id}\`)\n` +
          `  Status: **${c.is_active !== false ? 'AKTIF' : 'NON-AKTIF'}**\n\n` +
          `Apakah tindakan yang ingin Anda lakukan?\n` +
          `1. **Buat Order Baru:** Ketik *"buat order baru untuk ${c.name}"* atau buka [Form Buat Sales Order](/commercial/sales-orders/create?customerId=${c.id}&customer=${encodeURIComponent(c.name)})\n` +
          `2. **Cek Transaksi:** Ketik *"cek order ${c.name}"*`,
        results: rows,
      };
    }

    if (rows.length > 1) {
      const listItems = rows
        .map((c: any) => `- **${c.name}** (Kode: \`${c.entity_code || '-'}\`, ID: \`${c.id}\`)`)
        .join('\n');
      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content:
          `Ditemukan beberapa customer dengan nama yang relevan pada data master:\n\n` +
          `${listItems}\n\n` +
          `Silakan sebutkan nama lengkap atau instruksi yang ingin Anda jalankan (misalnya: *"buat order baru untuk ${rows[0].name}"*).`,
        results: rows,
      };
    }

    // Not found in master
    return {
      handled: true,
      type: 'text',
      status: 'NOT_FOUND',
      content:
        `Customer dengan nama **"${rawName}"** belum terdaftar pada data master tenant Anda.\n\n` +
        `Apakah Anda bermaksud:\n` +
        `1. **Mendaftarkan customer baru:** Ketik *"daftarkan customer baru ${rawName}"*\n` +
        `2. **Membuat Sales Order baru:** Ketik *"buat order baru"*\n` +
        `3. **Mencari dengan nama lain:** Ketik *"cari pelanggan [Nama]"*`,
      results: [],
    };
  }

  /**
   * Handles customer creation / registration requests.
   */
  static async handleCustomerCreate(
    input: string,
    identity: IdentityContext,
    conversationId?: string,
  ): Promise<CustomerHandlingResult> {
    const trimmedInput = input.trim();
    const isCancel = /^(batal|batalkan|cancel|tidak|jangan|hentikan)$/i.test(trimmedInput);

    // 1. Authorization check: requires commercial:manage or customer:register
    let hasRegisterAuth = false;
    try {
      assertAnyPermission(identity, ['commercial:manage', 'customer:register']);
      hasRegisterAuth = true;
    } catch {
      hasRegisterAuth = false;
    }

    if (!hasRegisterAuth) {
      const role = identity.role || 'user';
      return {
        handled: true,
        type: 'text',
        status: 'BLOCKED',
        content:
          `Akses ditolak: Pendaftaran entitas Customer baru memerlukan izin 'customer:register' atau 'commercial:manage'.\n\n` +
          `Akun Anda dengan role **${role}** tidak memiliki izin pendaftaran pelanggan ke database master.\n\n` +
          `Silakan hubungi administrator atau ajukan pembuatan pesanan melalui [Form Buat Sales Order](/commercial/sales-orders/create).`,
      };
    }

    // Check if user is cancelling a pending registration
    const pending = this.getPendingRegistration(identity, conversationId);
    if (isCancel && pending) {
      this.clearPendingRegistration(identity, conversationId);
      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content: `Pendaftaran customer baru **"${pending.candidateName}"** telah dibatalkan. Tidak ada data yang disimpan ke database master.`,
      };
    }

    // 2. Extract potential candidate name from input or retrieve from pending session
    const clean = trimmedInput
      .replace(/^(ya,?\s*daftarkan|buat|tambah|daftarkan|registrasi|bikin)\s+(?:pelanggan|customer|klien)?\s*(?:baru\s+)?/i, '')
      .replace(/^(pelanggan|customer|klien)\s+baru\s*/i, '')
      .replace(/^nama\s+(?:resmi\s+)?(?:customer\s+)?/i, '')
      .replace(/\?+$/, '')
      .trim();

    // Check if input is an affirmative confirmation command like "Ya, daftarkan PT XYZ", or simple "YA" / "setuju"
    const isAffirmative = /^(ya,?\s*daftarkan|ya\b|setuju\b|konfirmasi\b|ok\b|yes\b|simpan\b|lanjut\b|lanjutkan\b)/i.test(trimmedInput);
    let candidateName = '';

    if (isAffirmative) {
      const remainder = trimmedInput
        .replace(/^(ya,?\s*daftarkan|ya\b|setuju\b|konfirmasi\b|ok\b|yes\b|simpan\b|lanjut\b|lanjutkan\b)\s*(?:customer|pelanggan)?\s*(?:baru)?\s*/i, '')
        .trim();
      candidateName = remainder || (pending ? pending.candidateName : '');
    } else {
      candidateName = clean;
    }

    if (!candidateName || candidateName.toLowerCase() === 'baru') {
      return {
        handled: true,
        type: 'text',
        status: 'REQUIRES_CLARIFICATION',
        content:
          `Silakan sebutkan nama resmi customer/pelanggan yang ingin Anda daftarkan ke data master (misalnya: *PT Samudera Logistik Makmur*).`,
      };
    }

    const db = getDb();

    // 3. Pre-flight idempotency check: Does customer with identical or near-exact name already exist in tenant?
    try {
      const { data: existingEntities } = await db
        .from('md_entities')
        .select('id, name, entity_code, is_active')
        .eq('tenant_id', identity.tenantId)
        .ilike('name', candidateName)
        .limit(1);

      if (existingEntities && existingEntities.length > 0) {
        const existing = existingEntities[0];
        this.clearPendingRegistration(identity, conversationId);
        return {
          handled: true,
          type: 'text',
          status: 'SUCCESS',
          content:
            `Customer **${existing.name}** sudah terdaftar pada database master tenant Anda:\n\n` +
            `- **Nama:** **${existing.name}**\n` +
            `- **Kode:** \`${existing.entity_code || '-'}\`\n` +
            `- **ID Kanonik:** \`${existing.id}\`\n` +
            `- **Status:** **${existing.is_active !== false ? 'AKTIF' : 'NON-AKTIF'}**\n\n` +
            `Entitas ini dapat langsung digunakan untuk transaksi pesanan.\n\n` +
            `Ketik **"buat order untuk ${existing.name}"** untuk membuat Sales Order, atau buka [Form Buat Sales Order](/commercial/sales-orders/create?customerId=${existing.id}&customer=${encodeURIComponent(existing.name)}).`,
          results: [existing],
        };
      }
    } catch (checkErr) {
      console.error('[CustomerIntentHandler] Pre-flight existing check error:', checkErr);
    }

    // 4. Check for duplicates/similar names before creation
    let duplicates: any[] = [];
    try {
      const token = candidateName
        .replace(/\b(PT|CV|UD|TBK|LTD|INC)\b/gi, '')
        .trim()
        .split(/\s+/)[0] || candidateName;

      const { data } = await db
        .from('md_entities')
        .select('id, name, entity_code')
        .eq('tenant_id', identity.tenantId)
        .ilike('name', `%${token}%`)
        .limit(3);
      duplicates = (data || []).filter((d: any) => d.name.toLowerCase() !== candidateName.toLowerCase());
    } catch (err) {
      console.error('[CustomerIntentHandler] Duplicate check error:', err);
    }

    // If confirmation is given ("Ya, daftarkan [Nama]" or "YA" with pending registration):
    if (isAffirmative && candidateName.length >= 3) {
      const cleanEntityCode = candidateName
        .toUpperCase()
        .replace(/\b(PT|CV|TBK|LTD|INC)\b/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6) || 'CUS';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const generatedCode = `${cleanEntityCode}-${randomSuffix}`;

      let createdEntity: any = null;
      let insertError: any = null;

      try {
        const { data, error } = await db
          .from('md_entities')
          .insert({
            tenant_id: identity.tenantId,
            entity_code: generatedCode,
            name: candidateName,
            is_customer: true,
            is_active: true,
          })
          .select('id, name, entity_code, is_active')
          .single();

        createdEntity = data;
        insertError = error;

        // Maintain canonical party_roles assignment (party_roles = CANONICAL, is_* = COMPATIBILITY PROJECTION)
        if (createdEntity && !insertError) {
          try {
            await db.from('party_roles').insert({
              tenant_id: identity.tenantId,
              party_id: createdEntity.id,
              role_type: 'CUSTOMER',
              context_type: 'GLOBAL',
              context_id: null,
              is_primary: true,
              is_active: true,
            });
          } catch (roleErr) {
            console.error('[CustomerIntentHandler] party_roles insert error (non-fatal):', roleErr);
          }
        }
      } catch (err: any) {
        insertError = err;
      }

      if (insertError || !createdEntity) {
        return {
          handled: true,
          type: 'text',
          status: 'BLOCKED',
          content: `Gagal mendaftarkan customer baru ke database: ${insertError?.message || 'Database error'}. Silakan coba kembali.`,
        };
      }

      // Clear pending candidate on success
      this.clearPendingRegistration(identity, conversationId);

      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content:
          `Customer baru berhasil didaftarkan ke data master:\n\n` +
          `- **Nama:** **${createdEntity.name}**\n` +
          `- **Kode:** \`${createdEntity.entity_code}\`\n` +
          `- **ID Kanonik:** \`${createdEntity.id}\`\n` +
          `- **Tenant:** \`${identity.tenantId.slice(0, 8)}...\`\n\n` +
          `Customer kini siap digunakan untuk transaksi operasional dan pesanan penjualan (Sales Order).\n\n` +
          `**Langkah Selanjutnya:**\n` +
          `Apakah Anda ingin lanjut membuat Sales Order untuk customer ini? Ketik *"buat order baru untuk ${createdEntity.name}"* atau ketik *"selesai"* jika hanya mendaftarkan customer.\n\n` +
          `[Buka Form Buat Sales Order](/commercial/sales-orders/create?customerId=${createdEntity.id}&customer=${encodeURIComponent(createdEntity.name)}) • [Buka Master Kontak](/hq/master/contacts)`,
        results: [createdEntity],
      };
    }

    // Save pending registration candidate into session cache for subsequent turn confirmation
    this.savePendingRegistration(identity, candidateName, conversationId);

    // Display summary for review before mutation (EXECUTE: OFF safeguard)
    let warningMsg = '';
    if (duplicates.length > 0) {
      warningMsg = `> ⚠️ **Perhatian:** Ditemukan nama customer yang mirip pada database master:\n${duplicates.map((d: any) => `- *${d.name}* (Kode: \`${d.entity_code || '-'}\`)`).join('\n')}\n> Pastikan tidak membuat duplikasi entitas yang tidak disengaja.\n\n`;
    }

    return {
      handled: true,
      type: 'text',
      status: 'REQUIRES_CLARIFICATION',
      content:
        `### Ringkasan Pra-Pendaftaran Customer Baru (EXECUTE: OFF)\n\n` +
        `${warningMsg}` +
        `- **Nama Resmi Customer:** **${candidateName}**\n` +
        `- **Tenant Otorisasi:** \`${identity.tenantId.slice(0, 8)}...\`\n` +
        `- **Wewenang Pembuat:** Role \`${identity.role}\` (Disetujui)\n\n` +
        `Ketik **"Ya, daftarkan ${candidateName}"** atau ketik **"YA"** untuk menyimpan entitas customer secara resmi ke database master, atau ketik **"batal"** jika nama belum sesuai.`,
    };
  }
}
