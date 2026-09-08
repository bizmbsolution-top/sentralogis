import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ServiceRequestService } from '@/lib/domain/service-contracts/service-request-service';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { IdentityResolutionError } from '@/lib/application/identity/errors';

const serviceRequestService = new ServiceRequestService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:manage');

    const { id } = await params;
    const body = await req.json();
    const { container_assignments } = body;
    const tenant_id = ctx.tenantId;

    if (!container_assignments || !Array.isArray(container_assignments) || container_assignments.length === 0) {
      return NextResponse.json({ success: false, error: 'container_assignments harus diisi' }, { status: 400 });
    }

    const { data: consol, error: consolError } = await supabaseAdmin
      .from('fw_consolidations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (consolError || !consol) {
      return NextResponse.json({ success: false, error: 'Konsolidasi tidak ditemukan' }, { status: 404 });
    }

    if (consol.status !== 'arrived' && consol.status !== 'shipped') {
      return NextResponse.json({ success: false, error: 'Konsolidasi harus dalam status arrived/shipped untuk deconsol' }, { status: 400 });
    }

    const { data: containers, error: containersError } = await supabaseAdmin
      .from('fw_container_assignments')
      .select('id, status, container_number, container_type')
      .eq('consolidation_id', id)
      .eq('tenant_id', tenant_id);

    if (containersError) {
      return NextResponse.json({ success: false, error: 'Gagal memuat container' }, { status: 500 });
    }

    const notArrived = containers?.filter(c => c.status !== 'arrived' && c.status !== 'shipped') || [];
    if (notArrived.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Container ${notArrived.map(c => c.container_number).join(', ')} belum arrived/shipped`
      }, { status: 400 });
    }

    const { ForwardingService } = await import('@/lib/domain/forwarding/service');

    const forwardingService = new ForwardingService();
    const srIssuer = async (args: {
      tenant_id: string;
      source_domain: 'FORWARDING';
      target_domain: 'TRUCKING';
      work_order_id: string;
      service_product_sku: string;
      request_payload: any;
      idempotency_key: string;
    }) => {
      const result = await serviceRequestService.issueRequest(args, true);
      return {
        request: { assigned_domain_job_id: (result.request as any).assigned_domain_job_id || null },
        dispatchResult: result.dispatchResult || undefined,
      };
    };

    const result = await forwardingService.deconsolConsolidation(ctx, id, srIssuer);

    return NextResponse.json({
      success: true,
      data: {
        consol_id: result.consol_id,
        delivery_jobs_count: result.delivery_jobs_count,
        delivery_jobs_created: result.delivery_jobs_created,
      },
    });

  } catch (error: any) {
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Deconsol Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
