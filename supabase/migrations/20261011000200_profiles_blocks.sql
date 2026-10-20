-- Pupmeow · 0002 · profiles, private profile data, blocks, auth helpers

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 50),
  avatar_url text,
  city text not null default 'Delhi NCR',
  area text check (char_length(area) <= 60),
  bio text check (char_length(bio) <= 200),
  role public.user_role not null default 'user',
  is_banned boolean not null default false,
  hide_area boolean not null default false,
  species_pref text not null default 'both' check (species_pref in ('dog', 'cat', 'both')),
  onboarded boolean not null default false,
  ai_messages_today integer not null default 0,
  ai_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.area is 'Public area. NULL when hide_area is on; the real area lives in profile_private.home_area.';

-- Private per-user data: never readable by anyone but the owner.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  home_area text check (char_length(home_area) <= 60),
  whatsapp text check (whatsapp ~ '^\+?[0-9]{10,13}$'),
  notify_likes boolean not null default true,
  notify_comments boolean not null default true,
  notify_follows boolean not null default true,
  notify_mentions boolean not null default true,
  notify_matches boolean not null default true,
  notify_lost_nearby boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- ---------- helpers (security definer so policies can call them cheaply) ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and not p.is_banned
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_banned);
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Create a profile row when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.profile_private (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Blocking removes follows in both directions.
create or replace function public.on_block_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;
-- (trigger attached in 0004 after follows exists)

-- Username availability without exposing anything else.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,20}$'
    and lower(p_username) not in ('admin', 'pupmeow', 'support', 'help', 'settings', 'login', 'api', 'feed', 'lost', 'adopt', 'match')
    and not exists (select 1 from public.profiles where username = lower(p_username) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- AI usage counter (own row only).
create or replace function public.my_ai_usage()
returns table (used integer, reset_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.ai_messages_today, p.ai_reset_at from public.profiles p where p.id = auth.uid();
$$;

-- ---------- privileges ----------
-- Column-level grants: users may only edit safe columns; AI counters are not readable by others.
revoke all on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, city, area, bio, role, is_banned, hide_area, species_pref, onboarded, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, city, area, bio, hide_area, species_pref, onboarded)
  on public.profiles to authenticated;

revoke all on public.profile_private from anon, authenticated;
grant select on public.profile_private to authenticated;
grant update (home_area, whatsapp, notify_likes, notify_comments, notify_follows, notify_mentions, notify_matches, notify_lost_nearby)
  on public.profile_private to authenticated;

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.blocks enable row level security;

create policy "profiles readable unless blocked" on public.profiles
  for select using (auth.uid() is null or not public.is_blocked_between(auth.uid(), id));
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own private data readable" on public.profile_private
  for select to authenticated using (id = auth.uid());
create policy "own private data editable" on public.profile_private
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "see own blocks" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "create own blocks" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid() and public.is_active_user());
create policy "remove own blocks" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

create index profiles_username_trgm on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_display_name_trgm on public.profiles using gin (display_name extensions.gin_trgm_ops);
create index profiles_created_idx on public.profiles (created_at desc);
