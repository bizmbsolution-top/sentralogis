/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * API Route: /api/v1/customs/declarations/[id]/attach-shipment
 * Description: Progressive cross-domain attachment of Shipment to Customs Declaration
 *
 * ADR-021: Idempotent, tenant-safe, conflict-aware attachment
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CustomsAttachmentService } from '@/lib/domain/customs/attachment-service';
import { CustomsDeclaration } from '@/lib/domain/customs/types';
import { AttachShipmentCommand } from '@/lib/domain/commercial/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id: declarationId } = await params;
    const body = await req.json();

    if (!body.shipment_id) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAM', message: 'shipment_id is required' },
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

    // 2. Fetch shipment to verify tenant and existence
    const { data: shipment, error: shpErr } = await supabaseAdmin
      .from('shp_shipments')
      .select('id, tenant_id')
      .eq('id', body.shipment_id)
      .single();

    if (shpErr || !shipment) {
      return NextResponse.json(
        { success: false, error: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // 3. Process attachment command through domain service
    const command: AttachShipmentCommand = {
      declaration_id: declarationId,
      tenant_id: auth.tenantId,
      shipment_id: body.shipment_id,
      execution_leg_id: body.execution_leg_id,
      user_id: auth.userId,
    };

    const result = CustomsAttachmentService.attachShipment(
      declaration as CustomsDeclaration,
      command,
      shipment.tenant_id
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
      const updatePayload: Record<string, unknown> = {
        shipment_id: body.shipment_id,
        updated_at: new Date().toISOString(),
      };
      if (body.execution_leg_id) {
        updatePayload.execution_leg_id = body.execution_leg_id;
      }

      const { data: updatedDec, error: updateErr } = await supabaseAdmin
        .from('cus_declarations')
        .update(updatePayload)
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
