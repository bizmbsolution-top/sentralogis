/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/exception-service.ts
 * Description: Shipment Exception & Demurrage Risk Watchdog Engine
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShipmentException } from './types';
import { ShipmentRepository } from './repository';

export class ExceptionService {
  private repo = new ShipmentRepository();

  /**
   * Logs a new exception on a shipment or execution leg
   */
  public async logException(
    tenantId: string,
    shipmentId: string,
    exceptionType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    executionLegId?: string
  ): Promise<ShipmentException> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exc_${Date.now()}`;
    const now = new Date().toISOString();

    const exception: ShipmentException = {
      id,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      execution_leg_id: executionLegId || null,
      exception_type: exceptionType,
      severity,
      description,
      is_resolved: false,
      created_at: now
    };

    // 1. Persist in shp_exceptions
    await this.repo.insertException(exception);

    // 2. Publish to event_outbox
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'ShipmentExceptionRaised',
        event_version: '1.0.0',
        aggregate_type: 'Shipment',
        aggregate_id: shipmentId,
        correlation_id: shipmentId,
        producer_domain: 'FORWARDING',
        payload: {
          exception_id: exception.id,
          shipment_id: exception.shipment_id,
          exception_type: exception.exception_type,
          severity: exception.severity,
          description: exception.description
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit ShipmentExceptionRaised outbox event:', e);
    }

    return exception;
  }

  /**
   * Resolves an exception and emits a resolution event
   */
  public async resolveException(
    exceptionId: string,
    tenantId: string,
    shipmentId: string,
    resolvedBy?: string
  ): Promise<void> {
    await this.repo.resolveException(exceptionId, tenantId, resolvedBy);

    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'ShipmentExceptionResolved',
        event_version: '1.0.0',
        aggregate_type: 'Shipment',
        aggregate_id: shipmentId,
        correlation_id: shipmentId,
        producer_domain: 'FORWARDING',
        payload: {
          exception_id: exceptionId,
          shipment_id: shipmentId,
          resolved_by: resolvedBy
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit ShipmentExceptionResolved outbox event:', e);
    }
  }

  /**
   * Checks if there are active unresolved CRITICAL or HIGH exceptions blocking completion
   */
  public async checkBlockingExceptions(shipmentId: string, tenantId: string): Promise<boolean> {
    const exceptions = await this.repo.getExceptions(shipmentId, tenantId);
    const blocking = exceptions.filter(
      (e: ShipmentException) => !e.is_resolved && (e.severity === 'CRITICAL' || e.severity === 'HIGH')
    );
    return blocking.length > 0;
  }
}
