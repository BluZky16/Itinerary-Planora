import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, ...rest }: Props) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-base-content">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9ca3af"
        className={`min-h-12 rounded-lg border bg-base-100 px-3 text-base text-base-content ${
          error ? 'border-error' : 'border-base-300'
        }`}
        {...rest}
      />
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
