/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: Customs Audit Trail Cryptographic Hash Chain Integrity
 * File: lib/domain/customs/audit/audit-integrity-service.ts
 */

import * as crypto from 'crypto';
import { CustomsAuditEvent, AuditIntegrityReport } from './types';

export class AuditIntegrityService {
  public static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Computes the deterministic SHA-256 hash for an audit event
   */
  public static computeEventHash(params: {
    tenantId: string;
    declarationId: string;
    sequenceNo: number;
    eventType: string;
    summary?: string;
    actorId?: string | null;
    createdAt: string;
    diff?: Record<string, any> | null;
    previousEventHash?: string | null;
  }): string {
    const prevHash = params.previousEventHash || this.GENESIS_HASH;
    const diffStr = params.diff ? JSON.stringify(params.diff) : '';

    const payloadString = [
      params.tenantId,
      params.declarationId,
      params.sequenceNo.toString(),
      params.eventType,
      params.summary || '',
      params.actorId || 'SYSTEM',
      params.createdAt,
      diffStr,
      prevHash
    ].join('|');

    return crypto.createHash('sha256').update(payloadString, 'utf8').digest('hex');
  }

  /**
   * Verifies the cryptographic continuity and tamper-evidence of a sequence of audit events
   */
  public static verifyAuditIntegrity(events: CustomsAuditEvent[]): AuditIntegrityReport {
    const checkedAt = new Date().toISOString();

    if (!events || events.length === 0) {
      return {
        status: 'VALID',
        checkedEventsCount: 0,
        genesisHash: this.GENESIS_HASH,
        latestHash: this.GENESIS_HASH,
        details: 'Empty audit event stream is trivially continuous',
        checkedAt
      };
    }

    // Sort by sequence number
    const sorted = [...events].sort((a, b) => a.sequence_no - b.sequence_no);

    let expectedPrevHash = this.GENESIS_HASH;

    for (let i = 0; i < sorted.length; i++) {
      const evt = sorted[i];
      const expectedSeq = i + 1;

      // 1. Check sequence numbering continuity
      if (evt.sequence_no !== expectedSeq) {
        return {
          status: 'BROKEN',
          checkedEventsCount: i,
          genesisHash: this.GENESIS_HASH,
          latestHash: sorted[i - 1]?.event_hash || this.GENESIS_HASH,
          brokenSequenceNo: evt.sequence_no,
          details: `Sequence discontinuity: expected #${expectedSeq}, found #${evt.sequence_no}`,
          checkedAt
        };
      }

      // 2. Check previous hash linkage
      const actualPrevHash = evt.previous_event_hash || this.GENESIS_HASH;
      if (actualPrevHash !== expectedPrevHash) {
        return {
          status: 'BROKEN',
          checkedEventsCount: i,
          genesisHash: this.GENESIS_HASH,
          latestHash: expectedPrevHash,
          brokenSequenceNo: evt.sequence_no,
          details: `Previous hash linkage broken at sequence #${evt.sequence_no}`,
          checkedAt
        };
      }

      // 3. Recompute event hash and assert integrity
      const recomputedHash = this.computeEventHash({
        tenantId: evt.tenant_id,
        declarationId: evt.declaration_id,
        sequenceNo: evt.sequence_no,
        eventType: evt.event_type,
        summary: evt.summary,
        actorId: evt.actor_id,
        createdAt: evt.created_at,
        diff: evt.diff,
        previousEventHash: actualPrevHash
      });

      if (recomputedHash !== evt.event_hash) {
        return {
          status: 'BROKEN',
          checkedEventsCount: i,
          genesisHash: this.GENESIS_HASH,
          latestHash: expectedPrevHash,
          brokenSequenceNo: evt.sequence_no,
          details: `Tamper detected: Recomputed hash does not match event_hash at sequence #${evt.sequence_no}`,
          checkedAt
        };
      }

      expectedPrevHash = evt.event_hash;
    }

    return {
      status: 'VALID',
      checkedEventsCount: sorted.length,
      genesisHash: sorted[0].previous_event_hash || this.GENESIS_HASH,
      latestHash: sorted[sorted.length - 1].event_hash,
      details: `All ${sorted.length} audit events cryptographically verified without tampering`,
      checkedAt
    };
  }
}
