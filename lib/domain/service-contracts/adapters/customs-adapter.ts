/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/adapters/customs-adapter.ts
 * Description: Customs Clearance SBU Adapter translating ServiceRequests into cus_declarations
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  ServiceRequestAdapter,
  AdapterExecutionResult,
  AdapterCompensationContext
} from './service-request-adapter.interface';
import { ServiceRequest, CustomsServicePayload } from '../types';
import { ValidationResult } from '../service-request-validator';
import {
  AdapterExecutionFailedError,
  DomainJobCreationFailedError
} from '../errors';

export class CustomsServiceRequestAdapter implements ServiceRequestAdapter {
  public readonly targetDomain = 'CUSTOMS' as const;

  public supports(serviceProductSku: string): boolean {
    return (
      serviceProductSku.startsWith('CUS_') ||
      serviceProductSku.includes('CUSTOMS') ||
      serviceProductSku.includes('CLEARANCE') ||
      serviceProductSku.includes('PIB') ||
      serviceProductSku.includes('PEB')
    );
  }

  public async validate(request: ServiceRequest): Promise<ValidationResult> {
    const payload = request.request_payload as CustomsServicePayload;
    if (!payload?.declaration_parameters?.customs_office_code) {
      return { isValid: false, errors: ['Missing customs_office_code'] };
    }
    if (!payload?.declaration_parameters?.importer_entity_id) {
      return { isValid: false, errors: ['Missing importer_entity_id'] };
    }
    return { isValid: true, errors: [] };
  }

  public async execute(request: ServiceRequest): Promise<AdapterExecutionResult> {
    const tenant_id = request.tenant_id;
    const payload = request.request_payload as CustomsServicePayload;
    const params = payload.declaration_parameters;

    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const declaration_number = `AJU-${params.customs_office_code}-${dateStr}-${randomSuffix}`;

      const { data: decData, error: decError } = await supabaseAdmin
        .from('cus_declarations')
        .insert({
          tenant_id,
          declaration_number,
          service_request_id: request.id,
          work_order_id: request.work_order_id || null,
          importer_id: params.importer_entity_id,
          ppjk_id: params.ppjk_entity_id || null,
          declaration_type: params.declaration_type || 'PIB_IMPORT',
          customs_office_code: params.customs_office_code,
          status: 'DRAFT'
        })
        .select('id, declaration_number')
        .single();

      if (decError || !decData) {
        throw new DomainJobCreationFailedError('CUSTOMS', decError?.message || 'Failed to insert cus_declarations');
      }

      return {
        success: true,
        domainJobId: decData.id,
        domainJobNumber: decData.declaration_number
      };
    } catch (err: any) {
      if (err instanceof DomainJobCreationFailedError) throw err;
      throw new AdapterExecutionFailedError('CUSTOMS', err.message || String(err));
    }
  }

  public async compensate(context: AdapterCompensationContext): Promise<void> {
    if (!context.domainJobId) return;
    try {
      await supabaseAdmin
        .from('cus_declarations')
        .update({ status: 'CANCELLED' })
        .eq('id', context.domainJobId)
        .eq('tenant_id', context.tenantId);
    } catch (error) {
      console.error(`Failed to compensate Customs declaration ${context.domainJobId}:`, error);
    }
  }
}
