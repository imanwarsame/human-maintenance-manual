import { supabase } from '../supabase.js';

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string,
): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint, p256dh, auth, user_agent: userAgent ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
  if (error) throw error;
}

export async function getAllSubscriptions(): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (error) throw error;
  return data ?? [];
}
