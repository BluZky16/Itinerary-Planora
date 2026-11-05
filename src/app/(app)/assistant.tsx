import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';

import { sendChat, type ChatMessage } from '@/api/assistant';
import { listTrips } from '@/api/trips';
import { Button } from '@/components/button';
import { PlanCard } from '@/components/plan-card';
import type { AiPlan } from '@/lib/ai-plan';
import { errorMessage } from '@/lib/errors';
import { useColors } from '@/lib/theme';

type Msg = ChatMessage & { plan?: AiPlan | null; planError?: string | null };

const MAX_MESSAGE = 1000;

export default function Assistant() {
  const colors = useColors();
  const trips = useQuery({ queryKey: ['trips'], queryFn: listTrips });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<Msg>>(null);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    const history: Msg[] = [...messages, { role: 'user', text: content }];
    setMessages(history);
    setText('');
    setError('');
    setSending(true);
    try {
      const r = await sendChat(history, trips.data ?? []);
      setMessages([...history, { role: 'assistant', text: r.reply, rawPlan: r.rawPlan, plan: r.plan, planError: r.planError }]);
    } catch (e) {
      // Put the message back so it can be sent again.
      setMessages(messages);
      setText(content);
      setError(errorMessage(e, 'Could not reach the assistant.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-base-200"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        contentContainerClassName="mx-auto w-full max-w-xl gap-3 p-4"
        ListEmptyComponent={
          <Text className="py-8 text-center text-base text-base-content">
            Tell me where, when and your budget, for example “5 days in Bali from 1 December, 1500 USD”. I will propose a plan
            you can review. Nothing is saved until you create it.
          </Text>
        }
        renderItem={({ item: m }) => (
          <View className={`gap-2 ${m.role === 'user' ? 'max-w-[85%] self-end' : m.plan ? 'w-full' : 'max-w-[85%] self-start'}`}>
            <View className={`rounded-3xl px-4 py-3 ${m.role === 'user' ? 'bg-accent' : 'border border-base-300 bg-base-100'}`}>
              <Text selectable className={`text-base ${m.role === 'user' ? 'text-accent-content' : 'text-base-content'}`}>
                {m.text}
              </Text>
            </View>
            {m.plan ? <PlanCard plan={m.plan} trips={trips.data ?? []} /> : null}
            {m.planError ? <Text className="text-sm text-error">I could not use that plan ({m.planError}) Ask me to try again.</Text> : null}
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View className="flex-row items-center gap-2 self-start px-2">
              <ActivityIndicator color={colors.primary} accessibilityLabel="Thinking" />
              <Text className="text-sm text-base-content opacity-70">Thinking…</Text>
            </View>
          ) : undefined
        }
      />
      <View className="mx-auto w-full max-w-xl gap-2 p-4 pt-0">
        {error ? <Text className="text-sm text-error">{error}</Text> : null}
        <View className="flex-row items-center gap-2">
          <TextInput
            accessibilityLabel="Message"
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            maxLength={MAX_MESSAGE}
            returnKeyType="send"
            placeholder="Plan a trip…"
            placeholderTextColor={colors.muted}
            className="min-h-12 flex-1 rounded-full border border-base-300 bg-base-100 px-4 text-base text-base-content"
          />
          <View className="w-24">
            <Button title="Send" onPress={send} loading={sending} />
          </View>
        </View>
        <Text className="text-xs text-base-content opacity-70">
          Your messages and your trip titles and dates go to Google’s free Gemini service, which may use them to improve its products.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
