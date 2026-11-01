import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { createTrip, type TripInput } from '@/api/trips';
import { TripForm } from '@/components/trip-form';
import { queryClient } from '@/lib/query';

export default function NewTrip() {
  async function save(input: TripInput) {
    const trip = await createTrip(input);
    await queryClient.invalidateQueries({ queryKey: ['trips'] });
    router.replace({ pathname: '/trip/[id]', params: { id: trip.id } });
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl p-4">
      <TripForm submitLabel="Create trip" onSubmit={save} />
    </ScrollView>
  );
}
