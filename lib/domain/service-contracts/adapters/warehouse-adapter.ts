/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/adapters/warehouse-adapter.ts
 * Description: Warehouse SBU Adapter validating contract boundaries
 */

import {
  ServiceRequestAdapter,
  AdapterExecutionResult,
  AdapterCompensationContext
} from './service-request-adapter.interface';
import { ServiceRequest, WarehouseServicePayload } from '../types';
import { ValidationResult } from '../service-request-validator';
import { AdapterExecutionFailedError } from '../errors';

export class WarehouseServiceRequestAdapter implements ServiceRequestAdapter {
  public readonly targetDomain = 'WAREHOUSE' as const;

  public supports(serviceProductSku: string): boolean {
    return (
      serviceProductSku.startsWith('WH_') ||
      serviceProductSku.includes('WAREHOUSE') ||
      serviceProductSku.includes('STAGING') ||
      serviceProductSku.includes('CROSSDOCK')
    );
  }

  public async validate(request: ServiceRequest): Promise<ValidationResult> {
    const payload = request.request_payload as WarehouseServicePayload;
    if (!payload?.handling_specification?.warehouse_location_id) {
      return { isValid: false, errors: ['Missing warehouse_location_id'] };
    }
    return { isValid: true, errors: [] };
  }

  public async execute(request: ServiceRequest): Promise<AdapterExecutionResult> {
    try {
      const today = new Date();
      const mmyy = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const domainJobNumber = `WH-JOB-${mmyy}-${randomSuffix}`;
      const domainJobId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `wh_${Date.now()}_${randomSuffix}`;

      return {
        success: true,
        domainJobId,
        domainJobNumber,
        metadata: {
          note: 'Warehouse handling job queued'
        }
      };
    } catch (err: any) {
      throw new AdapterExecutionFailedError('WAREHOUSE', err.message || String(err));
    }
  }

  public async compensate(context: AdapterCompensationContext): Promise<void> {
    console.log(`Compensating Warehouse domain job ${context.domainJobId}: ${context.reason}`);
  }
}
