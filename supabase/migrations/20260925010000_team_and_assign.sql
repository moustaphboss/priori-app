-- Team of associates, manager assignment, and a team-wide demo seed.

-- When a manager (re)assigns a task. Restarts the P0 acknowledgement window for the new assignee.
alter table public.tasks add column assigned_at timestamptz;

-- P0s escalate 30 s after they were raised or last reassigned, whichever is later.
create or replace function public.escalate_overdue_p0()
returns setof public.tasks
language sql
as $$
  update public.tasks
  set state = 'ESCALATED'
  where priority = 'P0'
    and acknowledged_at is null
    and state in ('READY', 'ASSIGNED')
    and greatest(created_at, coalesce(assigned_at, created_at)) <= now() - interval '30 seconds'
  returning *;
$$;

-- Manager (re)assigns an open, assigned or escalated task.
create or replace function public.assign_task(p_task text, p_associate text)
returns setof public.tasks
language plpgsql
as $$
begin
  return query
  update public.tasks
  set state = 'ASSIGNED', assignee_id = p_associate, assigned_at = now()
  where id = p_task and state in ('READY', 'ASSIGNED', 'ESCALATED')
  returning *;

  if not found then
    raise exception 'Task % can''t be reassigned in its current state', p_task;
  end if;
end;
$$;

grant execute on function public.assign_task(text, text) to anon, authenticated;

-- Demo seed (mirrors src/data/mock-tasks.ts), also used by the Reset button.
create or replace function public.reset_demo()
returns setof public.tasks
language plpgsql
as $$
begin
  delete from public.tasks where true;

  insert into public.associates (id, name, skills, location)
  values
    ('a1', 'Sam', array['restock', 'check', 'customer'], 'Aisle 7'),
    ('a2', 'Priya', array['bopis', 'customer'], 'Pickup desk'),
    ('a3', 'Tom', array['spill', 'restock', 'check'], 'Aisle 2'),
    ('a4', 'Lea', array['check', 'customer', 'spill'], 'Bakery')
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
     now() + interval '150 minutes', 15, 0.1, null, now() - interval '180 minutes', 0, null),
    ('t6', 'Pick BOPIS order #4819', 'bopis', 'adhoc', 'P1', 'IN_PROGRESS', 'Pickup desk',
     now() + interval '12 minutes', 8, 0.8, 'a2', now() - interval '10 minutes', 0, now() - interval '3 minutes'),
    ('t7', 'Face up cereal shelves', 'restock', 'planned', 'P3', 'IN_PROGRESS', 'Aisle 2',
     now() + interval '90 minutes', 25, 0.2, 'a3', now() - interval '90 minutes', 0, now() - interval '10 minutes'),
    ('t8', 'Bakery fridge temperature log', 'check', 'planned', 'P2', 'IN_PROGRESS', 'Bakery',
     now() + interval '20 minutes', 5, 0, 'a4', now() - interval '30 minutes', 0, now() - interval '1 minute'),
    ('t9', 'Restock water bottles', 'restock', 'planned', 'P2', 'ASSIGNED', 'Aisle 1',
     now() + interval '45 minutes', 15, 0.4, 'a3', now() - interval '40 minutes', 0, null);

  return query select * from public.tasks;
end;
$$;

select public.reset_demo();
