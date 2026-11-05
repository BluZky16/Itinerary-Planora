import '../global.css';
import type { Session } from '@supabase/supabase-js';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { CACHE_MAX_AGE, CACHE_VERSION, dehydrateOptions, persister, queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  // undefined = still loading the stored session; null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Drop cached data so the next user on this device never sees the previous user's trips.
      if (!next) {
        queryClient.clear();
        persister.removeClient(); // and the copy saved on the device
      }
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return (
    // key + buster: a different user never gets the previous user's saved cache restored.
    <PersistQueryClientProvider
      key={session?.user.id ?? 'signed-out'}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: `${CACHE_VERSION}:${session?.user.id ?? 'signed-out'}`,
        dehydrateOptions,
      }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Public: the read-only share link works signed in or out. */}
        <Stack.Screen name="share/[token]" />
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </PersistQueryClientProvider>
  );
}
