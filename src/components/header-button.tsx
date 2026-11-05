import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { useColors } from '@/lib/theme';

type Props = { label: string; onPress: () => void; icon?: ComponentProps<typeof Ionicons>['name'] };

// Text or icon button for a screen header. With an icon, the label is only read by screen readers.
export function HeaderButton({ label, onPress, icon }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mx-1.5 min-h-11 min-w-11 items-center justify-center px-2">
      {icon ? (
        <Ionicons name={icon} size={24} color={colors['base-content']} />
      ) : (
        <Text className="text-base font-semibold text-primary">{label}</Text>
      )}
    </Pressable>
  );
}
