-- =============================================================================
-- MAXIMUS — 0045 Premium white-label + company featured videos
-- * Two offers: Standard (own name, logo, colours) and Premium (also removes
--   every Maximus mark, with a branded company link /c/<slug>).
-- * White-labelled companies can feature their own YouTube/Loom video.
-- =============================================================================

alter table public.offices
  add column if not exists featured_video   jsonb,
  add column if not exists full_white_label boolean not null default false,
  add column if not exists slug             text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');
grant select (featured_video, full_white_label, slug) on public.offices to authenticated;

alter table public.company_signups add column if not exists tier text not null default 'standard' check (tier in ('standard', 'premium'));

-- A URL-safe, unique company link name.
create or replace function public.unique_office_slug(p_name text)
returns text language plpgsql stable security definer set search_path = public as $$
declare base text; v text; n int := 1;
begin
  base := trim(both '-' from regexp_replace(lower(coalesce(p_name, 'company')), '[^a-z0-9]+', '-', 'g'));
  base := left(coalesce(nullif(base, ''), 'company'), 34);
  if length(base) < 3 then base := base || '-co'; end if;
  v := base;
  while exists (select 1 from offices where slug = v) loop
    n := n + 1; v := base || '-' || n;
  end loop;
  return v;
end $$;
revoke execute on function public.unique_office_slug(text) from public, anon, authenticated;

-- Company admins feature their own video for their members (white-labelled offices only).
create or replace function public.set_office_featured_video(p_office uuid, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_office(p_office) then raise exception 'Only this office''s managers can change its video' using errcode = '42501'; end if;
  if not (select white_label_paid from offices where id = p_office) and not has_role('super_admin') then
    raise exception 'Your own featured video comes with white-label. Unlock it first.' using errcode = '42501';
  end if;
  update offices set featured_video = p_value where id = p_office;
end $$;
revoke execute on function public.set_office_featured_video(uuid, jsonb) from public, anon;
grant execute on function public.set_office_featured_video(uuid, jsonb) to authenticated;

-- Start a company sign-up (Standard ₦5,000 or Premium ₦10,000 by default).
create or replace function public.start_company_signup(p_company text, p_primary text, p_accent text, p_tier text default 'standard')
returns table (tx_ref text, amount numeric)
language plpgsql security definer set search_path = public as $$
declare v_amount numeric; v_ref text; v_tier text := case when p_tier = 'premium' then 'premium' else 'standard' end;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if length(trim(coalesce(p_company, ''))) < 2 then raise exception 'Enter your company name.'; end if;
  if exists (select 1 from offices where lower(name) = lower(trim(p_company))) then
    raise exception 'A company with that name already exists. Add your city or a short word to make it unique.';
  end if;
  if (select count(*) from online_payments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many payment attempts. Please try again later.';
  end if;
  v_amount := case when v_tier = 'premium'
    then coalesce((select (value->>'amount')::numeric from app_settings where key = 'company_whitelabel_premium_fee'), 10000)
    else coalesce((select (value->>'amount')::numeric from app_settings where key = 'company_whitelabel_fee'), 5000) end;
  v_ref := 'MX-' || replace(gen_random_uuid()::text, '-', '');
  insert into online_payments (tx_ref, user_id, purpose, amount) values (v_ref, auth.uid(), 'company_whitelabel', v_amount);
  insert into company_signups (user_id, company_name, primary_color, accent_color, tx_ref, tier)
    values (auth.uid(), trim(p_company), coalesce(p_primary, '#1d4ed8'), coalesce(p_accent, '#84cc16'), v_ref, v_tier);
  return query select v_ref, v_amount;
end $$;
revoke execute on function public.start_company_signup(text, text, text, text) from public, anon;
grant execute on function public.start_company_signup(text, text, text, text) to authenticated;

-- Provision now also sets the company link and Premium (full) white-label.
create or replace function public.provision_company(p_tx_ref text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s company_signups%rowtype; v_office uuid; v_name text;
begin
  select * into s from company_signups where tx_ref = p_tx_ref for update;
  if not found then return null; end if;
  if s.status = 'active' then return s.office_id; end if;
  v_name := s.company_name;
  if exists (select 1 from offices where lower(name) = lower(v_name)) then v_name := v_name || ' (' || substr(s.id::text, 1, 4) || ')'; end if;
  insert into offices (name, manager_id, display_name, primary_color, accent_color, white_label, white_label_paid, full_white_label, slug)
    values (v_name, s.user_id, s.company_name, s.primary_color, s.accent_color, true, true, s.tier = 'premium', unique_office_slug(s.company_name))
    returning id into v_office;
  insert into office_memberships (office_id, user_id, is_manager) values (v_office, s.user_id, true) on conflict do nothing;
  update profiles set office_id = v_office where id = s.user_id;
  insert into user_roles (user_id, role_id) select s.user_id, id from roles where key = 'office_admin' on conflict do nothing;
  update company_signups set status = 'active', office_id = v_office where id = s.id;
  perform notify(s.user_id, 'white_label', s.company_name || ' is ready 🎉',
    'Your branded company app is live. Add your logo in Office view > Branding and share your company link.', '/office/brand', jsonb_build_object('office_id', v_office));
  perform write_audit('company_provisioned', 'office', v_office::text, jsonb_build_object('company', s.company_name, 'tier', s.tier, 'tx_ref', p_tx_ref));
  return v_office;
end $$;
revoke execute on function public.provision_company(text) from public, anon, authenticated;
