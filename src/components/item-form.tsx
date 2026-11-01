import { useState } from 'react';
import { Text, View } from 'react-native';

import { ITEM_TYPES, type ItemInput, type ItemType } from '@/api/items';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Input } from '@/components/input';
import { errorMessage } from '@/lib/errors';
import { parseItemForm, type ItemFormErrors, type ItemFormValues } from '@/lib/item-form';
import { formatTime } from '@/lib/plan';

export const TYPE_LABELS: Record<ItemType, string> = {
  attraction: 'Attraction',
  lodging: 'Lodging',
  restaurant: 'Restaurant',
  transport: 'Transport',
  other: 'Other',
};
const TYPE_OPTIONS = ITEM_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));

type Props = {
  initial?: ItemInput;
  // Shown only when editing, to move the item to another day.
  days?: { options: { value: string; label: string }[]; initial: string };
  submitLabel: string;
  onSubmit: (input: ItemInput, dayId?: string) => Promise<unknown>;
};

export function ItemForm({ initial, days, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<ItemFormValues>({
    type: initial?.type ?? 'attraction',
    title: initial?.title ?? '',
    start_time: formatTime(initial?.start_time ?? null),
    end_time: formatTime(initial?.end_time ?? null),
    place_name: initial?.place_name ?? '',
    from_place: initial?.from_place ?? '',
    to_place: initial?.to_place ?? '',
    notes: initial?.notes ?? '',
    cost: initial?.cost != null ? String(initial.cost) : '',
  });
  const [dayId, setDayId] = useState(days?.initial);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const field = (key: Exclude<keyof ItemFormValues, 'type'>) => ({
    value: values[key],
    onChangeText: (text: string) => setValues((v) => ({ ...v, [key]: text })),
    error: errors[key],
  });

  async function submit() {
    const result = parseItemForm(values);
    if ('errors' in result) return setErrors(result.errors);
    setErrors({});
    setSaveError('');
    setSaving(true);
    try {
      await onSubmit(result.input, dayId);
    } catch (e) {
      setSaveError(errorMessage(e, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  const transport = values.type === 'transport';
  return (
    <View className="gap-4">
      <Chips label="Type" options={TYPE_OPTIONS} value={values.type} onChange={(type) => setValues((v) => ({ ...v, type }))} />
      <Input
        label="Title"
        placeholder={transport ? 'Train to Bandung' : 'Tanah Lot temple'}
        {...field('title')}
      />
      {transport ? (
        <>
          <Input label="From (optional)" placeholder="Jakarta Gambir" {...field('from_place')} />
          <Input label="To (optional)" placeholder="Bandung" {...field('to_place')} />
        </>
      ) : (
        <Input label="Place (optional)" placeholder="Search comes in phase 4" {...field('place_name')} />
      )}
      {/* shortcut: times are typed as HH:MM; swap for a time picker in phase 7. */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Start (optional)" placeholder="HH:MM" {...field('start_time')} />
        </View>
        <View className="flex-1">
          <Input label="End (optional)" placeholder="HH:MM" {...field('end_time')} />
        </View>
      </View>
      <Input label="Cost (optional)" placeholder="150000" keyboardType="decimal-pad" {...field('cost')} />
      <Input label="Notes (optional)" multiline textAlignVertical="top" style={{ minHeight: 80 }} {...field('notes')} />
      {days && dayId ? <Chips label="Day" options={days.options} value={dayId} onChange={setDayId} /> : null}
      {saveError ? <Text className="text-sm text-error">{saveError}</Text> : null}
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </View>
  );
}
