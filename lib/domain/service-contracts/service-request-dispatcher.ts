/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/service-request-dispatcher.ts
 * Description: Dispatcher orchestrating SBU capability execution and canonical event emission
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { ServiceRequest } from './types';
import { AdapterRegistry } from './adapters/adapter-registry';
import {
  InvalidServiceRequestStateError,
  AdapterExecutionFailedError
} from './errors';

export interface DispatchResult {
  success: boolean;
  serviceRequestId: string;
  domainJobId?: string;
  domainJobNumber?: string;
  status: string;
  error?: string;
}

export class ServiceRequestDispatcher {
  private adapterRegistry = AdapterRegistry.getInstance();

  /**
   * Dispatches an issued Service Request to the target SBU adapter
   */
  public async dispatch(request: ServiceRequest): Promise<DispatchResult> {
    // 1. Verify state allows dispatch
    if (request.status !== 'ISSUED' && request.status !== 'REROUTING') {
      throw new InvalidServiceRequestStateError(request.status, 'dispatch', ['ISSUED', 'REROUTING']);
    }

    // 2. Resolve adapter
    const adapter = this.adapterRegistry.getAdapter(request.target_domain, request.service_product_sku);

    // 3. Validate target SBU capability readiness
    const validation = await adapter.validate(request);
    if (!validation.isValid) {
      await this.markRejected(request, validation.errors.join('; '));
      return {
        success: false,
        serviceRequestId: request.id,
        status: 'REJECTED',
        error: validation.errors.join('; ')
      };
    }

    // 4. Update status to ACKNOWLEDGED
    await supabaseAdmin
      .from('svc_service_requests')
      .update({ status: 'ACKNOWLEDGED', updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('tenant_id', request.tenant_id);

    try {
      // 5. Execute adapter to create Domain Job in private SBU tables
      const execResult = await adapter.execute(request);

      if (!execResult.success || !execResult.domainJobId) {
        throw new AdapterExecutionFailedError(request.target_domain, 'Adapter returned non-success result');
      }

      // 6. Update ServiceRequest to ACCEPTED and bind domain_job_id
      await supabaseAdmin
        .from('svc_service_requests')
        .update({
          status: 'ACCEPTED',
          assigned_domain_job_id: execResult.domainJobId,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
        .eq('tenant_id', request.tenant_id);

      // 7. Write ServiceRequestAccepted event to Event Outbox
      await this.recordOutboxEvent(request, 'ServiceRequestAccepted', {
        domain_job_id: execResult.domainJobId,
        domain_job_number: execResult.domainJobNumber,
        target_domain: request.target_domain,
        service_sku: request.service_product_sku
      });

      return {
        success: true,
        serviceRequestId: request.id,
        domainJobId: execResult.domainJobId,
        domainJobNumber: execResult.domainJobNumber,
        status: 'ACCEPTED'
      };
    } catch (err: any) {
      // 8. Handle Failure: Compensation & Mark Rejected
      console.error(`Service Request dispatch error (${request.id}):`, err);

      if (adapter.compensate) {
        await adapter.compensate({
          serviceRequestId: request.id,
          tenantId: request.tenant_id,
          reason: err.message || 'Dispatch failed'
        });
      }

      await this.markRejected(request, err.message || 'Execution failed in target SBU adapter');

      return {
        success: false,
        serviceRequestId: request.id,
        status: 'REJECTED',
        error: err.message || 'Adapter execution failed'
      };
    }
  }

  private async markRejected(request: ServiceRequest, reason: string): Promise<void> {
    await supabaseAdmin
      .from('svc_service_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .eq('tenant_id', request.tenant_id);

    await this.recordOutboxEvent(request, 'ServiceRequestRejected', {
      rejection_reason: reason,
      target_domain: request.target_domain
    });
  }

  private async recordOutboxEvent(
    request: ServiceRequest,
    eventName: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: request.tenant_id,
        event_name: eventName,
        event_version: '1.0.0',
        aggregate_type: 'ServiceRequest',
        aggregate_id: request.id,
        correlation_id: request.correlation_id,
        causation_id: request.causation_id,
        producer_domain: request.source_domain,
        payload: {
          service_request_id: request.id,
          request_number: request.request_number,
          shipment_id: request.shipment_id,
          execution_leg_id: request.execution_leg_id,
          ...payload
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to record event in event_outbox:', e);
    }
  }
}
