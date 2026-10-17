-- =============================================================================
-- MAXIMUS — 0006 Announcements, Recognition & Birthdays
-- =============================================================================

create type public.announcement_kind as enum ('announcement', 'training', 'recognition');
create type public.announcement_audience as enum ('all', 'office', 'team');

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  kind         public.announcement_kind not null default 'announcement',
  audience     public.announcement_audience not null default 'all',
  office_id    uuid references public.offices (id) on delete cascade,
  -- For recognition posts: the member being celebrated.
  recipient_id uuid references public.profiles (id) on delete cascade,
  title        text not null check (length(trim(title)) between 3 and 160),
  body         text not null check (length(trim(body)) between 1 and 5000),
  pinned       boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint announcements_office_audience check (audience <> 'office' or office_id is not null),
  constraint announcements_recognition_recipient check (kind <> 'recognition' or recipient_id is not null)
);
create index announcements_published_idx on public.announcements (published_at desc);

create or replace function public.can_see_announcement(a public.announcements)
returns boolean language sql stable security definer set search_path = public as $$
  select a.author_id = auth.uid()
      or public.has_permission('view_org_analytics')
      or (a.published_at <= now() and (a.expires_at is null or a.expires_at > now()) and (
            a.audience = 'all'
         or (a.audience = 'office' and exists (select 1 from office_memberships
                                               where office_id = a.office_id and user_id = auth.uid()))
         or (a.audience = 'team' and exists (select 1 from team_relationships
                                             where ancestor_id = a.author_id and descendant_id = auth.uid()))))
$$;

create or replace function public.can_publish(p_kind public.announcement_kind, p_audience public.announcement_audience,
                                              p_office uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    -- Leaders may recognise members of their own team, to their own team.
    when p_kind = 'recognition' and p_audience = 'team' then
      public.has_permission('view_team_dashboard') and public.can_view_team_data(p_recipient)
    when p_audience = 'office' then
      public.has_permission('publish_announcements') and public.can_manage_office(p_office)
    when p_audience = 'team' then
      public.has_permission('publish_announcements')
    else
      public.has_permission('publish_announcements') and public.has_permission('view_org_analytics')
  end
$$;

-- Fan the announcement out to its audience as notifications.
create or replace function public.announcements_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_type text := case new.kind when 'training' then 'training_announcement'
                                     when 'recognition' then 'recognition'
                                     else 'admin_announcement' end;
begin
  insert into notifications (user_id, type, title, body, link, data)
  select p.id, v_type, new.title, left(new.body, 160), '/announcements/' || new.id,
         jsonb_build_object('announcement_id', new.id)
  from profiles p
  where p.status = 'active'
    and p.id is distinct from new.author_id
    and (new.audience = 'all'
      or (new.audience = 'office' and exists (select 1 from office_memberships m where m.office_id = new.office_id and m.user_id = p.id))
      or (new.audience = 'team' and exists (select 1 from team_relationships t where t.ancestor_id = new.author_id and t.descendant_id = p.id)))
    and not exists (select 1 from notification_preferences np where np.user_id = p.id and v_type = any (np.muted_types));
  return new;
end $$;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.announcements_notify();

alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select to authenticated
  using (public.can_see_announcement(announcements));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and public.can_publish(kind, audience, office_id, recipient_id));
create policy announcements_update on public.announcements for update to authenticated
  using (author_id = auth.uid() or public.has_permission('view_org_analytics'))
  with check (public.can_publish(kind, audience, office_id, recipient_id));
create policy announcements_delete on public.announcements for delete to authenticated
  using (author_id = auth.uid() or public.has_permission('view_org_analytics'));

-- -----------------------------------------------------------------------------
-- Birthdays & anniversaries. Only members who opted in are listed, and the
-- birth year is shown only when the member chose 'full'.
-- -----------------------------------------------------------------------------
create or replace function public.upcoming_birthdays(p_days integer default 30)
returns table (member uuid, full_name text, avatar_url text, office_name text,
               birthday_month integer, birthday_day integer, birth_year integer, days_until integer)
language sql stable security definer set search_path = public as $$
  with b as (
    select p.id, p.full_name, p.avatar_url, o.name as office_name, p.date_of_birth, p.birthday_visibility,
           make_date(extract(year from current_date)::int, extract(month from p.date_of_birth)::int,
                     -- 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
                     least(extract(day from p.date_of_birth)::int,
                           extract(day from (make_date(extract(year from current_date)::int, extract(month from p.date_of_birth)::int, 1)
                                             + interval '1 month - 1 day'))::int)) as this_year
    from profiles p left join offices o on o.id = p.office_id
    where p.status = 'active' and p.date_of_birth is not null and p.birthday_visibility <> 'private'
      and auth.uid() is not null
  )
  select id, full_name, avatar_url, office_name,
         extract(month from date_of_birth)::int, extract(day from date_of_birth)::int,
         case when birthday_visibility = 'full' then extract(year from date_of_birth)::int end,
         (case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end - current_date)::int
  from b
  where (case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end - current_date) <= p_days
  order by 8, 2
$$;

create or replace function public.upcoming_anniversaries(p_days integer default 30)
returns table (member uuid, full_name text, avatar_url text, years integer, days_until integer)
language sql stable security definer set search_path = public as $$
  with a as (
    select p.id, p.full_name, p.avatar_url, p.joined_at::date as joined,
           (p.joined_at::date + make_interval(years => (extract(year from age(current_date, p.joined_at::date))::int + 1))) as next_date,
           (p.joined_at::date + make_interval(years => extract(year from age(current_date, p.joined_at::date))::int)) as this_date
    from profiles p
    where p.status = 'active' and auth.uid() is not null
  )
  select id, full_name, avatar_url,
         extract(year from age(case when this_date::date = current_date then this_date else next_date end, joined))::int,
         ((case when this_date::date = current_date then this_date else next_date end)::date - current_date)::int
  from a
  where ((case when this_date::date = current_date then this_date else next_date end)::date - current_date) <= p_days
    and extract(year from age(case when this_date::date = current_date then this_date else next_date end, joined)) >= 1
  order by 5, 2
$$;
