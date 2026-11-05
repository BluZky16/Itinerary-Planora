import { router, Stack, type Href } from 'expo-router';

import { HeaderButton } from '@/components/header-button';

// Opened by link or after a browser reload there is no history, so the header has no back arrow.
// Give it one that goes up a level instead: the trip for its sub-screens, else the trip list.
function upFrom(name: string, params: object | undefined): Href {
  const id = (params as { id?: string } | undefined)?.id;
  return id && name !== 'trip/[id]/index' ? { pathname: '/trip/[id]', params: { id } } : '/itineraries';
}

// Everything in (app) is signed-in only; the root layout guards this group.
export default function AppLayout() {
  return (
    <Stack
      screenOptions={({ navigation, route }) => ({
        headerBackTitle: 'Back', // else screen readers hear the previous route name, "(tabs), back"
        headerLeft: navigation.canGoBack()
          ? undefined
          : () => <HeaderButton label="Back" icon="arrow-back" onPress={() => router.replace(upFrom(route.name, route.params))} />,
      })}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/new" options={{ title: 'Create trip' }} />
      <Stack.Screen name="trip/[id]/index" options={{ title: 'Trip' }} />
      <Stack.Screen name="trip/[id]/edit" options={{ title: 'Edit trip' }} />
      <Stack.Screen name="trip/[id]/item/new" options={{ title: 'Add to plan' }} />
      <Stack.Screen name="trip/[id]/item/[itemId]" options={{ title: 'Edit plan item' }} />
    </Stack>
  );
}
