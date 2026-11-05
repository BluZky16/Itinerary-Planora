import { useState } from 'react';
import { Text, View } from 'react-native';

import { shareTrip, unshareTrip } from '@/api/trips';
import { Button } from '@/components/button';
import { errorMessage } from '@/lib/errors';
import { queryClient } from '@/lib/query';
import { copyOrShare, shareUrl } from '@/lib/share';

// Turn the read-only link on or off, and copy it. `token` is the trip's current share_token.
export function SharePanel({ tripId, token }: { tripId: string; token: string | null }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      setNote(done);
    } catch (e) {
      setError(errorMessage(e, 'Could not change sharing.'));
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    setError('');
    try {
      setNote((await copyOrShare(url)) === 'copied' ? 'Link copied.' : '');
    } catch (e) {
      setError(errorMessage(e, 'Could not copy the link.'));
    }
  }

  return (
    <View className="gap-2 rounded-3xl border border-base-300 bg-base-100 p-4">
      <Text accessibilityRole="header" className="text-lg font-bold text-base-content">Share</Text>
      {token ? (
        <>
          <Text className="text-sm text-base-content opacity-70">
            Anyone with this link can see the plan (not the budget, costs or notes).
          </Text>
          <Text selectable className="text-sm text-base-content">{shareUrl(token)}</Text>
          <Button title="Copy link" onPress={() => copy(shareUrl(token))} />
          <Button title="Stop sharing" variant="ghost" onPress={() => run(() => unshareTrip(tripId), 'Sharing is off.')} loading={busy} />
        </>
      ) : (
        <Button title="Create share link" onPress={() => run(() => shareTrip(tripId), 'Link created.')} loading={busy} />
      )}
      {note ? <Text className="text-sm text-base-content">{note}</Text> : null}
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
