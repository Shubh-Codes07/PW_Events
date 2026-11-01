import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env',
  );
}

/**
 * Supabase client for the browser — uses the anon (public) key only.
 * Never include the service role key in the client bundle.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
