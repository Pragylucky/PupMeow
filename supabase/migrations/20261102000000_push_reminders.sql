-- Pupmeow · web push subscriptions + vaccine / treatment reminders

-- One row per browser / installed app that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create policy "push: see own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push: delete own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Save this device for the signed-in user. A shared device moves to whoever enabled it last;
-- each user keeps at most 10 devices (oldest dropped).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'Sign in required.' using errcode = '42501'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Invalid subscription.' using errcode = '22023'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
  delete from public.push_subscriptions
  where user_id = auth.uid()
    and id not in (select id from public.push_subscriptions where user_id = auth.uid() order by created_at desc limit 10);
end; $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- Reminder preference (vaccines, deworming, tick treatment due).
alter table public.profile_private add column notify_reminders boolean not null default true;
grant update (notify_reminders) on public.profile_private to authenticated;

-- Reminders are their own notification type and link to a pet.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'mention', 'match_request', 'match_accepted', 'match_declined', 'lost_nearby', 'lost_match', 'system', 'reminder'));
alter table public.notifications drop constraint if exists notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check
  check (entity_type in ('post', 'comment', 'profile', 'lost_found', 'adoption', 'match_request', 'match_profile', 'pet'));
