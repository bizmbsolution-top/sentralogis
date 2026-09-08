/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/classification-service.ts
 * Description: Classification Lines Management and Batch Tax Re-calculation
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CreateClassificationLineDTO,
  CustomsClassificationLine
} from './types';
import { CustomsDeclarationRepository } from './declaration-repository';
import { CustomsTaxCalculator } from './tax-calculator';

export class ClassificationService {
  private repo = new CustomsDeclarationRepository();

  /**
   * Adds new classification lines to an existing declaration and updates total duty and tax
   */
  public async addClassificationLines(
    declarationId: string,
    tenantId: string,
    linesDto: CreateClassificationLineDTO[],
    exchangeRateIdr: number = CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR
  ): Promise<CustomsClassificationLine[]> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const startIndex = aggregate.classification_lines.length;
    const now = new Date().toISOString();

    const createdLines: CustomsClassificationLine[] = linesDto.map((l, idx) => {
      const lineId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cline_${Date.now()}_${idx}`;
      const tax = CustomsTaxCalculator.calculateLineTax({
        cifValueUsd: l.cif_value_usd,
        exchangeRateIdr,
        bmRatePercent: l.bm_rate_percent !== undefined ? Number(l.bm_rate_percent) : 0,
        ppnRatePercent: l.ppn_rate_percent !== undefined ? Number(l.ppn_rate_percent) : CustomsTaxCalculator.DEFAULT_PPN_RATE_PERCENT,
        pphRatePercent: l.pph_rate_percent !== undefined ? Number(l.pph_rate_percent) : CustomsTaxCalculator.DEFAULT_PPH_RATE_PERCENT
      });

      return {
        id: lineId,
        tenant_id: tenantId,
        declaration_id: declarationId,
        item_sequence: startIndex + idx + 1,
        hs_code: l.hs_code,
        goods_description: l.goods_description,
        cif_value_usd: Number(l.cif_value_usd) || 0,
        bm_rate_percent: l.bm_rate_percent !== undefined ? Number(l.bm_rate_percent) : 0,
        ppn_rate_percent: l.ppn_rate_percent !== undefined ? Number(l.ppn_rate_percent) : CustomsTaxCalculator.DEFAULT_PPN_RATE_PERCENT,
        pph_rate_percent: l.pph_rate_percent !== undefined ? Number(l.pph_rate_percent) : CustomsTaxCalculator.DEFAULT_PPH_RATE_PERCENT,
        calculated_bm_idr: tax.beaMasukIdr,
        calculated_ppn_idr: tax.ppnIdr,
        calculated_pph_idr: tax.pph22Idr,
        created_at: now
      };
    });

    const { error } = await supabaseAdmin.from('cus_classification_lines').insert(createdLines);
    if (error) throw new Error(`Failed to add classification lines: ${error.message}`);

    // Re-compute declaration total duty and tax
    const updatedAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    await this.repo.updateDeclarationStatus(
      declarationId,
      tenantId,
      updatedAggregate.declaration.status,
      updatedAggregate.summary.total_tax_payable_idr
    );

    return createdLines;
  }

  /**
   * Deletes a classification line and re-computes total taxes
   */
  public async deleteClassificationLine(
    lineId: string,
    declarationId: string,
    tenantId: string
  ): Promise<void> {
    await this.repo.getDeclarationAggregate(declarationId, tenantId);

    const { error } = await supabaseAdmin
      .from('cus_classification_lines')
      .delete()
      .eq('id', lineId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to delete classification line: ${error.message}`);

    // Re-compute declaration total duty and tax
    const updatedAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    await this.repo.updateDeclarationStatus(
      declarationId,
      tenantId,
      updatedAggregate.declaration.status,
      updatedAggregate.summary.total_tax_payable_idr
    );
  }
}
