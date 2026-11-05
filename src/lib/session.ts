import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// The signed-in user, kept current (e.g. when a guest saves their account). null while loading or signed out.
export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

// One auth step at a time with a loading flag. A step returns an error message, or nothing on success.
export function useAuthStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function run(step: () => Promise<string | void>) {
    if (loading) return; // Enter can fire while a request is running
    setLoading(true);
    setError('');
    const message = await step().catch((e: Error) => e.message);
    setLoading(false);
    if (message) setError(message);
  }
  return { loading, error, run, clearError: () => setError('') };
}

// Same minimum everywhere a password is set. Checked before any request, so a reset never half-finishes.
export const passwordError = (password: string) => (password.length < 8 ? 'Use at least 8 characters.' : '');
