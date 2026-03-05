import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '').trim();

// Sanitiza headers removendo valores undefined que causam "Invalid value" no fetch
const sanitizedFetch = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  if (options?.headers) {
    const raw = options.headers as Record<string, string>;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    options = { ...options, headers: clean };
  }
  return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: sanitizedFetch },
});
