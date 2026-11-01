import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/button';

// Loading and error states shared by data screens.
export function ScreenState({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-base-200 p-4">
      {error ? (
        <>
          <Text className="text-center text-base text-error">{error.message}</Text>
          {onRetry ? <Button title="Try again" variant="ghost" onPress={onRetry} /> : null}
        </>
      ) : (
        <ActivityIndicator color="#570df8" accessibilityLabel="Loading" />
      )}
    </View>
  );
}
