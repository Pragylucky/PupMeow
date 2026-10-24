-- PM-001: Enforce no-sale + own Storage photo URLs on direct client writes.
-- PM-002: Rate-limit contact reveals (anti-scraping).

-- ---------- sale language (matches src/lib/validations/listings.ts SALE_PATTERN) ----------
create or replace function public.text_mentions_animal_sale(p_text text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(p_text, '') ~* '(₹\s?\d|rs\.?\s?\d|\binr\b|\d+\s?(?:k|000)\s?(?:rs|rupees)|\bprice\b|\bfor sale\b|\bselling\b|\brehoming fee\b|\bstud fee\b|\bpaid adoption\b)';
$$;

-- ---------- photo URLs must be this user's object in the given public bucket ----------
create or replace function public.assert_photo_urls_own_storage(p_urls text[], p_bucket text, p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  u text;
  path_re text;
begin
  if p_urls is null or cardinality(p_urls) = 0 then
    return;
  end if;
  path_re := '^https?://[^/]+/storage/v1/object/public/' || p_bucket || '/' || p_user_id::text || '/';
  foreach u in array p_urls loop
    if u is null or length(trim(u)) = 0 then
      raise exception 'Photo URL is required.' using errcode = '23514';
    end if;
    if u !~ path_re then
      raise exception 'Photos must be uploaded from your account (invalid storage path).' using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function public.assert_single_photo_own_storage(p_url text, p_bucket text, p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_url is null or length(trim(p_url)) = 0 then
    return;
  end if;
  perform public.assert_photo_urls_own_storage(array[p_url], p_bucket, p_user_id);
end;
$$;

-- ---------- table guards ----------
create or replace function public.guard_adoptions_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.text_mentions_animal_sale(coalesce(new.description, '') || ' ' || coalesce(new.age_text, '')) then
    raise exception 'Listings cannot mention a price or fee. Pupmeow is for free adoption only.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'adoptions', new.author_id);
  return new;
end; $$;

create or replace function public.guard_lost_found_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'lost-found', new.author_id);
  return new;
end; $$;

create or replace function public.guard_match_profiles_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.text_mentions_animal_sale(new.about) then
    raise exception 'No prices or stud fees on match profiles.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'matchmaking', new.owner_id);
  return new;
end; $$;

create or replace function public.guard_match_requests_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.message is not null and public.text_mentions_animal_sale(new.message) then
    raise exception 'No prices or stud fees in match messages.' using errcode = '23514';
  end if;
  return new;
end; $$;

create or replace function public.guard_posts_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.text_mentions_animal_sale(new.caption) then
    raise exception 'Posts cannot mention selling animals or fees for animals.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.image_urls, 'posts', new.author_id);
  return new;
end; $$;

create or replace function public.guard_pets_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'pets', new.owner_id);
  perform public.assert_single_photo_own_storage(new.photo_url, 'pets', new.owner_id);
  return new;
end; $$;

drop trigger if exists adoptions_content_guard on public.adoptions;
create trigger adoptions_content_guard before insert or update on public.adoptions
  for each row execute function public.guard_adoptions_write();

drop trigger if exists lost_found_content_guard on public.lost_found;
create trigger lost_found_content_guard before insert or update on public.lost_found
  for each row execute function public.guard_lost_found_write();

drop trigger if exists match_profiles_content_guard on public.pet_match_profiles;
create trigger match_profiles_content_guard before insert or update on public.pet_match_profiles
  for each row execute function public.guard_match_profiles_write();

drop trigger if exists match_requests_content_guard on public.match_requests;
create trigger match_requests_content_guard before insert or update on public.match_requests
  for each row execute function public.guard_match_requests_write();

drop trigger if exists posts_content_guard on public.posts;
create trigger posts_content_guard before insert or update on public.posts
  for each row execute function public.guard_posts_write();

drop trigger if exists pets_content_guard on public.pets;
create trigger pets_content_guard before insert or update on public.pets
  for each row execute function public.guard_pets_write();

-- ---------- contact reveal limits ----------
create table if not exists public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('adoption', 'lost_found', 'match')),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists contact_reveals_user_created_idx on public.contact_reveals (user_id, created_at desc);

alter table public.contact_reveals enable row level security;
revoke all on public.contact_reveals from anon, authenticated;

create or replace function public.assert_contact_reveal_allowed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  joined timestamptz;
  recent integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in to see contact details.' using errcode = '42501';
  end if;
  select p.created_at into joined from public.profiles p where p.id = auth.uid();
  if joined is null then
    raise exception 'Complete your profile first.' using errcode = '42501';
  end if;
  if joined > now() - interval '24 hours' then
    raise exception 'New accounts can view contacts after 24 hours. This helps protect owners from scrapers.' using errcode = '42501';
  end if;
  select count(*)::integer into recent
    from public.contact_reveals
    where user_id = auth.uid() and created_at > now() - interval '1 day';
  if recent >= 15 then
    raise exception 'Daily contact limit reached (15). Try again tomorrow.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.log_contact_reveal(p_kind text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contact_reveals (user_id, target_kind, target_id)
  values (auth.uid(), p_kind, p_target_id);
end;
$$;

create or replace function public.get_adoption_contact(p_id uuid)
returns table (contact_method public.contact_method, contact_value text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_contact_reveal_allowed();
  if not exists (
    select 1 from public.adoptions a
    where a.id = p_id and not a.is_hidden
      and not public.is_blocked_between(auth.uid(), a.author_id)
  ) then
    return;
  end if;
  perform public.log_contact_reveal('adoption', p_id);
  return query
    select a.contact_method, a.contact_value
    from public.adoptions a
    where a.id = p_id and not a.is_hidden
      and not public.is_blocked_between(auth.uid(), a.author_id);
end;
$$;

create or replace function public.get_lost_found_contact(p_id uuid)
returns table (contact_method public.contact_method, contact_value text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_contact_reveal_allowed();
  if not exists (
    select 1 from public.lost_found lf
    where lf.id = p_id and not lf.is_hidden
      and not public.is_blocked_between(auth.uid(), lf.author_id)
  ) then
    return;
  end if;
  perform public.log_contact_reveal('lost_found', p_id);
  return query
    select lf.contact_method, lf.contact_value
    from public.lost_found lf
    where lf.id = p_id and not lf.is_hidden
      and not public.is_blocked_between(auth.uid(), lf.author_id);
end;
$$;

create or replace function public.get_match_contact(p_request_id uuid)
returns table (username text, display_name text, whatsapp text)
language plpgsql
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
  perform public.assert_contact_reveal_allowed();
  other := case when auth.uid() = r.from_owner_id then r.to_owner_id else r.from_owner_id end;
  perform public.log_contact_reveal('match', p_request_id);
  return query
    select p.username, p.display_name, pp.whatsapp
    from public.profiles p join public.profile_private pp on pp.id = p.id
    where p.id = other;
end;
$$;
