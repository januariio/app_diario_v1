import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '').trim();

console.log('[Supabase] URL completa:', JSON.stringify(supabaseUrl));
console.log('[Supabase] KEY length:', supabaseAnonKey.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
