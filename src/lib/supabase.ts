import { createClient } from '@supabase/supabase-js';

// Remove qualquer caractere não-ASCII-printável (newlines, tabs, etc)
const clean = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim();

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL as string);
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string);

console.log('[Supabase] url len:', supabaseUrl.length, 'key len:', supabaseAnonKey.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
