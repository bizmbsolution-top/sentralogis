import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';

const service = new ShipmentService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;

    // 1. Fetch Core Shipment Aggregate
    const aggregate = await service.getShipment(id, auth.tenantId);

    // 2. Fetch Cross-Domain Service Requests
    const { data: serviceRequestsData } = await supabaseAdmin
      .from('svc_service_requests')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .or(`shipment_id.eq.${id},correlation_id.eq.${id}`)
      .order('requested_at', { ascending: false });

    // 3. Fetch Customs Declarations (if any)
    const { data: customsData } = await supabaseAdmin
      .from('cus_declarations')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .or(`shipment_id.eq.${id},correlation_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .maybeSingle();

    // 4. Derive Attention Items
    const attentionItems: Array<{
      id: string;
      severity: 'CRITICAL' | 'WARNING' | 'INFO';
      title: string;
      description: string;
      action_label?: string;
      action_target?: string;
    }> = [];

    // Check unresolved exceptions
    const criticalExceptions = aggregate.exceptions.filter(e => !e.is_resolved && (e.severity === 'CRITICAL' || e.severity === 'HIGH'));
    criticalExceptions.forEach(ex => {
      attentionItems.push({
        id: `att-ex-${ex.id}`,
        severity: ex.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `Exception: ${ex.exception_type}`,
        description: ex.description,
        action_label: 'Resolve Exception',
        action_target: 'EXCEPTIONS'
      });
    });

    // Check Customs Channel / Hold
    if (customsData) {
      if (customsData.customs_channel === 'RED') {
        attentionItems.push({
          id: `att-cus-red`,
          severity: 'CRITICAL',
          title: 'Customs Red Channel Inspection Required',
          description: 'Physical inspection and document verification mandatory before SPPB release.',
          action_label: 'Open Customs Workspace',
          action_target: '/sbu/customs'
        });
      } else if (customsData.customs_channel === 'YELLOW') {
        attentionItems.push({
          id: `att-cus-yel`,
          severity: 'WARNING',
          title: 'Customs Yellow Channel Document Review',
          description: 'Customs officer reviewing supporting import documents.',
          action_label: 'View Declaration',
          action_target: '/sbu/customs'
        });
      }
    }

    // Check pending unaccepted service requests
    (serviceRequestsData || []).forEach(sr => {
      if (sr.status === 'ISSUED') {
        attentionItems.push({
          id: `att-sr-${sr.id}`,
          severity: 'WARNING',
          title: `Pending SBU Handoff: ${sr.target_domain}`,
          description: `Service request for ${sr.service_product_sku} has been issued and awaits acceptance.`,
          action_label: 'Review Request',
          action_target: 'SERVICES'
        });
      }
    });

    // 5. Derive Next Required Action
    let nextAction: {
      title: string;
      target_sbu: string;
      status: string;
      action_label: string;
      action_type: string;
    } | null = null;

    if (criticalExceptions.length > 0) {
      nextAction = {
        title: `Resolve Critical Exception (${criticalExceptions[0].exception_type})`,
        target_sbu: 'FORWARDING',
        status: 'BLOCKING',
        action_label: 'Resolve Now',
        action_type: 'RESOLVE_EXCEPTION'
      };
    } else if (customsData && customsData.status !== 'RELEASED' && customsData.status !== 'SPPB_ISSUED') {
      nextAction = {
        title: `Progress Customs Declaration (${customsData.nomor_pengajuan || 'Draft'})`,
        target_sbu: 'CUSTOMS',
        status: customsData.status,
        action_label: 'Open Customs',
        action_type: 'OPEN_CUSTOMS'
      };
    } else if (aggregate.execution_legs.some(l => l.status === 'PLANNED')) {
      const nextLeg = aggregate.execution_legs.find(l => l.status === 'PLANNED');
      nextAction = {
        title: `Dispatch Execution Leg #${nextLeg?.leg_sequence} (${nextLeg?.transport_mode})`,
        target_sbu: nextLeg?.execution_provider_type === 'INTERNAL_SBU' ? 'SBU_SERVICE' : 'VENDOR',
        status: 'READY_TO_DISPATCH',
        action_label: 'Dispatch Leg',
        action_type: 'DISPATCH_LEG'
      };
    }

    // 6. Compute Risk Assessment
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const riskFactors: string[] = [];

    if (criticalExceptions.length > 0) {
      riskLevel = 'CRITICAL';
      riskFactors.push(`${criticalExceptions.length} critical operational exception(s)`);
    }

    if (customsData?.customs_channel === 'RED') {
      riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      riskFactors.push('Customs physical inspection (Red Channel)');
    }

    const projection = {
      ...aggregate,
      service_requests: serviceRequestsData || [],
      customs_summary: customsData
        ? {
            declaration_id: customsData.id,
            nomor_pengajuan: customsData.nomor_pengajuan,
            declaration_type: customsData.declaration_type,
            customs_channel: customsData.customs_channel,
            status: customsData.status,
            total_tax_amount: customsData.total_tax_amount,
            sppb_number: customsData.sppb_number
          }
        : null,
      attention_items: attentionItems,
      next_action: nextAction,
      risk_assessment: {
        risk_level: riskLevel,
        eta_variance_hours: 0,
        factors: riskFactors.length > 0 ? riskFactors : ['All operational milestones on schedule']
      }
    };

    return NextResponse.json({
      success: true,
      data: projection
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
