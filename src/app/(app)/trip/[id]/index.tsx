import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { moveItem, type Item } from '@/api/items';
import { deleteTrip, getTripPlan, type Day, type TripPlan } from '@/api/trips';
import { Button } from '@/components/button';
import { TYPE_LABELS } from '@/components/item-form';
import { ScreenState } from '@/components/screen-state';
import { dayTotal, formatCost, formatDay, formatTime, moveInPlan, tripTotal } from '@/lib/plan';
import { errorMessage } from '@/lib/errors';
import { queryClient } from '@/lib/query';

type Move = { itemId: string; dayId: string; index: number };

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const key = ['trips', id, 'plan'];
  const plan = useQuery({ queryKey: key, queryFn: () => getTripPlan(id) });

  // Reorder shows at once, then the database confirms; on failure the old order comes back.
  const move = useMutation({
    mutationFn: (m: Move) => moveItem(m.itemId, m.dayId, m.index),
    onMutate: async (m) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<TripPlan>(key);
      if (prev) queryClient.setQueryData(key, moveInPlan(prev, m.itemId, m.dayId, m.index));
      return { prev };
    },
    onError: (_e, _m, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  // Two taps to delete: Alert.alert does nothing on web, so confirm in-place instead.
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!plan.data) return <ScreenState error={plan.error} onRetry={() => plan.refetch()} />;
  const t = plan.data;

  async function remove() {
    if (!confirming) return setConfirming(true);
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteTrip(id);
      queryClient.removeQueries({ queryKey: ['trips', id] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.replace('/itineraries');
    } catch (e) {
      setDeleteError(errorMessage(e, 'Could not delete the trip.'));
      setDeleting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl gap-4 p-4">
      <View className="gap-1 rounded-2xl bg-base-100 p-4">
        <Text className="text-2xl font-bold text-base-content">{t.title}</Text>
        {t.destination ? <Text className="text-base text-base-content">{t.destination}</Text> : null}
        <Text className="text-sm text-base-content opacity-70">
          {formatDay(t.start_date)} to {formatDay(t.end_date)}
        </Text>
        <Text className="text-base font-semibold text-base-content">Total cost: {formatCost(tripTotal(t), t.currency)}</Text>
      </View>

      {move.error ? <Text className="text-sm text-error">Could not move: {move.error.message}</Text> : null}

      {t.days.map((day, n) => (
        <DaySection key={day.id} tripId={id} day={day} number={n + 1} onMove={move.mutate} />
      ))}

      <Button title="Edit trip" onPress={() => router.push({ pathname: '/trip/[id]/edit', params: { id } })} />
      {deleteError ? <Text className="text-sm text-error">{deleteError}</Text> : null}
      <Button
        title={confirming ? 'Tap again to delete this trip' : 'Delete trip'}
        variant="ghost"
        loading={deleting}
        onPress={remove}
      />
    </ScrollView>
  );
}

function DaySection({ tripId, day, number, onMove }: { tripId: string; day: Day; number: number; onMove: (m: Move) => void }) {
  const total = dayTotal(day);
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="text-lg font-bold text-base-content">
          Day {number} · {formatDay(day.date)}
        </Text>
        {total ? <Text className="text-sm text-base-content opacity-70">{formatCost(total)}</Text> : null}
      </View>

      {day.items.map((item, i) => (
        <ItemRow
          key={item.id}
          tripId={tripId}
          item={item}
          onUp={i > 0 ? () => onMove({ itemId: item.id, dayId: day.id, index: i - 1 }) : undefined}
          onDown={i < day.items.length - 1 ? () => onMove({ itemId: item.id, dayId: day.id, index: i + 1 }) : undefined}
        />
      ))}

      <Button
        title={`Add to day ${number}`}
        variant="ghost"
        onPress={() => router.push({ pathname: '/trip/[id]/item/new', params: { id: tripId, dayId: day.id } })}
      />
    </View>
  );
}

function ItemRow({ tripId, item, onUp, onDown }: { tripId: string; item: Item; onUp?: () => void; onDown?: () => void }) {
  const time = [formatTime(item.start_time), formatTime(item.end_time)].filter(Boolean).join('–');
  const where = item.type === 'transport'
    ? [item.from_place, item.to_place].filter(Boolean).join(' → ')
    : item.place_name;
  return (
    <View className="flex-row items-stretch gap-2 rounded-2xl bg-base-100 p-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.title}`}
        onPress={() => router.push({ pathname: '/trip/[id]/item/[itemId]', params: { id: tripId, itemId: item.id } })}
        className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          {time ? <Text className="text-sm font-semibold text-base-content">{time}</Text> : null}
          <Text className="rounded-full bg-base-200 px-2 text-xs text-base-content">{TYPE_LABELS[item.type]}</Text>
        </View>
        <Text className="text-base font-semibold text-base-content">{item.title}</Text>
        {where ? <Text className="text-sm text-base-content opacity-70">{where}</Text> : null}
        {item.cost != null ? <Text className="text-sm text-base-content">{formatCost(item.cost)}</Text> : null}
      </Pressable>
      <View className="justify-between">
        <MoveButton label="Move up" symbol="↑" onPress={onUp} />
        <MoveButton label="Move down" symbol="↓" onPress={onDown} />
      </View>
    </View>
  );
}

function MoveButton({ label, symbol, onPress }: { label: string; symbol: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-lg bg-base-200 ${onPress ? '' : 'opacity-30'}`}>
      <Text className="text-lg text-base-content">{symbol}</Text>
    </Pressable>
  );
}
