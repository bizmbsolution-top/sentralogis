import { NextRequest, NextResponse } from 'next/server';
import { ServiceRequestService } from '@/lib/domain/service-contracts/service-request-service';
import { ServiceContractError } from '@/lib/domain/service-contracts/errors';

const service = new ServiceRequestService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      source_domain,
      target_domain,
      shipment_id,
      execution_leg_id,
      work_order_id,
      service_product_sku,
      request_payload,
      sla_target_time,
      idempotency_key,
      correlation_id,
      auto_dispatch = true
    } = body;

    if (!tenant_id || !target_domain || !service_product_sku) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields: tenant_id, target_domain, service_product_sku' },
        { status: 400 }
      );
    }

    const resolvedIdempotencyKey =
      idempotency_key ||
      `idem-${tenant_id}-${execution_leg_id || 'manual'}-${service_product_sku}-${Date.now()}`;

    const result = await service.issueRequest(
      {
        tenant_id,
        source_domain: source_domain || 'FORWARDING',
        target_domain,
        shipment_id,
        execution_leg_id,
        work_order_id,
        service_product_sku,
        request_payload,
        sla_target_time,
        idempotency_key: resolvedIdempotencyKey,
        correlation_id
      },
      auto_dispatch
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ServiceContractError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code, details: err.details },
        { status: err.statusCode }
      );
    }
    console.error('Service request issue error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ success: false, error: 'tenant_id query param is required' }, { status: 400 });
    }

    const target_domain = searchParams.get('target_domain') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const shipment_id = searchParams.get('shipment_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const list = await service.listRequests(tenant_id, {
      target_domain,
      status,
      shipment_id,
      limit
    });

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    console.error('Service request list error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
