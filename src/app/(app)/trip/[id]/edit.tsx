import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { getTrip, updateTrip, type TripInput } from '@/api/trips';
import { ScreenState } from '@/components/screen-state';
import { TripForm } from '@/components/trip-form';
import { goBackOr } from '@/lib/nav';
import { queryClient } from '@/lib/query';

export default function EditTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery({ queryKey: ['trips', id], queryFn: () => getTrip(id) });

  if (!trip.data) return <ScreenState error={trip.error} onRetry={() => trip.refetch()} />;

  async function save(input: TripInput) {
    await updateTrip(id, input);
    await queryClient.invalidateQueries({ queryKey: ['trips'] });
    goBackOr({ pathname: '/trip/[id]', params: { id } });
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl p-4">
      <TripForm initial={trip.data} submitLabel="Save changes" onSubmit={save} />
    </ScrollView>
  );
}
