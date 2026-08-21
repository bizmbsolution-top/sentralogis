import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobOrderService } from '@/src/application/trucking/JobOrderServiceFactory';
import { IRequestContext } from '@/src/domains/security/contracts/IRequestContext';
import { AcceptJobCommand } from '@/src/application/trucking/commands/AcceptJobCommand';
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

    const ctx: IRequestContext = {
      userId: user.id,
      tenantId: profile.tenant_id,
      role: profile.role,
      trace: { traceId: crypto.randomUUID(), spanId: crypto.randomUUID() },
    };

    const cmd: AcceptJobCommand = {
      jobOrderId,
    };

    const service = getJobOrderService(supabase);
    const result: Result<void> = await service.acceptJob(ctx, cmd);

    if (result.isFailure) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[trucking/accept] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
