import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * Hook to access the current authentication state and actions.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Provider wrapping the application to manage Supabase authentication state.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state changes (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Send a magic link to the user's email.
   * @param {string} email
   */
  const signInWithOtp = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  }, []);

  /**
   * One-click anonymous guest authentication for evaluators and demo users.
   */
  const signInAsGuest = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        const msg = error.message || '';
        if (msg.includes('disabled') || msg.includes('not enabled')) {
          throw new Error('Guest demo access is not enabled in Supabase authentication settings.');
        }
        throw new Error('Unable to start guest session. Please use email sign in.');
      }
      setSession(data.session);
      setUser(data.user);
      return data;
    } catch (err) {
      console.error('[GUEST AUTH ERROR]:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Signs the user out.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = {
    user,
    session,
    loading,
    isGuest: Boolean(user?.is_anonymous),
    signIn: signInWithOtp,
    signInAsGuest,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
