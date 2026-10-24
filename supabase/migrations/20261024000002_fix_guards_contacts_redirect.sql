-- Fix sale regex (\b is backspace in Postgres; use \y word boundaries).
-- Contact: lost open listings for new accounts (3/day); hide contacts when closed.
-- Posts guard: only when caption / image_urls change (likes update like_count only).

create or replace function public.text_mentions_animal_sale(p_text text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(p_text, '') ~* E'(₹\\s?\\d|\\mrs\\.?\\s*\\d|\\minr\\M|\\d+\\s?(?:k|000)\\s?(?:rs|rupees)|\\yprice\\y|\\yfor\\s+sale\\y|\\yselling\\y|\\ysell\\y|\\yrehoming fee\\y|\\ystud fee\\y|\\ypaid adoption\\y|price\\s*\\d)';
$$;

create or replace function public.guard_posts_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.caption is not distinct from old.caption
       and new.image_urls is not distinct from old.image_urls then
      return new;
    end if;
  end if;
  if public.text_mentions_animal_sale(new.caption) then
    raise exception 'Posts cannot mention selling animals or fees for animals.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.image_urls, 'posts', new.author_id);
  return new;
end; $$;

create or replace function public.guard_adoptions_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.description is not distinct from old.description
       and new.age_text is not distinct from old.age_text
       and new.photo_urls is not distinct from old.photo_urls then
      return new;
    end if;
  end if;
  if public.text_mentions_animal_sale(coalesce(new.description, '') || ' ' || coalesce(new.age_text, '')) then
    raise exception 'Listings cannot mention a price or fee. Pupmeow is for free adoption only.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'adoptions', new.author_id);
  return new;
end; $$;

create or replace function public.guard_lost_found_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.photo_urls is not distinct from old.photo_urls
       and new.description is not distinct from old.description then
      return new;
    end if;
  end if;
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'lost-found', new.author_id);
  return new;
end; $$;

create or replace function public.guard_match_profiles_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.about is not distinct from old.about
       and new.photo_urls is not distinct from old.photo_urls then
      return new;
    end if;
  end if;
  if public.text_mentions_animal_sale(new.about) then
    raise exception 'No prices or stud fees on match profiles.' using errcode = '23514';
  end if;
  perform public.assert_photo_urls_own_storage(new.photo_urls, 'matchmaking', new.owner_id);
  return new;
end; $$;

drop function if exists public.assert_contact_reveal_allowed();

-- Adoption + match: 24h account age + 15/day global. Lost open: new accounts OK, 3 lost contacts/day.
create or replace function public.assert_contact_reveal_allowed(p_kind text default 'adoption')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  joined timestamptz;
  recent_all integer;
  recent_lost integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in to see contact details.' using errcode = '42501';
  end if;
  select p.created_at into joined from public.profiles p where p.id = auth.uid();
  if joined is null then
    raise exception 'Complete your profile first.' using errcode = '42501';
  end if;

  if p_kind = 'lost_found' then
    select count(*)::integer into recent_lost
      from public.contact_reveals
      where user_id = auth.uid()
        and target_kind = 'lost_found'
        and created_at > now() - interval '1 day';
    if recent_lost >= 3 then
      raise exception 'You can view up to 3 lost-pet contacts per day on a new account. Try again tomorrow.' using errcode = '42501';
    end if;
    return;
  end if;

  if joined > now() - interval '24 hours' then
    raise exception 'New accounts can view adoption and match contacts after 24 hours. This helps protect owners from scrapers.' using errcode = '42501';
  end if;
  select count(*)::integer into recent_all
    from public.contact_reveals
    where user_id = auth.uid() and created_at > now() - interval '1 day';
  if recent_all >= 15 then
    raise exception 'Daily contact limit reached (15). Try again tomorrow.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_adoption_contact(p_id uuid)
returns table (contact_method public.contact_method, contact_value text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_contact_reveal_allowed('adoption');
  if not exists (
    select 1 from public.adoptions a
    where a.id = p_id and not a.is_hidden and a.status = 'available'
      and not public.is_blocked_between(auth.uid(), a.author_id)
  ) then
    return;
  end if;
  perform public.log_contact_reveal('adoption', p_id);
  return query
    select a.contact_method, a.contact_value
    from public.adoptions a
    where a.id = p_id and not a.is_hidden and a.status = 'available'
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
  perform public.assert_contact_reveal_allowed('lost_found');
  if not exists (
    select 1 from public.lost_found lf
    where lf.id = p_id and not lf.is_hidden and lf.status = 'open'
      and not public.is_blocked_between(auth.uid(), lf.author_id)
  ) then
    return;
  end if;
  perform public.log_contact_reveal('lost_found', p_id);
  return query
    select lf.contact_method, lf.contact_value
    from public.lost_found lf
    where lf.id = p_id and not lf.is_hidden and lf.status = 'open'
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
  perform public.assert_contact_reveal_allowed('match');
  other := case when auth.uid() = r.from_owner_id then r.to_owner_id else r.from_owner_id end;
  perform public.log_contact_reveal('match', p_request_id);
  return query
    select p.username, p.display_name, pp.whatsapp
    from public.profiles p join public.profile_private pp on pp.id = p.id
    where p.id = other;
end;
$$;

alter table public.ai_usage_log drop constraint if exists ai_usage_log_kind_check;
alter table public.ai_usage_log add constraint ai_usage_log_kind_check
  check (kind in ('chat', 'vision', 'write', 'health', 'moderation'));

-- Per-user daily cap on LLM moderation calls (heuristics always run).
create or replace function public.consume_moderation_llm(p_limit integer default 40)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.' using errcode = '42501';
  end if;
  select count(*)::integer into used
    from public.ai_usage_log
    where user_id = auth.uid()
      and kind = 'moderation'
      and created_at > now() - interval '1 day';
  if used >= p_limit then
    raise exception 'RATE_LIMIT: Too many moderation checks today. Try again tomorrow.' using errcode = '42501';
  end if;
  insert into public.ai_usage_log (user_id, kind) values (auth.uid(), 'moderation');
  return greatest(p_limit - used - 1, 0);
end;
$$;

revoke all on function public.consume_moderation_llm(integer) from public, anon;
grant execute on function public.consume_moderation_llm(integer) to authenticated;
