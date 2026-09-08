/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/ppjk-workbench-service.ts
 * Description: Application Orchestration Service for PPJK Workbench & Bulk Controllers
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsSkuIntelligence,
  CustomsHsCodeMaster,
  CreateClassificationLineDTO,
  CustomsValidationResult,
  CustomsDeclarationException,
  CustomsDeclarationValidationRun,
  CustomsValidationTriggerType,
  ResolveExceptionDTO,
  WaiveExceptionDTO,
  CustomsDocumentCompletenessReport,
  CustomsValuationSummary,
  CustomsLartasReport,
  CustomsSkuClassificationHistory
} from './types';
import { CustomsDeclarationRepository } from './declaration-repository';
import { ItemImportService, RawImportRow, ItemImportPreview } from './item-import-service';
import { SkuIntelligenceService } from './sku-intelligence-service';
import { CustomsValidationEngine, DeclarationValidationReport } from './customs-validation-engine';
import { CeisaPreparationService, CeisaPreparationDataset } from './ceisa-preparation-service';
import { CustomsTaxCalculator } from './tax-calculator';
import {
  DeclarationNotFoundError,
  InvalidClassificationDataError,
  CustomsIdempotencyConflictError,
  CustomsValidationExceptionError
} from './errors';

export interface BulkImportRequestDTO {
  source?: 'CSV' | 'XLSX' | 'JSON' | 'TSV_CLIPBOARD';
  rows: RawImportRow[];
  mode?: 'PREVIEW' | 'COMMIT';
  defaultOrigin?: string;
  defaultCurrency?: string;
  exchangeRateIdr?: number;
  numberLocale?: 'AUTO' | 'ID' | 'US';
  customColumnMappings?: Record<string, string>;
  duplicatePolicy?: 'CREATE_DISTINCT_LINES' | 'SKIP_DUPLICATES' | 'REPLACE_EXISTING';
}

export interface BulkImportResponse {
  import_id: string;
  mode: 'PREVIEW' | 'COMMIT';
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  duplicate_rows: number;
  auto_matched_sku_rows: number;
  auto_suggested_hs_rows: number;
  unresolved_rows: number;
  preview: ItemImportPreview;
  committed_lines_count?: number;
}

export interface BulkUpdateItemsDTO {
  item_ids: string[];
  changes: Partial<{
    sku_code: string;
    goods_description: string;
    brand: string;
    model: string;
    item_quantity: number;
    uom_code: string;
    unit_price_usd: number;
    fob_value_usd: number;
    freight_usd: number;
    insurance_usd: number;
    currency: string;
    country_of_origin: string;
    manufacturer_name: string;
    supplier_name: string;
    invoice_number: string;
    invoice_line_no: number;
    hs_code: string;
    bm_rate_percent: number;
    ppn_rate_percent: number;
    pph_rate_percent: number;
    classification_rationale: string;
  }>;
  change_reason?: string;
}

export class PpjkWorkbenchService {
  private repo = new CustomsDeclarationRepository();
  private importEngine = new ItemImportService();
  private skuEngine = new SkuIntelligenceService();
  private validationEngine = new CustomsValidationEngine();
  private ceisaEngine = new CeisaPreparationService();

  // In-memory idempotency cache for bulk operations
  private static idempotencyCache = new Map<string, { payloadHash: string; result: any; timestamp: number }>();

  /**
   * Previews or atomically commits a bulk item import payload
   */
  public async previewOrCommitBulkImport(
    declarationId: string,
    tenantId: string,
    dto: BulkImportRequestDTO,
    idempotencyKey?: string,
    userId?: string
  ): Promise<BulkImportResponse> {
    const mode = dto.mode || 'PREVIEW';
    const importId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `imp_${Date.now()}`;

    // 1. Idempotency Check on COMMIT
    if (mode === 'COMMIT' && idempotencyKey) {
      const cached = PpjkWorkbenchService.idempotencyCache.get(idempotencyKey);
      if (cached) {
        const payloadHash = JSON.stringify(dto.rows);
        if (cached.payloadHash === payloadHash) {
          return cached.result;
        }
        throw new CustomsIdempotencyConflictError('Idempotency key provided with a different payload');
      }
    }

    // 2. Load Declaration and verify tenant ownership
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const importerId = aggregate.declaration.importer_id;

    // 3. Batch fetch SKU intelligence catalog for importer
    const { data: skuCatalogRows } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', importerId)
      .eq('is_active', true);

    const skuIntelligenceMap = new Map<string, { suggested_hs_code?: string; confidence?: number; brand?: string; model?: string }>();
    if (skuCatalogRows) {
      for (const row of skuCatalogRows) {
        skuIntelligenceMap.set(row.sku_code.toUpperCase(), {
          suggested_hs_code: row.suggested_hs_code || undefined,
          confidence: row.classification_confidence || 1.0,
          brand: row.brand || undefined,
          model: row.model || undefined
        });
      }
    }

    // 4. Batch fetch BTKI HS codes
    const { data: hsMasterRows } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    const hsTariffMap = new Map<string, { bm_rate: number; ppn_rate: number; pph_rate: number; description_id: string }>();
    if (hsMasterRows) {
      for (const h of hsMasterRows) {
        hsTariffMap.set(h.hs_code, {
          bm_rate: Number(h.bm_rate) || 0,
          ppn_rate: Number(h.ppn_rate) || 11,
          pph_rate: Number(h.pph_rate) || 2.5,
          description_id: h.description_id
        });
      }
    }

    // 5. Process Import via ItemImportService
    const preview = this.importEngine.processImportData(dto.rows, {
      defaultOrigin: dto.defaultOrigin,
      defaultCurrency: dto.defaultCurrency,
      numberLocale: dto.numberLocale,
      customColumnMappings: dto.customColumnMappings,
      duplicatePolicy: dto.duplicatePolicy,
      skuIntelligenceMap,
      hsTariffMap
    });

    const response: BulkImportResponse = {
      import_id: importId,
      mode,
      total_rows: preview.total_rows,
      valid_rows: preview.valid_rows,
      warning_rows: preview.warning_rows,
      error_rows: preview.error_rows,
      duplicate_rows: preview.duplicate_rows,
      auto_matched_sku_rows: preview.auto_matched_sku_rows,
      auto_suggested_hs_rows: preview.auto_suggested_hs_rows,
      unresolved_rows: preview.unresolved_rows,
      preview
    };

    // 6. If mode is COMMIT, execute atomic persistence
    if (mode === 'COMMIT') {
      if (preview.error_rows > 0) {
        throw new InvalidClassificationDataError(
          [`Cannot commit import with ${preview.error_rows} critical error(s). Please resolve all errors before committing.`]
        );
      }

      // If policy is REPLACE_EXISTING, remove prior lines first
      if (dto.duplicatePolicy === 'REPLACE_EXISTING') {
        await supabaseAdmin
          .from('cus_classification_lines')
          .delete()
          .eq('declaration_id', declarationId)
          .eq('tenant_id', tenantId);
      }

      const refreshedAgg = await this.repo.getDeclarationAggregate(declarationId, tenantId);
      const lineDtos = this.importEngine.toClassificationDTOs(preview.normalized_rows);
      const exchangeRate = dto.exchangeRateIdr || CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR;
      const startIndex = dto.duplicatePolicy === 'REPLACE_EXISTING' ? 0 : refreshedAgg.classification_lines.length;
      const now = new Date().toISOString();

      const createdLines: CustomsClassificationLine[] = lineDtos.map((l, idx) => {
        const lineId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cline_${Date.now()}_${idx}`;
        const tax = CustomsTaxCalculator.calculateLineTax({
          cifValueUsd: l.cif_value_usd,
          exchangeRateIdr: exchangeRate,
          bmRatePercent: l.bm_rate_percent !== undefined ? Number(l.bm_rate_percent) : 0,
          ppnRatePercent: l.ppn_rate_percent !== undefined ? Number(l.ppn_rate_percent) : CustomsTaxCalculator.DEFAULT_PPN_RATE_PERCENT,
          pphRatePercent: l.pph_rate_percent !== undefined ? Number(l.pph_rate_percent) : CustomsTaxCalculator.DEFAULT_PPH_RATE_PERCENT
        });

        return {
          id: lineId,
          tenant_id: tenantId,
          declaration_id: declarationId,
          item_sequence: startIndex + idx + 1,
          hs_code: l.hs_code || '0000.00.00',
          goods_description: l.goods_description,
          cif_value_usd: Number(l.cif_value_usd) || 0,
          bm_rate_percent: l.bm_rate_percent !== undefined ? Number(l.bm_rate_percent) : 0,
          ppn_rate_percent: l.ppn_rate_percent !== undefined ? Number(l.ppn_rate_percent) : CustomsTaxCalculator.DEFAULT_PPN_RATE_PERCENT,
          pph_rate_percent: l.pph_rate_percent !== undefined ? Number(l.pph_rate_percent) : CustomsTaxCalculator.DEFAULT_PPH_RATE_PERCENT,
          calculated_bm_idr: tax.beaMasukIdr,
          calculated_ppn_idr: tax.ppnIdr,
          calculated_pph_idr: tax.pph22Idr,
          created_at: now,

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
          classification_source: l.classification_source || 'FILE_IMPORT',
          classification_rationale: l.classification_rationale || null,
          validation_status: 'VALID',
          validation_error_count: 0,
          validation_warning_count: 0
        };
      });

      // Persist in single batch insert
      if (createdLines.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('cus_classification_lines').insert(createdLines);
        if (insertError) throw new Error(`Bulk line insertion failed: ${insertError.message}`);

        // Record Audit log
        await supabaseAdmin.from('cus_item_audit_logs').insert({
          tenant_id: tenantId,
          declaration_id: declarationId,
          field_name: 'BULK_IMPORT',
          old_value: { lines_count: startIndex },
          new_value: { added_lines: createdLines.length, import_id: importId },
          change_reason: `Imported ${createdLines.length} lines via bulk controller`,
          changed_by: userId || null,
          source: 'PPJK_REST_API'
        });

        // Recompute declaration tax total
        const updatedAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
        await this.repo.updateDeclarationStatus(
          declarationId,
          tenantId,
          updatedAggregate.declaration.status,
          updatedAggregate.summary.total_tax_payable_idr
        );
      }

      response.committed_lines_count = createdLines.length;

      // Cache idempotent response
      if (idempotencyKey) {
        PpjkWorkbenchService.idempotencyCache.set(idempotencyKey, {
          payloadHash: JSON.stringify(dto.rows),
          result: response,
          timestamp: Date.now()
        });
      }
    }

    return response;
  }

  /**
   * Bulk updates selected fields across multiple classification lines
   */
  public async bulkUpdateItems(
    declarationId: string,
    tenantId: string,
    dto: BulkUpdateItemsDTO,
    userId?: string
  ): Promise<{ updatedCount: number; declaration: CustomsDeclaration }> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const ALLOWLIST = [
      'sku_code', 'goods_description', 'brand', 'model', 'item_quantity',
      'uom_code', 'unit_price_usd', 'fob_value_usd', 'freight_usd', 'insurance_usd',
      'currency', 'country_of_origin', 'manufacturer_name', 'supplier_name',
      'invoice_number', 'invoice_line_no', 'hs_code', 'bm_rate_percent',
      'ppn_rate_percent', 'pph_rate_percent', 'classification_rationale'
    ];

    const cleanChanges: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto.changes)) {
      if (ALLOWLIST.includes(key) && value !== undefined) {
        cleanChanges[key] = value;
      }
    }

    if (Object.keys(cleanChanges).length === 0 || dto.item_ids.length === 0) {
      return { updatedCount: 0, declaration: aggregate.declaration };
    }

    const { error: updateError } = await supabaseAdmin
      .from('cus_classification_lines')
      .update(cleanChanges)
      .in('id', dto.item_ids)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId);

    if (updateError) throw new Error(`Bulk update failed: ${updateError.message}`);

    // Audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      field_name: 'BULK_UPDATE',
      old_value: { item_ids: dto.item_ids },
      new_value: cleanChanges,
      change_reason: dto.change_reason || 'Batch update via PPJK Workbench API',
      changed_by: userId || null,
      source: 'PPJK_REST_API'
    });

    // Recompute total taxes
    const updatedAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    await this.repo.updateDeclarationStatus(
      declarationId,
      tenantId,
      updatedAggregate.declaration.status,
      updatedAggregate.summary.total_tax_payable_idr
    );

    return {
      updatedCount: dto.item_ids.length,
      declaration: updatedAggregate.declaration
    };
  }

  /**
   * Diagnostic pre-submission validation run
   */
  public async validateDeclaration(
    declarationId: string,
    tenantId: string
  ): Promise<DeclarationValidationReport & { declaration_id: string; validation_run_id: string }> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const documents = await this.listDocuments(declarationId, tenantId);

    // Fetch master HS catalog map
    const { data: hsMasterRows } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    const hsMasterMap = new Map<string, CustomsHsCodeMaster>();
    if (hsMasterRows) {
      for (const h of hsMasterRows) {
        hsMasterMap.set(h.hs_code, h);
      }
    }

    // Fetch SKU historical map
    const { data: skuRows } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', aggregate.declaration.importer_id);

    const skuHistoricalMap = new Map<string, { suggested_hs_code?: string; average_price?: number }>();
    if (skuRows) {
      for (const s of skuRows) {
        skuHistoricalMap.set(s.sku_code.toUpperCase(), {
          suggested_hs_code: s.suggested_hs_code || undefined,
          average_price: s.average_unit_price_usd ? Number(s.average_unit_price_usd) : undefined
        });
      }
    }

    const report = this.validationEngine.validateDeclaration(
      aggregate.declaration,
      aggregate.classification_lines,
      documents,
      { hsMasterMap, skuHistoricalMap }
    );

    const runId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `val_${Date.now()}`;

    return {
      declaration_id: declarationId,
      validation_run_id: runId,
      ...report
    };
  }

  /**
   * Comprehensive validation run with persistent Exception Registry reconciliation
   */
  public async validateDeclarationDetailed(
    declarationId: string,
    tenantId: string,
    options: {
      triggerType?: CustomsValidationTriggerType;
      userId?: string;
    } = {}
  ): Promise<CustomsValidationResult> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const documents = await this.listDocuments(declarationId, tenantId);

    // Fetch master HS catalog map
    const { data: hsMasterRows } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    const hsMasterMap = new Map<string, CustomsHsCodeMaster>();
    if (hsMasterRows) {
      for (const h of hsMasterRows) {
        hsMasterMap.set(h.hs_code, h);
      }
    }

    // Fetch SKU historical map
    const { data: skuRows } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', aggregate.declaration.importer_id);

    const skuHistoricalMap = new Map<string, { suggested_hs_code?: string; average_price?: number }>();
    if (skuRows) {
      for (const s of skuRows) {
        skuHistoricalMap.set(s.sku_code.toUpperCase(), {
          suggested_hs_code: s.suggested_hs_code || undefined,
          average_price: s.average_unit_price_usd ? Number(s.average_unit_price_usd) : undefined
        });
      }
    }

    // Fetch existing exceptions
    const { data: existingExcRows } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('declaration_id', declarationId);

    const existingExceptions: CustomsDeclarationException[] = existingExcRows || [];

    // Run multi-tier evaluation & projection
    const result = this.validationEngine.validateDeclarationAggregate(
      aggregate.declaration,
      aggregate.classification_lines,
      documents,
      existingExceptions,
      {
        hsMasterMap,
        skuHistoricalMap,
        triggerType: options.triggerType || 'MANUAL',
        userId: options.userId
      }
    );

    // Persist validation run
    try {
      await supabaseAdmin.from('cus_declaration_validation_runs').insert({
        id: result.validation_run_id,
        tenant_id: tenantId,
        declaration_id: declarationId,
        overall_status: result.overall_status,
        rule_set_version: result.rule_set_version,
        engine_version: result.engine_version,
        trigger_type: result.trigger_type,
        triggered_by: options.userId || null,
        total_lines: aggregate.classification_lines.length,
        error_count: result.error_count,
        warning_count: result.warning_count,
        info_count: result.info_count,
        execution_duration_ms: result.execution_duration_ms,
        summary_json: {
          readiness_percentage: result.readiness_percentage,
          readiness_by_category: result.readiness_by_category,
          total_rules_evaluated: result.total_rules_evaluated
        },
        validated_at: result.validated_at
      });

      // Upsert reconciled exceptions
      for (const exc of result.active_exceptions) {
        await supabaseAdmin.from('cus_declaration_exceptions').upsert({
          id: exc.id,
          tenant_id: tenantId,
          declaration_id: declarationId,
          validation_run_id: exc.validation_run_id,
          classification_line_id: exc.classification_line_id || null,
          item_sequence: exc.item_sequence || null,
          sku_code: exc.sku_code || null,
          rule_code: exc.rule_code,
          fingerprint: exc.fingerprint,
          severity: exc.severity,
          category: exc.category,
          resolution_policy: exc.resolution_policy,
          readiness_impact: exc.readiness_impact,
          rule_source: exc.rule_source || 'RULE SOURCE REQUIRED',
          status: exc.status,
          title: exc.title,
          description: exc.description,
          current_value: exc.current_value || null,
          expected_value: exc.expected_value || null,
          evidence: exc.evidence || {},
          source: exc.source || 'DETERMINISTIC_ENGINE',
          detected_at: exc.detected_at,
          detected_by: exc.detected_by || null,
          acknowledged_at: exc.acknowledged_at || null,
          acknowledged_by: exc.acknowledged_by || null,
          resolved_at: exc.resolved_at || null,
          resolved_by: exc.resolved_by || null,
          resolution_type: exc.resolution_type || null,
          resolution_note: exc.resolution_note || null,
          reopened_at: exc.reopened_at || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, declaration_id, fingerprint' });
      }
    } catch (dbErr) {
      console.warn('[Validation Run Persistence Notice]:', dbErr);
    }

    return result;
  }

  /**
   * Lists all active or historical exceptions for a declaration
   */
  public async listDeclarationExceptions(
    declarationId: string,
    tenantId: string,
    filter?: { status?: string; severity?: string; category?: string }
  ): Promise<CustomsDeclarationException[]> {
    let query = supabaseAdmin
      .from('cus_declaration_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('declaration_id', declarationId)
      .order('detected_at', { ascending: false });

    if (filter?.status && filter.status !== 'ALL') {
      query = query.eq('status', filter.status);
    }
    if (filter?.severity && filter.severity !== 'ALL') {
      query = query.eq('severity', filter.severity);
    }
    if (filter?.category && filter.category !== 'ALL') {
      query = query.eq('category', filter.category);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[List Exceptions Error]:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Acknowledges an active exception
   */
  public async acknowledgeException(
    declarationId: string,
    exceptionId: string,
    tenantId: string,
    userId?: string
  ): Promise<CustomsDeclarationException> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledged_at: now,
        acknowledged_by: userId || null,
        updated_at: now
      })
      .eq('id', exceptionId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new CustomsValidationExceptionError(`Exception '${exceptionId}' not found or unauthorized to acknowledge.`);
    }

    return data;
  }

  /**
   * Resolves an exception with an explicit resolution type
   */
  public async resolveException(
    declarationId: string,
    exceptionId: string,
    tenantId: string,
    dto: ResolveExceptionDTO,
    userId?: string
  ): Promise<CustomsDeclarationException> {
    const now = new Date().toISOString();

    // Fetch existing exception
    const { data: existing } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .select('*')
      .eq('id', exceptionId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!existing) {
      throw new CustomsValidationExceptionError(`Exception '${exceptionId}' not found or unauthorized.`);
    }

    // Apply data mutations if override_data supplied
    if (dto.override_data && existing.classification_line_id) {
      await supabaseAdmin
        .from('cus_classification_lines')
        .update(dto.override_data)
        .eq('id', existing.classification_line_id)
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId);
    }

    const { data, error } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .update({
        status: 'RESOLVED',
        resolution_type: dto.resolution_type || 'DATA_CORRECTED',
        resolution_note: dto.resolution_note || null,
        resolved_at: now,
        resolved_by: userId || null,
        updated_at: now
      })
      .eq('id', exceptionId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new CustomsValidationExceptionError(`Failed to resolve exception '${exceptionId}'.`);
    }

    // Record audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      classification_line_id: existing.classification_line_id || null,
      field_name: `EXCEPTION_RESOLVED:${existing.rule_code}`,
      old_value: { status: existing.status },
      new_value: { status: 'RESOLVED', resolution_type: dto.resolution_type },
      change_reason: dto.resolution_note || `Resolved exception ${existing.rule_code}`,
      changed_by: userId || null,
      source: 'EXCEPTION_RESOLUTION_DRAWER'
    });

    return data;
  }

  /**
   * Waives a warning exception with mandatory written justification
   */
  public async waiveException(
    declarationId: string,
    exceptionId: string,
    tenantId: string,
    dto: WaiveExceptionDTO,
    userId?: string
  ): Promise<CustomsDeclarationException> {
    if (!dto.justification_reason || dto.justification_reason.trim().length < 5) {
      throw new InvalidClassificationDataError(['A valid, non-empty justification reason (minimum 5 characters) is required to waive an exception.']);
    }

    // Fetch existing exception
    const { data: existing } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .select('*')
      .eq('id', exceptionId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!existing) {
      throw new CustomsValidationExceptionError(`Exception '${exceptionId}' not found or unauthorized.`);
    }

    if (existing.severity === 'BLOCKING' && existing.resolution_policy === 'FIX_REQUIRED') {
      throw new InvalidClassificationDataError([`Cannot waive BLOCKING rule '${existing.rule_code}' under FIX_REQUIRED policy. The underlying data must be corrected.`]);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('cus_declaration_exceptions')
      .update({
        status: 'WAIVED',
        resolution_type: 'MANUALLY_WAIVED',
        resolution_note: dto.justification_reason,
        resolved_at: now,
        resolved_by: userId || null,
        updated_at: now
      })
      .eq('id', exceptionId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new CustomsValidationExceptionError(`Failed to waive exception '${exceptionId}'.`);
    }

    // Record audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      classification_line_id: existing.classification_line_id || null,
      field_name: `EXCEPTION_WAIVED:${existing.rule_code}`,
      old_value: { status: existing.status },
      new_value: { status: 'WAIVED', justification: dto.justification_reason },
      change_reason: dto.justification_reason,
      changed_by: userId || null,
      source: 'EXCEPTION_WAIVER_DRAWER'
    });

    return data;
  }

  /**
   * Generates the CEISA 4.0 preparation dataset and readiness matrix
   */
  public async getCeisaPreview(
    declarationId: string,
    tenantId: string
  ): Promise<CeisaPreparationDataset> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const documents = await this.listDocuments(declarationId, tenantId);

    const { data: hsMasterRows } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    const hsMasterMap = new Map<string, CustomsHsCodeMaster>();
    if (hsMasterRows) {
      for (const h of hsMasterRows) {
        hsMasterMap.set(h.hs_code, h);
      }
    }

    return this.ceisaEngine.prepareCeisaDataset(
      aggregate.declaration,
      aggregate.classification_lines,
      documents,
      { hsMasterMap }
    );
  }

  /**
   * Search SKU Intelligence catalog
   */
  public async searchSkuIntelligence(
    tenantId: string,
    filters: {
      importer_id?: string;
      sku_code?: string;
      q?: string;
      brand?: string;
      hs_code?: string;
    },
    pagination: { page?: number; pageSize?: number } = {}
  ): Promise<{ results: CustomsSkuIntelligence[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(200, Math.max(1, pagination.pageSize || 50));
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (filters.importer_id) {
      query = query.eq('importer_id', filters.importer_id);
    }
    if (filters.sku_code) {
      query = query.ilike('sku_code', `%${filters.sku_code}%`);
    }
    if (filters.brand) {
      query = query.ilike('brand', `%${filters.brand}%`);
    }
    if (filters.hs_code) {
      query = query.ilike('suggested_hs_code', `%${filters.hs_code}%`);
    }
    if (filters.q) {
      query = query.or(`sku_code.ilike.%${filters.q}%,normalized_description.ilike.%${filters.q}%`);
    }

    query = query.range(offset, offset + pageSize - 1).order('updated_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw new Error(`SKU search failed: ${error.message}`);

    return {
      results: (data || []) as CustomsSkuIntelligence[],
      total: count || 0,
      page,
      pageSize
    };
  }

  /**
   * Registers or updates SKU Intelligence product memory
   */
  public async registerSkuIntelligence(
    tenantId: string,
    dto: Partial<CustomsSkuIntelligence>,
    userId?: string
  ): Promise<CustomsSkuIntelligence> {
    if (!dto.importer_id || !dto.sku_code || !dto.normalized_description) {
      throw new InvalidClassificationDataError(['importer_id, sku_code, and normalized_description are required']);
    }

    const payload = {
      tenant_id: tenantId,
      importer_id: dto.importer_id,
      customer_id: dto.customer_id || dto.importer_id,
      sku_code: dto.sku_code.trim().toUpperCase(),
      normalized_description: dto.normalized_description.trim(),
      original_description: dto.original_description || null,
      brand: dto.brand || null,
      model: dto.model || null,
      manufacturer: dto.manufacturer || null,
      supplier: dto.supplier || null,
      country_of_origin: dto.country_of_origin || 'CN',
      preferred_uom: dto.preferred_uom || 'PCE',
      suggested_hs_code: dto.suggested_hs_code || null,
      classification_confidence: dto.classification_confidence !== undefined ? dto.classification_confidence : 1.0,
      classification_status: dto.classification_status || 'SUGGESTED',
      classification_rationale: dto.classification_rationale || null,
      classification_source: dto.classification_source || 'MANUAL_ENTRY',
      last_reviewed_by: userId || null,
      last_reviewed_at: new Date().toISOString(),
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .upsert(payload, { onConflict: 'tenant_id,importer_id,sku_code' })
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert SKU intelligence: ${error.message}`);
    return data as CustomsSkuIntelligence;
  }

  /**
   * Search BTKI 8-digit tariff catalog
   */
  public async searchHsCodes(
    queryStr?: string,
    pagination: { page?: number; pageSize?: number } = {}
  ): Promise<{ results: CustomsHsCodeMaster[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(200, Math.max(1, pagination.pageSize || 50));
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (queryStr) {
      const q = queryStr.trim();
      query = query.or(`hs_code.ilike.%${q}%,description_id.ilike.%${q}%,description_en.ilike.%${q}%`);
    }

    query = query.range(offset, offset + pageSize - 1).order('hs_code', { ascending: true });

    const { data, count, error } = await query;
    if (error) throw new Error(`HS lookup failed: ${error.message}`);

    return {
      results: (data || []) as CustomsHsCodeMaster[],
      total: count || 0,
      page,
      pageSize
    };
  }

  /**
   * List attached documents
   */
  public async listDocuments(declarationId: string, tenantId: string): Promise<CustomsDeclarationDocument[]> {
    await this.repo.getDeclarationAggregate(declarationId, tenantId);

    const { data, error } = await supabaseAdmin
      .from('cus_declaration_documents')
      .select('*')
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to load documents: ${error.message}`);
    return (data || []) as CustomsDeclarationDocument[];
  }

  /**
   * Attaches a supporting document
   */
  /**
   * Attaches a supporting document with item linkage & metadata
   */
  public async attachDocument(
    declarationId: string,
    tenantId: string,
    dto: Partial<CustomsDeclarationDocument>,
    userId?: string
  ): Promise<CustomsDeclarationDocument> {
    await this.repo.getDeclarationAggregate(declarationId, tenantId);

    if (!dto.document_type) {
      throw new InvalidClassificationDataError(['document_type is required']);
    }

    const payload = {
      tenant_id: tenantId,
      declaration_id: declarationId,
      classification_line_id: dto.classification_line_id || null,
      item_sequence: dto.item_sequence || null,
      document_type: dto.document_type,
      document_number: dto.document_number || null,
      issue_date: dto.issue_date || null,
      expiry_date: dto.expiry_date || null,
      issuer_name: dto.issuer_name || null,
      file_reference: dto.file_reference || null,
      file_name: dto.file_name || null,
      mime_type: dto.mime_type || null,
      file_size_bytes: dto.file_size_bytes || null,
      verification_status: dto.verification_status || 'PENDING_REVIEW',
      status: dto.status || 'UPLOADED',
      created_by: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('cus_declaration_documents')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Failed to attach document: ${error.message}`);

    // Audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      classification_line_id: dto.classification_line_id || null,
      field_name: `DOCUMENT_ATTACHED:${dto.document_type}`,
      old_value: null,
      new_value: { document_type: dto.document_type, document_number: dto.document_number },
      change_reason: `Attached supporting document ${dto.document_type}`,
      changed_by: userId || null,
      source: 'PPJK_DOCUMENT_VAULT'
    });

    return data as CustomsDeclarationDocument;
  }

  /**
   * Updates document verification status
   */
  public async updateDocumentStatus(
    declarationId: string,
    tenantId: string,
    documentId: string,
    status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED',
    userId?: string,
    notes?: string
  ): Promise<CustomsDeclarationDocument> {
    await this.repo.getDeclarationAggregate(declarationId, tenantId);

    const updatePayload: Record<string, any> = {
      verification_status: status,
      status: status === 'VERIFIED' ? 'VERIFIED' : status === 'REJECTED' ? 'REJECTED' : 'UPLOADED',
      updated_at: new Date().toISOString()
    };
    if (status === 'VERIFIED') {
      updatePayload.verified_by = userId || null;
      updatePayload.verified_at = new Date().toISOString();
    }
    if (notes) {
      updatePayload.notes = notes;
    }

    const { data, error } = await supabaseAdmin
      .from('cus_declaration_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update document: ${error.message}`);

    // Audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      field_name: `DOCUMENT_VERIFICATION:${documentId}`,
      old_value: null,
      new_value: { verification_status: status, notes },
      change_reason: notes || `Document verification status changed to ${status}`,
      changed_by: userId || null,
      source: 'PPJK_DOCUMENT_VAULT'
    });

    return data as CustomsDeclarationDocument;
  }

  /**
   * Removes a document reference
   */
  public async deleteDocument(
    declarationId: string,
    tenantId: string,
    documentId: string,
    userId?: string
  ): Promise<void> {
    await this.repo.getDeclarationAggregate(declarationId, tenantId);

    const { error } = await supabaseAdmin
      .from('cus_declaration_documents')
      .delete()
      .eq('id', documentId)
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to delete document: ${error.message}`);

    // Audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      field_name: `DOCUMENT_DELETED:${documentId}`,
      old_value: { document_id: documentId },
      new_value: null,
      change_reason: 'Document unlinked from declaration',
      changed_by: userId || null,
      source: 'PPJK_DOCUMENT_VAULT'
    });
  }

  /**
   * Evaluates Document Completeness for a declaration
   */
  public async getDocumentCompletenessReport(
    declarationId: string,
    tenantId: string
  ): Promise<CustomsDocumentCompletenessReport> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const documents = await this.listDocuments(declarationId, tenantId);

    return this.validationEngine.evaluateDocumentCompleteness(
      aggregate.declaration,
      aggregate.classification_lines,
      documents
    );
  }

  /**
   * Evaluates Commercial Valuation Summary & Reconciliation
   */
  public async getValuationSummary(
    declarationId: string,
    tenantId: string,
    exchangeRateIdr: number = 16000
  ): Promise<CustomsValuationSummary> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);

    // Fetch SKU historical map
    const { data: skuRows } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', aggregate.declaration.importer_id);

    const skuHistoricalMap = new Map<string, { average_price?: number }>();
    if (skuRows) {
      for (const s of skuRows) {
        skuHistoricalMap.set(s.sku_code.toUpperCase(), {
          average_price: s.average_unit_price_usd ? Number(s.average_unit_price_usd) : undefined
        });
      }
    }

    return this.validationEngine.evaluateValuationSummary(
      aggregate.declaration,
      aggregate.classification_lines,
      exchangeRateIdr,
      skuHistoricalMap
    );
  }

  /**
   * Evaluates Item-Level Lartas & Permit Matrix Report
   */
  public async getLartasReport(
    declarationId: string,
    tenantId: string
  ): Promise<CustomsLartasReport> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const documents = await this.listDocuments(declarationId, tenantId);

    // Fetch master HS catalog map
    const { data: hsMasterRows } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    const hsMasterMap = new Map<string, CustomsHsCodeMaster>();
    if (hsMasterRows) {
      for (const h of hsMasterRows) {
        hsMasterMap.set(h.hs_code, h);
      }
    }

    return this.validationEngine.evaluateLartasReport(
      aggregate.declaration,
      aggregate.classification_lines,
      documents,
      hsMasterMap
    );
  }

  /**
   * Retrieves BTKI 2-digit chapters catalog
   */
  public async getBtkiChapters(): Promise<Array<{ chapter: string; title_id: string; title_en?: string; total_headings: number; total_tariffs: number }>> {
    const { data, error } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('chapter, description_id, description_en')
      .order('chapter', { ascending: true });

    if (error) throw new Error(`Failed to load BTKI chapters: ${error.message}`);

    const chaptersMap = new Map<string, { chapter: string; title_id: string; title_en?: string; total_headings: number; total_tariffs: number; headingsSet: Set<string> }>();

    // Standard Chapter titles mapping for Indonesian BTKI
    const chapterTitles: Record<string, { id: string; en: string }> = {
      '01': { id: 'Binatang Hidup', en: 'Live Animals' },
      '02': { id: 'Daging dan Sisa Daging yang Dapat Dimakan', en: 'Meat and Edible Meat Offal' },
      '03': { id: 'Ikan dan Krustasea, Moluska', en: 'Fish and Crustaceans, Molluscs' },
      '04': { id: 'Produk Susu; Telur Unggas; Madu Alami', en: 'Dairy Produce; Birds Eggs; Natural Honey' },
      '07': { id: 'Sayuran dan Akar serta Umbi Tertentu', en: 'Edible Vegetables and Certain Roots and Tubers' },
      '08': { id: 'Buah dan Kacang yang Dapat Dimakan', en: 'Edible Fruit and Nuts; Peel of Citrus Fruit' },
      '27': { id: 'Bahan Bakar Mineral, Minyak Mineral', en: 'Mineral Fuels, Mineral Oils and Products' },
      '29': { id: 'Bahan Kimia Organik', en: 'Organic Chemicals' },
      '30': { id: 'Produk Farmasi', en: 'Pharmaceutical Products' },
      '39': { id: 'Plastik dan Barang Daripadanya', en: 'Plastics and Articles Thereof' },
      '40': { id: 'Karet dan Barang Daripadanya', en: 'Rubber and Articles Thereof' },
      '72': { id: 'Besi dan Baja', en: 'Iron and Steel' },
      '73': { id: 'Barang dari Besi atau Baja', en: 'Articles of Iron or Steel' },
      '84': { id: 'Reaktor Nuklir, Boiler, Mesin dan Peralatan Mekanik', en: 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances' },
      '85': { id: 'Mesin dan Peralatan Listrik serta Bagiannya', en: 'Electrical Machinery and Equipment and Parts Thereof' },
      '87': { id: 'Kendaraan Selain Peralatan Kereta Api', en: 'Vehicles Other than Railway or Tramway Rolling-stock' },
      '90': { id: 'Instrumen dan Aparatus Optik, Fotografi, Medis', en: 'Optical, Photographic, Cinematographic, Medical Instruments' }
    };

    (data || []).forEach(row => {
      const ch = String(row.chapter).padStart(2, '0');
      if (!chaptersMap.has(ch)) {
        const defaultTitle = chapterTitles[ch] || { id: `Bab ${ch} - ${row.description_id.slice(0, 50)}`, en: `Chapter ${ch}` };
        chaptersMap.set(ch, {
          chapter: ch,
          title_id: defaultTitle.id,
          title_en: defaultTitle.en,
          total_headings: 0,
          total_tariffs: 0,
          headingsSet: new Set()
        });
      }
      const entry = chaptersMap.get(ch)!;
      entry.total_tariffs += 1;
    });

    return Array.from(chaptersMap.values()).map(({ headingsSet, ...rest }) => ({
      ...rest,
      total_headings: Math.max(1, Math.round(rest.total_tariffs / 10))
    }));
  }

  /**
   * Retrieves BTKI tree hierarchy by Chapter or Heading
   */
  public async getBtkiHierarchyTree(params: { chapter?: string; heading?: string; q?: string }): Promise<{
    chapter?: string;
    heading?: string;
    items: CustomsHsCodeMaster[];
    headings?: Array<{ heading: string; sampleDescription: string; count: number }>;
  }> {
    let query = supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('is_active', true);

    if (params.chapter) {
      const ch = params.chapter.padStart(2, '0');
      query = query.eq('chapter', ch);
    }

    if (params.heading) {
      query = query.eq('heading', params.heading);
    }

    if (params.q) {
      const q = params.q.trim();
      query = query.or(`hs_code.ilike.%${q}%,description_id.ilike.%${q}%,description_en.ilike.%${q}%`);
    }

    query = query.order('hs_code', { ascending: true }).limit(200);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to load BTKI hierarchy tree: ${error.message}`);

    const items = (data || []) as CustomsHsCodeMaster[];

    // Extract unique headings if querying by chapter
    const headingsMap = new Map<string, { heading: string; sampleDescription: string; count: number }>();
    if (params.chapter && !params.heading) {
      items.forEach(item => {
        const h = item.heading;
        if (!headingsMap.has(h)) {
          headingsMap.set(h, {
            heading: h,
            sampleDescription: item.description_id,
            count: 0
          });
        }
        headingsMap.get(h)!.count += 1;
      });
    }

    return {
      chapter: params.chapter,
      heading: params.heading,
      items,
      headings: Array.from(headingsMap.values())
    };
  }

  /**
   * Generates ranked classification candidates for an item line
   */
  public async getClassificationCandidates(
    tenantId: string,
    importerId: string,
    line: Partial<CustomsClassificationLine>
  ): Promise<{
    skuMatch: any;
    candidates: Array<{
      hs_code: string;
      description_id: string;
      description_en?: string | null;
      confidence: number;
      match_type: 'EXACT_SKU' | 'SKU_MANUFACTURER' | 'SKU_SUPPLIER' | 'FINGERPRINT' | 'DESCRIPTION_KEYWORD' | 'MANUAL';
      rationale: string;
      bm_rate: number;
      ppn_rate: number;
      pph_rate: number;
      lartas_flag: boolean;
      lartas_permit_type?: string | null;
      historical_declarations_count?: number;
      average_price_usd?: number;
    }>;
  }> {
    // 1. Fetch importer SKU memory catalog
    const { data: skuRecords } = await supabaseAdmin
      .from('cus_sku_intelligence')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', importerId)
      .eq('is_active', true);

    const knownCatalog = (skuRecords || []) as CustomsSkuIntelligence[];

    // 2. Fetch history records
    const { data: historyData } = await supabaseAdmin
      .from('cus_sku_classification_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('importer_id', importerId);

    const historyRecords = (historyData || []) as CustomsSkuClassificationHistory[];

    // 3. Run SkuIntelligence engine
    const skuMatch = this.skuEngine.matchSku(
      importerId,
      line.sku_code || '',
      {
        brand: line.brand || undefined,
        model: line.model || undefined,
        manufacturer: line.manufacturer_name || undefined,
        supplier: line.supplier_name || undefined,
        unitPriceUsd: line.unit_price_usd
      },
      knownCatalog,
      historyRecords
    );

    const candidates: Array<any> = [];

    // 4. If SKU intelligence suggested an HS code, hydrate full BTKI details
    if (skuMatch.matched && skuMatch.suggested_hs_code) {
      const { data: hsData } = await supabaseAdmin
        .from('md_customs_hs_codes')
        .select('*')
        .eq('hs_code', skuMatch.suggested_hs_code)
        .maybeSingle();

      const hsMaster = hsData as CustomsHsCodeMaster | null;

      candidates.push({
        hs_code: skuMatch.suggested_hs_code,
        description_id: hsMaster?.description_id || skuMatch.normalized_description || 'Product Classification',
        description_en: hsMaster?.description_en || null,
        confidence: Math.round(skuMatch.confidence_score * 100),
        match_type: skuMatch.match_type,
        rationale: skuMatch.classification_rationale || `Matched from ${skuMatch.match_type.replace('_', ' ')} with ${skuMatch.historical_declarations_count} previous declarations`,
        bm_rate: hsMaster?.bm_rate !== undefined ? hsMaster.bm_rate : 0,
        ppn_rate: hsMaster?.ppn_rate !== undefined ? hsMaster.ppn_rate : 11,
        pph_rate: hsMaster?.pph_rate !== undefined ? hsMaster.pph_rate : 2.5,
        lartas_flag: Boolean(hsMaster?.lartas_flag),
        lartas_permit_type: hsMaster?.lartas_permit_type || null,
        historical_declarations_count: skuMatch.historical_declarations_count,
        average_price_usd: skuMatch.average_unit_price_usd
      });
    }

    // 5. Keyword search candidate from goods description
    const descKeyword = (line.goods_description || '').split(' ')[0];
    if (descKeyword && descKeyword.length >= 3) {
      const { data: keywordHs } = await supabaseAdmin
        .from('md_customs_hs_codes')
        .select('*')
        .ilike('description_id', `%${descKeyword}%`)
        .limit(2);

      (keywordHs || []).forEach((hs: any) => {
        if (!candidates.some(c => c.hs_code === hs.hs_code)) {
          candidates.push({
            hs_code: hs.hs_code,
            description_id: hs.description_id,
            description_en: hs.description_en,
            confidence: 75,
            match_type: 'DESCRIPTION_KEYWORD',
            rationale: `Matched keyword "${descKeyword}" against BTKI description`,
            bm_rate: hs.bm_rate,
            ppn_rate: hs.ppn_rate,
            pph_rate: hs.pph_rate,
            lartas_flag: hs.lartas_flag,
            lartas_permit_type: hs.lartas_permit_type
          });
        }
      });
    }

    return {
      skuMatch,
      candidates
    };
  }

  /**
   * Approves line classification, records audit log, updates SKU memory, and recalculates taxes
   */
  public async approveLineClassification(
    declarationId: string,
    tenantId: string,
    lineId: string,
    dto: {
      hs_code: string;
      justification?: string;
      update_sku_memory?: boolean;
    },
    userId?: string,
    userName?: string
  ): Promise<{ line: CustomsClassificationLine; declaration: CustomsDeclaration }> {
    // 1. Verify aggregate and declaration
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const existingLine = aggregate.classification_lines.find(l => l.id === lineId);
    if (!existingLine) {
      throw new InvalidClassificationDataError([`Item line ${lineId} not found in declaration`]);
    }

    // 2. Fetch master BTKI tariff for the approved HS Code
    const { data: hsMasterData, error: hsErr } = await supabaseAdmin
      .from('md_customs_hs_codes')
      .select('*')
      .eq('hs_code', dto.hs_code)
      .maybeSingle();

    if (hsErr) throw new Error(`BTKI lookup error: ${hsErr.message}`);
    const hsMaster = hsMasterData as CustomsHsCodeMaster | null;

    const bmRate = hsMaster?.bm_rate !== undefined ? hsMaster.bm_rate : (existingLine.bm_rate_percent || 0);
    const ppnRate = hsMaster?.ppn_rate !== undefined ? hsMaster.ppn_rate : (existingLine.ppn_rate_percent || 11);
    const pphRate = hsMaster?.pph_rate !== undefined ? hsMaster.pph_rate : (existingLine.pph_rate_percent || 2.5);

    // Compute duty and tax
    const cifUsd = (existingLine.item_quantity || 1) * (existingLine.unit_price_usd || existingLine.cif_value_usd || 0);
    const taxCalc = CustomsTaxCalculator.calculateLineTax({
      cifValueUsd: cifUsd,
      exchangeRateIdr: 16000,
      bmRatePercent: bmRate,
      ppnRatePercent: ppnRate,
      pphRatePercent: pphRate
    });

    // 3. Update cus_classification_lines with snapshots and validation status
    const lineUpdatePayload: Record<string, any> = {
      hs_code: dto.hs_code,
      hs_master_id: hsMaster?.id || null,
      hs_code_snapshot: dto.hs_code,
      hs_description_snapshot: hsMaster?.description_id || null,
      bm_rate_percent: bmRate,
      ppn_rate_percent: ppnRate,
      pph_rate_percent: pphRate,
      bm_rate_snapshot: bmRate,
      ppn_rate_snapshot: ppnRate,
      pph_rate_snapshot: pphRate,
      calculated_bm_idr: taxCalc.beaMasukIdr,
      calculated_ppn_idr: taxCalc.ppnIdr,
      calculated_pph_idr: taxCalc.pph22Idr,
      classification_confidence: 1.00,
      classification_source: 'PPJK_APPROVED',
      classification_rationale: dto.justification || 'Approved by licensed PPJK specialist',
      validation_status: 'VALID',
      lartas_flag: Boolean(hsMaster?.lartas_flag)
    };

    const { data: updatedLineData, error: lineUpdateErr } = await supabaseAdmin
      .from('cus_classification_lines')
      .update(lineUpdatePayload)
      .eq('id', lineId)
      .eq('declaration_id', declarationId)
      .select()
      .single();

    if (lineUpdateErr) throw new Error(`Failed to update classification line: ${lineUpdateErr.message}`);
    const updatedLine = updatedLineData as CustomsClassificationLine;

    // 4. Record Immutable Audit Log in cus_item_audit_logs
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      classification_line_id: lineId,
      field_name: 'hs_code',
      old_value: existingLine.hs_code || null,
      new_value: dto.hs_code,
      change_reason: dto.justification || 'PPJK Specialist Approval',
      changed_by: userId || null,
      changed_by_name: userName || 'PPJK Specialist',
      changed_at: new Date().toISOString(),
      source: 'PPJK_CLASSIFICATION_WORKBENCH'
    });

    // 5. Update/Upsert SKU Intelligence Memory if requested (default true)
    if (dto.update_sku_memory !== false && existingLine.sku_code) {
      await this.registerSkuIntelligence(
        tenantId,
        {
          importer_id: aggregate.declaration.importer_id,
          sku_code: existingLine.sku_code,
          normalized_description: existingLine.goods_description,
          brand: existingLine.brand || undefined,
          model: existingLine.model || undefined,
          manufacturer: existingLine.manufacturer_name || undefined,
          supplier: existingLine.supplier_name || undefined,
          country_of_origin: existingLine.country_of_origin || 'CN',
          preferred_uom: existingLine.uom_code || 'PCE',
          suggested_hs_code: dto.hs_code,
          classification_confidence: 1.0,
          classification_status: 'VERIFIED',
          classification_rationale: dto.justification || 'Approved in PPJK Workbench',
          classification_source: 'PPJK_WORKBENCH_APPROVAL',
          average_unit_price_usd: existingLine.unit_price_usd
        },
        userId
      );

      // Record classification history
      await supabaseAdmin.from('cus_sku_classification_history').insert({
        tenant_id: tenantId,
        importer_id: aggregate.declaration.importer_id,
        declaration_id: declarationId,
        declaration_number: aggregate.declaration.declaration_number,
        sku_code: existingLine.sku_code,
        hs_code: dto.hs_code,
        goods_description: existingLine.goods_description,
        unit_price_usd: existingLine.unit_price_usd,
        currency: existingLine.currency || 'USD',
        country_of_origin: existingLine.country_of_origin || 'CN',
        customs_channel: aggregate.declaration.channel || 'GREEN',
        recorded_at: new Date().toISOString()
      });
    }

    // 6. Recalculate and update declaration total tax
    const refreshedAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const totalDuty = refreshedAggregate.classification_lines.reduce(
      (acc, l) => acc + (l.calculated_bm_idr || 0) + (l.calculated_ppn_idr || 0) + (l.calculated_pph_idr || 0),
      0
    );

    await supabaseAdmin
      .from('cus_declarations')
      .update({
        total_duty_and_tax: totalDuty,
        updated_at: new Date().toISOString()
      })
      .eq('id', declarationId)
      .eq('tenant_id', tenantId);

    const finalAggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);

    return {
      line: updatedLine,
      declaration: finalAggregate.declaration
    };
  }
}

