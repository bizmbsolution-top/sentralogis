/**
 * Sentralogis — Phase 3 / Unit 1
 * API Route: /api/v1/operational/work-orders/[id]/items
 *
 * GET — canonical read-only list of WO items for a given Work Order,
 * with embedded job orders.
 *
 * Auth: resolveSessionIdentity (U-01) → assertPermission('commercial:read') (U-02)
 * Tenant: server-derived from IdentityContext, never from client input.
 * Read-only: NO mutations, NO writes, NO RLS changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  listWorkOrderItems,
  listJobOrdersForWorkOrderItem,
  enrichJobOrdersWithEntityNames,
} from '@/lib/work-order/service';
import { toWorkOrderErrorResponse } from '@/lib/work-order/http';
import type { WorkOrderItemView } from '@/lib/work-order/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity();
    const { id } = await params;

    const items = await listWorkOrderItems(ctx, id);

    const views: WorkOrderItemView[] = [];
    for (const item of items) {
      const jos = await listJobOrdersForWorkOrderItem(ctx, item.id);
      const enriched = await enrichJobOrdersWithEntityNames(ctx, jos);
      views.push({
        id: item.id,
        itemCode: item.itemCode,
        sbuType: item.sbuType,
        status: item.status,
        jobOrders: enriched.map((jo) => ({
          id: jo.id,
          joNumber: jo.joNumber,
          status: jo.status,
          transporterName: jo.transporterName,
          fleetPlateNumber: jo.fleetPlateNumber,
          driverName: jo.driverName,
          driverPhone: jo.driverPhone,
          containerNumber: jo.containerNumber,
          basePrice: jo.basePrice,
          createdAt: jo.createdAt,
          updatedAt: jo.updatedAt,
          assignedAt: jo.assignedAt,
          acceptedAt: jo.acceptedAt,
          startedAt: jo.startedAt,
          completedAt: jo.completedAt,
        })),
      });
    }

    return NextResponse.json({ success: true, data: views });
  } catch (error) {
    return toWorkOrderErrorResponse(error);
  }
}
