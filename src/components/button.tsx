import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
};

export function Button({ title, onPress, loading, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      className={`min-h-12 items-center justify-center rounded-lg px-4 ${
        primary ? 'bg-primary' : 'bg-transparent'
      } ${loading ? 'opacity-60' : ''}`}>
      {loading ? (
        <ActivityIndicator color={primary ? '#ffffff' : '#570df8'} />
      ) : (
        <Text className={`text-base font-semibold ${primary ? 'text-primary-content' : 'text-primary'}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
