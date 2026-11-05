import { useState } from 'react';
import { Text, View } from 'react-native';

import type { TripInput } from '@/api/trips';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { errorMessage } from '@/lib/errors';
import { parseTripForm, type TripFormErrors, type TripFormValues } from '@/lib/trip-form';

type Props = {
  initial?: TripInput;
  submitLabel: string;
  onSubmit: (input: TripInput) => Promise<unknown>;
};

export function TripForm({ initial, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<TripFormValues>({
    title: initial?.title ?? '',
    destination: initial?.destination ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    budget: initial?.budget != null ? String(initial.budget) : '',
    currency: initial?.currency ?? '',
  });
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const field = (key: keyof TripFormValues) => ({
    value: values[key],
    onChangeText: (text: string) => setValues((v) => ({ ...v, [key]: text })),
    error: errors[key],
  });

  async function submit() {
    const result = parseTripForm(values);
    if ('errors' in result) return setErrors(result.errors);
    setErrors({});
    setSaveError('');
    setSaving(true);
    try {
      await onSubmit(result.input);
    } catch (e) {
      setSaveError(errorMessage(e, 'Could not save the trip.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="gap-4">
      <Input label="Title" placeholder="Bali with friends" {...field('title')} />
      <Input label="Destination (optional)" placeholder="Bali, Indonesia" {...field('destination')} />
      {/* shortcut: dates are typed as YYYY-MM-DD; swap for a date picker in phase 7. */}
      <Input label="Start date" placeholder="YYYY-MM-DD" autoCapitalize="none" {...field('start_date')} />
      <Input label="End date" placeholder="YYYY-MM-DD" autoCapitalize="none" {...field('end_date')} />
      <Input label="Budget (optional)" placeholder="1500" keyboardType="decimal-pad" {...field('budget')} />
      <Input label="Currency (optional)" placeholder="USD" autoCapitalize="characters" maxLength={3} {...field('currency')} />
      {saveError ? <Text className="text-sm text-error">{saveError}</Text> : null}
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </View>
  );
}
