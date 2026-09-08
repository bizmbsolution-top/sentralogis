/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/service-request-service.ts
 * Description: Application Service providing facade methods for Service Request operations
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  IssueServiceRequestDTO,
  ServiceRequest,
  ServiceRequestStatus
} from './types';
import { ServiceRequestFactory } from './service-request-factory';
import { ServiceRequestDispatcher, DispatchResult } from './service-request-dispatcher';
import {
  ServiceRequestNotFoundError,
  DuplicateServiceRequestError,
  TenantIsolationViolationError
} from './errors';

export class ServiceRequestService {
  private dispatcher = new ServiceRequestDispatcher();

  /**
   * Issues a new Service Request with idempotency check, and optionally auto-dispatches it
   */
  public async issueRequest(
    dto: IssueServiceRequestDTO,
    autoDispatch = true
  ): Promise<{ request: ServiceRequest; dispatchResult?: DispatchResult }> {
    // 1. Check idempotency: check if request with same idempotency_key already exists for this tenant
    const { data: existing } = await supabaseAdmin
      .from('svc_service_requests')
      .select('*')
      .eq('tenant_id', dto.tenant_id)
      .eq('idempotency_key', dto.idempotency_key)
      .single();

    if (existing) {
      const existingReq = existing as unknown as ServiceRequest;
      return { request: existingReq };
    }

    // 2. Build aggregate using factory (includes validation)
    const request = ServiceRequestFactory.create(dto);

    // 3. Save to database
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('svc_service_requests')
      .insert({
        id: request.id,
        tenant_id: request.tenant_id,
        request_number: request.request_number,
        correlation_id: request.correlation_id,
        causation_id: request.causation_id,
        idempotency_key: request.idempotency_key,
        source_domain: request.source_domain,
        target_domain: request.target_domain,
        shipment_id: request.shipment_id,
        execution_leg_id: request.execution_leg_id,
        work_order_id: request.work_order_id,
        service_product_sku: request.service_product_sku,
        request_payload: request.request_payload,
        sla_target_time: request.sla_target_time,
        status: request.status
      })
      .select('*')
      .single();

    if (insertError || !insertedData) {
      if (insertError?.code === '23505') {
        // Unique violation on idempotency_key or request_number
        const { data: conflict } = await supabaseAdmin
          .from('svc_service_requests')
          .select('*')
          .eq('tenant_id', dto.tenant_id)
          .eq('idempotency_key', dto.idempotency_key)
          .single();
        if (conflict) return { request: conflict as unknown as ServiceRequest };
      }
      throw new Error(`Failed to save Service Request: ${insertError?.message}`);
    }

    const savedRequest = insertedData as unknown as ServiceRequest;

    // 4. Auto-dispatch if requested
    if (autoDispatch) {
      const dispatchResult = await this.dispatcher.dispatch(savedRequest);
      const updatedReq = await this.getRequestById(savedRequest.id, savedRequest.tenant_id);
      return { request: updatedReq, dispatchResult };
    }

    return { request: savedRequest };
  }

  /**
   * Dispatches an existing Service Request
   */
  public async dispatchRequest(requestId: string, tenantId: string): Promise<DispatchResult> {
    const request = await this.getRequestById(requestId, tenantId);
    return this.dispatcher.dispatch(request);
  }

  /**
   * Manually accepts a Service Request and binds the target SBU job ID
   */
  public async acceptRequest(
    requestId: string,
    tenantId: string,
    domainJobId: string
  ): Promise<ServiceRequest> {
    const request = await this.getRequestById(requestId, tenantId);

    const { data: updated, error } = await supabaseAdmin
      .from('svc_service_requests')
      .update({
        status: 'ACCEPTED',
        assigned_domain_job_id: domainJobId,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to accept Service Request: ${error?.message}`);
    }

    return updated as unknown as ServiceRequest;
  }

  /**
   * Rejects a Service Request with a reason
   */
  public async rejectRequest(
    requestId: string,
    tenantId: string,
    rejectionReason: string
  ): Promise<ServiceRequest> {
    const request = await this.getRequestById(requestId, tenantId);

    const { data: updated, error } = await supabaseAdmin
      .from('svc_service_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to reject Service Request: ${error?.message}`);
    }

    return updated as unknown as ServiceRequest;
  }

  /**
   * Fetches a single Service Request by ID and validates tenant context
   */
  public async getRequestById(requestId: string, tenantId: string): Promise<ServiceRequest> {
    const { data, error } = await supabaseAdmin
      .from('svc_service_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      throw new ServiceRequestNotFoundError(requestId);
    }

    if (data.tenant_id !== tenantId) {
      throw new TenantIsolationViolationError(data.tenant_id, tenantId);
    }

    return data as unknown as ServiceRequest;
  }

  /**
   * Lists Service Requests with filtering
   */
  public async listRequests(
    tenantId: string,
    filters?: {
      target_domain?: string;
      status?: ServiceRequestStatus;
      shipment_id?: string;
      limit?: number;
    }
  ): Promise<ServiceRequest[]> {
    let query = supabaseAdmin
      .from('svc_service_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.target_domain) {
      query = query.eq('target_domain', filters.target_domain);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.shipment_id) {
      query = query.eq('shipment_id', filters.shipment_id);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list Service Requests: ${error.message}`);
    }

    return (data || []) as unknown as ServiceRequest[];
  }
}
