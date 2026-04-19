import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key.
 * This client bypasses RLS and should ONLY be used in server-side contexts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !key) {
    console.warn("Supabase Admin keys are missing in the current environment.");
  }

  return createClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * LAZY ADMIN CLIENT PROXY (supabaseAdmin)
 * This allows 'supabaseAdmin' to be used statically, but it delays 
 * instantiation until its first use. This fixes Vercel build-time validation.
 */
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(target, prop) {
    const client = createAdminClient();
    return (client as any)[prop];
  }
});