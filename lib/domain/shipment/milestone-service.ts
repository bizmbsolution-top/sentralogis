/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/milestone-service.ts
 * Description: Immutable Milestone Timeline Engine & Event Outbox integration
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { Milestone } from './types';
import { ShipmentRepository } from './repository';

export class MilestoneService {
  private repo = new ShipmentRepository();

  /**
   * Appends an immutable milestone and publishes an outbox event
   */
  public async recordMilestone(
    tenantId: string,
    shipmentId: string,
    milestoneCode: string,
    milestoneLabel: string,
    options?: {
      executionLegId?: string;
      locationId?: string;
      recordedBy?: string;
      metadata?: Record<string, unknown>;
      occurredAt?: string;
    }
  ): Promise<Milestone> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ms_${Date.now()}`;
    const occurred_at = options?.occurredAt || new Date().toISOString();

    const milestone: Milestone = {
      id,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      execution_leg_id: options?.executionLegId || null,
      milestone_code: milestoneCode,
      milestone_label: milestoneLabel,
      occurred_at,
      location_id: options?.locationId || null,
      recorded_by: options?.recordedBy || null,
      metadata: options?.metadata || {}
    };

    // 1. Insert into database
    await this.repo.insertMilestone(milestone);

    // 2. Publish to event_outbox
    try {
      await supabaseAdmin.from('event_outbox').insert({
        tenant_id: tenantId,
        event_name: 'ShipmentMilestoneReached',
        event_version: '1.0.0',
        aggregate_type: 'Shipment',
        aggregate_id: shipmentId,
        correlation_id: (milestone.metadata?.correlation_id as string) || shipmentId,
        producer_domain: 'FORWARDING',
        payload: {
          milestone_id: milestone.id,
          shipment_id: milestone.shipment_id,
          execution_leg_id: milestone.execution_leg_id,
          milestone_code: milestone.milestone_code,
          milestone_label: milestone.milestone_label,
          occurred_at: milestone.occurred_at
        },
        is_published: false
      });
    } catch (e) {
      console.error('Failed to emit ShipmentMilestoneReached outbox event:', e);
    }

    return milestone;
  }
}
