/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: Customs Audit Diff & Sanitization Engine
 * File: lib/domain/customs/audit/audit-diff-engine.ts
 */

import { CustomsStructuredDiff } from './types';

export class AuditDiffEngine {
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'access_token',
    'refresh_token',
    'jwt',
    'secret',
    'api_key',
    'apikey',
    'authorization',
    'bearer'
  ]);

  private static readonly IGNORED_KEYS = new Set([
    'updated_at',
    'created_at',
    'version_no',
    'tenant_id'
  ]);

  /**
   * Sanitizes object by masking sensitive attributes recursively
   */
  public static sanitizePayload<T>(payload: T): T {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizePayload(item)) as unknown as T;
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizePayload(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Calculates a compact structured before/after diff between two objects
   */
  public static calculateDiff(
    beforeObj: Record<string, any> | null | undefined,
    afterObj: Record<string, any> | null | undefined,
    options: { ignoreKeys?: string[] } = {}
  ): CustomsStructuredDiff | null {
    if (!beforeObj && !afterObj) return null;

    const diff: CustomsStructuredDiff = {};
    const origBefore = beforeObj || {};
    const origAfter = afterObj || {};

    const customIgnore = new Set(options.ignoreKeys || []);
    const allKeys = new Set([...Object.keys(origBefore), ...Object.keys(origAfter)]);

    for (const key of allKeys) {
      if (this.IGNORED_KEYS.has(key) || customIgnore.has(key)) {
        continue;
      }

      const origValBefore = origBefore[key];
      const origValAfter = origAfter[key];

      const beforeStr = JSON.stringify(origValBefore);
      const afterStr = JSON.stringify(origValAfter);

      if (beforeStr !== afterStr) {
        const isSensitive = this.SENSITIVE_KEYS.has(key.toLowerCase());
        diff[key] = {
          before: isSensitive ? '[REDACTED]' : this.sanitizePayload(origValBefore !== undefined ? origValBefore : null),
          after: isSensitive ? '[REDACTED]' : this.sanitizePayload(origValAfter !== undefined ? origValAfter : null)
        };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}
