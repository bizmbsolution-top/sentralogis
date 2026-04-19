import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

/**
 * Creates a Supabase client for browser/client-side use.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !key) {
    // We log a warning instead of crashing during build time.
    if (typeof window !== 'undefined') {
       console.warn("Supabase keys are missing in the browser environment.");
    }
  }

  return createBrowserClient<Database>(
    url || 'https://placeholder.supabase.co', 
    key || 'placeholder'
  )
}

/**
 * LAZY CLIENT PROXY (supabase)
 * This allows all existing code to use 'import { supabase }' as before.
 * The actual client is only created when you call a method like supabase.from().
 */
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const instance = createClient();
    return (instance as any)[prop];
  }
});
