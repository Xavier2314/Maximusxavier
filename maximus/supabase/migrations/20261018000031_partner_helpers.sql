-- =============================================================================
-- MAXIMUS — 0031 Accountability helpers: partner and request details (names and
-- photos even across offices), and the partner's score when they share it.
-- =============================================================================
create or replace function public.my_partnership()
returns table (partnership_id uuid, since timestamptz, partner_id uuid, full_name text, member_id text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.responded_at, pr.id, pr.full_name, pr.member_id, pr.avatar_url
  from partnerships p
  join profiles pr on pr.id = case when p.requester_id = auth.uid() then p.partner_id else p.requester_id end
  where p.status = 'active' and auth.uid() in (p.requester_id, p.partner_id)
  limit 1
$$;

create or replace function public.my_partner_requests()
returns table (id uuid, incoming boolean, message text, created_at timestamptz, full_name text, member_id text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.partner_id = auth.uid(), p.message, p.created_at, pr.full_name, pr.member_id, pr.avatar_url
  from partnerships p
  join profiles pr on pr.id = case when p.requester_id = auth.uid() then p.partner_id else p.requester_id end
  where p.status = 'pending' and auth.uid() in (p.requester_id, p.partner_id)
  order by p.created_at desc
$$;

create or replace function public.productivity_score(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_from date := current_date - 6;
  v_tasks_due int; v_tasks_done int; v_goal_pct numeric; v_habit_due int; v_habit_done int; v_focus int;
  t numeric; g numeric; h numeric;
begin
  if v_user <> auth.uid() and not partner_shares(v_user, 'score') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select count(*) filter (where due_date between v_from and current_date or completed_at::date between v_from and current_date),
         count(*) filter (where completed_at::date between v_from and current_date)
    into v_tasks_due, v_tasks_done from tasks where user_id = v_user;
  select avg(least(1, progress / target)) into v_goal_pct from tool_goals
    where user_id = v_user and target is not null and status <> 'abandoned'
      and (deadline is null or deadline >= v_from) and start_date <= current_date;
  select count(*) into v_habit_due from habits h2 cross join generate_series(v_from, current_date, interval '1 day') d
    where h2.user_id = v_user and not h2.archived and extract(isodow from d)::smallint = any (h2.days) and d::date >= h2.created_at::date;
  select count(*) into v_habit_done from habit_checks where user_id = v_user and check_date between v_from and current_date;
  select coalesce(sum(focus_seconds(s)), 0) / 60 into v_focus from focus_sessions s
    where user_id = v_user and kind <> 'break' and status = 'completed' and started_at >= v_from;
  t := case when v_tasks_due > 0 then least(1, v_tasks_done::numeric / v_tasks_due) end;
  g := v_goal_pct;
  h := case when v_habit_due > 0 then least(1, v_habit_done::numeric / v_habit_due) end;
  return jsonb_build_object(
    'score', round(100 * (coalesce(t, 0) * 0.4 + coalesce(g, 0) * 0.3 + coalesce(h, 0) * 0.3)
                   / nullif((case when t is null then 0 else 0.4 end) + (case when g is null then 0 else 0.3 end) + (case when h is null then 0 else 0.3 end), 0)),
    'tasks_due', v_tasks_due, 'tasks_done', v_tasks_done,
    'goal_progress_pct', round(coalesce(g, 0) * 100), 'habit_due', v_habit_due, 'habit_done', v_habit_done,
    'focus_minutes', v_focus);
end $$;


revoke execute on function public.my_partnership() from public, anon;
revoke execute on function public.my_partner_requests() from public, anon;
grant execute on function public.my_partnership(), public.my_partner_requests() to authenticated;
