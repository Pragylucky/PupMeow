-- Pupmeow · 0004 · posts, likes, comments, follows

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete set null,
  species public.species_type, -- from tagged pet, or chosen; NULL = general (shows for both)
  caption text not null default '' check (char_length(caption) <= 1000),
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 6),
  hashtags text[] not null default '{}',
  mentions text[] not null default '{}',
  city text,
  area text,
  is_hidden boolean not null default false,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(caption) > 0 or cardinality(image_urls) > 0)
);
create index posts_feed_idx on public.posts (created_at desc, id desc) where not is_hidden;
create index posts_city_idx on public.posts (city, created_at desc);
create index posts_area_idx on public.posts (area, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_pet_idx on public.posts (pet_id, created_at desc);
create index posts_hashtags_idx on public.posts using gin (hashtags);
create index posts_caption_trgm on public.posts using gin (caption extensions.gin_trgm_ops);

create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index likes_user_idx on public.likes (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
create trigger blocks_remove_follows after insert on public.blocks
  for each row execute function public.on_block_created();

-- Derive hashtags/mentions/species and stop clients from tampering with counters.
create or replace function public.posts_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pet_species public.species_type;
begin
  new.hashtags := public.extract_hashtags(new.caption);
  new.mentions := public.extract_mentions(new.caption);
  if new.pet_id is not null then
    select p.species into pet_species from public.pets p where p.id = new.pet_id and p.owner_id = new.author_id;
    if pet_species is null then
      raise exception 'You can only tag your own pets.';
    end if;
    new.species := pet_species;
  end if;
  if tg_op = 'INSERT' then
    new.like_count := 0;
    new.comment_count := 0;
    new.is_hidden := false;
  end if;
  return new;
end;
$$;
create trigger posts_before_write before insert or update of caption, pet_id on public.posts
  for each row execute function public.posts_before_write();

-- Keep like_count / comment_count in sync.
create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
create trigger likes_count after insert or delete on public.likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not new.is_hidden then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and not old.is_hidden then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' and old.is_hidden <> new.is_hidden then
    update public.posts
      set comment_count = greatest(comment_count + case when new.is_hidden then -1 else 1 end, 0)
      where id = new.post_id;
  end if;
  return null;
end;
$$;
create trigger comments_count after insert or delete or update of is_hidden on public.comments
  for each row execute function public.sync_comment_count();

-- ---------- privileges ----------
revoke all on public.posts from anon, authenticated;
grant select on public.posts to authenticated;
grant insert (author_id, pet_id, species, caption, image_urls, city, area) on public.posts to authenticated;
grant update (caption, pet_id, species) on public.posts to authenticated;
grant delete on public.posts to authenticated;

revoke all on public.likes from anon, authenticated;
grant select, insert, delete on public.likes to authenticated;

revoke all on public.comments from anon, authenticated;
grant select, delete on public.comments to authenticated;
grant insert (post_id, author_id, body) on public.comments to authenticated;

revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- ---------- RLS ----------
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

create policy "posts: members read visible posts" on public.posts
  for select to authenticated using (
    (not is_hidden or author_id = auth.uid() or public.is_admin())
    and not public.is_blocked_between(auth.uid(), author_id)
  );
create policy "posts: active users create own" on public.posts
  for insert to authenticated with check (author_id = auth.uid() and public.is_active_user());
create policy "posts: authors edit own" on public.posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "posts: authors or admins delete" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "likes: read on visible posts" on public.likes
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id)
    and not public.is_blocked_between(auth.uid(), user_id)
  );
create policy "likes: like as self" on public.likes
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "likes: unlike own" on public.likes
  for delete to authenticated using (user_id = auth.uid());

create policy "comments: read visible" on public.comments
  for select to authenticated using (
    (not is_hidden or author_id = auth.uid() or public.is_admin())
    and not public.is_blocked_between(auth.uid(), author_id)
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "comments: add as self" on public.comments
  for insert to authenticated with check (
    author_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden)
  );
create policy "comments: author, post owner or admin deletes" on public.comments
  for delete to authenticated using (
    author_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

create policy "follows: readable" on public.follows for select using (true);
create policy "follows: follow as self" on public.follows
  for insert to authenticated with check (
    follower_id = auth.uid() and public.is_active_user()
    and not public.is_blocked_between(follower_id, following_id)
  );
create policy "follows: unfollow own" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
