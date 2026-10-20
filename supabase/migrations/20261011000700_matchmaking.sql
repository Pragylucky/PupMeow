-- Pupmeow · 0007 · pet matchmaking (playdates & breeding, no payments)

create table public.pet_match_profiles (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  looking_for public.match_purpose not null,
  has_papers boolean not null default false,
  health_confirmed boolean not null check (health_confirmed),
  about text not null check (char_length(about) between 10 and 500),
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) between 1 and 6),
  area text not null check (char_length(area) <= 60),
  health_doc_path text, -- path in the private "documents" bucket; only the owner can read the file
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index match_profiles_browse_idx on public.pet_match_profiles (is_active, created_at desc) where not is_hidden;
create index match_profiles_owner_idx on public.pet_match_profiles (owner_id);
create trigger match_profiles_updated_at before update on public.pet_match_profiles
  for each row execute function public.set_updated_at();

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  from_pet_id uuid not null references public.pets (id) on delete cascade,
  to_pet_id uuid not null references public.pets (id) on delete cascade,
  from_owner_id uuid not null references public.profiles (id) on delete cascade,
  to_owner_id uuid not null references public.profiles (id) on delete cascade,
  purpose public.match_purpose not null default 'playdate',
  message text check (char_length(message) <= 300),
  status public.match_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_pet_id, to_pet_id),
  check (from_pet_id <> to_pet_id),
  check (purpose <> 'both')
);
create index match_requests_to_idx on public.match_requests (to_owner_id, status, created_at desc);
create index match_requests_from_idx on public.match_requests (from_owner_id, status, created_at desc);
create trigger match_requests_updated_at before update on public.match_requests
  for each row execute function public.set_updated_at();

-- Minimum breeding age: dogs 18 months, cats 12 months.
create or replace function public.breeding_age_ok(p_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.age_in_months(p.birthday) >= case p.species when 'dog' then 18 when 'cat' then 12 else 18 end
    from public.pets p where p.id = p_pet_id
  ), false);
$$;

create or replace function public.match_profiles_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.pets p where p.id = new.pet_id and p.owner_id = new.owner_id) then
    raise exception 'You can only create a match profile for your own pet.';
  end if;
  if new.looking_for in ('breeding', 'both') and not public.breeding_age_ok(new.pet_id) then
    raise exception 'BREEDING_AGE: Breeding needs a birthday on the pet profile and a minimum age of 18 months for dogs or 12 months for cats.';
  end if;
  if tg_op = 'INSERT' then
    new.is_hidden := false;
  end if;
  return new;
end;
$$;
create trigger match_profiles_before_write before insert or update on public.pet_match_profiles
  for each row execute function public.match_profiles_before_write();

create or replace function public.match_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_pet public.pets;
  to_pet public.pets;
  target public.pet_match_profiles;
begin
  select * into from_pet from public.pets where id = new.from_pet_id;
  select * into to_pet from public.pets where id = new.to_pet_id;
  if from_pet.id is null or from_pet.owner_id <> new.from_owner_id then
    raise exception 'Choose one of your own pets.';
  end if;
  if to_pet.id is null then
    raise exception 'That pet is no longer available.';
  end if;
  if to_pet.owner_id = new.from_owner_id then
    raise exception 'You cannot send a request to your own pet.';
  end if;
  if from_pet.species <> to_pet.species then
    raise exception 'Matches are only between pets of the same species.';
  end if;
  select * into target from public.pet_match_profiles where pet_id = new.to_pet_id;
  if target.id is null or not target.is_active or target.is_hidden then
    raise exception 'This pet is not open to matches right now.';
  end if;
  if new.purpose = 'breeding' then
    if target.looking_for = 'playdate' then
      raise exception 'This pet is only open to playdates.';
    end if;
    if not public.breeding_age_ok(new.from_pet_id) or not public.breeding_age_ok(new.to_pet_id) then
      raise exception 'BREEDING_AGE: Both pets must meet the minimum breeding age (dogs 18 months, cats 12 months).';
    end if;
    if from_pet.gender = to_pet.gender or from_pet.gender = 'unknown' or to_pet.gender = 'unknown' then
      raise exception 'Breeding requests need one male and one female pet with genders set.';
    end if;
  elsif target.looking_for = 'breeding' then
    raise exception 'This pet is only open to breeding requests.';
  end if;
  if public.is_blocked_between(new.from_owner_id, to_pet.owner_id) then
    raise exception 'This pet is not open to matches right now.';
  end if;
  new.to_owner_id := to_pet.owner_id;
  new.status := 'pending';
  new.responded_at := null;
  return new;
end;
$$;
create trigger match_requests_before_insert before insert on public.match_requests
  for each row execute function public.match_requests_before_insert();

create or replace function public.match_requests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' then
    raise exception 'This request has already been answered.';
  end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'Invalid status.';
  end if;
  new.responded_at := now();
  return new;
end;
$$;
create trigger match_requests_before_update before update of status on public.match_requests
  for each row execute function public.match_requests_before_update();

alter table public.pet_match_profiles enable row level security;
alter table public.match_requests enable row level security;

revoke all on public.pet_match_profiles from anon, authenticated;
grant select on public.pet_match_profiles to authenticated;
grant insert (pet_id, owner_id, looking_for, has_papers, health_confirmed, about, photo_urls, area, health_doc_path, is_active)
  on public.pet_match_profiles to authenticated;
grant update (looking_for, has_papers, health_confirmed, about, photo_urls, area, health_doc_path, is_active)
  on public.pet_match_profiles to authenticated;
grant delete on public.pet_match_profiles to authenticated;

revoke all on public.match_requests from anon, authenticated;
grant select on public.match_requests to authenticated;
grant insert (from_pet_id, to_pet_id, from_owner_id, to_owner_id, purpose, message) on public.match_requests to authenticated;
grant update (status) on public.match_requests to authenticated;
grant delete on public.match_requests to authenticated;

create policy "match profiles: members browse active" on public.pet_match_profiles
  for select to authenticated using (
    owner_id = auth.uid() or public.is_admin()
    or (is_active and not is_hidden and not public.is_blocked_between(auth.uid(), owner_id))
  );
create policy "match profiles: owner creates" on public.pet_match_profiles
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_user());
create policy "match profiles: owner edits" on public.pet_match_profiles
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "match profiles: owner or admin deletes" on public.pet_match_profiles
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

create policy "match requests: parties read" on public.match_requests
  for select to authenticated using (from_owner_id = auth.uid() or to_owner_id = auth.uid());
create policy "match requests: send as self" on public.match_requests
  for insert to authenticated with check (from_owner_id = auth.uid() and public.is_active_user());
create policy "match requests: recipient answers" on public.match_requests
  for update to authenticated using (to_owner_id = auth.uid()) with check (to_owner_id = auth.uid());
create policy "match requests: sender cancels pending" on public.match_requests
  for delete to authenticated using (from_owner_id = auth.uid() and status = 'pending');

-- Accepted matches reveal each owner's WhatsApp to the other.
create or replace function public.get_match_contact(p_request_id uuid)
returns table (username text, display_name text, whatsapp text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.match_requests;
  other uuid;
begin
  select * into r from public.match_requests where id = p_request_id;
  if r.id is null or r.status <> 'accepted' or auth.uid() not in (r.from_owner_id, r.to_owner_id) then
    raise exception 'Contact is shared only after a match is accepted.' using errcode = '42501';
  end if;
  other := case when auth.uid() = r.from_owner_id then r.to_owner_id else r.from_owner_id end;
  return query
    select p.username, p.display_name, pp.whatsapp
    from public.profiles p join public.profile_private pp on pp.id = p.id
    where p.id = other;
end;
$$;
revoke all on function public.get_match_contact(uuid) from public, anon;
grant execute on function public.get_match_contact(uuid) to authenticated;
