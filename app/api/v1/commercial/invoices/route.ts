/**
 * Sentralogis — Phase 5D-2 / U-25
 * app/api/v1/commercial/invoices/route.ts
 *
 * API Route: /api/v1/commercial/invoices
 *
 * POST — create a canonical invoice from committed billable events.
 *
 * Thin route — all logic in the application layer:
 *   HTTP → resolveSessionIdentity (U-01) → assertPermission (U-02) →
 *   FIN_INVOICE capability gate → createInvoice() → generate_invoice() RPC.
 *
 * This route is an application boundary, NOT a second financial engine.
 * It does NOT directly mutate fin_invoices / fin_invoice_lines.
 *
 * Capability remains OFF until a separate activation gate is authorized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { createInvoice } from '@/lib/financial/repository';
import { toFinancialErrorResponse } from '@/lib/financial/http';
import type { CreateInvoiceInput } from '@/lib/financial/types';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body.' },
        { status: 400 },
      );
    }

    // Validate required fields before touching the domain layer.
    if (!Array.isArray(body.billableEventIds) || body.billableEventIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'billableEventIds must be a non-empty array.' },
        { status: 400 },
      );
    }

    if (!body.side || (body.side !== 'AR' && body.side !== 'AP')) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'side must be "AR" or "AP".' },
        { status: 400 },
      );
    }

    if (!body.currency || typeof body.currency !== 'string') {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'currency is required.' },
        { status: 400 },
      );
    }

    const input: CreateInvoiceInput = {
      salesOrderId: body.salesOrderId ?? null,
      customerId: null, // Canonical bill-to is resolved server-side via commercial_work_orders.
      side: body.side,
      invoiceDate: body.invoiceDate ?? undefined,
      dueDate: body.dueDate ?? null,
      currency: body.currency,
      taxPercentage: typeof body.taxPercentage === 'number' ? body.taxPercentage : undefined,
      billableEventIds: body.billableEventIds,
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
    };

    const result = await createInvoice(ctx, input);

    return NextResponse.json(
      {
        success: true,
        data: {
          invoice: result.invoice,
          lines: result.lines,
          billableEventIds: result.billableEventIds,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return toFinancialErrorResponse(error);
  }
}