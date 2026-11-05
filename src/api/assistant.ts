import { createItem } from '@/api/items';
import { createTrip, deleteTrip, getTripPlan, type Trip } from '@/api/trips';
import { validatePlan, type AiPlan } from '@/lib/ai-plan';
import { localToday } from '@/lib/plan';
import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'user' | 'assistant'; text: string; rawPlan?: unknown };
export type ChatReply = { reply: string; rawPlan: unknown; plan: AiPlan | null; planError: string | null };

const MAX_HISTORY = 10; // the function caps this too; the free tier counts tokens
const MAX_TRIPS = 30;

// The `chat` Edge Function answers with { error } and a status code (429 over quota, 401 signed out).
async function functionError(e: { message: string; context?: unknown }): Promise<Error> {
  const body: unknown = e.context instanceof Response ? await e.context.json().catch(() => null) : null;
  const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : '';
  return new Error(message || 'The assistant is not reachable right now.');
}

// One chat turn. Sends the last messages (an earlier plan goes along as JSON, so "make it cheaper" works)
// and only the title, destination and dates of your trips. The plan in the reply is validated here.
export async function sendChat(history: ChatMessage[], trips: Trip[]): Promise<ChatReply> {
  const { data, error } = await supabase.functions.invoke('chat', {
    body: {
      today: localToday(), // the function runs in UTC: late at night "tomorrow" would be off by a day
      messages: history.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        text: m.rawPlan ? `${m.text}\nProposed plan: ${JSON.stringify(m.rawPlan)}` : m.text,
      })),
      trips: trips.slice(-MAX_TRIPS).map((t) => ({ title: t.title, destination: t.destination, start_date: t.start_date, end_date: t.end_date })),
    },
  });
  if (error) throw await functionError(error);
  if (!data || typeof data !== 'object' || typeof data.reply !== 'string') throw new Error('The assistant sent an unexpected reply.');

  const rawPlan: unknown = data.plan ?? null;
  if (rawPlan === null) return { reply: data.reply, rawPlan, plan: null, planError: null };
  const result = validatePlan(rawPlan);
  return 'plan' in result
    ? { reply: data.reply, rawPlan, plan: result.plan, planError: null }
    : { reply: data.reply, rawPlan: null, plan: null, planError: result.error };
}

// Saves a validated plan as a real trip. The database makes the days from the trip dates, so the
// trip is created first and its days read back. A failure part-way deletes the trip (items go with it).
export async function createFromPlan({ trip, items }: AiPlan): Promise<Trip> {
  const created = await createTrip(trip);
  try {
    const { days } = await getTripPlan(created.id);
    const next = days.map(() => 0);
    await Promise.all(items.map(({ day, input }) => createItem(days[day - 1].id, next[day - 1]++, input)));
  } catch (e) {
    await deleteTrip(created.id).catch(() => undefined);
    throw e;
  }
  return created;
}
