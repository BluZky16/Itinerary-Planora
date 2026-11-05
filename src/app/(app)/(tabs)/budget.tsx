import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { ITEM_TYPES, TYPE_LABELS } from '@/api/items';
import { listTripCosts, type TripCosts } from '@/api/trips';
import { ScreenState } from '@/components/screen-state';
import { costByType, formatCost, tripTotal } from '@/lib/plan';

export default function Budget() {
  const trips = useQuery({ queryKey: ['trips', 'costs'], queryFn: listTripCosts });
  const cols = useWindowDimensions().width >= 1024 ? 2 : 1; // same width as Tailwind's lg

  if (!trips.data) return <ScreenState error={trips.error} onRetry={() => trips.refetch()} />;

  return (
    <FlatList
      key={cols} // FlatList cannot change numColumns on the fly
      numColumns={cols}
      className="flex-1 bg-base-200"
      data={trips.data}
      keyExtractor={(t) => t.id}
      contentContainerClassName="mx-auto w-full max-w-xl gap-3 p-4 lg:max-w-4xl"
      ListEmptyComponent={
        <Text className="py-8 text-center text-base text-base-content">
          No trips yet. Create a trip, then add costs to its items.
        </Text>
      }
      // Two columns: each cell is half wide with the 12px gap split between neighbours, so a lone last card keeps the same width.
      renderItem={({ item, index }) => (
        <View className={cols > 1 ? `w-1/2 ${index % 2 ? 'pl-1.5' : 'pr-1.5'}` : ''}>
          <TripBudget trip={item} />
        </View>
      )}
    />
  );
}

function TripBudget({ trip }: { trip: TripCosts }) {
  const planned = tripTotal(trip);
  const byType = costByType(trip);
  const remaining = trip.budget == null ? null : trip.budget - planned;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
      className="gap-2 rounded-3xl border border-base-300 bg-base-100 p-4">
      <Text className="font-display text-2xl text-primary">{trip.title}</Text>
      <Row label="Budget" value={trip.budget == null ? 'Not set (edit the trip)' : formatCost(trip.budget, trip.currency)} />
      <Row label="Planned" value={formatCost(planned, trip.currency)} />
      {remaining != null ? (
        <Row
          label={remaining < 0 ? 'Over budget' : 'Remaining'}
          value={formatCost(Math.abs(remaining), trip.currency)}
          bad={remaining < 0}
        />
      ) : null}
      {ITEM_TYPES.filter((t) => byType[t]).map((t) => (
        <Row key={t} label={TYPE_LABELS[t]} value={formatCost(byType[t]!, trip.currency)} muted />
      ))}
    </Pressable>
  );
}

function Row({ label, value, bad, muted }: { label: string; value: string; bad?: boolean; muted?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text className={`text-base text-base-content ${muted ? 'opacity-70' : ''}`}>{label}</Text>
      <Text className={`text-base font-medium ${bad ? 'text-error' : 'text-base-content'} ${muted ? 'opacity-70' : ''}`}>
        {value}
      </Text>
    </View>
  );
}
