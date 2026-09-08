/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Preparation Application Service
 * File: lib/domain/customs/ceisa/ceisa-preparation-service.ts
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsOperationalReadiness
} from '../types';
import {
  CeisaPreparationRecord,
  CeisaPreparationSummary,
  CeisaArtifactFormat,
  CanonicalCustomsPayload
} from './types';
import { CeisaMappingEngine } from './mapping-engine';
import { CeisaValidator } from './ceisa-validator';
import { CeisaArtifactBuilder } from './artifact-builder';
import { CustomsDeclarationRepository } from '../declaration-repository';

export class CeisaPreparationService {
  private repo = new CustomsDeclarationRepository();

  /**
   * Compiles an In-Memory CEISA Preparation Summary from Declaration Aggregate
   */
  public compilePreparationSummary(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[],
    options: {
      format?: CeisaArtifactFormat;
      kursKmk?: number;
      importerName?: string;
      importerTaxId?: string;
      importerAddress?: string;
    } = {}
  ): CeisaPreparationSummary {
    const format = options.format || 'XML';

    // 1. Compile Canonical Model
    const canonicalPayload = CeisaMappingEngine.compileCanonicalPayload(
      declaration,
      lines,
      documents,
      {
        kursPajakKmk: options.kursKmk,
        importerName: options.importerName,
        importerTaxId: options.importerTaxId,
        importerAddress: options.importerAddress
      }
    );

    // 2. Run 3-Layer Multi-Stage Validator
    const validationRes = CeisaValidator.validatePayload(canonicalPayload);

    // 3. Generate Explainable Field Mappings
    const fieldMappings = CeisaMappingEngine.generateFieldMappings(canonicalPayload);

    // 4. Build Serialized Artifact (XML / EDI / JSON)
    const artifact = CeisaArtifactBuilder.buildArtifact(canonicalPayload, format);

    // 5. Compute Human Review Checkpoints
    const humanReviewChecklist = [
      {
        checkpoint: 'AJU Number 26-digit structure and Office Code validity',
        category: 'HEADER' as const,
        status: validationRes.issues.some(i => i.ruleCode === 'CEISA-XML-001')
          ? ('BLOCKED' as const)
          : ('VERIFIED' as const),
        notes: 'Verified against DJBC KPPBC directory standard'
      },
      {
        checkpoint: 'Commercial Invoice, Packing List, and B/L vault documents verified',
        category: 'DOCUMENTS' as const,
        status: documents.some(d => d.document_type === 'INVOICE' && d.verification_status === 'VERIFIED')
          ? ('VERIFIED' as const)
          : ('ATTENTION_REQUIRED' as const),
        notes: 'Document vault status check'
      },
      {
        checkpoint: 'CIF Valuation balance and KMK tax base precision',
        category: 'VALUATION' as const,
        status: validationRes.issues.some(i => i.ruleCode === 'CEISA-BIZ-001')
          ? ('BLOCKED' as const)
          : ('VERIFIED' as const),
        notes: 'Total FOB + Freight + Insurance = Header CIF (tolerance $0.05)'
      },
      {
        checkpoint: 'Statutory Lartas trade restrictions and permit document linkage',
        category: 'LARTAS' as const,
        status: validationRes.issues.some(i => i.ruleCode === 'CEISA-BIZ-002')
          ? ('BLOCKED' as const)
          : ('VERIFIED' as const),
        notes: 'Permendag No. 36/2023 import quota compliance'
      },
      {
        checkpoint: 'CEISA 4.0 XML schema tags, namespaces, and element ordering',
        category: 'SCHEMA' as const,
        status: validationRes.isSchemaValid ? ('VERIFIED' as const) : ('BLOCKED' as const),
        notes: 'urn:customs.go.id:ceisa:4.0:pib schema compliance'
      }
    ];

    const preparationRecord: CeisaPreparationRecord = {
      id: `prep-${declaration.id}-preview`,
      tenant_id: declaration.tenant_id,
      declaration_id: declaration.id,
      version_no: 1,
      message_type: 'PIB_BC20',
      schema_version: 'CEISA-4.0-XML-v1.0',
      status: validationRes.readinessStatus === 'BLOCKED' ? 'INVALID' : 'READY_FOR_REVIEW',
      artifact_format: format,
      artifact_content: artifact.content,
      artifact_checksum: artifact.checksumSha256,
      artifact_size_bytes: artifact.sizeBytes,
      item_count: lines.length,
      blocking_errors_count: validationRes.blockingCount,
      warnings_count: validationRes.warningsCount,
      metadata: {
        kurs_kmk: canonicalPayload.valuation.kursPajakKmkIdr,
        total_cif_usd: canonicalPayload.valuation.totalCifUsd
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let customsDomainReadiness: CustomsOperationalReadiness = 'READY';
    if (validationRes.blockingCount > 0) customsDomainReadiness = 'BLOCKED';
    else if (validationRes.warningsCount > 0) customsDomainReadiness = 'READY_WITH_WARNINGS';

    return {
      preparation: preparationRecord,
      readinessStatus: validationRes.readinessStatus,
      customsDomainReadiness,
      validationIssues: validationRes.issues,
      fieldMappings,
      artifact,
      humanReviewChecklist
    };
  }

  /**
   * Generates or Refreshes a Versioned Preparation Run in Database
   */
  public async prepareAndPersistRun(
    declarationId: string,
    tenantId: string,
    format: CeisaArtifactFormat = 'XML',
    userId?: string
  ): Promise<CeisaPreparationSummary> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    
    // Fetch documents
    const { data: docRows } = await supabaseAdmin
      .from('cus_declaration_documents')
      .select('*')
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId);

    const documents: CustomsDeclarationDocument[] = docRows || [];

    // Compile Summary & Artifact
    const summary = this.compilePreparationSummary(
      aggregate.declaration,
      aggregate.classification_lines || [],
      documents,
      { format }
    );

    // Determine version number
    const { data: prevRuns } = await supabaseAdmin
      .from('cus_ceisa_preparations')
      .select('version_no')
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .order('version_no', { ascending: false })
      .limit(1);

    const nextVersion = prevRuns && prevRuns.length > 0 ? (prevRuns[0].version_no + 1) : 1;

    // Mark previous runs SUPERSEDED
    await supabaseAdmin
      .from('cus_ceisa_preparations')
      .update({ status: 'SUPERSEDED' })
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .in('status', ['DRAFT', 'VALIDATING', 'READY_FOR_REVIEW', 'READY_TO_TRANSMIT']);

    // Insert new preparation record
    const { data: newPrep, error: insertErr } = await supabaseAdmin
      .from('cus_ceisa_preparations')
      .insert({
        tenant_id: tenantId,
        declaration_id: declarationId,
        version_no: nextVersion,
        message_type: 'PIB_BC20',
        schema_version: 'CEISA-4.0-XML-v1.0',
        status: summary.readinessStatus === 'BLOCKED' ? 'INVALID' : 'READY_FOR_REVIEW',
        artifact_format: format,
        artifact_content: summary.artifact?.content || null,
        artifact_checksum: summary.artifact?.checksumSha256 || null,
        artifact_size_bytes: summary.artifact?.sizeBytes || null,
        item_count: aggregate.classification_lines?.length || 0,
        blocking_errors_count: summary.validationIssues.filter(i => i.severity === 'BLOCKING').length,
        warnings_count: summary.validationIssues.filter(i => i.severity === 'WARNING').length,
        metadata: {
          generated_via: 'PPJK_WORKBENCH_CEISA_GATEWAY',
          format
        },
        created_by: userId || null
      })
      .select()
      .single();

    if (insertErr || !newPrep) {
      throw new Error(`Failed to persist CEISA preparation run: ${insertErr?.message}`);
    }

    // Insert validation results
    if (summary.validationIssues.length > 0) {
      const valInserts = summary.validationIssues.map(issue => ({
        tenant_id: tenantId,
        preparation_id: newPrep.id,
        layer: issue.layer,
        rule_code: issue.ruleCode,
        severity: issue.severity,
        field_path: issue.fieldPath,
        message: issue.message,
        expected_value: issue.expectedValue || null,
        actual_value: issue.actualValue || null,
        resolution_hint: issue.resolutionHint || null
      }));

      await supabaseAdmin.from('cus_ceisa_validation_results').insert(valInserts);
    }

    // Emit audit log
    await supabaseAdmin.from('cus_item_audit_logs').insert({
      tenant_id: tenantId,
      declaration_id: declarationId,
      action_type: 'CEISA_PREPARATION_GENERATED',
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      reason: `Generated CEISA 4.0 preparation version #${nextVersion} (${format}) with checksum ${summary.artifact?.checksumSha256?.slice(0, 8)}...`,
      snapshot_data: {
        preparation_id: newPrep.id,
        version_no: nextVersion,
        status: newPrep.status,
        checksum: summary.artifact?.checksumSha256
      }
    });

    summary.preparation = newPrep as CeisaPreparationRecord;
    return summary;
  }

  /**
   * Retrieves Latest CEISA Preparation or Compiles On-The-Fly Preview
   */
  public async getLatestPreparation(
    declarationId: string,
    tenantId: string,
    format: CeisaArtifactFormat = 'XML'
  ): Promise<CeisaPreparationSummary> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);

    const { data: docRows } = await supabaseAdmin
      .from('cus_declaration_documents')
      .select('*')
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId);

    return this.compilePreparationSummary(
      aggregate.declaration,
      aggregate.classification_lines || [],
      docRows || [],
      { format }
    );
  }

  /**
   * Lists Historical Preparation Runs
   */
  public async listPreparations(
    declarationId: string,
    tenantId: string
  ): Promise<CeisaPreparationRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('cus_ceisa_preparations')
      .select('*')
      .eq('declaration_id', declarationId)
      .eq('tenant_id', tenantId)
      .order('version_no', { ascending: false });

    if (error) throw new Error(`Failed to list CEISA preparations: ${error.message}`);
    return (data || []) as CeisaPreparationRecord[];
  }
}
