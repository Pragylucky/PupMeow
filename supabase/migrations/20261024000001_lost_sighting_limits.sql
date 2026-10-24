-- Rate-limit "I saw your pet" alerts; block banned users; only open lost reports.

create table if not exists public.lost_sighting_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  lost_id uuid not null references public.lost_found (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists lost_sighting_reports_reporter_idx on public.lost_sighting_reports (reporter_id, created_at desc);
create index if not exists lost_sighting_reports_pair_idx on public.lost_sighting_reports (reporter_id, lost_id, created_at desc);

alter table public.lost_sighting_reports enable row level security;
revoke all on public.lost_sighting_reports from anon, authenticated;

create or replace function public.report_lost_sighting(p_lost_id uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  row public.lost_found;
  today_count integer;
  recent_same integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Sign in to report a sighting.' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_message)), 0) < 8 then
    raise exception 'Please add where and when you saw the pet.' using errcode = '22023';
  end if;
  select * into row from public.lost_found where id = p_lost_id;
  if row.id is null then raise exception 'Not found.' using errcode = 'P0002'; end if;
  if row.is_hidden then raise exception 'This report is not available.' using errcode = '42501'; end if;
  if row.type <> 'lost' or row.status <> 'open' then
    raise exception 'Sightings are only allowed on open lost-pet reports.' using errcode = '22023';
  end if;
  if row.author_id = auth.uid() then return; end if;

  select count(*)::integer into today_count
    from public.lost_sighting_reports
    where reporter_id = auth.uid() and created_at > now() - interval '1 day';
  if today_count >= 8 then
    raise exception 'You can send up to 8 sighting alerts per day. Try again tomorrow.' using errcode = '42501';
  end if;

  select count(*)::integer into recent_same
    from public.lost_sighting_reports
    where reporter_id = auth.uid() and lost_id = p_lost_id and created_at > now() - interval '6 hours';
  if recent_same >= 1 then
    raise exception 'You already alerted the owner about this pet recently. Please wait a few hours.' using errcode = '42501';
  end if;

  perform public.notify(
    row.author_id,
    'system',
    auth.uid(),
    'lost_found',
    row.id,
    left(trim(p_message), 200)
  );

  insert into public.lost_sighting_reports (reporter_id, lost_id)
  values (auth.uid(), p_lost_id);
end; $$;
