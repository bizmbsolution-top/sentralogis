/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/customs-service.ts
 * Description: Primary Application Service Facade for SBU Customs Clearance
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CreateDeclarationDTO,
  CreateClassificationLineDTO,
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsAggregate,
  CustomsDeclarationStatus,
  CustomsChannelType
} from './types';
import { CustomsDeclarationFactory } from './declaration-factory';
import { CustomsStateMachine } from './state-machine';
import { CustomsDeclarationRepository } from './declaration-repository';
import { ClassificationService } from './classification-service';
import { SppbService } from './sppb-service';
import { CustomsTaxCalculator } from './tax-calculator';

export class CustomsService {
  private repo = new CustomsDeclarationRepository();
  private classificationService = new ClassificationService();
  private sppbService = new SppbService();

  /**
   * Creates a new Customs Declaration aggregate
   */
  public async createDeclaration(dto: CreateDeclarationDTO): Promise<CustomsAggregate> {
    const declaration = CustomsDeclarationFactory.createDeclarationEntity(dto);
    const exchangeRate = dto.exchange_rate_idr || CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR;

    const lines = dto.classification_lines
      ? CustomsDeclarationFactory.createClassificationLineEntities(
          declaration.id,
          dto.tenant_id,
          dto.classification_lines,
          exchangeRate
        )
      : [];

    const totalTax = lines.reduce(
      (acc, l) => acc + (l.calculated_bm_idr + l.calculated_ppn_idr + l.calculated_pph_idr),
      0
    );
    declaration.total_duty_and_tax = totalTax;

    // 1. Persist in database
    await this.repo.createDeclarationAggregate(declaration, lines);

    // 2. Emit event
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: dto.tenant_id,
        event_name: 'customs.declaration.created',
        event_version: '1.0.0',
        aggregate_type: 'CustomsDeclaration',
        aggregate_id: declaration.id,
        correlation_id: declaration.service_request_id || declaration.id,
        producer_domain: 'CUSTOMS',
        payload: {
          declaration_id: declaration.id,
          declaration_number: declaration.declaration_number,
          importer_id: declaration.importer_id,
          customs_office_code: declaration.customs_office_code,
          total_duty_and_tax: totalTax
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit customs.declaration.created event:', e);
    }

    return this.repo.getDeclarationAggregate(declaration.id, dto.tenant_id);
  }

  /**
   * Retrieves single Customs Declaration aggregate
   */
  public async getDeclaration(declarationId: string, tenantId: string): Promise<CustomsAggregate> {
    return this.repo.getDeclarationAggregate(declarationId, tenantId);
  }

  /**
   * Lists declarations for tenant
   */
  public async listDeclarations(
    tenantId: string,
    filters?: { status?: CustomsDeclarationStatus; channel?: CustomsChannelType; importer_id?: string; limit?: number }
  ): Promise<CustomsDeclaration[]> {
    return this.repo.listDeclarations(tenantId, filters);
  }

  /**
   * Transitions declaration status with state machine enforcement
   */
  public async updateDeclarationStatus(
    declarationId: string,
    tenantId: string,
    targetStatus: CustomsDeclarationStatus
  ): Promise<void> {
    const aggregate = await this.repo.getDeclarationAggregate(declarationId, tenantId);
    const currentStatus = aggregate.declaration.status;

    // 1. State machine validation
    CustomsStateMachine.assertTransition(currentStatus, targetStatus);

    // 2. Update database
    await this.repo.updateDeclarationStatus(declarationId, tenantId, targetStatus);

    // 3. Emit event
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'customs.declaration.status_changed',
        event_version: '1.0.0',
        aggregate_type: 'CustomsDeclaration',
        aggregate_id: declarationId,
        correlation_id: aggregate.declaration.service_request_id || declarationId,
        producer_domain: 'CUSTOMS',
        payload: {
          declaration_id: declarationId,
          previous_status: currentStatus,
          new_status: targetStatus
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit customs.declaration.status_changed event:', e);
    }
  }

  /**
   * Assigns Customs Channel (GREEN, YELLOW, RED)
   */
  public async assignChannel(
    declarationId: string,
    tenantId: string,
    channel: CustomsChannelType
  ): Promise<void> {
    await this.repo.assignChannel(declarationId, tenantId, channel);

    // Determine appropriate next status based on channel
    let nextStatus: CustomsDeclarationStatus = 'CHANNEL_ASSIGNED';
    if (channel === 'RED') nextStatus = 'INSPECTION_REQUIRED';
    else if (channel === 'YELLOW') nextStatus = 'DOCUMENT_REVIEW';
    else if (channel === 'GREEN' || channel === 'AEO_PRIORITY') nextStatus = 'APPROVED';

    await this.repo.updateDeclarationStatus(declarationId, tenantId, nextStatus);

    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'customs.channel.assigned',
        event_version: '1.0.0',
        aggregate_type: 'CustomsDeclaration',
        aggregate_id: declarationId,
        correlation_id: declarationId,
        producer_domain: 'CUSTOMS',
        payload: {
          declaration_id: declarationId,
          channel,
          status: nextStatus
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit customs.channel.assigned event:', e);
    }
  }

  /**
   * Issues official SPPB Customs Release
   */
  public async issueSppb(
    declarationId: string,
    tenantId: string,
    sppbNumber?: string,
    sppbDate?: string
  ): Promise<{ sppbNumber: string; sppbDate: string }> {
    return this.sppbService.issueSppbRelease(declarationId, tenantId, sppbNumber, sppbDate);
  }

  /**
   * Adds classification lines
   */
  public async addClassificationLines(
    declarationId: string,
    tenantId: string,
    lines: CreateClassificationLineDTO[],
    exchangeRateIdr?: number
  ): Promise<CustomsClassificationLine[]> {
    return this.classificationService.addClassificationLines(
      declarationId,
      tenantId,
      lines,
      exchangeRateIdr
    );
  }

  /**
   * Deletes a classification line
   */
  public async deleteClassificationLine(
    lineId: string,
    declarationId: string,
    tenantId: string
  ): Promise<void> {
    return this.classificationService.deleteClassificationLine(lineId, declarationId, tenantId);
  }
}
