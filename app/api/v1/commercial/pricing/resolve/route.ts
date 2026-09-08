/**
 * Sentralogis — Phase 5C / ADR-082
 * API Route: /api/v1/commercial/pricing/resolve
 *
 * POST — resolve canonical pricing rate for a given PricingContext.
 *
 * Thin route — all logic in the application service:
 *   HTTP → resolveSessionIdentity (U-01) → assertPermission (U-02) →
 *   PricingService.resolveRate → calculateRate → return.
 *
 * This is the canonical pricing activation seam (ADR-082).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { resolveCanonicalPricing } from '@/lib/actions/pricingActions';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const body = await req.json().catch(() => null);
    if (!body || !body.context) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'context is required.' },
        { status: 400 },
      );
    }

    const result = await resolveCanonicalPricing({
      context: body.context,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to resolve pricing.' },
      { status: 500 },
    );
  }
}
