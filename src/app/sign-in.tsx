import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendCode() {
    if (loading) return; // Enter can fire while a request is running
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) setError(error.message);
    else setCodeSent(true);
  }

  async function verifyCode() {
    if (loading) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    // On success onAuthStateChange in the root layout swaps to the home screen.
    if (error) setError(error.message);
  }

  return (
    <View className="flex-1 items-center justify-center bg-base-200 p-4">
      <View className="w-full max-w-sm gap-4 rounded-2xl bg-base-100 p-6">
        <Text accessibilityRole="header" className="text-2xl font-bold text-base-content">Itinerary</Text>
        <Text className="text-base text-base-content">
          {codeSent ? `Enter the code we emailed to ${email.trim()}.` : 'Sign in with your email.'}
        </Text>

        {codeSent ? (
          <>
            <Input
              label="Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              onSubmitEditing={verifyCode}
              error={error}
            />
            <Button title="Sign in" onPress={verifyCode} loading={loading} />
            <Button
              title="Use a different email"
              variant="ghost"
              onPress={() => {
                setCodeSent(false);
                setCode('');
                setError('');
              }}
            />
          </>
        ) : (
          <>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={sendCode}
              error={error}
            />
            <Button title="Send code" onPress={sendCode} loading={loading} />
          </>
        )}
      </View>
    </View>
  );
}
