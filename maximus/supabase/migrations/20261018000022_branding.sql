-- =============================================================================
-- MAXIMUS — 0022 Office branding & white-label
-- * Each office can set its own name, tagline, logo and colours. Office
--   managers (and organisation admins) own it; members only read it.
-- * white_label hides the platform name for that office's members.
-- * Platform branding (app_settings 'branding') lets a Super Admin rename and
--   recolour the whole system.
-- =============================================================================

alter table public.offices
  add column if not exists display_name  text check (length(display_name) <= 60),
  add column if not exists tagline       text check (length(tagline) <= 120),
  add column if not exists logo_url      text check (length(logo_url) <= 500),
  add column if not exists primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists accent_color  text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists sidebar_color text check (sidebar_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists white_label   boolean not null default false;

grant select (display_name, tagline, logo_url, primary_color, accent_color, sidebar_color, white_label)
  on public.offices to authenticated;

-- Saving branding goes through this function so managers can change only the brand fields.
create or replace function public.set_office_branding(
  p_office uuid, p_display_name text, p_tagline text, p_logo_url text,
  p_primary text, p_accent text, p_sidebar text, p_white_label boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_office(p_office) then
    raise exception 'Only this office''s managers can change its branding' using errcode = '42501';
  end if;
  if p_logo_url is not null and p_logo_url not like '%/storage/v1/object/public/branding/office/' || p_office::text || '/%' then
    raise exception 'Invalid logo';
  end if;
  update offices set
    display_name  = nullif(trim(p_display_name), ''),
    tagline       = nullif(trim(p_tagline), ''),
    logo_url      = p_logo_url,
    primary_color = p_primary,
    accent_color  = p_accent,
    sidebar_color = p_sidebar,
    white_label   = coalesce(p_white_label, false)
  where id = p_office;
  perform write_audit('office_branding_changed', 'office', p_office::text,
    jsonb_build_object('primary', p_primary, 'accent', p_accent, 'sidebar', p_sidebar, 'white_label', p_white_label));
end $$;

-- Platform white-label (Super Admin only).
create or replace function public.set_platform_branding(p_brand jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('super_admin') then
    raise exception 'Only a Super Admin can change platform branding' using errcode = '42501';
  end if;
  insert into app_settings (key, value) values ('branding', coalesce(p_brand, '{}'::jsonb))
  on conflict (key) do update set value = excluded.value;
  perform write_audit('platform_branding_changed', 'app_settings', 'branding', coalesce(p_brand, '{}'::jsonb));
end $$;

do $do$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('branding', 'branding', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
    on conflict (id) do nothing;
    execute $p$create policy "branding public read" on storage.objects for select using (bucket_id = 'branding')$p$;
    execute $p$create policy "branding office upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'branding' and (
        ((storage.foldername(name))[1] = 'office' and public.can_manage_office(((storage.foldername(name))[2])::uuid))
        or ((storage.foldername(name))[1] = 'platform' and public.has_role('super_admin'))))$p$;
  end if;
end
$do$;

revoke execute on function public.set_office_branding(uuid, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.set_office_branding(uuid, text, text, text, text, text, text, boolean) to authenticated;
revoke execute on function public.set_platform_branding(jsonb) from public, anon;
grant execute on function public.set_platform_branding(jsonb) to authenticated;
