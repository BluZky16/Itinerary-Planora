import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { listCountryMarks, type MarkStatus } from '@/api/country-marks';
import { TYPE_LABELS } from '@/api/items';
import { listTripCosts, type TripCosts } from '@/api/trips';
import { Button } from '@/components/button';
import { ScreenState } from '@/components/screen-state';
import { WorldMap } from '@/components/world-map';
import {
  costByType,
  formatCost,
  formatRange,
  localToday,
  monthIndex,
  monthName,
  totalsByCurrency,
  tripDays,
  tripTotal,
  upcomingTrip,
} from '@/lib/plan';
import { useUser } from '@/lib/session';
import { useColors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CARD = 'gap-3 rounded-3xl border border-base-300 bg-base-100 p-5';
// Photo placeholders: pastel gradients on web, the solid first colour on phones. Dark text reads on all of them.
const GRADIENTS = [
  'bg-accent bg-gradient-to-br from-accent to-tint',
  'bg-lime bg-gradient-to-br from-lime to-tint',
  'bg-tint bg-gradient-to-br from-tint to-accent',
];
const openTrip = (id: string) => router.push({ pathname: '/trip/[id]', params: { id } });

export default function Dashboard() {
  const user = useUser();
  const trips = useQuery({ queryKey: ['trips', 'costs'], queryFn: listTripCosts });
  const marks = useQuery({ queryKey: ['country-marks'], queryFn: listCountryMarks });

  if (!trips.data || !marks.data) {
    const failed = trips.error ? trips : marks;
    return <ScreenState error={failed.error} onRetry={() => failed.refetch()} />;
  }

  const today = localToday();
  const all = trips.data; // sorted by start_date
  const markMap = new Map(marks.data.map((m) => [m.country_code, m.status]));

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-6xl gap-4 p-4 lg:px-6">
      <View className="gap-4 lg:flex-row">
        <AccountCard email={user?.is_anonymous ? '' : (user?.email ?? '')} trips={all} />
        <CalendarCard trips={all} today={today} />
        <UpcomingCard trip={upcomingTrip(all, today)} />
      </View>
      <View className="gap-4 lg:flex-row">
        <PreviousCard trips={all.filter((t) => t.end_date < today).reverse()} />
        <MapCard trips={all} today={today} marks={markMap} />
      </View>
    </ScrollView>
  );
}

function CardTitle({ icon, title, right }: { icon: IconName; title: string; right?: ReactNode }) {
  const colors = useColors();
  return (
    <View className="min-h-9 flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={18} color={colors['base-content']} />
        <Text accessibilityRole="header" className="text-base text-base-content">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-base-300 bg-base-100 px-3 py-1">
      <Text className="text-sm text-base-content">{label}</Text>
    </View>
  );
}

function AccountCard({ email, trips }: { email: string; trips: TripCosts[] }) {
  const totals = totalsByCurrency(trips);
  return (
    <View className={`min-h-56 justify-between gap-6 rounded-3xl p-5 lg:w-64 ${GRADIENTS[0]}`}>
      <View className="flex-row items-center gap-2">
        <Ionicons name="person-outline" size={18} color="#1e1b2e" />
        <Text className="text-base text-accent-content">Account</Text>
      </View>
      <View className="gap-1">
        <Text className="font-display text-3xl text-accent-content" numberOfLines={2}>
          {email ? email.split('@')[0] : 'Guest'}
        </Text>
        <Text className="text-sm text-accent-content">{email || 'Save your account to keep your trips.'}</Text>
        <Text className="text-base font-semibold text-accent-content">
          {totals.length ? totals.map((t) => formatCost(t.total, t.currency)).join(' · ') : 'Nothing'} planned
        </Text>
      </View>
    </View>
  );
}

// Six months side by side; each trip in them is a chip that starts in its first month.
function CalendarCard({ trips, today }: { trips: TripCosts[]; today: string }) {
  const colors = useColors();
  const [start, setStart] = useState(() => monthIndex(today));
  const end = start + 5;
  const shown = trips.filter((t) => monthIndex(t.end_date) >= start && monthIndex(t.start_date) <= end);
  const months = [0, 1, 2, 3, 4, 5].map((i) => start + i);
  const year = Math.floor(start / 12);
  const endYear = Math.floor(end / 12);

  const arrow = (icon: IconName, label: string, step: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => setStart(start + step)}
      className="min-h-11 min-w-11 items-center justify-center rounded-full">
      <Ionicons name={icon} size={20} color={colors['base-content']} />
    </Pressable>
  );

  return (
    <View className={`${CARD} lg:flex-1`}>
      <CardTitle icon="calendar-outline" title="Calendar" right={<Chip label={year === endYear ? `${year}` : `${year}–${endYear}`} />} />
      <View className="flex-row items-center justify-between">
        {arrow('chevron-back', 'Previous six months', -6)}
        <Text className="text-base font-semibold text-base-content">
          {monthName(start)} – {monthName(end)}
        </Text>
        {arrow('chevron-forward', 'Next six months', 6)}
      </View>

      <View className="min-h-36">
        {/* Month columns with dividers behind the trip chips */}
        <View className="absolute inset-0 flex-row">
          {months.map((m, i) => (
            <View key={m} className={`flex-1 items-center ${i ? 'border-l border-base-300' : ''}`}>
              <Text className="text-sm text-base-content opacity-70">{monthName(m)}</Text>
            </View>
          ))}
        </View>
        <View className="gap-2 pb-2 pt-8">
          {shown.length ? (
            shown.map((t) => {
              const col = Math.max(monthIndex(t.start_date) - start, 0);
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title}, ${formatRange(t.start_date, t.end_date)}`}
                  onPress={() => openTrip(t.id)}
                  style={{ marginLeft: `${(col / 6) * 100}%`, maxWidth: `${((6 - col) / 6) * 100}%` }}
                  className="min-h-11 self-start justify-center rounded-2xl border border-base-300 bg-surface px-3 py-1">
                  <Text className="text-sm font-semibold text-base-content" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text className="text-xs text-base-content opacity-70" numberOfLines={1}>
                    {formatRange(t.start_date, t.end_date)}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-center text-base text-base-content opacity-70">No trips in these months.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function UpcomingCard({ trip }: { trip?: TripCosts }) {
  if (!trip) {
    return (
      <View className={`${CARD} lg:w-96`}>
        <CardTitle icon="airplane-outline" title="Upcoming trip" />
        <Text className="text-base text-base-content">No upcoming trip.</Text>
        <Button title="Plan a new trip" onPress={() => router.push('/trip/new')} />
      </View>
    );
  }
  const types = Object.keys(costByType(trip)) as (keyof typeof TYPE_LABELS)[];
  const items = trip.days.reduce((n, d) => n + d.items.length, 0);
  return (
    <View className={`${CARD} lg:w-96`}>
      <Pressable accessibilityRole="button" onPress={() => openTrip(trip.id)} className="gap-1">
        <Text className="font-display text-3xl text-primary" numberOfLines={1}>
          {trip.title}
        </Text>
        <Text className="text-base text-base-content">
          {formatRange(trip.start_date, trip.end_date)} · {formatCost(tripTotal(trip), trip.currency)}
        </Text>
      </Pressable>
      {types.length ? (
        <View className="flex-row flex-wrap gap-2">
          {types.map((type) => (
            <Chip key={type} label={TYPE_LABELS[type]} />
          ))}
        </View>
      ) : null}
      <View className="min-h-32 flex-1 flex-row gap-3">
        <Tile gradient={GRADIENTS[1]} icon="location-outline" title={trip.destination ?? 'No destination yet'} />
        <Tile
          gradient={GRADIENTS[2]}
          icon="list-outline"
          title={`${tripDays(trip)} days · ${items} ${items === 1 ? 'item' : 'items'} planned`}
        />
      </View>
    </View>
  );
}

function Tile({ gradient, icon, title }: { gradient: string; icon: IconName; title: string }) {
  return (
    <View className={`flex-1 justify-between rounded-2xl p-3 ${gradient}`}>
      <Ionicons name={icon} size={20} color="#1e1b2e" />
      <Text className="text-sm font-semibold text-accent-content">{title}</Text>
    </View>
  );
}

// The latest past trip as a big card, with the next ones peeking out behind it.
function PreviousCard({ trips }: { trips: TripCosts[] }) {
  const [first, ...rest] = trips;
  return (
    <View className={`${CARD} lg:w-96`}>
      <CardTitle
        icon="time-outline"
        title="Previous trips"
        right={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/itineraries')}
            className="min-h-9 justify-center rounded-full border border-base-300 bg-surface px-3">
            <Text className="text-sm font-semibold text-base-content">See all</Text>
          </Pressable>
        }
      />
      {first ? (
        <View className="min-h-64 flex-row items-center gap-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${first.title}, ${formatRange(first.start_date, first.end_date)}`}
            onPress={() => openTrip(first.id)}
            className={`min-h-64 flex-1 justify-between rounded-3xl p-4 ${GRADIENTS[1]}`}>
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-1">
                <Text className="font-display text-3xl text-accent-content" numberOfLines={2}>
                  {first.title}
                </Text>
                <Text className="text-sm text-accent-content">{formatRange(first.start_date, first.end_date)}</Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-full border border-accent-content">
                <Ionicons name="arrow-up-outline" size={18} color="#1e1b2e" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
            </View>
            {first.destination ? (
              <View className="self-start">
                <Chip label={first.destination} />
              </View>
            ) : null}
          </Pressable>
          {rest.slice(0, 3).map((t, i) => (
            <View
              key={t.id}
              style={{ height: `${88 - i * 10}%` }}
              className={`w-4 rounded-2xl ${GRADIENTS[(i + 2) % GRADIENTS.length]}`}
            />
          ))}
        </View>
      ) : (
        <Text className="text-base text-base-content opacity-70">No past trips yet.</Text>
      )}
    </View>
  );
}

function MapCard({ trips, today, marks }: { trips: TripCosts[]; today: string; marks: Map<string, MarkStatus> }) {
  const visited = [...marks.values()].filter((s) => s === 'visited').length;
  const stats: [string, string][] = [
    [String(trips.reduce((n, t) => n + tripDays(t), 0)), 'Travel days'],
    [String(visited), 'Countries visited'],
    [String(trips.filter((t) => t.start_date >= today).length), 'Trips planned'],
  ];
  return (
    <View className={`${CARD} lg:flex-1`}>
      <CardTitle
        icon="globe-outline"
        title="Map"
        right={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/travel-map')}
            className="min-h-9 justify-center rounded-full border border-base-300 bg-surface px-3">
            <Text className="text-sm font-semibold text-base-content">Edit countries</Text>
          </Pressable>
        }
      />
      <View className="flex-1 gap-4 md:flex-row">
        <View className="flex-row justify-around gap-4 md:flex-col md:justify-end">
          {stats.map(([value, label]) => (
            <View key={label} className="items-center">
              <Text className="text-3xl font-bold text-base-content">{value}</Text>
              <Text className="text-center text-sm text-base-content opacity-70">{label}</Text>
            </View>
          ))}
        </View>
        <WorldMap marks={marks} />
      </View>
    </View>
  );
}
