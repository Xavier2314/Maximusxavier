-- =============================================================================
-- MAXIMUS — 0048 Portfolio media, social links and page design
-- Members upload images, videos and files to their own folder in the public
-- 'portfolio' bucket, add text and video-link blocks, list social profiles,
-- and customise how their page looks.
-- =============================================================================

alter table public.portfolios
  add column if not exists blocks  jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 40),
  add column if not exists socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  add column if not exists design  jsonb not null default '{}'::jsonb check (jsonb_typeof(design) = 'object');
grant update (blocks, socials, design) on public.portfolios to authenticated;

do $do$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('portfolio', 'portfolio', true, 52428800, array[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'text/plain'])
    on conflict (id) do nothing;
    execute $p$create policy "portfolio public read" on storage.objects for select using (bucket_id = 'portfolio')$p$;
    execute $p$create policy "portfolio own write" on storage.objects for insert to authenticated
      with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "portfolio own update" on storage.objects for update to authenticated
      using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "portfolio own delete" on storage.objects for delete to authenticated
      using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $do$;
