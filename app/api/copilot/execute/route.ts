import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { ExecutionService } from '@/lib/copilot/execute/execution-service';

export async function POST(req: Request) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:manage');

    const foundationContext = createFoundationContext(ctx);

    const body = await req.json();
    const { proposalId, confirmation, proposal } = body;

    if (!proposalId && !proposal?.proposalId) {
      return NextResponse.json({ success: false, error: 'Invalid request: proposalId is required' }, { status: 400 });
    }

    const resolvedProposalId = proposalId || proposal?.proposalId;

    if (!confirmation || !confirmation.confirmed) {
      return NextResponse.json({
        success: false,
        error: 'Execution requires explicit human confirmation',
        proposalId: resolvedProposalId,
        confirmationRequired: true,
      }, { status: 400 });
    }

    const executionRequest = {
      proposalId: resolvedProposalId,
      proposal,
      confirmation: {
        confirmed: true,
        confirmedBy: ctx.userId,
        confirmedAt: new Date().toISOString(),
        confirmationNote: confirmation.confirmationNote || '',
      },
    };

    const result = await ExecutionService.execute(ctx, executionRequest);

    return NextResponse.json({
      success: result.status === 'SUCCESS',
      result,
      foundationVersion: foundationContext.version,
    });

  } catch (error: any) {
    console.error('Copilot Execution API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
