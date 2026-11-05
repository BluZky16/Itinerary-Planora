import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { listCountryMarks, setCountryMark, type CountryMark, type MarkStatus } from '@/api/country-marks';
import { Chips } from '@/components/chips';
import { Input } from '@/components/input';
import { ScreenState } from '@/components/screen-state';
import { queryClient } from '@/lib/query';
import { filterCountries } from '@/lib/countries';

const KEY = ['country-marks'];

const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'visited', label: 'Visited' },
  { value: 'wishlist', label: 'Wishlist' },
] as const;

export default function TravelMap() {
  const [search, setSearch] = useState('');
  // A filter rather than sorting marked countries to the top: sorting would move a row away as you tap it.
  const [show, setShow] = useState<(typeof SHOW)[number]['value']>('all');
  const marks = useQuery({ queryKey: KEY, queryFn: listCountryMarks });

  // Instant toggle: update the cache first, then reload from the database either way.
  const mark = useMutation({
    mutationFn: ({ code, status }: { code: string; status: MarkStatus | null }) => setCountryMark(code, status),
    onMutate: async ({ code, status }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      queryClient.setQueryData<CountryMark[]>(KEY, (old = []) => [
        ...old.filter((m) => m.country_code !== code),
        ...(status ? [{ country_code: code, status }] : []),
      ]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  if (!marks.data) return <ScreenState error={marks.error} onRetry={() => marks.refetch()} />;
  const status = new Map(marks.data.map((m) => [m.country_code, m.status]));
  const visited = marks.data.filter((m) => m.status === 'visited').length;

  return (
    <FlatList
      className="flex-1 bg-base-200"
      data={filterCountries(search).filter((c) => show === 'all' || status.get(c.code) === show)}
      keyExtractor={(c) => c.code}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="mx-auto w-full max-w-xl gap-2 p-4"
      ListHeaderComponent={
        <View className="gap-2 pb-2">
          <Text className="text-base text-base-content">
            {visited} visited · {marks.data.length - visited} on wishlist
          </Text>
          <Input label="Search countries" value={search} onChangeText={setSearch} placeholder="Japan" />
          <Chips label="Show" options={SHOW} value={show} onChange={setShow} />
          {mark.error ? <Text className="text-sm text-error">Could not save: {mark.error.message}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text className="py-8 text-center text-base text-base-content">No country matches.</Text>}
      renderItem={({ item: c }) => (
        <View className="flex-row items-center justify-between gap-2 rounded-3xl border border-base-300 bg-base-100 p-3">
          <Text className="flex-1 text-base text-base-content">{c.name}</Text>
          {(['visited', 'wishlist'] as const).map((s) => {
            const on = status.get(c.code) === s;
            return (
              <Pressable
                key={s}
                accessibilityRole="checkbox"
                accessibilityLabel={`${c.name} ${s}`}
                accessibilityState={{ checked: on }}
                onPress={() => mark.mutate({ code: c.code, status: on ? null : s })}
                className={`min-h-10 justify-center rounded-full border px-3 ${
                  on ? (s === 'visited' ? 'border-accent bg-accent' : 'border-lime bg-lime') : 'border-base-300 bg-base-100'
                }`}>
                <Text className={`text-sm ${on ? (s === 'visited' ? 'text-accent-content' : 'text-lime-content') : 'text-base-content'}`}>
                  {s === 'visited' ? 'Visited' : 'Wishlist'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}
