import { Text, View } from 'react-native';

import type { DateFieldProps } from './date-field';

// Web: the browser's own date/time input. Its value is already 'YYYY-MM-DD' or 'HH:MM'.
export function DateField({ label, mode, value, onChangeText, error }: DateFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-base-content">{label}</Text>
      <input
        type={mode}
        aria-label={label}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        // color-scheme makes the browser's calendar/clock icon follow light or dark mode
        style={{ colorScheme: 'light dark', fontFamily: 'inherit' }}
        className={`min-h-12 rounded-lg border bg-base-100 px-3 text-base text-base-content ${
          error ? 'border-error' : 'border-base-300'
        }`}
      />
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
