-- =============================================================================
-- MAXIMUS — 0014 Send to sponsor / team leader, written plans, order screenshots
-- =============================================================================

-- Members can describe their month in their own words (typed or dictated).
alter table public.monthly_goals add column if not exists plan_text text check (length(plan_text) <= 4000);

-- Orders from Fiverr, Upwork, product sales… with a description and screenshot.
alter table public.orders
  add column if not exists platform text check (platform in ('product', 'fiverr', 'upwork', 'freelance_other', 'other')),
  add column if not exists description text check (length(description) <= 2000),
  add column if not exists attachment_path text check (length(attachment_path) <= 300);

-- Private bucket for order screenshots and shared files.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do nothing;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Who a member reports to: their sponsor, and their team leader.
-- Team leader = an upline with the Team Leader role (or higher) in the same
-- office; otherwise the office's manager; otherwise the nearest upline Team Leader.
-- -----------------------------------------------------------------------------
create or replace function public.my_leaders(p_user uuid default null)
returns table (relation text, id uuid, full_name text, avatar_url text, member_code text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_user   uuid := coalesce(p_user, auth.uid());
  v_office uuid;
  v_leader uuid;
begin
  if auth.uid() is not null and v_user <> auth.uid() and not can_view_team_data(v_user) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select office_id into v_office from profiles where profiles.id = v_user;

  select tr.ancestor_id into v_leader
  from team_relationships tr
  join user_roles ur on ur.user_id = tr.ancestor_id
  join roles r on r.id = ur.role_id and r.key in ('team_leader', 'director', 'executive_admin', 'super_admin')
  join profiles p on p.id = tr.ancestor_id and p.status = 'active'
  where tr.descendant_id = v_user and tr.depth >= 1 and v_office is not null and p.office_id = v_office
  order by tr.depth limit 1;

  if v_leader is null and v_office is not null then
    select coalesce(o.manager_id, (select om.user_id from office_memberships om
                                   where om.office_id = o.id and om.is_manager and om.user_id <> v_user limit 1))
      into v_leader from offices o where o.id = v_office;
    if v_leader = v_user then v_leader := null; end if;
  end if;

  if v_leader is null then
    select tr.ancestor_id into v_leader
    from team_relationships tr
    join user_roles ur on ur.user_id = tr.ancestor_id
    join roles r on r.id = ur.role_id and r.key in ('team_leader', 'director', 'executive_admin', 'super_admin')
    where tr.descendant_id = v_user and tr.depth >= 1
    order by tr.depth limit 1;
  end if;

  return query
  select 'sponsor'::text, p.id, p.full_name, p.avatar_url, p.member_id
  from profiles me join profiles p on p.id = me.sponsor_id where me.id = v_user
  union all
  select 'team_leader'::text, p.id, p.full_name, p.avatar_url, p.member_id
  from profiles p where p.id = v_leader;
end $$;

-- -----------------------------------------------------------------------------
-- Shared items: a snapshot sent to the sponsor and/or team leader. The snapshot
-- is stored, so the recipient can always read what was sent to them.
-- -----------------------------------------------------------------------------
create table public.shared_items (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  relation        text not null check (relation in ('sponsor', 'team_leader')),
  kind            text not null check (kind in ('goal', 'evaluation', 'order', 'payment', 'plan')),
  item_id         uuid,
  title           text not null check (length(title) <= 200),
  body            text not null check (length(body) <= 8000),
  message         text check (length(message) <= 1000),
  attachment_path text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index shared_items_recipient_idx on public.shared_items (recipient_id, created_at desc);
create index shared_items_sender_idx on public.shared_items (sender_id, created_at desc);
alter table public.shared_items enable row level security;
create policy shared_items_read on public.shared_items for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy shared_items_mark_read on public.shared_items for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
revoke insert, delete on public.shared_items from authenticated, anon;

create or replace function public.share_with_leaders(
  p_kind text, p_item uuid, p_title text, p_body text, p_relations text[],
  p_message text default null, p_attachment text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_count int := 0; v_name text; v_link text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_attachment is not null and split_part(p_attachment, '/', 1) <> auth.uid()::text then
    raise exception 'You can only share your own files' using errcode = '42501';
  end if;
  -- The item must belong to the sender.
  if p_item is not null and not (case p_kind
      when 'goal' then exists (select 1 from monthly_goals where id = p_item and user_id = auth.uid())
      when 'evaluation' then exists (select 1 from evaluations where id = p_item and user_id = auth.uid())
      when 'order' then exists (select 1 from orders where id = p_item and member_id = auth.uid())
      when 'payment' then exists (select 1 from financial_transactions where id = p_item and user_id = auth.uid())
      else true end) then
    raise exception 'You can only send your own records' using errcode = '42501';
  end if;
  select full_name into v_name from profiles where id = auth.uid();
  for r in select * from my_leaders() l where l.relation = any (p_relations) loop
    insert into shared_items (sender_id, recipient_id, relation, kind, item_id, title, body, message, attachment_path)
    values (auth.uid(), r.id, r.relation, p_kind, p_item, left(p_title, 200), left(p_body, 8000),
            nullif(trim(p_message), ''), p_attachment)
    returning '/inbox/' || id into v_link;
    perform notify(r.id, 'shared_with_you', v_name || ' sent you ' || case p_kind
        when 'goal' then 'their goals' when 'evaluation' then 'their evaluation' when 'order' then 'an order'
        when 'payment' then 'a payment' else 'a plan' end,
      left(p_title, 140), v_link, jsonb_build_object('kind', p_kind));
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then raise exception 'No sponsor or team leader found to send this to.'; end if;
  return v_count;
end $$;

-- Attachments: owner uploads into their folder; owner, their leaders, and
-- anyone it was shared with can read.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $p$create policy "attachments own upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "attachments read" on storage.objects for select to authenticated
      using (bucket_id = 'attachments' and (
        public.can_view_team_data(((storage.foldername(name))[1])::uuid)
        or exists (select 1 from public.shared_items s where s.attachment_path = name and s.recipient_id = auth.uid())))$p$;
  end if;
end $$;

revoke execute on function public.my_leaders(uuid) from public, anon;
grant execute on function public.my_leaders(uuid) to authenticated;
revoke execute on function public.share_with_leaders(text, uuid, text, text, text[], text, text) from public, anon;
grant execute on function public.share_with_leaders(text, uuid, text, text, text[], text, text) to authenticated;
