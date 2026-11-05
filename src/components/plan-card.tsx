import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { createFromPlan } from '@/api/assistant';
import { TYPE_LABELS } from '@/api/items';
import type { Trip } from '@/api/trips';
import { Button } from '@/components/button';
import { toast } from '@/components/toast';
import type { AiPlan } from '@/lib/ai-plan';
import { errorMessage } from '@/lib/errors';
import { formatCost, formatDay, formatRange, formatTime, tripDays, tripTotal } from '@/lib/plan';
import { queryClient } from '@/lib/query';

// The assistant's proposal. Nothing is saved until the button is pressed.
export function PlanCard({ plan, trips }: { plan: AiPlan; trips: Trip[] }) {
  const { trip, items } = plan;
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const total = tripTotal({ days: [{ items: items.map((i) => i.input) }] });
  const exists = trips.some(
    (t) => t.title.trim().toLowerCase() === trip.title.toLowerCase() && t.start_date === trip.start_date && t.end_date === trip.end_date,
  );
  const dayCount = tripDays(trip);
  const dayDate = (n: number) => new Date(Date.parse(trip.start_date) + (n - 1) * 86_400_000).toISOString().slice(0, 10);

  async function create() {
    if (saving || createdId) return; // a double tap must never create two trips
    setSaving(true);
    setError('');
    try {
      const created = await createFromPlan(plan);
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      setCreatedId(created.id);
      toast('Trip created.');
      router.push({ pathname: '/trip/[id]', params: { id: created.id } });
    } catch (e) {
      setError(errorMessage(e, 'Could not create the trip.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="gap-3 rounded-3xl border border-base-300 bg-base-100 p-4">
      <View className="gap-1">
        <Text className="font-display text-2xl text-primary">{trip.title}</Text>
        {trip.destination ? <Text className="text-base text-base-content">{trip.destination}</Text> : null}
        <Text className="text-sm text-base-content opacity-70">{formatRange(trip.start_date, trip.end_date)}</Text>
        {trip.budget != null ? (
          <Text className="text-sm text-base-content">
            Budget {formatCost(trip.budget, trip.currency)}
            {total > 0 ? ` · planned ${formatCost(total, trip.currency)}` : ''}
          </Text>
        ) : total > 0 ? (
          <Text className="text-sm text-base-content">Planned {formatCost(total, trip.currency)}</Text>
        ) : null}
      </View>

      {Array.from({ length: dayCount }, (_, n) => n + 1).map((day) => {
        const today = items.filter((i) => i.day === day);
        if (!today.length) return null;
        return (
          <View key={day} className="gap-1">
            <Text className="text-sm font-semibold text-base-content">Day {day} · {formatDay(dayDate(day))}</Text>
            {today.map(({ input }, n) => (
              <View key={n} className="flex-row justify-between gap-3">
                <Text className="flex-1 text-sm text-base-content">
                  {formatTime(input.start_time) ? `${formatTime(input.start_time)} ` : ''}
                  {input.title}
                  <Text className="opacity-70"> ({TYPE_LABELS[input.type]})</Text>
                </Text>
                {input.cost != null ? (
                  <Text className="text-sm text-base-content">{formatCost(input.cost, trip.currency)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}

      <Text className="text-sm text-base-content opacity-70">
        Prices and places are estimates from an AI. Check them before you book.
      </Text>
      {exists && !createdId ? (
        <Text className="text-sm text-error">You already have a trip with this title and dates.</Text>
      ) : null}
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
      {createdId ? (
        <Button title="Open trip" variant="ghost" onPress={() => router.push({ pathname: '/trip/[id]', params: { id: createdId } })} />
      ) : (
        <Button title="Create this trip" onPress={create} loading={saving} />
      )}
    </View>
  );
}
