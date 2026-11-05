import { Text, View } from 'react-native';

export function ComingSoon({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-base-200 p-4">
      <View className="w-full max-w-sm gap-3 rounded-2xl bg-base-100 p-6">
        <Text className="text-2xl font-bold text-base-content">{title}</Text>
        <Text className="text-base text-base-content">Coming soon.</Text>
      </View>
    </View>
  );
}
