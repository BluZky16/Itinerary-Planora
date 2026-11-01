import { Pressable, Text, View } from 'react-native';

type Props<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Single-choice row of pill buttons.
export function Chips<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-base-content">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              className={`min-h-10 justify-center rounded-full border px-4 ${
                selected ? 'border-primary bg-primary' : 'border-base-300 bg-base-100'
              }`}>
              <Text className={selected ? 'text-primary-content' : 'text-base-content'}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
