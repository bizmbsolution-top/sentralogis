import { NextRequest, NextResponse } from 'next/server';
import { CustomsDecisionService } from '@/lib/domain/customs/audit/customs-decision-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const decisionService = new CustomsDecisionService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const decisions = await decisionService.listDecisions(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: decisions
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const decision = await decisionService.createDecision({
      tenantId: auth.tenantId,
      declarationId: id,
      decisionType: body.decisionType,
      outcome: body.outcome,
      actor: {
        id: auth.userId,
        name: body.actorName || 'PPJK Specialist',
        role: body.actorRole || 'PPJK_OPERATOR',
        type: 'USER'
      },
      reason: body.reason,
      justification: body.justification,
      evidence: body.evidence,
      regulatorySource: body.regulatorySource,
      relatedItemId: body.relatedItemId,
      relatedExceptionId: body.relatedExceptionId,
      relatedDocumentId: body.relatedDocumentId,
      confidence: body.confidence || 'HIGH'
    });

    return NextResponse.json({
      success: true,
      data: decision
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
