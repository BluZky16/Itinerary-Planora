import { Text, View } from 'react-native';

export function ComingSoon({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-base-200 p-4">
      <View className="w-full max-w-sm gap-3 rounded-3xl border border-base-300 bg-base-100 p-6">
        <Text className="font-display text-3xl text-primary">{title}</Text>
        <Text className="text-base text-base-content">Coming soon.</Text>
      </View>
    </View>
  );
}
