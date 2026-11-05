import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { createItem, type ItemInput } from '@/api/items';
import { getTripPlan } from '@/api/trips';
import { ItemForm } from '@/components/item-form';
import { ScreenState } from '@/components/screen-state';
import { toast } from '@/components/toast';
import { goBackOr } from '@/lib/nav';
import { queryClient } from '@/lib/query';

export default function NewItem() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const plan = useQuery({ queryKey: ['trips', id, 'plan'], queryFn: () => getTripPlan(id) });

  if (!plan.data) return <ScreenState error={plan.error} onRetry={() => plan.refetch()} />;
  const day = plan.data.days.find((d) => d.id === dayId);
  if (!day) return <ScreenState error={new Error('This day is no longer part of the trip.')} />;

  async function save(input: ItemInput) {
    await createItem(dayId, day!.items.length, input); // new items go to the end of the day
    await queryClient.invalidateQueries({ queryKey: ['trips'] }); // also refreshes Budget and Dashboard costs
    goBackOr({ pathname: '/trip/[id]', params: { id } });
    toast('Added to the plan.');
  }

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-xl p-4">
      <ItemForm submitLabel="Add" onSubmit={save} />
    </ScrollView>
  );
}
