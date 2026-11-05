import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { listTrips } from '@/api/trips';
import { Button } from '@/components/button';
import { ScreenState } from '@/components/screen-state';
import { formatRange } from '@/lib/plan';

export default function Itineraries() {
  const trips = useQuery({ queryKey: ['trips'], queryFn: listTrips });

  if (!trips.data) return <ScreenState error={trips.error} onRetry={() => trips.refetch()} />;

  return (
    <View className="flex-1 bg-base-200">
      <FlatList
        data={trips.data}
        keyExtractor={(t) => t.id}
        contentContainerClassName="mx-auto w-full max-w-xl gap-3 p-4"
        ListHeaderComponent={
          <View className="gap-1">
            <Button title="Create trip" onPress={() => router.push('/trip/new')} />
            <Button title="Plan with the AI assistant" variant="ghost" onPress={() => router.push('/assistant')} />
          </View>
        }
        ListEmptyComponent={
          <Text className="py-8 text-center text-base text-base-content">
            No trips yet. Create your first one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
            className="gap-1 rounded-3xl border border-base-300 bg-base-100 p-4">
            <Text className="font-display text-2xl text-primary">{item.title}</Text>
            {item.destination ? <Text className="text-base text-base-content">{item.destination}</Text> : null}
            <Text className="text-sm text-base-content opacity-70">
              {formatRange(item.start_date, item.end_date)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
