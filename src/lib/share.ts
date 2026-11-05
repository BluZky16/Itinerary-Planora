import { Platform, Share } from 'react-native';

// Production web app (EAS Hosting). Phones share this address so the link opens in any browser.
const WEB_URL = 'https://bluzky-itinerary.expo.app';

// On web, the current origin, so local dev links point at the local server.
export const shareUrl = (token: string) =>
  `${Platform.OS === 'web' ? window.location.origin : WEB_URL}/share/${token}`;

// Copies on web; opens the system share sheet on phones. Returns what happened, for the button label.
export async function copyOrShare(url: string): Promise<'copied' | 'shared'> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  await Share.share({ message: url });
  return 'shared';
}
