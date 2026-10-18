-- =============================================================================
-- MAXIMUS — 0024 Weekly office reports
-- One report per office per week (Monday start), filled by the office's
-- managers by voice/AI or form, downloaded as a branded PDF. "Last week" and
-- "the week before" come from earlier reports, so only this week is entered.
-- =============================================================================

create table public.office_reports (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references public.offices (id) on delete cascade,
  week_start      date not null check (extract(isodow from week_start) = 1),
  team_leaders    text check (length(team_leaders) <= 200),
  director        text check (length(director) <= 120),
  location        text check (length(location) <= 200),
  currency        text not null default 'USD' check (currency in ('USD', 'NGN')),
  metrics         jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object' and pg_column_size(metrics) < 4000),
  services        jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array' and pg_column_size(services) < 12000),
  new_services    jsonb not null default '[]'::jsonb check (jsonb_typeof(new_services) = 'array' and pg_column_size(new_services) < 12000),
  trainings_count integer check (trainings_count between 0 and 1000),
  training_topics text check (length(training_topics) <= 1000),
  timetable       text check (length(timetable) <= 1000),
  fresh_updates   text check (length(fresh_updates) <= 2000),
  challenges      jsonb not null default '[]'::jsonb check (jsonb_typeof(challenges) = 'array' and pg_column_size(challenges) < 12000),
  notes           text check (length(notes) <= 4000),
  status          text not null default 'draft' check (status in ('draft', 'submitted')),
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (office_id, week_start)
);
create index office_reports_office_week_idx on public.office_reports (office_id, week_start desc);
create trigger office_reports_updated_at before update on public.office_reports
  for each row execute function public.set_updated_at();

alter table public.office_reports enable row level security;
create policy office_reports_read on public.office_reports for select to authenticated
  using (public.can_manage_office(office_id));
create policy office_reports_insert on public.office_reports for insert to authenticated
  with check (public.can_manage_office(office_id));
create policy office_reports_update on public.office_reports for update to authenticated
  using (public.can_manage_office(office_id)) with check (public.can_manage_office(office_id));

-- Super Admins hear when an office submits its weekly report.
create or replace function public.office_reports_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_office text := (select coalesce(display_name, name) from offices where id = new.office_id);
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at := now();
    for r in select distinct ur.user_id from user_roles ur join roles ro on ro.id = ur.role_id
             where ro.key = 'super_admin' and ur.user_id <> auth.uid() loop
      perform notify(r.user_id, 'office_report', v_office || ' sent its weekly report',
        'Week of ' || to_char(new.week_start, 'DD Mon YYYY'), '/office/weekly?office=' || new.office_id,
        jsonb_build_object('report_id', new.id));
    end loop;
  end if;
  return new;
end $$;
create trigger office_reports_notify before insert or update on public.office_reports
  for each row execute function public.office_reports_notify();

-- Numbers the app already knows for a week, to pre-fill the report.
create or replace function public.office_week_facts(p_office uuid, p_week_start date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_end date := p_week_start + 6;
begin
  if not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'active_members', (select count(*) from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
                       where om.office_id = p_office),
    'avg_attendance', (select round(avg(d.present)) from attendance_daily(p_office, p_week_start, v_end) d),
    'orders', (select count(*) from orders o join office_memberships om on om.user_id = o.member_id and om.office_id = p_office
               where o.order_date between p_week_start and v_end and o.status <> 'cancelled'),
    'amount_earned_ngn', (select coalesce(sum(o.amount), 0) from orders o join office_memberships om on om.user_id = o.member_id and om.office_id = p_office
               where o.order_date between p_week_start and v_end and o.status <> 'cancelled'),
    'earners', (select count(distinct o.member_id) from orders o join office_memberships om on om.user_id = o.member_id and om.office_id = p_office
               where o.order_date between p_week_start and v_end and o.status <> 'cancelled'),
    'new_members', (select count(*) from office_memberships om join profiles p on p.id = om.user_id
                    where om.office_id = p_office and p.joined_at::date between p_week_start and v_end)
  );
end $$;

revoke execute on function public.office_week_facts(uuid, date) from public, anon;
grant execute on function public.office_week_facts(uuid, date) to authenticated;
