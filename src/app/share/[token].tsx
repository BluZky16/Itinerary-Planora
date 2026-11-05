import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { TYPE_LABELS } from '@/api/items';
import { getSharedTrip, type SharedItem } from '@/api/shared';
import { ScreenState } from '@/components/screen-state';
import { formatDay, formatRange, formatTime } from '@/lib/plan';

// Public, read-only view of one trip. Lives outside (app), so no sign-in is needed.
export default function SharedTrip() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const trip = useQuery({ queryKey: ['share', token], queryFn: () => getSharedTrip(token) });

  if (trip.data === undefined) return <ScreenState error={trip.error} onRetry={() => trip.refetch()} />;
  if (trip.data === null) return <ScreenState error={new Error('This link is not active any more.')} />;
  const t = trip.data;

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl gap-4 p-4">
      <View className="gap-1 rounded-2xl bg-base-100 p-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-base-content">{t.title}</Text>
        {t.destination ? <Text className="text-base text-base-content">{t.destination}</Text> : null}
        <Text className="text-sm text-base-content opacity-70">
          {formatRange(t.start_date, t.end_date)}
        </Text>
      </View>

      {t.days.map((day, n) => (
        <View key={day.date} className="gap-2">
          <Text accessibilityRole="header" className="px-1 text-lg font-bold text-base-content">
            Day {n + 1} · {formatDay(day.date)}
          </Text>
          {day.items.map((item, i) => (
            <Item key={i} item={item} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Item({ item }: { item: SharedItem }) {
  const time = [formatTime(item.start_time), formatTime(item.end_time)].filter(Boolean).join('–');
  const where =
    item.type === 'transport' ? [item.from_place, item.to_place].filter(Boolean).join(' → ') : item.place_name;
  return (
    <View className="gap-1 rounded-2xl bg-base-100 p-3">
      <View className="flex-row items-center gap-2">
        {time ? <Text className="text-sm font-semibold text-base-content">{time}</Text> : null}
        <Text className="rounded-full bg-base-200 px-2 text-xs text-base-content">{TYPE_LABELS[item.type]}</Text>
      </View>
      <Text className="text-base font-semibold text-base-content">{item.title}</Text>
      {where ? <Text className="text-sm text-base-content opacity-70">{where}</Text> : null}
    </View>
  );
}
