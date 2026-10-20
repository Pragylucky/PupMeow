-- Pupmeow · 0009 · AI assistant conversations, usage limits, lost & found matching

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 80),
  pet_id uuid references public.pets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create table public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('chat', 'vision', 'write', 'health')),
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_log enable row level security;

revoke all on public.ai_conversations from anon, authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
revoke all on public.ai_messages from anon, authenticated;
grant select, insert, delete on public.ai_messages to authenticated;
revoke all on public.ai_usage_log from anon, authenticated;
grant select on public.ai_usage_log to authenticated;

create policy "ai conversations: owner only" on public.ai_conversations
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_active_user()
    and (pet_id is null or exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid())));
create policy "ai messages: owner reads" on public.ai_messages
  for select to authenticated using (user_id = auth.uid());
create policy "ai messages: owner writes" on public.ai_messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "ai messages: owner deletes" on public.ai_messages
  for delete to authenticated using (user_id = auth.uid());
create policy "ai usage: owner reads" on public.ai_usage_log
  for select to authenticated using (user_id = auth.uid());

-- Atomically spend one AI message from today's budget (resets at midnight IST).
create or replace function public.consume_ai_message(p_kind text, p_limit integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata';
  used integer;
  reset timestamptz;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in to use Pupmeow AI.' using errcode = '42501';
  end if;
  select ai_messages_today, ai_reset_at into used, reset from public.profiles where id = auth.uid() for update;
  if reset < today_start then
    used := 0;
  end if;
  if used >= least(p_limit, 30) then
    raise exception 'RATE_LIMIT: You have used all % AI messages for today. They reset at midnight.', least(p_limit, 30);
  end if;
  update public.profiles set ai_messages_today = used + 1, ai_reset_at = now() where id = auth.uid();
  insert into public.ai_usage_log (user_id, kind) values (auth.uid(), p_kind);
  return least(p_limit, 30) - used - 1;
end;
$$;
revoke all on function public.consume_ai_message(text, integer) from public, anon;
grant execute on function public.consume_ai_message(text, integer) to authenticated;

-- Ranked possible matches for a FOUND post among OPEN LOST posts of the same species.
create or replace function public.match_lost_found(p_found_id uuid, p_limit integer default 6)
returns table (
  id uuid, pet_name text, species public.species_type, breed text, color text, photo_urls text[],
  last_seen_area text, last_seen_date timestamptz, author_id uuid, similarity double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  src public.lost_found;
begin
  if auth.uid() is null then
    raise exception 'Sign in to see possible matches.' using errcode = '42501';
  end if;
  select * into src from public.lost_found where lost_found.id = p_found_id;
  if src.id is null or src.image_embedding is null then
    return;
  end if;
  return query
    select l.id, l.pet_name, l.species, l.breed, l.color, l.photo_urls, l.last_seen_area, l.last_seen_date, l.author_id,
      (1 - (l.image_embedding operator(extensions.<=>) src.image_embedding))::double precision as similarity
    from public.lost_found l
    where l.type = case when src.type = 'found' then 'lost'::public.lost_found_type else 'found'::public.lost_found_type end
      and l.status = 'open' and not l.is_hidden
      and l.species = src.species
      and l.city = src.city
      and l.image_embedding is not null
      and l.id <> src.id
      and not public.is_blocked_between(auth.uid(), l.author_id)
    order by l.image_embedding operator(extensions.<=>) src.image_embedding
    limit least(greatest(p_limit, 1), 20);
end;
$$;
revoke all on function public.match_lost_found(uuid, integer) from public, anon;
grant execute on function public.match_lost_found(uuid, integer) to authenticated, service_role;
