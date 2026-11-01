import { router, type Href } from 'expo-router';

// Opened by link or after a browser reload there is no history to go back to.
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
