import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

let _client = null;

export const createClient = () => {
  if (!_client) {
    _client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // AuthCallback exchanges the code itself. Auto-detection would race it,
        // consuming the single-use code and deleting the PKCE verifier first.
        detectSessionInUrl: false,
        // auth-js defaults to the implicit flow, which returns the session in the
        // URL hash. AuthCallback reads ?code= and calls exchangeCodeForSession,
        // both of which require PKCE.
        flowType: 'pkce',
      },
    });
  }
  return _client;
};

export const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
