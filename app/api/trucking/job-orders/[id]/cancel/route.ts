import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobOrderService, getLegacyJobOrderSyncService } from '@/src/application/trucking/JobOrderServiceFactory';
import { IRequestContext } from '@/src/domains/security/contracts/IRequestContext';
import { CancelMissionCommand } from '@/src/application/trucking/commands/CancelMissionCommand';
import { AssignDriverCommand } from '@/src/application/trucking/commands/AssignDriverCommand';
import { Result } from '@/src/shared/kernel/Result';

type UserProfileQuery = {
  from(table: 'user_profiles'): {
    select(columns: string): {
      eq(column: string, value: string): {
        single(): PromiseLike<{ data: { tenant_id: string; role: string } | null }>;
      };
    };
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobOrderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await (supabase as unknown as UserProfileQuery)
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    const body = await request.json();
    const { reason, driverId, vehicleId, transporterId, note } = body;

    const ctx: IRequestContext = {
      userId: user.id,
      tenantId: profile.tenant_id,
      role: profile.role,
      trace: { traceId: crypto.randomUUID(), spanId: crypto.randomUUID() },
    };

    const service = getJobOrderService(supabase);

    // 1. Cancel Mission
    const cancelCmd: CancelMissionCommand = {
      jobOrderId,
      reason,
    };
    const cancelResult: Result<void> = await service.cancelMission(ctx, cancelCmd);
    if (cancelResult.isFailure) {
      return NextResponse.json({ error: cancelResult.error }, { status: 400 });
    }

    // 2. Re-assign if new details provided
    if (driverId && vehicleId) {
      const assignCmd: AssignDriverCommand = {
        jobOrderId,
        driverId,
        vehicleId,
      };
      const assignResult: Result<void> = await service.assignDriver(ctx, assignCmd);
      if (assignResult.isFailure) {
        return NextResponse.json({ error: assignResult.error }, { status: 400 });
      }

      // Legacy adapter patch for transporter and note
      try {
        const legacyAdapter = getLegacyJobOrderSyncService(supabase);
        await legacyAdapter.syncCancellationLegacyFields(jobOrderId, { transporterId, note });
      } catch (legacyError: any) {
        return NextResponse.json({ error: legacyError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[trucking/cancel] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


