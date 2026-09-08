/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/sppb-service.ts
 * Description: SPPB (Surat Persetujuan Pengeluaran Barang) Release Engine
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { CustomsDeclarationRepository } from './declaration-repository';
import { SppbIssuanceError } from './errors';

export class SppbService {
  private repo = new CustomsDeclarationRepository();

  /**
   * Issues official SPPB Customs Release after approval and emits event
   */
  public async issueSppbRelease(
    declarationId: string,
    tenantId: string,
    customSppbNumber?: string,
    customSppbDate?: string
  ): Promise<{ sppbNumber: string; sppbDate: string }> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const dec = aggregate.declaration;

    // 1. Validation: Cannot issue SPPB if declaration is still in DRAFT, DOCUMENTS_PENDING, or REJECTED
    const validApprovalStatuses = ['APPROVED', 'SPPB_PENDING', 'CHANNEL_ASSIGNED', 'ACCEPTED'];
    if (!validApprovalStatuses.includes(dec.status)) {
      throw new SppbIssuanceError(
        `Declaration status is '${dec.status}'. SPPB requires approval/channel clearance first.`
      );
    }

    // 2. Red channel inspection gate
    if (dec.channel === 'RED' && dec.status !== 'APPROVED' && dec.status !== 'SPPB_PENDING') {
      throw new SppbIssuanceError(
        'Red Channel declaration requires physical inspection approval before SPPB can be issued.'
      );
    }

    const today = new Date();
    const sppbDate = customSppbDate || today.toISOString().split('T')[0];
    const sppbNumber =
      customSppbNumber ||
      `SPPB-${dec.customs_office_code}-${sppbDate.replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Update database record
    await this.repo.recordSppbRelease(declarationId, tenantId, sppbNumber, sppbDate);

    // 4. Emit outbox events
    try {
      await supabaseAdmin.from('event_outbox').insert([
        {
          tenant_id: tenantId,
          event_name: 'customs.sppb.issued',
          event_version: '1.0.0',
          aggregate_type: 'CustomsDeclaration',
          aggregate_id: declarationId,
          correlation_id: dec.service_request_id || declarationId,
          producer_domain: 'CUSTOMS',
          payload: {
            declaration_id: declarationId,
            declaration_number: dec.declaration_number,
            sppb_number: sppbNumber,
            sppb_date: sppbDate,
            importer_id: dec.importer_id
          },
          is_published: false
        },
        {
          tenant_id: tenantId,
          event_name: 'customs.declaration.released',
          event_version: '1.0.0',
          aggregate_type: 'CustomsDeclaration',
          aggregate_id: declarationId,
          correlation_id: dec.service_request_id || declarationId,
          producer_domain: 'CUSTOMS',
          payload: {
            declaration_id: declarationId,
            declaration_number: dec.declaration_number,
            sppb_number: sppbNumber,
            released_at: new Date().toISOString()
          },
          is_published: false
        }
      ]);
    } catch (e) {
      console.error('Failed to emit customs.sppb.issued event:', e);
    }

    return { sppbNumber, sppbDate };
  }
}
