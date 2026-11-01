import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { ComingSoon } from '@/components/coming-soon';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  return (
    <ComingSoon title="Dashboard" phase={5}>
      <Text className="text-sm text-base-content">Signed in as {email}</Text>
      <Button title="Sign out" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </ComingSoon>
  );
}
