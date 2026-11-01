import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { deleteItem, getItem, moveItem, updateItem, type ItemInput } from '@/api/items';
import { getTripPlan } from '@/api/trips';
import { Button } from '@/components/button';
import { ItemForm } from '@/components/item-form';
import { ScreenState } from '@/components/screen-state';
import { errorMessage } from '@/lib/errors';
import { goBackOr } from '@/lib/nav';
import { formatDay } from '@/lib/plan';
import { queryClient } from '@/lib/query';

export default function EditItem() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const item = useQuery({ queryKey: ['trips', id, 'items', itemId], queryFn: () => getItem(itemId) });
  const plan = useQuery({ queryKey: ['trips', id, 'plan'], queryFn: () => getTripPlan(id) });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!item.data || !plan.data) {
    const error = item.error ?? plan.error;
    return <ScreenState error={error} onRetry={() => (item.error ? item.refetch() : plan.refetch())} />;
  }
  const days = plan.data.days;
  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ['trips', id] });
    goBackOr({ pathname: '/trip/[id]', params: { id } });
  };

  async function save(input: ItemInput, dayId?: string) {
    await updateItem(itemId, input);
    const target = days.find((d) => d.id === dayId);
    if (target && target.id !== item.data!.day_id) await moveItem(itemId, target.id, target.items.length);
    await done();
  }

  async function remove() {
    if (!confirming) return setConfirming(true);
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteItem(itemId);
      queryClient.removeQueries({ queryKey: ['trips', id, 'items', itemId] });
      await done();
    } catch (e) {
      setDeleteError(errorMessage(e, 'Could not delete.'));
      setDeleting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl gap-4 p-4">
      <ItemForm
        initial={item.data}
        days={{
          options: days.map((d, n) => ({ value: d.id, label: `Day ${n + 1} · ${formatDay(d.date)}` })),
          initial: item.data.day_id,
        }}
        submitLabel="Save changes"
        onSubmit={save}
      />
      <View className="gap-2">
        {deleteError ? <Text className="text-sm text-error">{deleteError}</Text> : null}
        <Button
          title={confirming ? 'Tap again to delete' : 'Delete'}
          variant="ghost"
          loading={deleting}
          onPress={remove}
        />
      </View>
    </ScrollView>
  );
}
