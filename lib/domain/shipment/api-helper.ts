/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/api-helper.ts
 * Description: Centralized API Authentication, Tenant Isolation & Error Response Mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShipmentDomainError } from './errors';

export interface AuthContext {
  tenantId: string;
  userId?: string;
  role?: string;
}

/**
 * Resolves authenticated tenant and user context securely from server session.
 * Rejects untrusted client payload tenant overrides.
 */
export async function resolveApiAuthContext(req: NextRequest): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (user && !userError) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.tenant_id) {
      return {
        tenantId: profile.tenant_id,
        userId: user.id,
        role: profile.role,
      };
    }
  }

  throw new Error('UNAUTHORIZED_TENANT_CONTEXT: Missing valid session or tenant authorization header.');
}

/**
 * Centralized API Error Response Mapper for Shipment Domain
 */
export function handleDomainError(err: unknown): NextResponse {
  if (err instanceof ShipmentDomainError) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        details: err.details
      },
      { status: err.statusCode }
    );
  }

  const errorMessage = err instanceof Error ? err.message : String(err);

  // Check for common auth / validation keywords
  if (errorMessage.includes('UNAUTHORIZED_TENANT_CONTEXT')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: missing or invalid tenant authentication context.',
        code: 'UNAUTHORIZED'
      },
      { status: 401 }
    );
  }

  // Sanitized internal error (Never expose raw database stack traces or credentials)
  console.error('[Shipment API Error]:', err);
  return NextResponse.json(
    {
      success: false,
      error: 'An internal server error occurred while processing the logistics shipment request.',
      code: 'INTERNAL_SERVER_ERROR'
    },
    { status: 500 }
  );
}
