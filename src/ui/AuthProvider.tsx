import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authErrorMessage } from '../services/errors';
import { supabase } from '../services/supabase';

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  /** Devolve null se entrou, ou a mensagem de erro em português. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Sai só deste aparelho (funciona sem internet). */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? authErrorMessage(error.message) : null;
    } catch (e) {
      return authErrorMessage(e instanceof Error ? e.message : '');
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
