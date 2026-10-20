-- Pupmeow · 0001 · extensions, enums, shared helpers
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Species is an enum so new animals can be added later with:
--   alter type public.species_type add value 'rabbit';
create type public.species_type as enum ('dog', 'cat');
create type public.pet_gender as enum ('male', 'female', 'unknown');
create type public.user_role as enum ('user', 'admin');
create type public.health_record_type as enum ('vaccination', 'medication', 'vet_visit', 'weight');
create type public.lost_found_type as enum ('lost', 'found');
create type public.lost_found_status as enum ('open', 'reunited');
create type public.contact_method as enum ('whatsapp', 'phone');
create type public.adoption_status as enum ('available', 'adopted');
create type public.match_purpose as enum ('playdate', 'breeding', 'both');
create type public.match_status as enum ('pending', 'accepted', 'declined');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.report_target as enum ('post', 'comment', 'profile', 'lost_found', 'adoption', 'match_profile');

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- "#Monsoon #DogsOfDelhi" -> {monsoon, dogsofdelhi}
create or replace function public.extract_hashtags(input text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
  from regexp_matches(coalesce(input, ''), '#([A-Za-z0-9_]{1,40})', 'g') as m;
$$;

create or replace function public.extract_mentions(input text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
  from regexp_matches(coalesce(input, ''), '@([A-Za-z0-9_]{3,20})', 'g') as m;
$$;

-- Pet age in whole months (null when birthday unknown).
create or replace function public.age_in_months(birthday date)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when birthday is null then null
    else (extract(year from age(current_date, birthday)) * 12 + extract(month from age(current_date, birthday)))::int
  end;
$$;
