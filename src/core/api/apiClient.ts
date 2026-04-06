import { supabase } from '@/core/api/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL;
if (!API_BASE) {
  throw new Error("[apiClient] VITE_API_URL is not set. Set it in your .env or Vercel environment variables.");
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // On 401, attempt one token refresh and retry
  if (res.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });
    }
  }

  return res;
}
