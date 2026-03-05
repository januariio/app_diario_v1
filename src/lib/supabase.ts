<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';

function resolveSupabaseUrl(raw: string): string {
  const dashboardMatch = raw.match(/supabase\.com\/dashboard\/project\/([^/]+)/);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return raw;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!rawUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos nas variáveis de ambiente.');
}

const supabaseUrl = resolveSupabaseUrl(rawUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
=======
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos nas variáveis de ambiente."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
>>>>>>> 74846f0b1cc1d1abce17e573816f3259ddfaecfc
