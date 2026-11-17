import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, supabaseHost } from '../services/supabase';
import { seedDefaultsForUser } from '../services/db';

const AuthContext = createContext(null);

export const getPasswordResetRedirectUrl = () => {
  if (typeof window === 'undefined') return '';
  const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  return `${baseUrl.replace(/\/$/, '')}/#type=recovery`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check if current browser URL contains recovery tokens/parameters
  const checkIsRecovery = () => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  };

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(checkIsRecovery);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Safety timeout: ensure loading state never hangs indefinitely
    const timeoutTimer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    // Check active session on mount
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeoutTimer);
        if (error) setAuthError(error.message);
        setSession(session);
        setUser(session?.user ?? null);
        if (checkIsRecovery()) {
          setIsPasswordRecovery(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutTimer);
        setAuthError(err.message);
        setLoading(false);
      });

    // Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        clearTimeout(timeoutTimer);
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY' || checkIsRecovery()) {
          setIsPasswordRecovery(true);
        } else if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutTimer);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    if (!supabase) {
      const err = new Error('Supabase client is not configured. Please check .env.local.');
      setAuthError(err.message);
      throw err;
    }
    setAuthError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        let msg = error.message;
        const msgLower = error.message.toLowerCase();
        if (msgLower.includes('invalid login credentials')) {
          msg = 'Invalid email or password. Please verify your credentials or use Forgot Password.';
        } else if (msgLower.includes('email not confirmed')) {
          msg = 'Your email address has not been confirmed yet. Please check your inbox for the Supabase confirmation link, or disable "Confirm email" in Supabase Authentication settings.';
        } else if (msgLower.includes('invalid path')) {
          msg = 'Invalid Supabase URL in settings. In Vercel Environment Variables, VITE_SUPABASE_URL must be strictly https://<project-ref>.supabase.co without /rest/v1 or extra paths.';
        }
        setAuthError(msg);
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      const isFetchErr = err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('networkerror');
      const friendlyMsg = isFetchErr
        ? `Failed to fetch: Cannot connect to Supabase at ${supabaseHost}. Please verify your internet connection or check if your Supabase project is active.`
        : err.message || 'Authentication failed';
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signUp = async (email, password, displayName) => {
    if (!supabase) {
      const err = new Error('Supabase client is not configured. Please check .env.local.');
      setAuthError(err.message);
      throw err;
    }
    setAuthError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
            full_name: cleanName,
          },
        },
      });
      if (error) {
        let msg = error.message;
        const msgLower = error.message.toLowerCase();
        if (msgLower.includes('already registered') || msgLower.includes('user already exists')) {
          msg = 'An account with this email already exists. Please sign in instead.';
        } else if (msgLower.includes('rate limit')) {
          msg = 'Email rate limit exceeded in Supabase (free tier allows 3 emails/hour). Please wait before trying again or configure custom SMTP in Supabase Dashboard.';
        } else if (msgLower.includes('invalid path')) {
          msg = 'Invalid Supabase URL in settings. In Vercel Environment Variables, VITE_SUPABASE_URL must be strictly https://<project-ref>.supabase.co without /rest/v1 or extra paths.';
        }
        setAuthError(msg);
        throw new Error(msg);
      }

      // If user was created immediately and has an id, ensure default records exist
      if (data?.user?.id && data?.session) {
        seedDefaultsForUser(data.user.id).catch(() => {});
      }

      return data;
    } catch (err) {
      const isFetchErr = err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('networkerror');
      const friendlyMsg = isFetchErr
        ? `Failed to fetch: Cannot reach Supabase at ${supabaseHost}. Please verify your internet connection or check if your Supabase project is active.`
        : err.message || 'Account creation failed';
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setUser(null);
      setSession(null);
      setIsPasswordRecovery(false);
    }
  };

  const resetPassword = async (email) => {
    if (!supabase) {
      const err = new Error('Supabase client is not configured.');
      setAuthError(err.message);
      throw err;
    }
    setAuthError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      setAuthError(err.message);
      throw err;
    }

    try {
      const redirectUrl = getPasswordResetRedirectUrl();
      const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      if (error) {
        let msg = error.message;
        if (error.message.toLowerCase().includes('rate limit')) {
          msg = 'Email rate limit exceeded in Supabase (free tier allows 3 emails/hour). Please wait before requesting another reset link, or configure custom SMTP in Supabase Dashboard.';
        }
        setAuthError(msg);
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      const isFetchErr = err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('networkerror');
      const friendlyMsg = isFetchErr
        ? `Failed to fetch: Cannot reach Supabase at ${supabaseHost}. Please check your internet connection or verify your Supabase project status.`
        : err.message || 'Failed to send password reset email';
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const updatePassword = async (newPassword) => {
    if (!supabase) {
      const err = new Error('Supabase client is not configured.');
      setAuthError(err.message);
      throw err;
    }
    setAuthError(null);

    if (!newPassword || newPassword.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      setAuthError(err.message);
      throw err;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }

      // Securely end recovery session so user can log in with new credentials
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore sign out error
      }
      setUser(null);
      setSession(null);
      setIsPasswordRecovery(false);

      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }

      return data;
    } catch (err) {
      const isFetchErr = err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('networkerror');
      const friendlyMsg = isFetchErr
        ? `Failed to fetch: Cannot connect to Supabase (${supabaseHost}).`
        : err.message || 'Failed to update password';
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authError,
        setAuthError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        isPasswordRecovery,
        setIsPasswordRecovery,
        isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
