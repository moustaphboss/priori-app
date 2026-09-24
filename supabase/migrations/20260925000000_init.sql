-- Smart Store Tasks: schema, state machine, and task commands.
-- The client ranks tasks; the database guards invariants (legal transitions,
-- one IN_PROGRESS task per associate, first-ack-wins for P0) so they hold across devices.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.associates (
  id text primary key,
  name text not null,
  skills text[] not null default '{}',
  location text
);

create table public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  type text not null check (type in ('restock', 'check', 'spill', 'bopis', 'customer')),
  origin text not null default 'adhoc' check (origin in ('planned', 'adhoc')),
  priority text not null check (priority in ('P0', 'P1', 'P2', 'P3')),
  state text not null default 'READY' check (
    state in ('PLANNED', 'READY', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ESCALATED')
  ),
  location text,
  due_at timestamptz,
  estimated_minutes integer not null default 5 check (estimated_minutes > 0),
  customer_impact real not null default 0 check (customer_impact between 0 and 1),
  assignee_id text references public.associates (id),
  created_at timestamptz not null default now(),
  worked_ms bigint not null default 0,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  acknowledged_at timestamptz,
  -- Bumped on every update so clients can drop stale realtime events.
  version integer not null default 0
);

-- One task in progress per associate, enforced by the database.
create unique index tasks_one_in_progress_per_associate
  on public.tasks (assignee_id)
  where state = 'IN_PROGRESS';

-- ---------------------------------------------------------------------------
-- State machine (mirrors src/domain/state-machine.ts)
-- ---------------------------------------------------------------------------

create or replace function public.can_transition(from_state text, to_state text)
returns boolean
language sql
immutable
as $$
  select case
    when to_state = 'ESCALATED' then from_state not in ('ESCALATED', 'COMPLETED', 'CANCELLED')
    else (from_state, to_state) in (
      ('PLANNED', 'READY'), ('PLANNED', 'CANCELLED'),
      ('READY', 'ASSIGNED'), ('READY', 'CANCELLED'),
      ('ASSIGNED', 'IN_PROGRESS'), ('ASSIGNED', 'READY'), ('ASSIGNED', 'CANCELLED'),
      ('IN_PROGRESS', 'PAUSED'), ('IN_PROGRESS', 'COMPLETED'), ('IN_PROGRESS', 'CANCELLED'),
      ('PAUSED', 'IN_PROGRESS'), ('PAUSED', 'CANCELLED'),
      ('ESCALATED', 'ASSIGNED'), ('ESCALATED', 'CANCELLED')
    )
  end;
$$;

create or replace function public.tasks_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.state is distinct from old.state and not public.can_transition(old.state, new.state) then
    raise exception 'Illegal transition % -> % (task %)', old.state, new.state, old.id
      using errcode = 'check_violation';
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();

-- ---------------------------------------------------------------------------
-- Commands. Each runs in one transaction and returns the rows it changed.
-- ---------------------------------------------------------------------------

-- Pause whatever the associate has in progress (internal helper).
create or replace function public._pause_current(p_associate text)
returns setof public.tasks
language sql
as $$
  update public.tasks
  set state = 'PAUSED',
      worked_ms = worked_ms + coalesce((extract(epoch from now() - started_at) * 1000)::bigint, 0),
      started_at = null,
      paused_at = now()
  where assignee_id = p_associate and state = 'IN_PROGRESS'
  returning *;
$$;

-- Start or resume a task. Anything already in progress is paused first.
create or replace function public.start_task(p_task text, p_associate text)
returns setof public.tasks
language plpgsql
as $$
declare
  paused_ids text[];
begin
  select coalesce(array_agg(id), '{}') into paused_ids
  from public._pause_current(p_associate)
  where id <> p_task;

  update public.tasks
  set state = 'ASSIGNED', assignee_id = p_associate
  where id = p_task and state in ('READY', 'ESCALATED');

  update public.tasks
  set state = 'IN_PROGRESS',
      started_at = now(),
      paused_at = null,
      -- Starting a P0 counts as acknowledging it.
      acknowledged_at = case when priority = 'P0' then coalesce(acknowledged_at, now()) else acknowledged_at end
  where id = p_task and state in ('ASSIGNED', 'PAUSED') and assignee_id = p_associate;

  if not found then
    raise exception 'Task % cannot be started by %', p_task, p_associate;
  end if;

  return query select * from public.tasks where id = p_task or id = any (paused_ids);
end;
$$;

-- Pause a task and, optionally, promote the next one (chosen by the client's ranking).
create or replace function public.pause_task(p_task text, p_associate text, p_next text default null)
returns setof public.tasks
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.tasks
    where id = p_task and assignee_id = p_associate and state = 'IN_PROGRESS'
  ) then
    raise exception 'Task % is not in progress for %', p_task, p_associate;
  end if;

  return query select * from public._pause_current(p_associate);

  if p_next is not null then
    return query select * from public.start_task(p_next, p_associate);
  end if;
end;
$$;

create or replace function public.complete_task(p_task text)
returns setof public.tasks
language sql
as $$
  update public.tasks
  set state = 'COMPLETED',
      worked_ms = worked_ms + coalesce((extract(epoch from now() - started_at) * 1000)::bigint, 0),
      started_at = null,
      completed_at = now()
  where id = p_task and state = 'IN_PROGRESS'
  returning *;
$$;

-- "I'm on it" for a P0. First associate to acknowledge wins; others get an error.
create or replace function public.acknowledge_p0(p_task text, p_associate text)
returns setof public.tasks
language plpgsql
as $$
begin
  update public.tasks
  set acknowledged_at = now()
  where id = p_task and priority = 'P0' and acknowledged_at is null;

  if not found then
    raise exception 'Already acknowledged by someone else';
  end if;

  return query select * from public.start_task(p_task, p_associate);
end;
$$;

-- Escalate P0s nobody acknowledged within 30 s. Run by pg_cron and callable by clients.
create or replace function public.escalate_overdue_p0()
returns setof public.tasks
language sql
as $$
  update public.tasks
  set state = 'ESCALATED'
  where priority = 'P0'
    and acknowledged_at is null
    and state in ('READY', 'ASSIGNED')
    and created_at <= now() - interval '30 seconds'
  returning *;
$$;

-- ---------------------------------------------------------------------------
-- Demo seed (mirrors src/data/mock-tasks.ts), also used by the Reset button.
-- ---------------------------------------------------------------------------

create or replace function public.reset_demo()
returns setof public.tasks
language plpgsql
as $$
begin
  delete from public.tasks where true;

  insert into public.associates (id, name, skills, location)
  values ('a1', 'Sam', array['restock', 'check', 'customer'], 'Aisle 7')
  on conflict (id) do update
    set name = excluded.name, skills = excluded.skills, location = excluded.location;

  insert into public.tasks
    (id, title, type, origin, priority, state, location, due_at, estimated_minutes,
     customer_impact, assignee_id, created_at, worked_ms, started_at)
  values
    ('t1', 'Restock dairy fridge', 'restock', 'planned', 'P2', 'IN_PROGRESS', 'Aisle 7',
     now() + interval '40 minutes', 20, 0.2, 'a1', now() - interval '60 minutes', 360000, now() - interval '2 minutes'),
    ('t2', 'Pick BOPIS order #4821', 'bopis', 'adhoc', 'P1', 'ASSIGNED', 'Pickup desk',
     now() + interval '8 minutes', 6, 0.8, 'a1', now() - interval '5 minutes', 0, null),
    ('t3', 'Freezer temperature check', 'check', 'planned', 'P2', 'READY', 'Frozen section',
     now() + interval '25 minutes', 5, 0, null, now() - interval '120 minutes', 0, null),
    ('t4', 'Customer asking for gluten-free pasta', 'customer', 'adhoc', 'P1', 'ASSIGNED', 'Aisle 3',
     now() + interval '3 minutes', 3, 1, 'a1', now() - interval '1 minute', 0, null),
    ('t5', 'Replace shelf price labels', 'check', 'planned', 'P3', 'READY', 'Aisle 12',
     now() + interval '150 minutes', 15, 0.1, null, now() - interval '180 minutes', 0, null);

  return query select * from public.tasks;
end;
$$;

select public.reset_demo();

-- ---------------------------------------------------------------------------
-- Access (PoC: no auth, open to the publishable key. Lock down before real use.)
-- ---------------------------------------------------------------------------

alter table public.associates enable row level security;
alter table public.tasks enable row level security;

create policy "demo: read associates" on public.associates for select to anon, authenticated using (true);
create policy "demo: full access to tasks" on public.tasks for all to anon, authenticated using (true) with check (true);

grant execute on function
  public.start_task(text, text),
  public.pause_task(text, text, text),
  public.complete_task(text),
  public.acknowledge_p0(text, text),
  public.escalate_overdue_p0(),
  public.reset_demo()
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime + server-side escalation
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('escalate-overdue-p0', '5 seconds', 'select public.escalate_overdue_p0()');
