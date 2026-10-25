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
import { generateNextCustomerCode } from '@/lib/actions/customer-master-actions';

export interface CustomerHandlingResult {
  handled: boolean;
  type: 'text' | 'action_proposal' | 'clarification';
  content: string;
  proposal?: any;
  status: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'REQUIRES_CLARIFICATION';
  results?: Array<{
    id: string;
    name: string;
    legal_name?: string | null;
    entity_code?: string | null;
    code?: string | null;
    phone?: string | null;
    email?: string | null;
    is_customer?: boolean;
    is_active?: boolean;
  }>;
}

let _customerDbClient: any = null;

export function _setCustomerDbClient(client: any): void {
  _customerDbClient = client;
}

export interface PendingCustomerRegistration {
  candidateName: string;
  lastUpdated: number;
}

export interface LastRegisteredCustomer {
  id: string;
  name: string;
  entity_code: string | null;
  lastUpdated: number;
}

// In-memory pending registrations cache keyed by tenantId:userId:conversationId
const pendingRegistrations = new Map<string, PendingCustomerRegistration>();
// In-memory last registered customer cache keyed by tenantId:userId:conversationId
const lastRegisteredCustomers = new Map<string, LastRegisteredCustomer>();

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
    lastRegisteredCustomers.clear();
  }

  /**
   * Retrieves the most recently confirmed customer registration for this session.
   */
  static getLastRegisteredCustomer(identity: IdentityContext, conversationId?: string): LastRegisteredCustomer | null {
    const key = getPendingKey(identity, conversationId);
    let last = lastRegisteredCustomers.get(key);
    const isDefaultConv = !conversationId || conversationId === 'default' || conversationId === 'default-session';
    if (!last && isDefaultConv) {
      last = lastRegisteredCustomers.get(`${identity.tenantId}:${identity.userId}:default`);
    }
    if (last && Date.now() - last.lastUpdated > 30 * 60 * 1000) {
      lastRegisteredCustomers.delete(key);
      if (isDefaultConv) {
        lastRegisteredCustomers.delete(`${identity.tenantId}:${identity.userId}:default`);
      }
      return null;
    }
    return last || null;
  }

  /**
   * Saves the most recently confirmed customer registration for this session.
   */
  static saveLastRegisteredCustomer(
    identity: IdentityContext,
    customer: { id: string; name: string; entity_code?: string | null },
    conversationId?: string,
  ): void {
    const item: LastRegisteredCustomer = {
      id: customer.id,
      name: customer.name,
      entity_code: customer.entity_code || null,
      lastUpdated: Date.now(),
    };
    const key = getPendingKey(identity, conversationId);
    lastRegisteredCustomers.set(key, item);
    lastRegisteredCustomers.set(`${identity.tenantId}:${identity.userId}:default`, item);
  }

  /**
   * Retrieves any pending customer registration candidate for this session.
   */
  static getPendingRegistration(identity: IdentityContext, conversationId?: string): PendingCustomerRegistration | null {
    const key = getPendingKey(identity, conversationId);
    let pending = pendingRegistrations.get(key);
    const isDefaultConv = !conversationId || conversationId === 'default' || conversationId === 'default-session';
    if (!pending && isDefaultConv) {
      pending = pendingRegistrations.get(`${identity.tenantId}:${identity.userId}:default`);
    }
    if (pending && Date.now() - pending.lastUpdated > 30 * 60 * 1000) {
      pendingRegistrations.delete(key);
      if (isDefaultConv) {
        pendingRegistrations.delete(`${identity.tenantId}:${identity.userId}:default`);
      }
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
   * Normalizes and extracts the official customer name from a user instruction,
   * ensuring instruction phrases like "nama pelanggan baru", "daftarkan customer baru",
   * "bernama", etc. never leak into the canonical customer name or legal_name.
   */
  static extractCandidateCustomerName(input: string): string {
    let clean = (input || '')
      .trim()
      .replace(/^[\s,.:;!?'"-]+|[\s,.:;!?'"-]+$/g, '')
      .trim();

    const prefixPatterns: RegExp[] = [
      /^(?:ya,?\s*daftarkan|ya,?\s*simpan|ya,?\s*lanjut(?:kan)?|tolong|mohon|silakan|coba|maaf)\b[\s,.:;-]*/i,
      /^(?:salah(?:\s+nama)?|bukan|keliru|ralat|koreksi|revisi|ganti|ubah|edit|perbarui|perbaiki)\b[\s,.:;-]*/i,
      /^(?:buat(?:kan)?|tambah(?:kan)?|daftarkan|daftar|registrasi(?:kan)?|bikin|simpan|input|masukkan)\b[\s,.:;-]*/i,
      /^(?:data|entitas|master|akun|profil)\b[\s,.:;-]*/i,
      /^(?:nama\s+resmi|nama\s+lengkap|nama\s+perusahaan|nama\s+yang\s+benar|nama\s+seharusnya|nama)\b[\s,.:;-]*/i,
      /^(?:pelanggan|customer|klien|rekanan|mitra)\s+baru\b[\s,.:;-]*/i,
      /^(?:pelanggan|customer|klien|rekanan|mitra)\b[\s,.:;-]*/i,
      /^(?:tadi|barusan|sebelumnya|baru|resmi)\b[\s,.:;-]*/i,
      /^(?:yang\s+benar|seharusnya|harusnya|maksud\s+saya|maksudnya)\b[\s,.:;-]*/i,
      /^(?:dengan\s+nama|atas\s+nama|bernama|menjadi|jadi|ke|yaitu|adalah|sebagai|untuk)\b[\s,.:;-]*/i,
    ];

    let changed = true;
    let safety = 0;
    while (changed && safety < 15) {
      changed = false;
      safety++;
      for (const pattern of prefixPatterns) {
        const next = clean.replace(pattern, '').trim();
        if (next !== clean) {
          clean = next.replace(/^[\s,.:;!?'"-]+/, '').trim();
          changed = true;
        }
      }
    }

    clean = clean.replace(/[\s,.:;!?'"-]+$/, '').trim();

    if (
      !clean ||
      clean.length < 2 ||
      /^(?:baru|pelanggan|customer|klien|nama|resmi|data|master|ya|ok|yes|setuju|lanjut|simpan)$/i.test(clean)
    ) {
      return '';
    }

    return clean;
  }

  /**
   * Evaluates if the user input expresses an intent to search or edit customers.
   */
  static isCustomerSearchIntent(input: string): boolean {
    const trimmed = input.trim().toLowerCase();

    // Reject operational numbers or non-customer edit targets
    if (/\b(job order|work order|sales order|shipment|invoice|jo|wo|so|shp|inv)\b/i.test(trimmed)) {
      return false;
    }

    // Customer edit / lookup intent (e.g. "edit PT UJI COBA TRANSPORT", "edit pelanggan PT X", "ubah customer PT X")
    if (
      /^(?:tolong\s+|mohon\s+)?(edit|ubah|update|perbarui|koreksi)\s+(?:data\s+)?(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /^(?:tolong\s+|mohon\s+)?(edit|ubah|update|perbarui|koreksi)\s+(?:pt|cv|ud|tbk|ltd|inc)\b/i.test(trimmed)
    ) {
      return true;
    }
    if (/^(?:tolong\s+|mohon\s+)?(edit|ubah|update|perbarui|koreksi)\s+(.+)$/i.test(trimmed)) {
      const m = trimmed.match(/^(?:tolong\s+|mohon\s+)?(?:edit|ubah|update|perbarui|koreksi)\s+(.+)$/i);
      if (m && this.isStandaloneCustomerName(m[1].trim())) {
        return true;
      }
    }

    // Explicit customer search phrasing
    if (
      /\b(cari|cek|lihat|temukan|daftar|list)\s+(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /^(apakah\s+ada|ada)\s+(pelanggan|customer|klien)\b/i.test(trimmed) ||
      /^(pelanggan|customer|klien)\s+(?!baru\b)/i.test(trimmed) ||
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

    // Must not be an edit/update/search intent (e.g. "edit PT UJI COBA TRANSPORT")
    if (/^(?:tolong\s+|mohon\s+)?(edit|ubah|update|perbarui|koreksi|cari|cek|lihat|temukan)\b/i.test(trimmed)) {
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
      /\bnama\s+(?:resmi\s+)?(pelanggan|customer|klien)\s+baru\b/i.test(trimmed) ||
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
    if (/^(halo|hai|pagi|siang|sore|malam|batal|cancel|assign|ganti|edit|ubah|update|perbarui|koreksi|tampilkan|lihat|cari|cek|status|buka|open|detail)\b/i.test(trimmed)) return false;
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
   * Extracts search term from customer search or edit query.
   */
  static extractSearchTerm(input: string): string {
    const clean = input.trim()
      .replace(/^[\s,.;!?-]+|[\s,.;!?-]+$/g, '')
      .replace(/^(?:apakah\s+ada|tolong|mohon)\s+/i, '')
      .replace(/^(?:cari|cek|lihat|temukan|daftar|edit|ubah|update|perbarui|koreksi)\s+(?:data\s+)?(?:pelanggan|customer|klien)?\s*(?:baru\s+)?/i, '')
      .replace(/^(?:pelanggan|customer|klien)\s*(?:baru\s+)?/i, '')
      .replace(/^(?:apakah\s+ada)\s+(?:pelanggan|customer|klien)\s*/i, '')
      .replace(/\?+$/, '')
      .trim();

    return clean;
  }

  /**
   * Handles customer search and customer edit lookup queries.
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

    const isEditRequest = /^(?:tolong\s+|mohon\s+)?(edit|ubah|update|perbarui|koreksi)\b/i.test(input.trim());
    const term = this.extractSearchTerm(input);
    const cleanCore = term
      .replace(/^(PT|CV|UD|TBK|LTD|INC)\.?\s+/i, '')
      .replace(/[\s,.-]+/g, ' ')
      .trim();

    const db = getDb();

    let query = db
      .from('md_entities')
      .select('id, name, entity_code, legal_name, phone, email, is_customer, is_active')
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
          `- [Buka Form Buat Sales Order](/commercial/sales-orders/create) • [Buka Master Kontak](/tenant/master/contacts) • [Master Kontak HQ](/hq/master/contacts)`,
        results: [],
      };
    }

    // Exactly 1 match
    if (rows.length === 1) {
      const c = rows[0];
      const statusLabel = c.is_active !== false ? 'AKTIF' : 'NON-AKTIF';
      const codeLabel = c.entity_code ? ` (Kode: \`${c.entity_code}\`)` : '';
      const legalLine = c.legal_name ? `  - Nama Resmi: **${c.legal_name}**\n` : '';
      const editGuidance = isEditRequest
        ? `*Untuk memperbarui data resmi, NPWP, alamat, atau kontak PIC customer **${c.name}**, silakan buka [Master Customer](/tenant/master/contacts) atau [Master Kontak HQ](/hq/master/contacts).*`
        : `*Apakah Anda ingin membuat pesanan atau memperbarui data customer ini?*`;
      return {
        handled: true,
        type: 'text',
        status: 'SUCCESS',
        content:
          `Ditemukan data customer master:\n\n` +
          `- **${c.name}**${codeLabel}\n` +
          legalLine +
          `  - ID Kanonik: \`${c.id}\`\n` +
          `  - Status: **${statusLabel}**\n\n` +
          `${editGuidance}\n` +
          `Ketik **"buat order untuk ${c.name}"**, buka [Form Buat Sales Order](/commercial/sales-orders/create?customerId=${c.id}&customer=${encodeURIComponent(c.name)}), atau [Edit di Master Customer](/tenant/master/contacts).`,
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
        `*Silakan sebutkan nama lengkap customer untuk memilih, melihat detail, atau memulai pembuatan order.*`,
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

    // 2. Extract and normalize candidate name from input or retrieve from pending session
    const clean = this.extractCandidateCustomerName(trimmedInput);

    // Check if input is an affirmative confirmation command like "Ya, daftarkan PT XYZ", or simple "YA" / "setuju"
    const isAffirmative = /^(ya,?\s*daftarkan|ya\b|setuju\b|konfirmasi\b|ok\b|yes\b|simpan\b|lanjut\b|lanjutkan\b)/i.test(trimmedInput);
    let candidateName = '';

    if (isAffirmative) {
      const remainderRaw = trimmedInput
        .replace(/^(ya,?\s*daftarkan|ya\b|setuju\b|konfirmasi\b|ok\b|yes\b|simpan\b|lanjut\b|lanjutkan\b)\s*/i, '')
        .trim();
      const remainderClean = this.extractCandidateCustomerName(remainderRaw);
      const pendingClean = pending ? this.extractCandidateCustomerName(pending.candidateName) || pending.candidateName : '';
      candidateName = remainderClean || pendingClean;
    } else {
      candidateName = clean;
    }

    if (!candidateName || candidateName.length < 2 || candidateName.toLowerCase() === 'baru') {
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
        .select('id, name, legal_name, entity_code, phone, email, is_customer, is_active')
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
      let generatedCode = `CUS-${new Date().getFullYear()}-0001`;
      try {
        generatedCode = await generateNextCustomerCode(identity.tenantId, db);
      } catch (codeErr) {
        console.error('[CustomerIntentHandler] generateNextCustomerCode fallback:', codeErr);
      }

      let createdEntity: any = null;
      let insertError: any = null;

      try {
        const { data, error } = await db
          .from('md_entities')
          .insert({
            tenant_id: identity.tenantId,
            entity_code: generatedCode,
            name: candidateName,
            legal_name: candidateName,
            phone: null,
            email: null,
            is_customer: true,
            is_active: true,
          })
          .select('id, name, legal_name, entity_code, phone, email, is_customer, is_active')
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

      // Clear pending candidate and record as last registered customer for potential post-confirm correction
      this.clearPendingRegistration(identity, conversationId);
      this.saveLastRegisteredCustomer(identity, createdEntity, conversationId);

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
          `[Buka Form Buat Sales Order](/commercial/sales-orders/create?customerId=${createdEntity.id}&customer=${encodeURIComponent(createdEntity.name)}) • [Buka Master Kontak](/tenant/master/contacts)`,
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

  /**
   * Evaluates if the user input expresses a customer name correction
   * (either for a pending registration draft or a recently confirmed customer entity,
   * or an explicit rename "koreksi/ubah/ralat nama pelanggan X menjadi Y").
   */
  static isCustomerCorrectionIntent(
    input: string,
    identity?: IdentityContext | null,
    conversationId?: string,
  ): boolean {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Exclude non-customer order field corrections (tujuan, asal, nilai, muatan, jumlah, qty, service, layanan, sbu)
    if (
      /^(?:ganti|ubah|ralat|koreksi)\s+(?:tujuan|asal|nilai|muatan|barang|komoditas|kargo|jumlah|kuantitas|qty|service|layanan|sbu)\b/i.test(
        trimmed,
      )
    ) {
      return false;
    }

    // 1. Explicit rename: "koreksi/ralat/ubah/ganti/edit/perbaiki nama [pelanggan/customer] X menjadi/jadi Y"
    if (
      /^(?:tolong\s+|mohon\s+|maaf\s+)?(?:koreksi|ralat|revisi|ubah|ganti|edit|perbarui|perbaiki)\s+nama\s+(?:pelanggan|customer|klien)?\s*.+\s+(?:menjadi|jadi|ke)\s+.+/i.test(
        trimmed,
      )
    ) {
      return true;
    }

    // 2. Contextual correction when pending registration or recently confirmed customer exists in session
    if (identity) {
      const pending = this.getPendingRegistration(identity, conversationId);
      const lastRegistered = this.getLastRegisteredCustomer(identity, conversationId);
      if (pending || lastRegistered) {
        if (
          /^(?:maaf[\s,]+|tolong[\s,]+|mohon[\s,]+)?(?:salah|bukan|keliru|ralat|koreksi|revisi|perbaiki)\b/i.test(lower) ||
          /\b(?:ralat|koreksi|revisi|perbaiki|ubah|ganti)\s+(?:nama|yang\s+benar)(?:\s+(?:pelanggan|customer|klien))?\b/i.test(lower) ||
          /\b(?:nama\s+yang\s+benar|yang\s+benar|seharusnya|harusnya|maksud\s+saya)\b/i.test(lower)
        ) {
          const candidate = this.extractCandidateCustomerName(trimmed);
          return candidate.length >= 2;
        }
      }
    }

    return false;
  }

  /**
   * Handles customer name correction without creating duplicate customer entities:
   * - If a pending draft registration exists (not yet confirmed), updates the draft candidateName.
   * - If a confirmed customer entity exists in session (or is explicitly named), updates the existing
   *   md_entities record in place (preserving id, entity_code, party_roles, and tenant isolation).
   */
  static async handleCustomerCorrection(
    input: string,
    identity: IdentityContext,
    conversationId?: string,
  ): Promise<CustomerHandlingResult> {
    // 1. Authorization Gate: require commercial:manage or customer:register
    let hasAuth = false;
    try {
      assertAnyPermission(identity, ['commercial:manage', 'customer:register']);
      hasAuth = true;
    } catch {
      hasAuth = false;
    }

    if (!hasAuth) {
      const role = identity.role || 'user';
      return {
        handled: true,
        type: 'text',
        status: 'BLOCKED',
        content:
          `Akses ditolak: Koreksi nama Customer pada data master memerlukan izin 'customer:register' atau 'commercial:manage'.\n\n` +
          `Akun Anda dengan role **${role}** tidak memiliki izin perubahan data pelanggan.`,
      };
    }

    const trimmed = input.trim();
    const pending = this.getPendingRegistration(identity, conversationId);
    const lastRegistered = this.getLastRegisteredCustomer(identity, conversationId);

    // Check explicit "koreksi/ubah/ralat/perbaiki nama [pelanggan] <old> menjadi/jadi <new>"
    const explicitRenameMatch = trimmed.match(
      /^(?:tolong\s+|mohon\s+|maaf\s+)?(?:koreksi|ralat|revisi|ubah|ganti|edit|perbarui|perbaiki)\s+nama\s+(?:pelanggan|customer|klien)?\s*(.+?)\s+(?:menjadi|jadi|ke)\s+(.+)$/i,
    );

    let explicitOldName = '';
    let newName = '';

    if (explicitRenameMatch) {
      const rawOld = explicitRenameMatch[1].trim();
      const rawNew = explicitRenameMatch[2].trim();
      if (!/^(?:tadi|barusan|sebelumnya|baru|ini|itu|pelanggan|customer|klien)$/i.test(rawOld)) {
        explicitOldName = this.extractCandidateCustomerName(rawOld) || rawOld;
      }
      newName = this.extractCandidateCustomerName(rawNew) || rawNew;
    } else {
      const menjadiSplit = trimmed.match(/\b(?:menjadi|jadi|seharusnya|harusnya|yang\s+benar|maksud\s+saya)\s*[:,-]?\s*(.+)$/i);
      if (menjadiSplit) {
        newName = this.extractCandidateCustomerName(menjadiSplit[1]) || menjadiSplit[1].trim();
      } else {
        newName = this.extractCandidateCustomerName(trimmed);
      }
    }

    if (!newName || newName.length < 2) {
      return {
        handled: true,
        type: 'text',
        status: 'REQUIRES_CLARIFICATION',
        content: `Silakan sebutkan nama resmi customer yang benar untuk menggantikan nama sebelumnya (misalnya: *"koreksi nama pelanggan menjadi PT UJI COBA TRANSPORT"*).`,
      };
    }

    // Case A: Pending registration draft exists (not yet committed to DB) and no explicit committed old entity was named
    if (pending && (!explicitOldName || explicitOldName.toLowerCase() === pending.candidateName.toLowerCase())) {
      const previousCandidate = pending.candidateName;
      this.savePendingRegistration(identity, newName, conversationId);
      return {
        handled: true,
        type: 'text',
        status: 'REQUIRES_CLARIFICATION',
        content:
          `### Ringkasan Pra-Pendaftaran Customer Baru — Nama Dikoreksi (EXECUTE: OFF)\n\n` +
          `- **Nama Sebelumnya (Draft):** ~~${previousCandidate}~~\n` +
          `- **Nama Resmi Customer (Baru):** **${newName}**\n` +
          `- **Tenant Otorisasi:** \`${identity.tenantId.slice(0, 8)}...\`\n\n` +
          `Draft pendaftaran telah diperbarui tanpa membuat entitas duplikat. Ketik **"Ya, daftarkan ${newName}"** atau **"YA"** untuk menyimpan ke database master, atau ketik **"batal"** untuk membatalkan.`,
      };
    }

    // Case B: Confirmed customer entity exists in session or was explicitly named -> Update existing md_entities row in place
    const db = getDb();
    let targetEntity: any = null;

    if (
      lastRegistered &&
      (!explicitOldName || explicitOldName.toLowerCase() === lastRegistered.name.toLowerCase())
    ) {
      targetEntity = {
        id: lastRegistered.id,
        name: lastRegistered.name,
        entity_code: lastRegistered.entity_code,
      };
    } else if (explicitOldName) {
      try {
        const { data: foundRows } = await db
          .from('md_entities')
          .select('id, name, legal_name, entity_code, phone, email, is_customer, is_active')
          .eq('tenant_id', identity.tenantId)
          .ilike('name', explicitOldName)
          .limit(1);
        if (foundRows && foundRows.length > 0) {
          targetEntity = foundRows[0];
        }
      } catch (findErr) {
        console.error('[CustomerIntentHandler] Correction lookup error:', findErr);
      }
    }

    if (!targetEntity) {
      return {
        handled: true,
        type: 'text',
        status: 'NOT_FOUND',
        content:
          `Entitas customer yang ingin dikoreksi tidak ditemukan pada sesi ini maupun pada data master tenant Anda.\n\n` +
          `Jika Anda ingin mendaftarkan **${newName}** sebagai customer baru, ketik *"daftarkan pelanggan baru ${newName}"*.`,
        results: [],
      };
    }

    const oldName = targetEntity.name;
    let updatedEntity: any = {
      ...targetEntity,
      name: newName,
      legal_name: newName,
      phone: targetEntity.phone ?? null,
      email: targetEntity.email ?? null,
      is_customer: true,
      is_active: true,
    };

    try {
      const updateChain = db
        .from('md_entities')
        .update({
          name: newName,
          legal_name: newName,
        })
        .eq('id', targetEntity.id)
        .eq('tenant_id', identity.tenantId);

      if (typeof updateChain.select === 'function') {
        const { data: updatedRows, error: updateErr } = await updateChain.select();
        if (updateErr) {
          return {
            handled: true,
            type: 'text',
            status: 'BLOCKED',
            content: `Gagal memperbarui nama customer pada database master: ${updateErr.message || 'Database error'}.`,
          };
        }
        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
          updatedEntity = updatedRows[0];
        } else if (updatedRows && !Array.isArray(updatedRows)) {
          updatedEntity = updatedRows;
        }
      } else {
        await updateChain;
      }
    } catch (err: any) {
      return {
        handled: true,
        type: 'text',
        status: 'BLOCKED',
        content: `Gagal memperbarui nama customer pada database master: ${err?.message || 'Database error'}.`,
      };
    }

    // Update session reference to the corrected name on the SAME canonical ID
    this.saveLastRegisteredCustomer(
      identity,
      {
        id: targetEntity.id,
        name: newName,
        entity_code: updatedEntity.entity_code || targetEntity.entity_code,
      },
      conversationId,
    );

    return {
      handled: true,
      type: 'text',
      status: 'SUCCESS',
      content:
        `Koreksi nama customer berhasil disimpan pada entitas yang sama (tanpa membuat duplikat):\n\n` +
        `- **Nama Sebelumnya:** ~~${oldName}~~\n` +
        `- **Nama Resmi Baru:** **${updatedEntity.name}**\n` +
        `- **Kode:** \`${updatedEntity.entity_code || targetEntity.entity_code || '-'}\`\n` +
        `- **ID Kanonik:** \`${targetEntity.id}\`\n\n` +
        `**Langkah Selanjutnya:**\n` +
        `Ketik *"buat order baru untuk ${updatedEntity.name}"* untuk melanjutkan pembuatan Sales Order, atau buka [Master Kontak](/tenant/master/contacts).`,
      results: [updatedEntity],
    };
  }
}
