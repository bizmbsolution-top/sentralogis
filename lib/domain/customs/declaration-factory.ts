/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/declaration-factory.ts
 * Description: Factory generating canonical Customs Declaration and Classification Line aggregates
 */

import {
  CreateDeclarationDTO,
  CreateClassificationLineDTO,
  CustomsDeclaration,
  CustomsClassificationLine
} from './types';
import { InvalidClassificationDataError } from './errors';
import { CustomsTaxCalculator } from './tax-calculator';

export class CustomsDeclarationFactory {
  /**
   * Generates a 26-digit canonical Nomor Pengajuan (AJU-KPPBC-YYYYMMDD-XXXXXX)
   */
  public static generateDeclarationNumber(customsOfficeCode: string, customSeq?: number): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const seq = customSeq !== undefined ? customSeq : Math.floor(100000 + Math.random() * 900000);
    const office = customsOfficeCode || '040300';
    return `AJU-${office}-${dateStr}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Constructs the core CustomsDeclaration aggregate root
   */
  public static createDeclarationEntity(dto: CreateDeclarationDTO): CustomsDeclaration {
    const errors: string[] = [];
    if (!dto.tenant_id) errors.push('tenant_id is required');
    if (!dto.importer_id) errors.push('importer_id is required');
    if (!dto.customs_office_code) errors.push('customs_office_code is required');

    if (errors.length > 0) {
      throw new InvalidClassificationDataError(errors);
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dec_${Date.now()}`;
    const now = new Date().toISOString();
    const declaration_number = this.generateDeclarationNumber(dto.customs_office_code);

    return {
      id,
      tenant_id: dto.tenant_id,
      declaration_number,
      service_request_id: dto.service_request_id || null,
      work_order_id: dto.work_order_id || null,
      shipment_id: dto.shipment_id || null,
      execution_leg_id: dto.execution_leg_id || null,
      job_order_id: dto.job_order_id || null,
      importer_id: dto.importer_id,
      ppjk_id: dto.ppjk_id || null,
      declaration_type: dto.declaration_type || 'PIB_IMPORT',
      customs_office_code: dto.customs_office_code,
      billing_code: null,
      total_duty_and_tax: 0,
      ntpn_payment_ref: null,
      paid_at: null,
      channel: null,
      sppb_number: null,
      sppb_date: null,
      status: 'DRAFT',
      version_no: 1,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Constructs classification line items with computed taxes
   */
  public static createClassificationLineEntities(
    declarationId: string,
    tenantId: string,
    lines: CreateClassificationLineDTO[],
    exchangeRateIdr: number = CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR
  ): CustomsClassificationLine[] {
    const now = new Date().toISOString();

    return lines.map((l, idx) => {
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
        item_sequence: l.item_sequence || idx + 1,
        hs_code: l.hs_code || '0000.00.00',
        goods_description: l.goods_description || 'General Cargo',
        cif_value_usd: Number(l.cif_value_usd) || 0,
        bm_rate_percent: l.bm_rate_percent !== undefined ? Number(l.bm_rate_percent) : 0,
        ppn_rate_percent: l.ppn_rate_percent !== undefined ? Number(l.ppn_rate_percent) : CustomsTaxCalculator.DEFAULT_PPN_RATE_PERCENT,
        pph_rate_percent: l.pph_rate_percent !== undefined ? Number(l.pph_rate_percent) : CustomsTaxCalculator.DEFAULT_PPH_RATE_PERCENT,
        calculated_bm_idr: tax.beaMasukIdr,
        calculated_ppn_idr: tax.ppnIdr,
        calculated_pph_idr: tax.pph22Idr,
        created_at: now,

        // Extended PPJK Attributes
        sku_code: l.sku_code || null,
        brand: l.brand || null,
        model: l.model || null,
        item_quantity: l.item_quantity !== undefined ? Number(l.item_quantity) : 1,
        uom_code: l.uom_code || 'PCE',
        unit_price_usd: l.unit_price_usd !== undefined ? Number(l.unit_price_usd) : 0,
        fob_value_usd: l.fob_value_usd !== undefined ? Number(l.fob_value_usd) : 0,
        freight_usd: l.freight_usd !== undefined ? Number(l.freight_usd) : 0,
        insurance_usd: l.insurance_usd !== undefined ? Number(l.insurance_usd) : 0,
        currency: l.currency || 'USD',
        country_of_origin: l.country_of_origin || 'CN',
        manufacturer_name: l.manufacturer_name || null,
        supplier_name: l.supplier_name || null,
        invoice_number: l.invoice_number || null,
        invoice_line_no: l.invoice_line_no || null,
        classification_source: l.classification_source || 'MANUAL',
        classification_rationale: l.classification_rationale || null,
        validation_status: 'VALID',
        validation_error_count: 0,
        validation_warning_count: 0
      };
    });
  }
}
