import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * ⚠️ NEVER expose this key or client to the browser bundle.
 * Bypasses RLS for secure backend operations (e.g. guest upload verification, share tokens).
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
