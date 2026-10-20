-- Pupmeow · 0006 · adoption listings (free adoption only)

create table public.adoptions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  pet_name text not null check (char_length(pet_name) between 1 and 40),
  species public.species_type not null,
  breed text check (char_length(breed) <= 60),
  age_text text not null check (char_length(age_text) <= 30),
  age_months integer check (age_months between 0 and 360),
  gender public.pet_gender not null default 'unknown',
  vaccinated boolean not null default false,
  neutered boolean not null default false,
  description text not null check (char_length(description) between 20 and 2000),
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) between 1 and 6),
  city text not null default 'Delhi NCR',
  area text not null check (char_length(area) <= 60),
  is_ngo boolean not null default false,
  org_name text check (char_length(org_name) <= 80),
  contact_method public.contact_method not null default 'whatsapp',
  contact_value text not null check (contact_value ~ '^\+?[0-9]{10,13}$'),
  status public.adoption_status not null default 'available',
  adopted_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_ngo or org_name is not null)
);
create index adoptions_list_idx on public.adoptions (status, species, created_at desc) where not is_hidden;
create index adoptions_area_idx on public.adoptions (city, area);
create index adoptions_author_idx on public.adoptions (author_id);
create trigger adoptions_updated_at before update on public.adoptions
  for each row execute function public.set_updated_at();

create or replace function public.adoptions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'available';
    new.is_hidden := false;
    new.adopted_at := null;
  end if;
  if new.status = 'adopted' and (tg_op = 'INSERT' or old.status <> 'adopted') then
    new.adopted_at := now();
  elsif new.status = 'available' then
    new.adopted_at := null;
  end if;
  return new;
end;
$$;
create trigger adoptions_before_write before insert or update on public.adoptions
  for each row execute function public.adoptions_before_write();

alter table public.adoptions enable row level security;

revoke all on public.adoptions from anon, authenticated;
grant select (id, author_id, pet_name, species, breed, age_text, age_months, gender, vaccinated, neutered,
  description, photo_urls, city, area, is_ngo, org_name, contact_method, status, adopted_at, is_hidden,
  created_at, updated_at)
  on public.adoptions to anon, authenticated;
grant insert (author_id, pet_name, species, breed, age_text, age_months, gender, vaccinated, neutered,
  description, photo_urls, city, area, is_ngo, org_name, contact_method, contact_value)
  on public.adoptions to authenticated;
grant update (pet_name, breed, age_text, age_months, gender, vaccinated, neutered, description, photo_urls,
  area, is_ngo, org_name, contact_method, contact_value, status)
  on public.adoptions to authenticated;
grant delete on public.adoptions to authenticated;

create policy "adoptions: public read" on public.adoptions
  for select using (
    (not is_hidden or author_id = auth.uid() or public.is_admin())
    and (auth.uid() is null or not public.is_blocked_between(auth.uid(), author_id))
  );
create policy "adoptions: active users create own" on public.adoptions
  for insert to authenticated with check (author_id = auth.uid() and public.is_active_user());
create policy "adoptions: owner edits" on public.adoptions
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "adoptions: owner or admin deletes" on public.adoptions
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create or replace function public.get_adoption_contact(p_id uuid)
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
    select a.contact_method, a.contact_value
    from public.adoptions a
    where a.id = p_id and not a.is_hidden
      and not public.is_blocked_between(auth.uid(), a.author_id);
end;
$$;
revoke all on function public.get_adoption_contact(uuid) from public, anon;
grant execute on function public.get_adoption_contact(uuid) to authenticated;
