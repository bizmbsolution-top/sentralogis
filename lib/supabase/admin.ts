import { createClient } from '@supabase/supabase-js'

// Client dengan service role key - hanya untuk server-side!
// Melewati semua RLS untuk keperluan admin
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)