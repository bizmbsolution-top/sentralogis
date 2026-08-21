import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobOrderService, getLegacyJobOrderSyncService } from '@/src/application/trucking/JobOrderServiceFactory';
import { IRequestContext } from '@/src/domains/security/contracts/IRequestContext';
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
    const { driverId, vehicleId, transporterId, purchasePrice, notes } = body;

    const ctx: IRequestContext = {
      userId: user.id,
      tenantId: profile.tenant_id,
      role: profile.role,
      trace: { traceId: crypto.randomUUID(), spanId: crypto.randomUUID() },
    };

    // 1. Execute Domain Logic
    if (driverId && vehicleId) {
      const cmd: AssignDriverCommand = {
        jobOrderId,
        driverId,
        vehicleId,
      };

      const service = getJobOrderService(supabase);
      const result: Result<void> = await service.assignDriver(ctx, cmd);

      if (result.isFailure) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // 2. Legacy Adapter Patch
    try {
      const legacyAdapter = getLegacyJobOrderSyncService(supabase);
      await legacyAdapter.syncAssignmentLegacyFields(jobOrderId, { transporterId, purchasePrice, notes });
    } catch (legacyError: any) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[trucking/assign] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


