import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
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

const signOut = () => supabase.auth.signOut();

// Bottom tabs on phones and tablets; on wide screens the same tabs become a top bar with pill tabs.
export default function TabsLayout() {
  const wide = useWindowDimensions().width >= 1024; // logo + five tabs + the main button need this much room
  return (
    <Tabs
      tabBar={wide ? (props) => <TopBar {...props} /> : undefined}
      screenOptions={{ tabBarPosition: wide ? 'top' : 'bottom', headerShown: !wide }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // color is the theme's tint, always a string here; the navigation type also allows numbers
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color as string} size={size} />,
            headerRight: name === 'index' ? () => <HeaderButton label="Sign out" onPress={signOut} /> : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function TopBar({ state, descriptors, navigateToTab }: TabBarProps) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-4 bg-base-200 px-6 py-4">
      <View className="w-56 flex-row items-center gap-2">
        <Ionicons name="location" size={24} color={colors.primary} />
        <Text className="font-display text-2xl text-primary">Itinerary</Text>
      </View>

      <View className="flex-1 items-center">
        <View accessibilityRole="tablist" className="flex-row gap-1 rounded-full border border-base-300 bg-base-100 p-1">
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const title = descriptors[route.key].options.title ?? route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={title}
                accessibilityState={{ selected: focused }}
                onPress={() => navigateToTab(route.key)}
                className={`min-h-11 justify-center rounded-full px-4 ${focused ? 'bg-surface' : ''}`}>
                <Text className={`text-base text-base-content ${focused ? 'font-semibold' : 'opacity-70'}`}>{title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="w-56 flex-row items-center justify-end gap-2">
        <HeaderButton label="Sign out" icon="log-out-outline" onPress={signOut} />
        <Button title="Plan a new trip" onPress={() => router.push('/trip/new')} />
      </View>
    </View>
  );
}
