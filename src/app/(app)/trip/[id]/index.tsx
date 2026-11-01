import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { deleteTrip, getTrip } from '@/api/trips';
import { Button } from '@/components/button';
import { ScreenState } from '@/components/screen-state';
import { queryClient } from '@/lib/query';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery({ queryKey: ['trips', id], queryFn: () => getTrip(id) });
  // Two taps to delete: Alert.alert does nothing on web, so confirm in-place instead.
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!trip.data) return <ScreenState error={trip.error} onRetry={() => trip.refetch()} />;
  const t = trip.data;

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
      setDeleteError(e instanceof Error ? e.message : 'Could not delete the trip.');
      setDeleting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl gap-4 p-4">
      <View className="gap-1 rounded-2xl bg-base-100 p-4">
        <Text className="text-2xl font-bold text-base-content">{t.title}</Text>
        {t.destination ? <Text className="text-base text-base-content">{t.destination}</Text> : null}
        <Text className="text-sm text-base-content opacity-70">
          {t.start_date} to {t.end_date}
        </Text>
      </View>

      <Text className="text-base text-base-content">The day-by-day plan comes in phase 3.</Text>

      <Button
        title="Edit trip"
        onPress={() => router.push({ pathname: '/trip/[id]/edit', params: { id } })}
      />
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
