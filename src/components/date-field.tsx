import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatDay } from '@/lib/plan';
import { fromPickerDate, toPickerDate, type PickerMode } from '@/lib/picker';

export type DateFieldProps = {
  label: string;
  mode: PickerMode;
  value: string; // 'YYYY-MM-DD' or 'HH:MM', '' when empty
  onChangeText: (value: string) => void; // same name as Input, so forms spread one field() into either
  error?: string;
  optional?: boolean; // shows a Clear button
};

// Phones: a field that opens the system picker (dialog on Android, spinner below the field on iOS).
// The web version is date-field.web.tsx.
export function DateField({ label, mode, value, onChangeText, error, optional }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  function picked(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false); // the Android dialog closes itself on set or cancel
    if (event.type === 'set' && date) onChangeText(fromPickerDate(date, mode));
  }

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-base-content">{label}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || 'not set'}`}
          accessibilityHint={error}
          onPress={() => {
            // The iOS spinner reports a value only when it moves: save the value it opens on.
            if (!open && !value && Platform.OS === 'ios') onChangeText(fromPickerDate(new Date(), mode));
            setOpen(!open);
          }}
          className={`min-h-12 flex-1 justify-center rounded-lg border bg-base-100 px-3 ${
            error ? 'border-error' : 'border-base-300'
          }`}>
          <Text className={`text-base text-base-content ${value ? '' : 'opacity-70'}`}>
            {value ? (mode === 'date' ? formatDay(value) : value) : mode === 'date' ? 'Pick a date' : 'Pick a time'}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChangeText('')}
            className="min-h-12 justify-center px-2">
            <Text className="text-base text-primary">Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={toPickerDate(value, mode)}
          mode={mode}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={picked}
        />
      ) : null}
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
