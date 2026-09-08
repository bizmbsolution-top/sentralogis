/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/declaration-repository.ts
 * Description: Supabase / PostgreSQL Repository for Canonical Customs Declaration and Classification Tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsAggregate,
  CustomsDeclarationStatus,
  CustomsChannelType
} from './types';
import { DeclarationNotFoundError, CustomsTenantIsolationViolationError } from './errors';

export class CustomsDeclarationRepository {
  /**
   * Persists a complete Customs Declaration aggregate (Declaration + Classification Lines)
   */
  public async createDeclarationAggregate(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[] = []
  ): Promise<void> {
    const { error: decError } = await supabaseAdmin.from('cus_declarations').insert({
      id: declaration.id,
      tenant_id: declaration.tenant_id,
      declaration_number: declaration.declaration_number,
      service_request_id: declaration.service_request_id,
      work_order_id: declaration.work_order_id,
      importer_id: declaration.importer_id,
      ppjk_id: declaration.ppjk_id,
      declaration_type: declaration.declaration_type,
      customs_office_code: declaration.customs_office_code,
      billing_code: declaration.billing_code,
      total_duty_and_tax: declaration.total_duty_and_tax,
      status: declaration.status,
      version_no: declaration.version_no
    });

    if (decError) throw new Error(`Failed to insert cus_declarations: ${decError.message}`);

    if (lines.length > 0) {
      const { error: linesError } = await supabaseAdmin.from('cus_classification_lines').insert(
        lines.map(l => ({
          id: l.id,
          tenant_id: l.tenant_id,
          declaration_id: l.declaration_id,
          item_sequence: l.item_sequence,
          hs_code: l.hs_code,
          goods_description: l.goods_description,
          cif_value_usd: l.cif_value_usd,
          bm_rate_percent: l.bm_rate_percent,
          ppn_rate_percent: l.ppn_rate_percent,
          pph_rate_percent: l.pph_rate_percent,
          calculated_bm_idr: l.calculated_bm_idr,
          calculated_ppn_idr: l.calculated_ppn_idr,
          calculated_pph_idr: l.calculated_pph_idr
        }))
      );

      if (linesError) throw new Error(`Failed to insert cus_classification_lines: ${linesError.message}`);
    }
  }

  /**
   * Loads a full aggregate Customs Declaration by ID with tenant isolation verification
   */
  public async getDeclarationAggregate(declarationId: string, tenantId: string): Promise<CustomsAggregate> {
    const { data: decData, error: decError } = await supabaseAdmin
      .from('cus_declarations')
      .select('*')
      .eq('id', declarationId)
      .single();

    if (decError || !decData) {
      throw new DeclarationNotFoundError(declarationId);
    }

    if (decData.tenant_id !== tenantId) {
      throw new CustomsTenantIsolationViolationError(decData.tenant_id, tenantId);
    }

    const { data: linesData } = await supabaseAdmin
      .from('cus_classification_lines')
      .select('*')
      .eq('declaration_id', declarationId)
      .order('item_sequence', { ascending: true });

    const lines = (linesData || []) as CustomsClassificationLine[];

    const total_cif_usd = lines.reduce((acc, l) => acc + Number(l.cif_value_usd || 0), 0);
    const total_bm_idr = lines.reduce((acc, l) => acc + Number(l.calculated_bm_idr || 0), 0);
    const total_ppn_idr = lines.reduce((acc, l) => acc + Number(l.calculated_ppn_idr || 0), 0);
    const total_pph_idr = lines.reduce((acc, l) => acc + Number(l.calculated_pph_idr || 0), 0);
    const total_tax_payable_idr = total_bm_idr + total_ppn_idr + total_pph_idr;

    return {
      declaration: decData as unknown as CustomsDeclaration,
      classification_lines: lines,
      summary: {
        total_lines: lines.length,
        total_cif_usd,
        total_bm_idr,
        total_ppn_idr,
        total_pph_idr,
        total_tax_payable_idr,
        channel: decData.channel as CustomsChannelType | null,
        is_released: decData.status === 'RELEASED' || decData.status === 'COMPLETED' || Boolean(decData.sppb_number)
      }
    };
  }

  /**
   * Lists declarations for a tenant with optional filtering
   */
  public async listDeclarations(
    tenantId: string,
    filters?: {
      status?: CustomsDeclarationStatus;
      channel?: CustomsChannelType;
      importer_id?: string;
      limit?: number;
    }
  ): Promise<CustomsDeclaration[]> {
    let query = supabaseAdmin
      .from('cus_declarations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.channel) query = query.eq('channel', filters.channel);
    if (filters?.importer_id) query = query.eq('importer_id', filters.importer_id);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list declarations: ${error.message}`);
    return (data || []) as unknown as CustomsDeclaration[];
  }

  /**
   * Updates declaration status
   */
  public async updateDeclarationStatus(
    declarationId: string,
    tenantId: string,
    targetStatus: CustomsDeclarationStatus,
    totalDutyAndTax?: number
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: new Date().toISOString()
    };
    if (totalDutyAndTax !== undefined) {
      updatePayload.total_duty_and_tax = totalDutyAndTax;
    }

    const { error } = await supabaseAdmin
      .from('cus_declarations')
      .update(updatePayload)
      .eq('id', declarationId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to update declaration status: ${error.message}`);
  }

  /**
   * Assigns Customs Channel (GREEN, YELLOW, RED)
   */
  public async assignChannel(
    declarationId: string,
    tenantId: string,
    channel: CustomsChannelType
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cus_declarations')
      .update({
        channel,
        updated_at: new Date().toISOString()
      })
      .eq('id', declarationId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to assign customs channel: ${error.message}`);
  }

  /**
   * Issues SPPB Customs Release
   */
  public async recordSppbRelease(
    declarationId: string,
    tenantId: string,
    sppbNumber: string,
    sppbDate: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cus_declarations')
      .update({
        status: 'RELEASED',
        sppb_number: sppbNumber,
        sppb_date: sppbDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', declarationId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to record SPPB release: ${error.message}`);
  }
}
