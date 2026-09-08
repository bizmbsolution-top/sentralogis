/**
 * Sentralogis — API Route: /api/forwarding/wo  (POST)
 *
 * U-08 FORWARDING WRITER GUARD: all logic lives in the governed application
 * boundary (createForwardingWorkOrder). Identity/tenant come exclusively from
 * the session resolver (U-01); mutations are gated by commercial:manage (U-02);
 * the canonical engagement is resolved via U-03; SRs receive the CANONICAL
 * commercial_work_orders.id — never the legacy operational id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { EngagementError } from '@/lib/application/engagement/types';
import { createForwardingWorkOrder } from '@/lib/application/service-contracts/forwarding-writer';
import { ForwardingService } from '@/lib/domain/forwarding/service';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const body = await req.json();

    const legacyResult = await createForwardingWorkOrder(ctx, body);

    const forwardingService = new ForwardingService();
    const orderHeader = await forwardingService.createOrderHeader(ctx, {
      tenant_id: ctx.tenantId,
      work_order_id: legacyResult.wo_id,
      customer_id: body.customer_id,
      vessel_name: body.vessel_name || null,
      voyage_no: body.voyage_no || null,
      etd: body.etd || null,
      eta: body.eta || null,
      origin_port_id: body.origin_location_id || body.origin_port_id || null,
      dest_port_id: body.destination_location_id || body.dest_port_id || null,
      cargo_owner_name: body.cargo_owner_name || null,
      cargo_owner_email: body.cargo_owner_email || null,
      cargo_owner_phone: body.cargo_owner_phone || null,
      consignee_name: body.consignee_name || null,
      consignee_email: body.consignee_email || null,
      consignee_phone: body.consignee_phone || null,
      selling_price_snapshot: body.selling_price || null,
      status: body.status === 'DRAFT' ? 'need_assignment' : 'need_assignment',
      created_by: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      wo_id: legacyResult.wo_id,
      wo_number: legacyResult.wo_number,
      engagement_id: legacyResult.engagement_id,
      order_header_id: orderHeader.id,
      tracking_token: orderHeader.tracking_token,
    });
  } catch (error) {
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof EngagementError) {
      const status = error.code === 'CUSTOMER_NOT_FOUND' ? 404 : error.statusCode;
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status },
      );
    }
    console.error('Create FWD WO Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 },
    );
  }
}
