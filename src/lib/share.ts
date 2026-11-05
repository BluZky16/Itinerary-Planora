import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

// shortcut: native builds get an app-scheme link that only opens in the app; phase 7's web deploy gives a public https link.
export const shareUrl = (token: string) =>
  Platform.OS === 'web' ? `${window.location.origin}/share/${token}` : Linking.createURL(`/share/${token}`);

// Copies on web; opens the system share sheet on phones. Returns what happened, for the button label.
export async function copyOrShare(url: string): Promise<'copied' | 'shared'> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  await Share.share({ message: url });
  return 'shared';
}
