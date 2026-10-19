-- =============================================================================
-- MAXIMUS — 0043 Top earners of the week + Upwork niche leaders
-- Every Monday the daily cron awards last week's top 3 (and each office's #1)
-- from confirmed/delivered orders, posts a recognition and notifies everyone.
-- =============================================================================

create table public.weekly_winners (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null,
  office_id  uuid references public.offices (id) on delete cascade,
  position   integer not null check (position between 1 and 3),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  total      numeric(14, 2) not null,
  orders     integer not null,
  created_at timestamptz not null default now()
);
create unique index weekly_winners_slot on public.weekly_winners (week_start, coalesce(office_id, '00000000-0000-0000-0000-000000000000'::uuid), position);
alter table public.weekly_winners enable row level security;
create policy weekly_winners_read on public.weekly_winners for select to authenticated using (true);

-- Awards the week that starts on p_week_start (default: last week). Safe to run twice.
create or replace function public.award_weekly_winners(p_week_start date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_start date := coalesce(p_week_start, date_trunc('week', (now() at time zone 'Africa/Lagos')::date - 7)::date);
  v_end   date := v_start + 7;
  r record; n integer := 0; v_names text := ''; v_first uuid; m record;
begin
  if exists (select 1 from weekly_winners where week_start = v_start) then return 0; end if;

  for r in
    select o.member_id, sum(o.amount) as total, count(*) as cnt, p.full_name,
           row_number() over (order by sum(o.amount) desc, count(*) desc) as pos
    from orders o join profiles p on p.id = o.member_id and p.status = 'active'
    where o.status in ('confirmed', 'delivered') and o.order_date >= v_start and o.order_date < v_end and o.amount > 0
    group by o.member_id, p.full_name
    order by total desc, cnt desc limit 3
  loop
    insert into weekly_winners (week_start, position, user_id, total, orders) values (v_start, r.pos, r.member_id, r.total, r.cnt);
    n := n + 1;
    v_names := v_names || case r.pos when 1 then '🥇 ' when 2 then ' · 🥈 ' else ' · 🥉 ' end || r.full_name;
    if r.pos = 1 then
      v_first := r.member_id;
      insert into announcements (kind, audience, recipient_id, title, body, published_at, expires_at)
        values ('recognition', 'all', r.member_id, '🏆 Top Earner of the Week: ' || r.full_name,
                r.full_name || ' led everyone last week with ₦' || to_char(r.total, 'FM999,999,999,990') || ' in orders (' || r.cnt || ' order' || case when r.cnt = 1 then '' else 's' end || '). Congratulations! 🎉',
                now(), now() + interval '7 days');
    end if;
    perform notify(r.member_id, 'recognition', case r.pos when 1 then '🏆 You are Top Earner of the Week!' else '🎉 You made the top 3 this week!' end,
      'Position ' || r.pos || ' with ₦' || to_char(r.total, 'FM999,999,999,990') || ' in orders last week. Keep going!', '/dashboard', '{}'::jsonb);
  end loop;

  if v_first is not null then
    for m in select id from profiles where status = 'active' and id not in (select user_id from weekly_winners where week_start = v_start) loop
      perform notify(m.id, 'recognition', '🏆 Top earners of the week', v_names, '/dashboard', '{}'::jsonb);
    end loop;
  end if;

  -- Each office's own top earner.
  for r in
    select distinct on (p.office_id) p.office_id, o.member_id, sum(o.amount) as total, count(*) as cnt, p.full_name
    from orders o join profiles p on p.id = o.member_id and p.status = 'active' and p.office_id is not null
    where o.status in ('confirmed', 'delivered') and o.order_date >= v_start and o.order_date < v_end and o.amount > 0
    group by p.office_id, o.member_id, p.full_name
    order by p.office_id, sum(o.amount) desc, count(*) desc
  loop
    insert into weekly_winners (week_start, office_id, position, user_id, total, orders) values (v_start, r.office_id, 1, r.member_id, r.total, r.cnt);
    insert into announcements (kind, audience, office_id, recipient_id, title, body, published_at, expires_at)
      values ('recognition', 'office', r.office_id, r.member_id, '🏅 Office Top Earner: ' || r.full_name,
              r.full_name || ' was this office''s top earner last week with ₦' || to_char(r.total, 'FM999,999,999,990') || ' in orders.', now(), now() + interval '7 days');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.award_weekly_winners(date) from public, anon, authenticated;
grant execute on function public.award_weekly_winners(date) to service_role;

-- Members getting the most Upwork orders in a niche (last 90 days). Orders in
-- processing count too. Only for members who unlocked the Upwork analyser.
create or replace function public.upwork_niche_leaders(p_niche text, p_limit integer default 10)
returns table (full_name text, avatar_url text, business_rank text, member_id text, orders integer, in_progress integer, completed integer, matched boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_words text[];
begin
  if not has_tool_access('upwork_analyser') then raise exception 'Unlock the Upwork analyser first' using errcode = '42501'; end if;
  select coalesce(array_agg(w), '{}') into v_words
    from unnest(regexp_split_to_array(lower(coalesce(p_niche, '')), '[^a-z0-9]+')) w
    where length(w) >= 4 and w not in ('with', 'from', 'that', 'this', 'your', 'expert', 'services', 'service', 'freelance', 'freelancer', 'professional');
  return query
  with up as (
    select o.member_id, o.status,
           (cardinality(v_words) > 0 and exists (select 1 from unnest(v_words) w
              where lower(coalesce(o.category, '') || ' ' || coalesce(o.description, '') || ' ' || coalesce(o.notes, '')) like '%' || w || '%')) as hit
    from orders o
    where o.platform = 'upwork' and o.status <> 'cancelled' and o.order_date >= (now() at time zone 'Africa/Lagos')::date - 90
  ), niche as (select * from up where hit),
  src as (select * from niche union all select * from up where not exists (select 1 from niche))
  select p.full_name, p.avatar_url, p.business_rank, p.member_id,
         count(*)::int, count(*) filter (where s.status = 'pending')::int, count(*) filter (where s.status in ('confirmed', 'delivered'))::int,
         exists (select 1 from niche)
  from src s join profiles p on p.id = s.member_id and p.status = 'active'
  group by p.id
  order by count(*) desc, count(*) filter (where s.status in ('confirmed', 'delivered')) desc
  limit least(greatest(coalesce(p_limit, 10), 1), 20);
end $$;
revoke execute on function public.upwork_niche_leaders(text, integer) from public, anon;
grant execute on function public.upwork_niche_leaders(text, integer) to authenticated;
