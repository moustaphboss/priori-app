-- Push notifications: devices register tokens per persona; task changes that need someone's
-- attention call the notify-task Edge Function, which picks recipients and sends via Expo Push.

-- ---------------------------------------------------------------------------
-- Device tokens
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  -- Associate id, or 'manager'.
  persona text not null,
  platform text,
  updated_at timestamptz not null default now()
);

-- No client policies: tokens are written through register_push_token and read by the server only.
alter table public.push_tokens enable row level security;

-- A device (token) acts as one persona at a time; switching persona moves the token.
create or replace function public.register_push_token(p_token text, p_persona text, p_platform text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, persona, platform, updated_at)
  values (p_token, p_persona, p_platform, now())
  on conflict (token) do update
    set persona = excluded.persona, platform = excluded.platform, updated_at = now();
$$;

grant execute on function public.register_push_token(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Server-only settings (not exposed through the API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);

-- ---------------------------------------------------------------------------
-- Trigger: forward relevant task changes to the Edge Function (async, via pg_net)
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function private.notify_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notify_url text;
  notify_secret text;
begin
  select value into notify_url from private.settings where key = 'notify_url';
  select value into notify_secret from private.settings where key = 'notify_secret';
  -- Not configured yet: the app still works, just without push.
  if notify_url is null or notify_secret is null then
    return new;
  end if;

  -- Fire-and-forget: pg_net queues the request after commit, so task writes never wait on push.
  perform net.http_post(
    url := notify_url,
    body := jsonb_build_object(
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || notify_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

-- New P0s, and tasks created already assigned (manager dispatch).
create trigger tasks_notify_insert
  after insert on public.tasks
  for each row
  when (new.priority = 'P0' or new.assignee_id is not null)
  execute function private.notify_task_change();

-- Escalations, and manager (re)assignments (assign_task stamps assigned_at).
create trigger tasks_notify_update
  after update on public.tasks
  for each row
  when (
    (new.state = 'ESCALATED' and old.state is distinct from 'ESCALATED')
    or (new.assigned_at is distinct from old.assigned_at and new.assignee_id is not null)
  )
  execute function private.notify_task_change();
