import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// One short confirmation at a time, over every screen: call toast('Trip saved.') from anywhere.
// <Toaster /> is mounted once in the root layout.
let show: ((message: string) => void) | undefined;
export const toast = (message: string) => show?.(message);

export function Toaster() {
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    show = (m) => {
      clearTimeout(timer);
      setMessage(m);
      // VoiceOver ignores live regions; elsewhere the live region below speaks, so announcing too would repeat it.
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(m);
      timer = setTimeout(() => setMessage(''), 2500);
    };
    return () => {
      show = undefined;
      clearTimeout(timer);
    };
  }, []);

  // The live region stays mounted so screen readers announce each new message (web, Android).
  // Placed just below the screen header, under the notch on phones.
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ top: insets.top + 72 }}
      className="pointer-events-none absolute inset-x-0 items-center px-4">
      {message ? (
        <Text className="rounded-full bg-base-content px-4 py-2 text-base text-base-100">{message}</Text>
      ) : null}
    </View>
  );
}
