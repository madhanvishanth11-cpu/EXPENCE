import { createClient } from '@supabase/supabase-js';

// Sanitize the Supabase base URL:
// Must be strictly the root origin (e.g. https://<project-ref>.supabase.co)
// Strips accidental /rest/v1, /auth/v1, trailing slashes, quotes, or path segments pasted in Vercel/env
let rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/['"]/g, '').trim();
let sanitizedUrl = '';

if (rawUrl) {
  try {
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
    }
    const parsed = new URL(rawUrl);
    // Strictly protocol + host (drops any /rest/v1 or trailing path that causes PGRST125 "Invalid path specified in request URL")
    sanitizedUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    sanitizedUrl = rawUrl
      .replace(/\/rest\/v1.*$/i, '')
      .replace(/\/auth\/v1.*$/i, '')
      .replace(/\/+$/, '');
  }
}

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).replace(/['"]/g, '').trim();

export const supabaseUrl = sanitizedUrl;
export const supabaseKey = rawKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseKey.includes('placeholder') &&
  !supabaseKey.includes('your-supabase-')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

let parsedHost = 'Not configured';
try {
  if (supabaseUrl) {
    parsedHost = new URL(supabaseUrl).hostname;
  }
} catch {
  parsedHost = 'Invalid URL';
}
export const supabaseHost = parsedHost;

/**
 * Actively checks network reachability to the configured Supabase instance.
 */
export const checkSupabaseHealth = async () => {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      error: 'Supabase credentials are not configured in Vercel/env. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status >= 200 && res.status < 500) {
      return { ok: true, status: res.status };
    }

    return {
      ok: false,
      error: `Supabase responded with status ${res.status}. If your free tier project is paused in Supabase Dashboard, please restore it.`,
    };
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    return {
      ok: false,
      error: isAbort
        ? `Connection to Supabase timed out (${supabaseHost}). Check your internet connection or project status.`
        : `Cannot reach Supabase host (${supabaseHost}): ${err.message}. If your project was paused, unpause it in the Supabase Dashboard.`,
    };
  }
};
