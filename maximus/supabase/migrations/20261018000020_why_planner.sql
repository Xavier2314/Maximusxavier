-- =============================================================================
-- MAXIMUS — 0020 My Why & Daily Planner
-- * motivations: a member's reasons (financial, family, career...). Private by
--   default; shared ones are visible to their sponsor line and leaders, who may
--   send encouragement (never pressure).
-- * tasks: personal daily planner with priorities, due dates, repeating tasks
--   and tasks a leader assigns. The member always controls their own schedule.
-- =============================================================================

create table public.motivations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category          text not null default 'personal'
                    check (category in ('financial', 'family', 'career', 'personal', 'reason', 'milestone')),
  title             text not null check (length(trim(title)) between 1 and 120),
  body              text check (length(body) <= 2000),
  image_path        text check (length(image_path) <= 300),
  target_date       date,
  shared            boolean not null default false,
  show_on_dashboard boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index motivations_user_idx on public.motivations (user_id, created_at desc);
create trigger motivations_updated_at before update on public.motivations
  for each row execute function public.set_updated_at();

alter table public.motivations enable row level security;
create policy motivations_read on public.motivations for select to authenticated
  using (user_id = auth.uid() or (shared and public.can_view_team_data(user_id)));
create policy motivations_insert on public.motivations for insert to authenticated
  with check (user_id = auth.uid());
create policy motivations_update on public.motivations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy motivations_delete on public.motivations for delete to authenticated
  using (user_id = auth.uid());

-- A leader sends a kind word about something the member chose to share.
create or replace function public.encourage_member(p_motivation uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_m motivations%rowtype; v_name text := (select full_name from profiles where id = auth.uid());
begin
  select * into v_m from motivations where id = p_motivation;
  if not found or not v_m.shared or v_m.user_id = auth.uid() or not can_view_team_data(v_m.user_id) then
    raise exception 'You can only encourage members about what they have shared with you' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_message, ''))) not between 2 and 500 then
    raise exception 'Write a short message (up to 500 characters)';
  end if;
  perform notify(v_m.user_id, 'sponsor_feedback', coalesce(v_name, 'Your leader') || ' is cheering you on',
    trim(p_message), '/why', jsonb_build_object('motivation_id', v_m.id));
end $$;

-- -----------------------------------------------------------------------------
-- Daily planner
-- -----------------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 200),
  notes        text check (length(notes) <= 2000),
  category     text not null default 'other'
               check (category in ('prospecting', 'follow_up', 'training', 'sales', 'team', 'personal', 'other')),
  priority     smallint not null default 2 check (priority between 1 and 3),  -- 1 high, 2 normal, 3 low
  due_date     date,
  repeat       text not null default 'none' check (repeat in ('none', 'daily', 'weekly')),
  completed_at timestamptz,
  assigned_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tasks_user_open_idx on public.tasks (user_id, due_date) where completed_at is null;
create index tasks_user_done_idx on public.tasks (user_id, completed_at desc) where completed_at is not null;
create index tasks_assigned_by_idx on public.tasks (assigned_by) where assigned_by is not null;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
create policy tasks_read on public.tasks for select to authenticated
  using (user_id = auth.uid() or assigned_by = auth.uid());
-- Members add their own tasks; leaders may give a task to someone in their team.
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    (user_id = auth.uid() and assigned_by is null)
    or (assigned_by = auth.uid() and user_id <> auth.uid() and public.can_view_team_data(user_id)
        and (public.has_permission('view_direct_downlines') or public.has_permission('view_team_dashboard'))));
create policy tasks_update on public.tasks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_delete on public.tasks for delete to authenticated
  using (user_id = auth.uid() or (assigned_by = auth.uid() and completed_at is null));

create or replace function public.tasks_notify_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_by is not null then
    perform notify(new.user_id, 'task_assigned',
      'New task from ' || coalesce((select full_name from profiles where id = new.assigned_by), 'your leader'),
      new.title || case when new.due_date is not null then ' (due ' || to_char(new.due_date, 'DD Mon') || ')' else '' end,
      '/planner', jsonb_build_object('task_id', new.id));
  end if;
  return new;
end $$;
create trigger tasks_notify_assigned after insert on public.tasks
  for each row execute function public.tasks_notify_assigned();

-- Complete a task. A repeating task schedules its next copy.
create or replace function public.complete_task(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t      tasks%rowtype;
  v_tz   text := coalesce((select timezone from profiles where id = auth.uid()), 'Africa/Lagos');
  v_today date := (now() at time zone v_tz)::date;
  v_next uuid;
begin
  select * into t from tasks where id = p_id and user_id = auth.uid() and completed_at is null for update;
  if not found then raise exception 'Task not found'; end if;
  update tasks set completed_at = now() where id = p_id;
  if t.repeat <> 'none' then
    insert into tasks (user_id, title, notes, category, priority, due_date, repeat, assigned_by)
    values (t.user_id, t.title, t.notes, t.category, t.priority,
            greatest(coalesce(t.due_date, v_today), v_today) + case t.repeat when 'daily' then 1 else 7 end,
            t.repeat, t.assigned_by)
    returning id into v_next;
  end if;
  return v_next;
end $$;

-- Daily morning nudge: "You have N tasks today" (once per member per day).
create or replace function public.run_task_reminders(p_today date default current_date)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; v_count integer := 0;
begin
  for r in
    select t.user_id, count(*) filter (where t.due_date = p_today) as today, count(*) filter (where t.due_date < p_today) as overdue
    from tasks t join profiles p on p.id = t.user_id and p.status = 'active'
    where t.completed_at is null and t.due_date <= p_today
    group by t.user_id
  loop
    if not already_notified_today(r.user_id, 'task_reminder', p_today::text) then
      perform notify(r.user_id, 'task_reminder',
        case when r.today > 0 then 'You have ' || r.today || ' task' || case when r.today = 1 then '' else 's' end || ' today'
             else 'You have unfinished tasks' end,
        case when r.overdue > 0 then r.overdue || ' from earlier still open. Move them to today or let them go.' else 'Open your planner to get started.' end,
        '/planner', jsonb_build_object('key', p_today::text));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- Private images for My Why.
do $do$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('motivations', 'motivations', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    execute $p$create policy "motivations own upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'motivations' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "motivations read" on storage.objects for select to authenticated
      using (bucket_id = 'motivations' and (
        (storage.foldername(name))[1] = auth.uid()::text
        or exists (select 1 from public.motivations m where m.image_path = name and m.shared
                   and public.can_view_team_data(m.user_id))))$p$;
  end if;
end
$do$;

do $do$
declare f text;
begin
  foreach f in array array['encourage_member(uuid, text)', 'complete_task(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;
revoke execute on function public.run_task_reminders(date) from public, anon, authenticated;
