import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Support both VITE_SUPABASE_PUBLISHABLE_KEY and fallback to VITE_SUPABASE_ANON_KEY
const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabaseUrl = rawUrl.trim();
export const supabaseKey = rawKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseKey.includes('placeholder') &&
  !supabaseKey.includes('your-supabase-publishable-key-here')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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
 * Identifies paused instances, dead DNS records, or network outages.
 */
export const checkSupabaseHealth = async () => {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      error: 'Supabase credentials are not configured in .env.local. Please provide your Supabase Project URL and API Key.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        : `Cannot reach Supabase host (${supabaseHost}): ${err.message}. If your project was paused due to inactivity, unpause it in the Supabase Dashboard.`,
    };
  }
};
