import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { findSalesOrderById, enrichSalesOrdersWithCustomer } from '@/lib/sales-order/service';
import { getOperationalLineageForOrder } from '@/lib/work-order/service';
import { toErrorResponse } from '@/lib/sales-order/http';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await resolveSessionIdentity();
    const { id } = await params;

    const so = await findSalesOrderById(session, id);
    const [enriched] = await enrichSalesOrdersWithCustomer(session, [so]);
    const finalSo = enriched ?? so;

    const lineage = await getOperationalLineageForOrder(session, {
      orderId: finalSo.id,
      orderNumber: finalSo.soNumber,
      customerId: finalSo.customerId ?? null,
    });

    return NextResponse.json({
      success: true,
      data: {
        salesOrder: finalSo,
        workOrders: lineage.workOrders,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
