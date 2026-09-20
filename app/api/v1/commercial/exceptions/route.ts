/**
 * Sentralogis — UI/UX-4C
 * API Route: /api/v1/commercial/exceptions
 *
 * GET — Aggregated, tenant-scoped exception list for the Exception Center.
 *
 * READ-ONLY projection. Composes across canonical services:
 *   1. listWorkOrders (commercial_work_orders / engagements)
 *   2. listByEngagement (sales_orders per engagement)
 *   3. getInternalOperatorWorkspace (Control Tower projection incl. exceptions)
 *
 * No database writes. Zero client tenant trust — tenant from IdentityContext.
 */

import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { listWorkOrders as listWorkOrdersService } from '@/lib/application/commercial-work-orders';
import { listByEngagement } from '@/lib/sales-order/service';
import { getInternalOperatorWorkspace } from '@/lib/control-tower/service';

export async function GET() {
  try {
    const ctx = await resolveSessionIdentity();

    // 1. Fetch all engagements (work orders) for the tenant
    const { data: workOrders } = await listWorkOrdersService(ctx, {
      customerId: undefined,
      statuses: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      limit: 100,
      offset: 0,
    });

    // 2. For each engagement, list sales orders
    // 3. For each SO, fetch the Control Tower workspace (includes exceptions)
    const allExceptions: any[] = [];

    for (const wo of workOrders) {
      try {
        const salesOrders = await listByEngagement(ctx.tenantId, wo.id);

        for (const so of salesOrders) {
          try {
            const workspace = await getInternalOperatorWorkspace(ctx, so.id);
            for (const exc of workspace.exceptions) {
              allExceptions.push({
                ...exc,
                salesOrderId: so.id,
                soNumber: so.soNumber,
                engagementId: wo.id,
                woNumber: wo.woNumber,
              });
            }
          } catch {
            // Skip SOs the user cannot access
          }
        }
      } catch {
        // Skip engagements the user cannot access
      }
    }

    return NextResponse.json({ success: true, data: allExceptions });
  } catch (error: any) {
    console.error('Exception Center API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch exceptions' },
      { status: 500 },
    );
  }
}
