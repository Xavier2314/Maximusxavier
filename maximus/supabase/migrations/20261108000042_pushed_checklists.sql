-- Pushed checklists: a super admin sends a timed checklist to everyone or chosen members.
-- Each member works through the items with a timer; the admin watches progress.

create table public.pushed_checklists (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(trim(title)) between 1 and 160),
  due_at     timestamptz,
  audience   text not null check (audience in ('everyone', 'selected')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.pushed_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.pushed_checklists (id) on delete cascade,
  position     smallint not null,
  title        text not null check (length(trim(title)) between 1 and 200),
  minutes      integer not null check (minutes between 1 and 1440)
);
create index pushed_checklist_items_list_idx on public.pushed_checklist_items (checklist_id, position);

create table public.pushed_checklist_recipients (
  checklist_id uuid not null references public.pushed_checklists (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  primary key (checklist_id, user_id)
);
create index pushed_checklist_recipients_user_idx on public.pushed_checklist_recipients (user_id);

-- One row per member per item: when the timer started, pauses, and when it was finished.
create table public.pushed_checklist_progress (
  item_id        uuid not null references public.pushed_checklist_items (id) on delete cascade,
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  started_at     timestamptz,
  paused_at      timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (item_id, user_id)
);
create trigger pushed_checklist_progress_updated_at before update on public.pushed_checklist_progress
  for each row execute function public.set_updated_at();

alter table public.pushed_checklists enable row level security;
alter table public.pushed_checklist_items enable row level security;
alter table public.pushed_checklist_recipients enable row level security;
alter table public.pushed_checklist_progress enable row level security;

-- Is the signed-in member a recipient of this checklist?
create or replace function public.is_checklist_recipient(p_checklist uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pushed_checklist_recipients where checklist_id = p_checklist and user_id = auth.uid())
$$;

create policy pushed_checklists_read on public.pushed_checklists for select to authenticated
  using (public.has_role('super_admin') or public.is_checklist_recipient(id));
create policy pushed_checklist_items_read on public.pushed_checklist_items for select to authenticated
  using (public.has_role('super_admin') or public.is_checklist_recipient(checklist_id));
create policy pushed_checklist_recipients_read on public.pushed_checklist_recipients for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
create policy pushed_checklist_progress_read on public.pushed_checklist_progress for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
-- Members keep their own timers, only on checklists sent to them.
create policy pushed_checklist_progress_write on public.pushed_checklist_progress for insert to authenticated
  with check (user_id = auth.uid() and public.is_checklist_recipient(
    (select checklist_id from pushed_checklist_items i where i.id = item_id)));
create policy pushed_checklist_progress_update on public.pushed_checklist_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Super admins can withdraw a checklist they pushed.
create policy pushed_checklists_delete on public.pushed_checklists for delete to authenticated
  using (public.has_role('super_admin'));

/**
 * Push a checklist. p_items: [{"title": "...", "minutes": 60}, ...]. p_users null sends it to every
 * active member. Super admins only. Returns the new checklist's id; recipients get a notification.
 */
create or replace function public.push_checklist(p_title text, p_due timestamptz, p_items jsonb, p_users uuid[] default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if not public.has_role('super_admin') then
    raise exception 'Only super admins can push checklists' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'A checklist can have at most 30 items' using errcode = '22023';
  end if;

  insert into pushed_checklists (title, due_at, audience)
  values (trim(p_title), p_due, case when p_users is null then 'everyone' else 'selected' end)
  returning id into v_id;

  insert into pushed_checklist_items (checklist_id, position, title, minutes)
  select v_id, (e.ordinality - 1)::smallint, trim(e.value ->> 'title'), (e.value ->> 'minutes')::int
  from jsonb_array_elements(p_items) with ordinality as e;

  insert into pushed_checklist_recipients (checklist_id, user_id)
  select v_id, p.id from profiles p
  where p.status = 'active' and (p_users is null or p.id = any (p_users))
  on conflict do nothing;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Choose at least one active member' using errcode = '22023';
  end if;

  insert into notifications (user_id, type, title, body, link, data)
  select r.user_id, 'pushed_checklist', 'New checklist: ' || trim(p_title),
         'Open it on your Home and start the timer.', '/dashboard', jsonb_build_object('checklist_id', v_id)
  from pushed_checklist_recipients r
  where r.checklist_id = v_id and r.user_id is distinct from auth.uid()
    and not exists (select 1 from notification_preferences np where np.user_id = r.user_id and 'pushed_checklist' = any (np.muted_types));

  return v_id;
end $$;
revoke execute on function public.push_checklist(text, timestamptz, jsonb, uuid[]) from public, anon;
grant execute on function public.push_checklist(text, timestamptz, jsonb, uuid[]) to authenticated;

/** Remind everyone on a pushed checklist who hasn't finished it. Super admins only. Returns how many were reminded. */
create or replace function public.remind_checklist(p_checklist uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_title text; v_total int; v_count int;
begin
  if not public.has_role('super_admin') then
    raise exception 'Only super admins can send reminders' using errcode = '42501';
  end if;
  select title into v_title from pushed_checklists where id = p_checklist;
  if v_title is null then raise exception 'Checklist not found' using errcode = 'P0002'; end if;
  select count(*) into v_total from pushed_checklist_items where checklist_id = p_checklist;

  insert into notifications (user_id, type, title, body, link, data)
  select r.user_id, 'pushed_checklist', 'Reminder: ' || v_title, 'Your checklist is waiting on your Home.', '/dashboard',
         jsonb_build_object('checklist_id', p_checklist)
  from pushed_checklist_recipients r
  where r.checklist_id = p_checklist
    and (select count(*) from pushed_checklist_progress pr join pushed_checklist_items i on i.id = pr.item_id
         where i.checklist_id = p_checklist and pr.user_id = r.user_id and pr.completed_at is not null) < v_total
    and not exists (select 1 from notification_preferences np where np.user_id = r.user_id and 'pushed_checklist' = any (np.muted_types));
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.remind_checklist(uuid) from public, anon;
grant execute on function public.remind_checklist(uuid) to authenticated;

-- Members can't read every admin's profile, so the sender's name and photo travel with the checklist.
alter table public.pushed_checklists add column sender_name text, add column sender_avatar text;
update public.pushed_checklists c set sender_name = p.full_name, sender_avatar = p.avatar_url from public.profiles p where p.id = c.created_by;

create or replace function public.pushed_checklists_fill_sender() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select full_name, avatar_url into new.sender_name, new.sender_avatar from profiles where id = new.created_by;
  return new;
end $$;
create trigger pushed_checklists_fill_sender before insert on public.pushed_checklists
  for each row execute function public.pushed_checklists_fill_sender();
