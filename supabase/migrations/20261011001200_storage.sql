-- Pupmeow · 0012 · storage buckets and policies
-- Files must live in a folder named after the uploader's user id: <bucket>/<user-id>/<file>
-- 5 MB max. Images only, except "documents" which also accepts PDF. "documents" is private.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('pets', 'pets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('posts', 'posts', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('lost-found', 'lost-found', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('adoptions', 'adoptions', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('matchmaking', 'matchmaking', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('documents', 'documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "pm public buckets readable" on storage.objects
  for select using (bucket_id in ('avatars', 'pets', 'posts', 'lost-found', 'adoptions', 'matchmaking'));

create policy "pm upload into own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('avatars', 'pets', 'posts', 'lost-found', 'adoptions', 'matchmaking', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy "pm update own files" on storage.objects
  for update to authenticated using (
    bucket_id in ('avatars', 'pets', 'posts', 'lost-found', 'adoptions', 'matchmaking', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check ((storage.foldername(name))[1] = auth.uid()::text);

create policy "pm delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('avatars', 'pets', 'posts', 'lost-found', 'adoptions', 'matchmaking', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pm documents owner reads" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
