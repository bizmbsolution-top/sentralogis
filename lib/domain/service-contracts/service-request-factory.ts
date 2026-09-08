/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/service-request-factory.ts
 * Description: Factory generating canonical ServiceRequest aggregates
 */

import { IssueServiceRequestDTO, ServiceRequest } from './types';
import { ServiceRequestValidator } from './service-request-validator';

export class ServiceRequestFactory {
  /**
   * Generates a fully initialized canonical ServiceRequest aggregate
   */
  public static create(dto: IssueServiceRequestDTO): ServiceRequest {
    // 1. Validate DTO
    ServiceRequestValidator.validateIssueRequest(dto);

    // 2. Generate Request Number
    const today = new Date();
    const mmyy = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const request_number = `REQ-${dto.target_domain.substring(0, 3)}-${mmyy}-${randomSuffix}`;

    // 3. Resolve Correlation ID
    const correlation_id =
      dto.correlation_id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `corr_${Date.now()}_${randomSuffix}`);

    // 4. Return aggregate object
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sr_${Date.now()}`,
      tenant_id: dto.tenant_id,
      request_number,
      correlation_id,
      causation_id: null,
      idempotency_key: dto.idempotency_key,
      source_domain: dto.source_domain,
      target_domain: dto.target_domain,
      shipment_id: dto.shipment_id || null,
      execution_leg_id: dto.execution_leg_id || null,
      work_order_id: dto.work_order_id || null,
      service_product_sku: dto.service_product_sku,
      request_payload: dto.request_payload,
      sla_target_time: dto.sla_target_time || null,
      status: 'ISSUED',
      assigned_domain_job_id: null,
      rejection_reason: null,
      version_no: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
