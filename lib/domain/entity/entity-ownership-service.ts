import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';

type DbError = { message: string; code?: string };
type DbRpcResult = { data: unknown; error: DbError | null };

export interface EntityOwnershipDbClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<DbRpcResult>;
}

let _client: EntityOwnershipDbClient = supabaseAdmin as unknown as EntityOwnershipDbClient;

function db(): EntityOwnershipDbClient {
  return _client;
}

export function _setEntityOwnershipDbClient(client: EntityOwnershipDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as EntityOwnershipDbClient);
}

export class EntityOwnershipError extends Error {
  public readonly code: EntityOwnershipErrorCode;
  public readonly statusCode: 400 | 403 | 404 | 409 | 500;
  constructor(
    code: EntityOwnershipErrorCode,
    statusCode: 400 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message);
    this.name = 'EntityOwnershipError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type EntityOwnershipErrorCode =
  | 'ENTITY_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'TENANT_MISMATCH'
  | 'CONCURRENCY_CONFLICT'
  | 'INVALID_REASON'
  | 'INVALID_MUTATION'
  | 'DATABASE_ERROR';

export interface OwnershipClassification {
  isOwn: boolean | null;
  confidence: 'explicit' | 'unknown';
  source: 'is_own' | 'unclassified';
}

export interface OperationalHandoffInfo {
  entity_id: string;
  tenant_id: string;
  is_own: boolean | null;
  classification_source: 'is_own' | 'unclassified';
  classification_confidence: 'explicit' | 'unknown';
}

export interface SetOwnershipCommand {
  entityId: string;
  isOwn: boolean | null;
  expectedCurrentValue: boolean | null;
  reason: string;
  idempotencyKey?: string;
}

export interface SetOwnershipResult {
  entityId: string;
  isOwn: boolean | null;
  tenantId: string;
  updatedAt: string;
}

export class EntityOwnershipService {
    constructor(private readonly dbClient: EntityOwnershipDbClient = db()) {}

    async classifyOwnership(tenantId: string, entityId: string): Promise<OwnershipClassification> {
      const supabase = supabaseAdmin as unknown as SupabaseClient;
      const { data, error } = await supabase
        .from('md_entities')
        .select('is_own')
        .eq('tenant_id', tenantId)
        .eq('id', entityId)
        .maybeSingle();

      if (error) {
        throw new EntityOwnershipError('DATABASE_ERROR', 500, `Failed to fetch entity ownership: ${error.message}`);
      }

      if (!data) {
        throw new EntityOwnershipError('ENTITY_NOT_FOUND', 404, `Entity not found: ${entityId}`);
      }

      const isOwn = data.is_own ?? null;

      return {
        isOwn,
        confidence: isOwn !== null ? 'explicit' : 'unknown',
        source: isOwn !== null ? 'is_own' : 'unclassified',
      };
    }

    private async resolveTenantForActor(actorId: string): Promise<{ tenant_id: string }> {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', actorId)
        .maybeSingle();

      if (!profile?.tenant_id) {
        throw new Error('Unable to determine tenant for user');
      }
      return { tenant_id: profile.tenant_id };
    }

    async getOperationalHandoffInfo(
      context: IdentityContext,
      entityId: string,
    ): Promise<OperationalHandoffInfo> {
      const { tenant_id } = await this.resolveTenantForActor(context.userId);
      if (!tenant_id) {
        throw new Error('Unable to determine tenant for user');
      }

      const classification = await this.classifyOwnership(tenant_id, entityId);

      return {
        entity_id: entityId,
        tenant_id: tenant_id,
        is_own: classification.isOwn,
        classification_source: classification.source,
        classification_confidence: classification.confidence,
      };
    }

    async setOwnership(
      context: IdentityContext,
      command: SetOwnershipCommand,
    ): Promise<SetOwnershipResult> {
    assertPermission(context, 'commercial:manage');

    if (!command.entityId) {
      throw new EntityOwnershipError('INVALID_MUTATION', 400, 'entityId is required.');
    }
    if (command.expectedCurrentValue !== null && typeof command.expectedCurrentValue !== 'boolean') {
      throw new EntityOwnershipError(
        'INVALID_MUTATION',
        400,
        'expectedCurrentValue must be a boolean or null.',
      );
    }
    if (command.isOwn !== null && typeof command.isOwn !== 'boolean') {
      throw new EntityOwnershipError(
        'INVALID_MUTATION',
        400,
        'isOwn must be a boolean or null.',
      );
    }

    const normalizedReason = (command.reason ?? '').trim();
    if (normalizedReason.length < 5) {
      throw new EntityOwnershipError(
        'INVALID_REASON',
        400,
        'Reason is required and must be at least 5 meaningful characters.',
      );
    }

    const idempotencyKey = command.idempotencyKey ?? this.generateUuid();

    if (command.isOwn === null) {
      throw new EntityOwnershipError(
        'INVALID_MUTATION',
        400,
        'Setting isOwn to null is not supported via this RPC. The PostgreSQL function set_entity_ownership requires a boolean value; use a separate explicit unclassify command (future phase).',
      );
    }

    const { data, error } = await this.dbClient.rpc('set_entity_ownership', {
      p_entity_id: command.entityId,
      p_tenant_id: context.tenantId,
      p_new_is_own: command.isOwn,
      p_expected_current_value: command.expectedCurrentValue,
      p_reason: normalizedReason,
      p_actor_id: context.userId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const message = error.message || String(error);
      if (/ERR_INVALID_REASON/.test(message)) {
        throw new EntityOwnershipError('INVALID_REASON', 400, message);
      }
      if (/ERR_ENTITY_NOT_FOUND/.test(message)) {
        throw new EntityOwnershipError('ENTITY_NOT_FOUND', 404, message);
      }
      if (/ERR_CONCURRENCY_CONFLICT/.test(message)) {
        throw new EntityOwnershipError('CONCURRENCY_CONFLICT', 409, message);
      }
      throw new EntityOwnershipError('DATABASE_ERROR', 500, `Failed to set entity ownership: ${message}`);
    }

    const rows = (Array.isArray(data) ? data : data ? [data] : []) as Array<{
      entity_id: string;
      is_own: boolean | null;
      tenant_id: string;
      updated_at: string;
    }>;

    if (rows.length === 0) {
      throw new EntityOwnershipError(
        'DATABASE_ERROR',
        500,
        'set_entity_ownership returned no rows.',
      );
    }

    const row = rows[0];
    return {
      entityId: row.entity_id,
      isOwn: row.is_own ?? null,
      tenantId: row.tenant_id,
      updatedAt: row.updated_at,
    };
  }

  private generateUuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return template.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}