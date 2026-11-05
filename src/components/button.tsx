import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useColors } from '@/lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger'; // danger: ghost with red text, for delete
};

export function Button({ title, onPress, loading, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      onPress={onPress}
      disabled={loading}
      className={`min-h-12 items-center justify-center rounded-full px-5 ${
        primary ? 'bg-accent' : 'bg-transparent'
      } ${loading ? 'opacity-60' : ''}`}>
      {loading ? (
        <ActivityIndicator color={primary ? colors['accent-content'] : danger ? colors.error : colors.primary} />
      ) : (
        <Text className={`text-base font-semibold ${primary ? 'text-accent-content' : danger ? 'text-error' : 'text-primary'}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
