import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Safety timeout: ensure loading state never hangs indefinitely (e.g. if network or credentials fail)
    const timeoutTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Check active session on mount
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeoutTimer);
        if (error) setAuthError(error.message);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutTimer);
        setAuthError(err.message);
        setLoading(false);
      });

    // Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        clearTimeout(timeoutTimer);
        setSession(session);
        setUser(session?.user ?? null);
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      return data;
    } catch (err) {
      const friendlyMsg = err.message?.includes('Failed to fetch')
        ? 'Cannot reach Supabase database. Please verify your internet connection or check if your Supabase project is active.'
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      return data;
    } catch (err) {
      const friendlyMsg = err.message?.includes('Failed to fetch')
        ? 'Cannot reach Supabase database. Please verify your internet connection or check if your Supabase project is active.'
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
    }
  };

  const resetPassword = async (email) => {
    if (!supabase) {
      const err = new Error('Supabase client is not configured.');
      setAuthError(err.message);
      throw err;
    }
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      const friendlyMsg = err.message?.includes('Failed to fetch')
        ? 'Cannot reach Supabase database.'
        : err.message || 'Failed to send password reset email';
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
