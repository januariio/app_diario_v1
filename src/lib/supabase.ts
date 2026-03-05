import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'VAZIO');
console.log('[Supabase] KEY:', supabaseAnonKey ? 'OK' : 'VAZIO');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Variáveis de ambiente não encontradas!');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
