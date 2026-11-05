import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { toast } from '@/components/toast';
import { passwordError, useAuthStep } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Guests keep their trips by adding an email and password to the same (anonymous) user.
// When Supabase confirms emails, a 6-digit code ("Change email address" template) comes first; the password comes after.
export default function SaveAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const { loading, error, run } = useAuthStep();
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Last step, once the email is on the account.
  async function setPasswordAndFinish() {
    const set = await supabase.auth.updateUser({ password });
    if (set.error) return set.error.message;
    toast('Account saved');
    router.back();
  }

  const sendCode = () =>
    run(async () => {
      if (passwordError(password)) return passwordError(password);
      const addr = email.trim();
      const { data, error } = await supabase.auth.updateUser({ email: addr });
      if (error) return error.message;
      // With "Confirm email" off in Supabase the email is applied at once: no code to wait for.
      if (data.user.email?.toLowerCase() === addr.toLowerCase()) return setPasswordAndFinish();
      setCodeSent(true);
    });

  const verify = () =>
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email_change' });
      if (error) return error.message;
      return setPasswordAndFinish();
    });

  return (
    <ScrollView className="flex-1 bg-base-200" contentContainerClassName="mx-auto w-full max-w-sm gap-4 p-4">
      <View className="gap-4 rounded-3xl border border-base-300 bg-base-100 p-6">
        <Text className="text-base text-base-content">
          {codeSent
            ? `Enter the code we emailed to ${email.trim()}.`
            : 'You are using Itinerary as a guest. Add an email and password to keep your trips and sign in on other devices.'}
        </Text>
        {codeSent ? (
          <>
            <Input
              label="Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              onSubmitEditing={verify}
              error={error}
            />
            <Button title="Save account" onPress={verify} loading={loading} />
            <Button title="Back" variant="ghost" onPress={() => setCodeSent(false)} />
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
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={sendCode}
              error={error}
            />
            <Button title="Send code" onPress={sendCode} loading={loading} />
          </>
        )}
      </View>

      {/* A guest who signs out can never get back in, so this is a two-step button. */}
      <Button
        title={confirmLeave ? 'Confirm: leave and lose these trips' : 'Leave guest mode'}
        variant="danger"
        onPress={() => (confirmLeave ? supabase.auth.signOut() : setConfirmLeave(true))}
      />
    </ScrollView>
  );
}
