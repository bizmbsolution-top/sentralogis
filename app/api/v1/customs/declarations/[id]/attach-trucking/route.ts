/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * API Route: /api/v1/customs/declarations/[id]/attach-trucking
 * Description: Progressive cross-domain attachment of Trucking Job Order to Customs Declaration
 *
 * ADR-021: Idempotent, tenant-safe, conflict-aware attachment
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CustomsAttachmentService } from '@/lib/domain/customs/attachment-service';
import { CustomsDeclaration } from '@/lib/domain/customs/types';
import { AttachTruckingCommand } from '@/lib/domain/commercial/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id: declarationId } = await params;
    const body = await req.json();

    if (!body.job_order_id) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAM', message: 'job_order_id is required' },
        { status: 400 }
      );
    }

    // 1. Fetch customs declaration
    const { data: declaration, error: decErr } = await supabaseAdmin
      .from('cus_declarations')
      .select('*')
      .eq('id', declarationId)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (decErr || !declaration) {
      return NextResponse.json(
        { success: false, error: 'DECLARATION_NOT_FOUND', message: 'Customs declaration not found' },
        { status: 404 }
      );
    }

    // 2. Fetch job order to verify tenant and existence
    const { data: jobOrder, error: joErr } = await supabaseAdmin
      .from('job_orders')
      .select('id, tenant_id')
      .eq('id', body.job_order_id)
      .single();

    if (joErr || !jobOrder) {
      return NextResponse.json(
        { success: false, error: 'JOB_ORDER_NOT_FOUND', message: 'Job order not found' },
        { status: 404 }
      );
    }

    // 3. Process attachment command through domain service
    const command: AttachTruckingCommand = {
      declaration_id: declarationId,
      tenant_id: auth.tenantId,
      job_order_id: body.job_order_id,
      user_id: auth.userId,
    };

    const result = CustomsAttachmentService.attachTrucking(
      declaration as CustomsDeclaration,
      command,
      jobOrder.tenant_id
    );

    if (!result.success) {
      const status = result.action === 'FORBIDDEN' ? 403 : result.action === 'CONFLICT' ? 409 : 400;
      return NextResponse.json({
        success: false,
        action: result.action,
        error: result.action,
        message: result.message,
      }, { status });
    }

    // 4. If newly attached, update cus_declarations
    if (result.action === 'ATTACHED') {
      const { data: updatedDec, error: updateErr } = await supabaseAdmin
        .from('cus_declarations')
        .update({
          job_order_id: body.job_order_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', declarationId)
        .eq('tenant_id', auth.tenantId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: 'DB_UPDATE_ERROR', message: updateErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: result.action,
        data: updatedDec,
        message: result.message,
      });
    }

    // ALREADY_ATTACHED (idempotent)
    return NextResponse.json({
      success: true,
      action: result.action,
      data: declaration,
      message: result.message,
    });
  } catch (error) {
    return handleCustomsError(error);
  }
}
