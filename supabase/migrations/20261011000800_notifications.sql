-- Pupmeow · 0008 · notifications (+ triggers that create them)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'mention', 'match_request', 'match_accepted', 'match_declined', 'lost_nearby', 'lost_match', 'system')),
  actor_id uuid references public.profiles (id) on delete cascade,
  entity_type text check (entity_type in ('post', 'comment', 'profile', 'lost_found', 'adoption', 'match_request', 'match_profile')),
  entity_id uuid,
  message text not null check (char_length(message) <= 200),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where not is_read;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

create policy "notifications: own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Central helper: respects preferences, blocks and self-actions.
create or replace function public.notify(
  p_user uuid, p_type text, p_actor uuid, p_entity_type text, p_entity_id uuid, p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefs public.profile_private;
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and public.is_blocked_between(p_user, p_actor) then return; end if;
  select * into prefs from public.profile_private where id = p_user;
  if prefs.id is not null then
    if (p_type = 'like' and not prefs.notify_likes)
      or (p_type = 'comment' and not prefs.notify_comments)
      or (p_type = 'follow' and not prefs.notify_follows)
      or (p_type = 'mention' and not prefs.notify_mentions)
      or (p_type in ('match_request', 'match_accepted', 'match_declined') and not prefs.notify_matches)
      or (p_type in ('lost_nearby', 'lost_match') and not prefs.notify_lost_nearby) then
      return;
    end if;
  end if;
  insert into public.notifications (user_id, type, actor_id, entity_type, entity_id, message)
  values (p_user, p_type, p_actor, p_entity_type, p_entity_id, left(p_message, 200));
end;
$$;
revoke all on function public.notify(uuid, text, uuid, text, uuid, text) from public, anon, authenticated;

create or replace function public.on_like_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), 'like', new.user_id, 'post', new.post_id, 'liked your post');
  return null;
end; $$;
create trigger likes_notify after insert on public.likes for each row execute function public.on_like_notify();

create or replace function public.on_comment_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), 'comment', new.author_id, 'post', new.post_id,
    'commented: "' || left(new.body, 80) || '"');
  return null;
end; $$;
create trigger comments_notify after insert on public.comments for each row execute function public.on_comment_notify();

create or replace function public.on_follow_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.following_id, 'follow', new.follower_id, 'profile', new.follower_id, 'started following you');
  return null;
end; $$;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow_notify();

create or replace function public.on_post_mentions_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  for target in
    select p.id from public.profiles p
    where p.username = any (new.mentions)
      and (tg_op = 'INSERT' or not (p.username = any (old.mentions)))
    limit 20
  loop
    perform public.notify(target, 'mention', new.author_id, 'post', new.id, 'mentioned you in a post');
  end loop;
  return null;
end; $$;
create trigger posts_mentions_notify after insert or update of mentions on public.posts
  for each row execute function public.on_post_mentions_notify();

create or replace function public.on_match_request_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  from_name text;
  to_name text;
begin
  select name into from_name from public.pets where id = new.from_pet_id;
  select name into to_name from public.pets where id = new.to_pet_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.to_owner_id, 'match_request', new.from_owner_id, 'match_request', new.id,
      from_name || ' wants a ' || new.purpose::text || ' with ' || to_name);
  elsif new.status = 'accepted' and old.status = 'pending' then
    perform public.notify(new.from_owner_id, 'match_accepted', new.to_owner_id, 'match_request', new.id,
      to_name || '''s owner accepted your ' || new.purpose::text || ' request. Contact details are now shared.');
  elsif new.status = 'declined' and old.status = 'pending' then
    perform public.notify(new.from_owner_id, 'match_declined', new.to_owner_id, 'match_request', new.id,
      to_name || '''s owner declined your request');
  end if;
  return null;
end; $$;
create trigger match_requests_notify after insert or update of status on public.match_requests
  for each row execute function public.on_match_request_notify();

-- New LOST pet → alert people who live in the same area.
create or replace function public.on_lost_nearby_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if new.type <> 'lost' then return null; end if;
  for target in
    select pp.id from public.profile_private pp
    join public.profiles p on p.id = pp.id
    where lower(pp.home_area) = lower(new.last_seen_area)
      and pp.notify_lost_nearby and not p.is_banned and pp.id <> new.author_id
    limit 1000
  loop
    perform public.notify(target, 'lost_nearby', new.author_id, 'lost_found', new.id,
      'Lost ' || new.species::text || ' near you: ' || coalesce(new.pet_name, 'unnamed') || ', last seen in ' || new.last_seen_area);
  end loop;
  return null;
end; $$;
create trigger lost_found_nearby_notify after insert on public.lost_found
  for each row execute function public.on_lost_nearby_notify();

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set is_read = true where user_id = auth.uid() and not is_read;
$$;
grant execute on function public.mark_all_notifications_read() to authenticated;
