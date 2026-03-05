import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '').trim();

console.log('[Supabase] URL completa:', JSON.stringify(supabaseUrl));
console.log('[Supabase] KEY length:', supabaseAnonKey.length);

// Testa o fetch direto para ver se a URL funciona
fetch(`${supabaseUrl}/auth/v1/health`)
  .then(r => console.log('[Supabase] fetch test OK:', r.status))
  .catch(e => console.error('[Supabase] fetch test ERRO:', e.message));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => {
      console.log('[fetch]', args[0]);
      return fetch(...args);
    }
  }
});
