import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { toast } from '@/components/toast';
import { passwordError, useAuthStep } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up' | 'reset';
// After sign-up or "forgot password" Supabase emails a 6-digit code (the templates show {{ .Token }}).
type CodeFor = 'signup' | 'recovery' | null;

const INTRO: Record<Mode, string> = {
  'sign-in': 'Sign in with your email and password.',
  'sign-up': 'Create an account with your email and a password.',
  reset: 'Enter your email and we will send you a code to set a new password.',
};

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [codeFor, setCodeFor] = useState<CodeFor>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const { loading, error, run, clearError } = useAuthStep();

  const switchTo = (next: Mode) => {
    setMode(next);
    setCodeFor(null);
    setCode('');
    clearError();
  };

  // On success of any step, onAuthStateChange in the root layout swaps to the app.

  const submit = () =>
    run(async () => {
      const addr = email.trim();
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        return error?.message;
      }
      if (mode === 'sign-up') {
        if (passwordError(password)) return passwordError(password);
        const { data, error } = await supabase.auth.signUp({ email: addr, password });
        if (error) return error.message;
        if (!data.session) setCodeFor('signup'); // email confirmation is on: wait for the code
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(addr);
      if (error) return error.message;
      setPassword('');
      setCodeFor('recovery');
    });

  const verify = () =>
    run(async () => {
      const addr = email.trim();
      if (codeFor === 'recovery' && passwordError(password)) return passwordError(password);
      const { error } = await supabase.auth.verifyOtp({ email: addr, token: code.trim(), type: codeFor ?? 'signup' });
      if (error) return error.message;
      // The recovery code signs the user in (this screen closes); set the new password straight away.
      if (codeFor === 'recovery') {
        const set = await supabase.auth.updateUser({ password });
        if (set.error) toast(`Your password was not changed: ${set.error.message}`); // the screen is gone by now
        return set.error?.message;
      }
    });

  const guest = () =>
    run(async () => (await supabase.auth.signInAnonymously()).error?.message);

  return (
    <View className="flex-1 items-center justify-center bg-base-200 p-4">
      <View className="w-full max-w-sm gap-4 rounded-3xl border border-base-300 bg-base-100 p-6">
        <Text accessibilityRole="header" className="font-display text-3xl text-primary">Itinerary</Text>
        <Text className="text-base text-base-content">
          {codeFor ? `Enter the code we emailed to ${email.trim()}.` : INTRO[mode]}
        </Text>

        {codeFor ? (
          <>
            <Input
              label="Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              onSubmitEditing={verify}
              error={codeFor === 'signup' ? error : undefined}
            />
            {codeFor === 'recovery' ? (
              <Input
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                onSubmitEditing={verify}
                error={error}
              />
            ) : null}
            <Button title={codeFor === 'recovery' ? 'Set password and sign in' : 'Confirm and sign in'} onPress={verify} loading={loading} />
            <Button title="Back" variant="ghost" onPress={() => switchTo(mode)} />
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
              onSubmitEditing={submit}
              error={mode === 'reset' ? error : undefined}
            />
            {mode !== 'reset' ? (
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                onSubmitEditing={submit}
                error={error}
              />
            ) : null}
            <Button
              title={mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send code'}
              onPress={submit}
              loading={loading}
            />
            {mode === 'sign-in' ? (
              <>
                <Button title="Create an account" variant="ghost" onPress={() => switchTo('sign-up')} />
                <Button title="Forgot password?" variant="ghost" onPress={() => switchTo('reset')} />
              </>
            ) : (
              <Button title="Back to sign in" variant="ghost" onPress={() => switchTo('sign-in')} />
            )}
            <View className="h-px bg-base-300" />
            <Button title="Continue as guest" variant="ghost" onPress={guest} />
          </>
        )}
      </View>
    </View>
  );
}
