import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { listCountryMarks } from '@/api/country-marks';
import { listTripCosts } from '@/api/trips';
import { ScreenState } from '@/components/screen-state';
import { formatCost, formatRange, localToday, totalsByCurrency, upcomingTrip } from '@/lib/plan';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const trips = useQuery({ queryKey: ['trips', 'costs'], queryFn: listTripCosts });
  const marks = useQuery({ queryKey: ['country-marks'], queryFn: listCountryMarks });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ''));
  }, []);

  if (!trips.data || !marks.data) {
    const failed = trips.error ? trips : marks;
    return <ScreenState error={failed.error} onRetry={() => failed.refetch()} />;
  }

  const next = upcomingTrip(trips.data, localToday());
  const totals = totalsByCurrency(trips.data);

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl gap-4 p-4 lg:max-w-4xl">
      <View className="flex-row gap-3">
        <Stat label="Trips" value={String(trips.data.length)} />
        <Stat label="Countries visited" value={String(marks.data.filter((m) => m.status === 'visited').length)} />
      </View>

      {/* Side by side on wide screens */}
      <View className="gap-4 lg:flex-row">
        <View className="gap-1 rounded-3xl border border-base-300 bg-base-100 p-4 lg:flex-1">
          <Text className="text-sm text-base-content opacity-70">Total planned cost</Text>
          {totals.length ? (
            totals.map((t) => (
              <Text key={t.currency ?? ''} className="text-2xl font-bold text-base-content">
                {formatCost(t.total, t.currency)}
              </Text>
            ))
          ) : (
            <Text className="text-2xl font-bold text-base-content">0</Text>
          )}
        </View>

        <View className="gap-1 rounded-3xl border border-base-300 bg-base-100 p-4 lg:flex-1">
          <Text className="text-sm text-base-content opacity-70">Upcoming trip</Text>
          {next ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: next.id } })}
              className="gap-1">
              <Text className="font-display text-2xl text-primary">{next.title}</Text>
              <Text className="text-sm text-base-content opacity-70">{formatRange(next.start_date, next.end_date)}</Text>
            </Pressable>
          ) : (
            <Text className="text-base text-base-content">No upcoming trip.</Text>
          )}
        </View>
      </View>

      <Text className="text-sm text-base-content opacity-70">Signed in as {email}</Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1 rounded-3xl border border-base-300 bg-base-100 p-4">
      <Text className="text-sm text-base-content opacity-70">{label}</Text>
      <Text className="text-3xl font-bold text-base-content">{value}</Text>
    </View>
  );
}
