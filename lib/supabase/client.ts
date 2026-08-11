import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (typeof window === 'undefined') return createSupabaseClient<Database>(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  );

  if (clientInstance) return clientInstance;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!url || !key) {
    console.warn("Supabase keys are missing in the browser environment.");
  }

  // [FIX] Use @supabase/ssr createBrowserClient (cookie-based) so server
  // actions / route handlers using lib/supabase/server.ts (createServerClient,
  // cookie-based) can see the authenticated session (auth.uid()).
  // Previously the session lived only in localStorage ('sentralogis-auth'),
  // so server-side auth.uid() was always NULL → RLS INSERTs failed with 42501.
  clientInstance = createBrowserClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'hash',
    },
    global: {
      headers: {
        'x-application-name': 'sentralogis'
      }
    }
  });

  return clientInstance;
}

export const supabase = createClient();
