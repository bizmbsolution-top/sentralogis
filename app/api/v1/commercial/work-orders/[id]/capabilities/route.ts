/**
 * Sentralogis — API Route: /api/v1/commercial/work-orders/[id]/capabilities
 * Description: Manage capability bindings under a commercial work order (engagement root)
 *
 * ADR-018: Reuses commercial_work_orders as engagement root
 * ADR-020: Enforces UNIQUE(tenant_id, work_order_id, capability_type)
 *
 * U-06A CONTAINMENT: this route no longer performs direct lifecycle status
 * mutations. The former REACTIVATED `.update({status:'ACTIVE'}})` bypass now
 * delegates to the governed U-06 boundary (`transitionBinding`), which enforces
 * identity (U-01), commercial:manage (U-02), registry authority (U-05), the
 * domain state machine, atomic persistence and the canonical outbox event.
 *
 * Identity resolution uses the hardened session resolver; the broken
 * `resolveCustomsAuthContext` dependency is removed from this route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CapabilityBindingService } from '@/lib/domain/commercial/capability-binding-service';
import { CommercialCapabilityBinding, CreateCapabilityBindingDTO } from '@/lib/domain/commercial/types';
import {
  transitionBinding,
  toLifecycleErrorResponse,
} from '@/lib/application/capability-bindings';
import type { CapabilityBindingView } from '@/lib/application/capability-bindings';

/** Map the governed U-06 view back to the legacy row shape (contract preservation). */
function viewToLegacyRow(v: CapabilityBindingView): Record<string, unknown> {
  return {
    id: v.id,
    tenant_id: undefined,
    work_order_id: v.workOrderId,
    capability_type: v.capabilityCode,
    status: v.status,
    currency: v.currency,
    activated_at: v.activatedAt,
    completed_at: v.completedAt,
    deactivated_at: v.deactivatedAt,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
    const { id: workOrderId } = await params;

    const { data: bindings, error } = await supabaseAdmin
      .from('commercial_capability_bindings')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('tenant_id', ctx.tenantId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'FAILED_TO_FETCH_CAPABILITIES', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bindings || [],
      count: (bindings || []).length,
    });
  } catch (error) {
    return toLifecycleErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // U-01 identity + U-02 manage gate (mutations require manage authority).
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:manage');

    const { id: workOrderId } = await params;
    const body = await req.json();

    // 1. Fetch existing bindings for this work order
    const { data: existingData, error: fetchErr } = await supabaseAdmin
      .from('commercial_capability_bindings')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('tenant_id', ctx.tenantId);

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: 'DB_READ_ERROR', message: fetchErr.message },
        { status: 500 }
      );
    }

    const existingBindings = (existingData || []) as CommercialCapabilityBinding[];

    // 2. Activate capability using domain service (idempotent + ADR-020)
    const dto: CreateCapabilityBindingDTO = {
      tenant_id: ctx.tenantId,
      work_order_id: workOrderId,
      capability_type: body.capability_type,
      scope: body.scope,
      pricing: body.pricing,
      currency: body.currency || 'IDR',
      metadata: body.metadata,
      created_by: ctx.userId,
    };

    const { binding, action } = CapabilityBindingService.activateCapability(dto, existingBindings);

    // 3. Persist if newly created or reactivated
    if (action === 'CREATED') {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('commercial_capability_bindings')
        .insert(binding)
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json(
          { success: false, error: 'DB_INSERT_ERROR', message: insertErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        data: inserted,
      }, { status: 201 });
    }

    if (action === 'REACTIVATED') {
      // U-06A CONTAINMENT: delegate the lifecycle mutation to the governed
      // boundary — state machine, registry authority, optimistic guard,
      // atomic persist + canonical `capability.binding.activated` event all
      // happen inside transitionBinding. No direct UPDATE here.
      const result = await transitionBinding(ctx, workOrderId, binding.id, { status: 'ACTIVE' });

      if (result.action === 'NO_OP') {
        // Defensive: binding became ACTIVE concurrently between read and write.
        return NextResponse.json({ success: true, action: 'ALREADY_ACTIVE', data: binding });
      }

      return NextResponse.json({
        success: true,
        action,
        data: viewToLegacyRow(result.binding),
      });
    }

    // ALREADY_ACTIVE: Idempotent return
    return NextResponse.json({
      success: true,
      action,
      data: binding,
    });
  } catch (error) {
    return toLifecycleErrorResponse(error);
  }
}
