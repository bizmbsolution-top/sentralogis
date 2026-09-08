import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'job_order:assign');

    const body = await req.json();
    const { shipmentId, assigneeName, notes } = body;

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'shipmentId is required.' },
        { status: 400 },
      );
    }

    const tenantId = ctx.tenantId;
    const now = new Date().toISOString();

    const { data: existingJo } = await supabaseAdmin
      .from('job_orders')
      .select('id, jo_number')
      .eq('shipment_id', shipmentId)
      .eq('tenant_id', tenantId)
      .eq('sbu_type', 'FORWARDING')
      .maybeSingle();

    let joId: string;

    if (existingJo) {
      const { data: updatedJo, error: updateError } = await supabaseAdmin
        .from('job_orders')
        .update({
          assignee_name: assigneeName || null,
          assignee_notes: notes || null,
          status: 'assigned',
          assigned_at: now,
          assigned_by: ctx.userId,
          updated_at: now,
          updated_by: ctx.userId,
        })
        .eq('id', existingJo.id)
        .select('id, jo_number, status, assignee_name, assignee_notes, assigned_at, assigned_by')
        .single();

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR', message: updateError.message },
          { status: 400 },
        );
      }
      joId = updatedJo.id;
    } else {
      const joNumber = `FWD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const { data: newJo, error: insertError } = await supabaseAdmin
        .from('job_orders')
        .insert({
          tenant_id: tenantId,
          shipment_id: shipmentId,
          sbu_type: 'FORWARDING',
          jo_number: joNumber,
          assignee_name: assigneeName || null,
          assignee_notes: notes || null,
          status: 'assigned',
          assigned_at: now,
          assigned_by: ctx.userId,
          created_at: now,
          updated_at: now,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        })
        .select('id, jo_number, status, assignee_name, assignee_notes, assigned_at, assigned_by')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: raceJo } = await supabaseAdmin
            .from('job_orders')
            .select('id, jo_number, status, assignee_name, assignee_notes, assigned_at, assigned_by')
            .eq('shipment_id', shipmentId)
            .eq('tenant_id', tenantId)
            .eq('sbu_type', 'FORWARDING')
            .maybeSingle();

          if (raceJo) {
            return NextResponse.json({ success: true, data: raceJo }, { status: 200 });
          }

          return NextResponse.json(
            { success: false, error: 'DUPLICATE', message: 'Assignment already exists for this shipment.' },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { success: false, error: 'DATABASE_ERROR', message: insertError.message },
          { status: 400 },
        );
      }
      joId = newJo.id;
    }

    const { data: jo } = await supabaseAdmin
      .from('job_orders')
      .select('id, jo_number, status, assignee_name, assignee_notes, assigned_at, assigned_by')
      .eq('id', joId)
      .single();

    return NextResponse.json({ success: true, data: jo }, { status: 201 });
  } catch (error) {
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Forwarding assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'job_order:read');

    const { searchParams } = new URL(req.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'shipmentId query parameter is required.' },
        { status: 400 },
      );
    }

    const { data: jo } = await supabaseAdmin
      .from('job_orders')
      .select('id, jo_number, status, assignee_name, assignee_notes, assigned_at, assigned_by')
      .eq('shipment_id', shipmentId)
      .eq('tenant_id', ctx.tenantId)
      .eq('sbu_type', 'FORWARDING')
      .maybeSingle();

    return NextResponse.json({ success: true, data: jo || null });
  } catch (error) {
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Forwarding assignment fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}
