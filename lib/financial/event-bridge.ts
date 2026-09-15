/**
 * Sentralogis — ADR-087
 * lib/financial/event-bridge.ts
 *
 * Canonical Operational → Commercial Event Bridge.
 *
 * Connects operational completion (JO done / delivery confirmed) to the
 * canonical financial layer via `fin_billable_events`.
 *
 * Architecture:
 *   Operational completion (JO done)
 *     ↓
 *   ADR-087 Event Bridge (this module)
 *     ↓
 *   fin_billable_events (canonical, RLS, idempotent)
 *     ↓ STOP
 *
 * This module MUST NOT create invoices, AR/AP, settlement, or payment records.
 * Those are separate future waves.
 *
 * Tenant identity is derived exclusively from IdentityContext.
 * No client-supplied tenant authority is accepted.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import { supabaseAdmin } from '../supabase/admin';
import { createBillableEvent } from './repository';
import type { CreateBillableEventInput, BillableEvent } from './types';
import { FinancialError } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface OperationalCompletionContext {
  jobOrderId: string;
  jobOrderNumber: string;
  status: string;
  woItemId: string;
  woId: string;
  salesOrderId: string | null;
  fulfillmentId: string | null;
  capabilityType: string;
  side: 'SELL' | 'BUY';
  currency: string;
  quantity: number;
  unitOfMeasure: string;
  unitAmount: number;
  totalAmount: number;
  priceSnapshotId: string | null;
  completedAt: string;
}

export interface EmitBillableEventResult {
  billableEvent: BillableEvent;
  created: boolean;
}

// ============================================================================
// EVENT BRIDGE
// ============================================================================

export class OperationalCommercialEventBridge {
  /**
   * Emit a canonical billable event from an operational completion.
   *
   * Idempotent: repeated calls with the same idempotency key return the
   * existing record rather than creating a duplicate.
   *
   * Tenant-safe: tenant is derived from IdentityContext only.
   * No client-supplied tenant authority is accepted.
   */
  async emitBillableEvent(
    ctx: IdentityContext,
    completion: OperationalCompletionContext,
    idempotencyKey: string,
  ): Promise<EmitBillableEventResult> {
    assertPermission(ctx, 'commercial:manage');

    // Validate tenant binding: the JO must belong to the caller's tenant
    const jo = await this.fetchJobOrder(ctx.tenantId, completion.jobOrderId);
    if (!jo) {
      throw new FinancialError('BILLABLE_EVENT_NOT_FOUND', 404,
        `Job order not found or not accessible: ${completion.jobOrderId}`);
    }
    if (jo.tenant_id !== ctx.tenantId) {
      throw new FinancialError('BILLABLE_EVENT_NOT_OWNED', 409,
        'Cross-tenant billable event creation is forbidden');
    }

    // Validate the JO is in a terminal/done state
    const { isJoDone } = await import('../domain/jo/status');
    if (!isJoDone(jo.status)) {
      throw new FinancialError('INVALID_TRANSITION', 422,
        `Cannot emit billable event for job order in non-terminal status: ${jo.status}`);
    }

    // Resolve commercial identity
    const commercialIdentity = await this.resolveCommercialIdentity(
      ctx.tenantId,
      completion,
    );

    const input: CreateBillableEventInput = {
      salesOrderId: commercialIdentity.salesOrderId,
      soLineItemId: commercialIdentity.soLineItemId ?? null,
      sourceQuoteItemId: commercialIdentity.sourceQuoteItemId ?? null,
      capabilityType: commercialIdentity.capabilityType as any,
      side: commercialIdentity.side,
      eventType: 'FULFILLMENT_MILESTONE',
      description: `Billable event for JO ${completion.jobOrderNumber} (${completion.status})`,
      quantity: completion.quantity,
      unitOfMeasure: completion.unitOfMeasure,
      currency: completion.currency,
      unitAmount: completion.unitAmount,
      totalAmount: completion.totalAmount,
      priceSnapshotId: commercialIdentity.priceSnapshotId,
      idempotencyKey,
    };

    const billableEvent = await createBillableEvent(ctx, input);

    return {
      billableEvent,
      created: billableEvent.createdBy === ctx.userId,
    };
  }

  /**
   * Fetch a job order within the caller's tenant context.
   * Returns null if the JO does not exist or belongs to another tenant.
   */
  private async fetchJobOrder(tenantId: string, jobOrderId: string) {
    const { data, error } = await supabaseAdmin
      .from('job_orders')
      .select('id, tenant_id, status, wo_item_id')
      .eq('id', jobOrderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch job order: ${error.message}`);
    }
    return data;
  }

  /**
   * Resolve the commercial identity (SO, line item, price snapshot) for a
   * completed job order. Uses the existing commercial lineage without
   * introducing new financial concepts.
   */
  private async resolveCommercialIdentity(
    tenantId: string,
    completion: OperationalCompletionContext,
  ): Promise<{
    salesOrderId: string;
    soLineItemId: string | null;
    sourceQuoteItemId: string | null;
    capabilityType: string;
    side: 'SELL' | 'BUY';
    priceSnapshotId: string | null;
  }> {
    // Trace from wo_item → work_order → sales_order via existing lineage
    const { data: woItem } = await supabaseAdmin
      .from('wo_items')
      .select('id, wo_id, sales_order_id, capability_type, side, price_snapshot_id')
      .eq('id', completion.woItemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!woItem) {
      throw new FinancialError('DATABASE_ERROR', 422,
        `Work order item not found: ${completion.woItemId}`);
    }

    return {
      salesOrderId: woItem.sales_order_id || completion.salesOrderId || '',
      soLineItemId: woItem.id,
      sourceQuoteItemId: null,
      capabilityType: woItem.capability_type || completion.capabilityType,
      side: (woItem.side as 'SELL' | 'BUY') || completion.side,
      priceSnapshotId: woItem.price_snapshot_id || completion.priceSnapshotId,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const operationalCommercialEventBridge = new OperationalCommercialEventBridge();