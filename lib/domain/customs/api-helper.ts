/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/api-helper.ts
 * Description: API Authentication, Tenant Isolation & Error Response Mapping for Customs APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CustomsDomainError } from './errors';

export interface CustomsAuthContext {
  tenantId: string;
  userId?: string;
  role?: string;
}

/**
 * Resolves authenticated tenant and user context securely from server session.
 * Rejects untrusted client payload tenant overrides.
 */
export async function resolveCustomsAuthContext(req: NextRequest): Promise<CustomsAuthContext> {
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
 * Centralized API Error Response Mapper for Customs Domain
 */
export function handleCustomsError(err: unknown): NextResponse {
  if (err instanceof CustomsDomainError) {
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

  console.error('[Customs API Error]:', err);
  return NextResponse.json(
    {
      success: false,
      error: 'An internal server error occurred while processing the customs clearance request.',
      code: 'INTERNAL_SERVER_ERROR'
    },
    { status: 500 }
  );
}
