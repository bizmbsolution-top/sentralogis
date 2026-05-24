import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SLA_ESCALATION_RULES = [
  {
    level: 1,
    thresholdMinutes: 15,
    title: 'SLA Warning',
    message: 'Approaching SLA breach',
    roles: ['SBU_OPS'],
  },
  {
    level: 2,
    thresholdMinutes: 30,
    title: 'SLA Breach Alert',
    message: 'SLA has been breached',
    roles: ['SBU_OPS', 'HQ_OPS'],
  },
  {
    level: 3,
    thresholdMinutes: 120,
    title: 'SLA Critical',
    message: 'SLA breach exceeding 2 hours',
    roles: ['SBU_OPS', 'HQ_OPS', 'HQ_FINANCE'],
  },
  {
    level: 4,
    thresholdMinutes: 480,
    title: 'SLA Emergency',
    message: 'SLA breach exceeding 8 hours — immediate action required',
    roles: ['SBU_OPS', 'HQ_OPS', 'HQ_FINANCE', 'DIRECTOR'],
  },
];

const SLA_STAGE_TARGETS: Record<string, number> = {
  'SLA 1': 30,
  'SLA 2': 60,
  'SLA 3': 4320,
  'SLA 4': 1440,
  'SLA 5': 0,
  'SLA 6': 0,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const tenantFilter = body.tenant_id as string | undefined;

    const { data: breaches, error: breachError } = await supabaseAdmin
      .rpc('get_active_sla_breaches', { p_tenant_id: tenantFilter || '00000000-0000-0000-0000-000000000000' });

    if (breachError) {
      console.error('[sla-escalation] Error fetching breaches:', breachError);
      return NextResponse.json({ success: false, error: breachError.message }, { status: 500 });
    }

    const activeBreaches = (breaches || []) as any[];
    const escalations: any[] = [];
    const notifications: any[] = [];

    for (const breach of activeBreaches) {
      const slaStage = breach.breach_type || breach.stage;
      const targetMinutes = SLA_STAGE_TARGETS[slaStage] || 60;
      const overdueMinutes = breach.overdue_minutes || 0;
      const totalElapsed = targetMinutes + overdueMinutes;

      const applicableRules = SLA_ESCALATION_RULES.filter(rule => totalElapsed >= rule.thresholdMinutes);
      if (applicableRules.length === 0) continue;

      const highestRule = applicableRules[applicableRules.length - 1];

      const { data: existingEscalation } = await supabaseAdmin
        .from('sla_escalations')
        .select('id, escalation_level')
        .eq('wo_id', breach.wo_id || null)
        .eq('jo_id', breach.jo_id || null)
        .eq('sla_stage', slaStage)
        .is('resolved_at', null)
        .order('escalation_level', { ascending: false })
        .limit(1)
        .single();

      if (existingEscalation && existingEscalation.escalation_level >= highestRule.level) {
        continue;
      }

      const escalationData = {
        tenant_id: breach.tenant_id || '00000000-0000-0000-0000-000000000000',
        wo_id: breach.wo_id || null,
        jo_id: breach.jo_id || null,
        sla_stage: slaStage,
        breach_type: breach.breach_type || slaStage,
        escalation_level: highestRule.level,
        notified_role: highestRule.roles.join(','),
        details: `${highestRule.title}: ${breach.wo_number || 'N/A'} - ${breach.details || 'No details'}`,
      };

      if (!dryRun) {
        const { error: escError } = await supabaseAdmin
          .from('sla_escalations')
          .insert(escalationData);

        if (escError) {
          console.error('[sla-escalation] Error inserting escalation:', escError);
          continue;
        }

        for (const role of highestRule.roles) {
          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              role,
              title: `[${highestRule.title}] ${slaStage}`,
              message: `${highestRule.message} — ${breach.wo_number || 'N/A'}${breach.jo_number ? ` / ${breach.jo_number}` : ''} (${overdueMinutes}m overdue)`,
              type: 'sla_breach',
              is_read: false,
              metadata: {
                link: slaStage.includes('SLA 5') || slaStage.includes('SLA 6')
                  ? '/hq/invoice-customer'
                  : slaStage.includes('SLA 3')
                    ? '/hq/sbu-activities'
                    : slaStage.includes('SLA 4')
                      ? '/hq/invoice-customer'
                      : '/hq/work-orders',
                tenant_id: escalationData.tenant_id,
                wo_number: breach.wo_number,
                jo_number: breach.jo_number,
                sla_stage: slaStage,
                escalation_level: highestRule.level,
                overdue_minutes: overdueMinutes,
              },
            });

          if (!notifError) {
            notifications.push({ role, title: highestRule.title, message: breach.wo_number });
          }
        }
      }

      escalations.push({
        ...escalationData,
        notifications_sent: highestRule.roles.length,
      });
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        breaches_checked: activeBreaches.length,
        escalations_created: escalations.length,
        notifications_sent: notifications.length,
      },
      escalations,
      notifications,
      executed_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[sla-escalation] Critical error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('sla_escalations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const unresolved = data?.filter(d => !d.resolved_at) || [];
    const resolved = data?.filter(d => d.resolved_at) || [];

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      unresolved_count: unresolved.length,
      resolved_count: resolved.length,
      escalations: data,
      checked_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[sla-escalation] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
