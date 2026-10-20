-- Pupmeow · 0014 · helpers for profile pages and settings

-- People I have blocked (their profiles are otherwise hidden from me by RLS).
create or replace function public.my_blocked_users()
returns table (id uuid, username text, display_name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
revoke all on function public.my_blocked_users() from public, anon;
grant execute on function public.my_blocked_users() to authenticated;

-- Follower / following / post counts for a profile header.
create or replace function public.profile_stats(p_user uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'followers', (select count(*) from public.follows where following_id = p_user),
    'following', (select count(*) from public.follows where follower_id = p_user),
    'posts', (select count(*) from public.posts where author_id = p_user and not is_hidden),
    'pets', (select count(*) from public.pets where owner_id = p_user)
  );
$$;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
