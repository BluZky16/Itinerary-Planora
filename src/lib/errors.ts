// Supabase errors are plain objects with a message, not Error instances.
export function errorMessage(e: unknown, fallback: string): string {
  return e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : fallback;
}
