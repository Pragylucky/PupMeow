-- Pupmeow · 0005 · lost & found (public share pages; contact never exposed to anonymous users)

create table public.lost_found (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  type public.lost_found_type not null,
  pet_name text check (char_length(pet_name) <= 40),
  species public.species_type not null,
  breed text check (char_length(breed) <= 60),
  color text check (char_length(color) <= 60),
  gender public.pet_gender not null default 'unknown',
  description text not null check (char_length(description) between 10 and 1500),
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) between 1 and 6),
  last_seen_area text not null check (char_length(last_seen_area) <= 60),
  landmark text check (char_length(landmark) <= 120),
  last_seen_date timestamptz not null,
  contact_method public.contact_method not null default 'whatsapp',
  contact_value text not null check (contact_value ~ '^\+?[0-9]{10,13}$'),
  reward_text text check (char_length(reward_text) <= 80),
  status public.lost_found_status not null default 'open',
  reunited_at timestamptz,
  city text not null default 'Delhi NCR',
  is_hidden boolean not null default false,
  ai_description text,
  image_embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (last_seen_date <= now() + interval '1 day')
);
create index lost_found_list_idx on public.lost_found (status, type, created_at desc) where not is_hidden;
create index lost_found_area_idx on public.lost_found (city, last_seen_area);
create index lost_found_species_idx on public.lost_found (species, status);
create index lost_found_author_idx on public.lost_found (author_id);
create index lost_found_embedding_idx on public.lost_found
  using hnsw (image_embedding extensions.vector_cosine_ops);
create trigger lost_found_updated_at before update on public.lost_found
  for each row execute function public.set_updated_at();

create or replace function public.lost_found_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open';
    new.is_hidden := false;
    new.reunited_at := null;
  end if;
  if new.status = 'reunited' and (tg_op = 'INSERT' or old.status <> 'reunited') then
    new.reunited_at := now();
  elsif new.status = 'open' then
    new.reunited_at := null;
  end if;
  return new;
end;
$$;
create trigger lost_found_before_write before insert or update on public.lost_found
  for each row execute function public.lost_found_before_write();

alter table public.lost_found enable row level security;

-- contact_value, ai_description and image_embedding are NOT selectable by clients.
revoke all on public.lost_found from anon, authenticated;
grant select (id, author_id, type, pet_name, species, breed, color, gender, description, photo_urls,
  last_seen_area, landmark, last_seen_date, contact_method, reward_text, status, reunited_at, city,
  is_hidden, created_at, updated_at)
  on public.lost_found to anon, authenticated;
grant insert (author_id, type, pet_name, species, breed, color, gender, description, photo_urls,
  last_seen_area, landmark, last_seen_date, contact_method, contact_value, reward_text, city)
  on public.lost_found to authenticated;
grant update (pet_name, breed, color, description, photo_urls, landmark, reward_text, contact_method, contact_value, status)
  on public.lost_found to authenticated;
grant delete on public.lost_found to authenticated;

create policy "lost_found: public read" on public.lost_found
  for select using (
    (not is_hidden or author_id = auth.uid() or public.is_admin())
    and (auth.uid() is null or not public.is_blocked_between(auth.uid(), author_id))
  );
create policy "lost_found: active users create own" on public.lost_found
  for insert to authenticated with check (author_id = auth.uid() and public.is_active_user());
create policy "lost_found: owner edits" on public.lost_found
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "lost_found: owner or admin deletes" on public.lost_found
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Contact is revealed only to signed-in, non-banned, non-blocked users.
create or replace function public.get_lost_found_contact(p_id uuid)
returns table (contact_method public.contact_method, contact_value text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in to see contact details.' using errcode = '42501';
  end if;
  return query
    select lf.contact_method, lf.contact_value
    from public.lost_found lf
    where lf.id = p_id and not lf.is_hidden
      and not public.is_blocked_between(auth.uid(), lf.author_id);
end;
$$;
revoke all on function public.get_lost_found_contact(uuid) from public, anon;
grant execute on function public.get_lost_found_contact(uuid) to authenticated;
