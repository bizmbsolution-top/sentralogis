import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

let clientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createClient() {
  if (typeof window === 'undefined') return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !key) {
    console.warn("Supabase keys are missing in the browser environment.");
  }

  clientInstance = createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sentralogis-auth',
      flowType: 'hash',
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key)
          } catch {
            return null
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value)
          } catch {}
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key)
          } catch {}
        }
      }
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
