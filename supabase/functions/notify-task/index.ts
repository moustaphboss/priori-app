// notify-task: called by a Postgres trigger (pg_net) when a task needs someone's attention.
// Picks recipients, sends through the Expo Push API, and prunes dead tokens.
// Deploy with --no-verify-jwt: callers authenticate with the shared NOTIFY_SECRET instead.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { decideNotification, type TaskChangePayload } from './decide.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  const secret = Deno.env.get('NOTIFY_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as TaskChangePayload;
  const notice = decideNotification(payload);
  if (!notice) return Response.json({ sent: 0, reason: 'no notification needed' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const query = supabase.from('push_tokens').select('token');
  const { data: rows, error } =
    notice.audience.kind === 'personas'
      ? await query.in('persona', notice.audience.personas)
      : await query.neq('persona', 'manager');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const tokens = (rows ?? []).map((r) => r.token as string);
  if (tokens.length === 0) return Response.json({ sent: 0, reason: 'no registered devices' });

  const messages = tokens.map((to) => ({
    to,
    title: notice.title,
    body: notice.body,
    data: { taskId: notice.taskId, priority: notice.priority },
    sound: 'default',
    priority: 'high',
    channelId: notice.urgent ? 'safety' : 'default',
    interruptionLevel: notice.urgent ? 'time-sensitive' : 'active',
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await response.json();

  // Tickets come back in message order; drop tokens Expo says are no longer valid.
  const tickets: { status: string; details?: { error?: string } }[] = result.data ?? [];
  const dead = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered');
  if (dead.length > 0) await supabase.from('push_tokens').delete().in('token', dead);

  console.log(
    JSON.stringify({ task: notice.taskId, title: notice.title, sent: tokens.length, pruned: dead.length }),
  );
  return Response.json({ sent: tokens.length, pruned: dead.length, tickets });
});
