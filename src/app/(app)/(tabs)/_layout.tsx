import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { HeaderButton } from '@/components/header-button';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

const TABS = [
  ['index', 'Dashboard', 'home-outline'],
  ['itineraries', 'My Itineraries', 'list-outline'],
  ['explore', 'Explore', 'compass-outline'],
  ['travel-map', 'Travel Map', 'earth-outline'],
  ['budget', 'Budget', 'wallet-outline'],
] as const;

const BRAND_HEIGHT = 64;

// Bottom tabs on phones; on wide screens the same tabs become a sidebar on the left.
export default function TabsLayout() {
  const wide = useWindowDimensions().width >= 768;
  return (
    <Tabs
      screenOptions={{
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarVariant: wide ? 'material' : 'uikit',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        // The sidebar has no header slot: draw the app name in its background and push the tabs below it.
        ...(wide ? { tabBarBackground: () => <SidebarBrand />, tabBarStyle: { paddingTop: BRAND_HEIGHT } } : {}),
      }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // color is the theme's tint, always a string here; the navigation type also allows numbers
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color as string} size={size} />,
            headerRight:
              name === 'index' ? () => <HeaderButton label="Sign out" onPress={() => supabase.auth.signOut()} /> : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}

function SidebarBrand() {
  const colors = useColors();
  return (
    <View className="flex-1 bg-base-100">
      <View style={{ height: BRAND_HEIGHT }} className="flex-row items-center gap-2 px-5">
        <Ionicons name="location" size={24} color={colors.primary} />
        <Text className="text-xl font-bold text-base-content">Itinerary</Text>
      </View>
    </View>
  );
}
