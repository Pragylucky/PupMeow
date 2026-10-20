-- Pupmeow · 0003 · pets and private health records

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  species public.species_type not null,
  breed text check (char_length(breed) <= 60),
  gender public.pet_gender not null default 'unknown',
  birthday date check (birthday <= current_date),
  weight_kg numeric(5, 2) check (weight_kg > 0 and weight_kg < 150),
  photo_url text,
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) <= 6),
  bio text check (char_length(bio) <= 300),
  is_neutered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pets_owner_idx on public.pets (owner_id, created_at desc);
create index pets_species_idx on public.pets (species);
create index pets_name_trgm on public.pets using gin (name extensions.gin_trgm_ops);
create index pets_breed_trgm on public.pets using gin (breed extensions.gin_trgm_ops);
create trigger pets_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

create table public.pet_health_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type public.health_record_type not null,
  title text not null check (char_length(title) between 1 and 80),
  date date not null,
  next_due_date date,
  weight_kg numeric(5, 2) check (weight_kg > 0 and weight_kg < 150),
  notes text check (char_length(notes) <= 1000),
  document_url text, -- storage path inside the private "documents" bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_due_date is null or next_due_date >= date),
  check (type <> 'weight' or weight_kg is not null)
);
create index health_pet_idx on public.pet_health_records (pet_id, date desc);
create index health_due_idx on public.pet_health_records (owner_id, next_due_date) where next_due_date is not null;
create trigger health_updated_at before update on public.pet_health_records
  for each row execute function public.set_updated_at();

alter table public.pets enable row level security;
alter table public.pet_health_records enable row level security;

revoke all on public.pets from anon, authenticated;
grant select on public.pets to anon, authenticated;
grant insert, update, delete on public.pets to authenticated;

revoke all on public.pet_health_records from anon, authenticated;
grant select, insert, update, delete on public.pet_health_records to authenticated;

create policy "pets readable unless blocked" on public.pets
  for select using (auth.uid() is null or not public.is_blocked_between(auth.uid(), owner_id));
create policy "owners add pets" on public.pets
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_user());
create policy "owners edit pets" on public.pets
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete pets" on public.pets
  for delete to authenticated using (owner_id = auth.uid());

create policy "health: owner reads" on public.pet_health_records
  for select to authenticated using (owner_id = auth.uid());
create policy "health: owner adds" on public.pet_health_records
  for insert to authenticated with check (
    owner_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid())
  );
create policy "health: owner edits" on public.pet_health_records
  for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));
create policy "health: owner deletes" on public.pet_health_records
  for delete to authenticated using (owner_id = auth.uid());
