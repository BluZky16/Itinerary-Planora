import { Stack } from 'expo-router';

// Everything in (app) is signed-in only; the root layout guards this group.
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/new" options={{ title: 'Create trip' }} />
      <Stack.Screen name="trip/[id]/index" options={{ title: 'Trip' }} />
      <Stack.Screen name="trip/[id]/edit" options={{ title: 'Edit trip' }} />
    </Stack>
  );
}
