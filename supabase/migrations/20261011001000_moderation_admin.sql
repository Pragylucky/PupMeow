-- Pupmeow · 0010 · reports queue and admin tools

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null, -- NULL = flagged by AI moderation
  target_type public.report_target not null,
  target_id uuid not null,
  target_owner_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'animal_cruelty', 'scam_selling', 'fake_listing', 'other', 'ai_flag')),
  details text check (char_length(details) <= 500),
  ai_reason text check (char_length(ai_reason) <= 500),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_queue_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
create unique index reports_one_open_per_reporter on public.reports (reporter_id, target_type, target_id)
  where status = 'open' and reporter_id is not null;
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, target_owner_id, reason, details) on public.reports to authenticated;

create policy "reports: reporter or admin reads" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "reports: active users file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_active_user() and reason <> 'ai_flag');

-- Fill in target_owner_id server-side so reporters cannot spoof it.
create or replace function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.target_owner_id := case new.target_type
    when 'post' then (select author_id from public.posts where id = new.target_id)
    when 'comment' then (select author_id from public.comments where id = new.target_id)
    when 'profile' then (select id from public.profiles where id = new.target_id)
    when 'lost_found' then (select author_id from public.lost_found where id = new.target_id)
    when 'adoption' then (select author_id from public.adoptions where id = new.target_id)
    when 'match_profile' then (select owner_id from public.pet_match_profiles where id = new.target_id)
  end;
  if new.target_owner_id is null then
    raise exception 'That content no longer exists.';
  end if;
  if new.target_owner_id = new.reporter_id then
    raise exception 'You cannot report your own content.';
  end if;
  new.status := 'open';
  return new;
end; $$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

-- ---------- admin RPCs (all check is_admin) ----------
create or replace function public.admin_set_hidden(p_target_type public.report_target, p_target_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  case p_target_type
    when 'post' then update public.posts set is_hidden = p_hidden where id = p_target_id;
    when 'comment' then update public.comments set is_hidden = p_hidden where id = p_target_id;
    when 'lost_found' then update public.lost_found set is_hidden = p_hidden where id = p_target_id;
    when 'adoption' then update public.adoptions set is_hidden = p_hidden where id = p_target_id;
    when 'match_profile' then update public.pet_match_profiles set is_hidden = p_hidden where id = p_target_id;
    when 'profile' then update public.profiles set is_banned = p_hidden where id = p_target_id and role <> 'admin';
  end case;
end; $$;

create or replace function public.admin_set_ban(p_user_id uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot ban yourself.'; end if;
  update public.profiles set is_banned = p_banned where id = p_user_id and role <> 'admin';
end; $$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status public.report_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  update public.reports
    set status = p_status,
        resolved_by = case when p_status = 'open' then null else auth.uid() end,
        resolved_at = case when p_status = 'open' then null else now() end
    where id = p_report_id;
end; $$;

create or replace function public.admin_dashboard_counts()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'banned', (select count(*) from public.profiles where is_banned),
    'posts', (select count(*) from public.posts),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'lost_open', (select count(*) from public.lost_found where type = 'lost' and status = 'open'),
    'found_open', (select count(*) from public.lost_found where type = 'found' and status = 'open'),
    'reunited', (select count(*) from public.lost_found where status = 'reunited'),
    'adoptions_available', (select count(*) from public.adoptions where status = 'available'),
    'adopted', (select count(*) from public.adoptions where status = 'adopted'),
    'match_profiles', (select count(*) from public.pet_match_profiles where is_active)
  );
end; $$;

revoke all on function public.admin_set_hidden(public.report_target, uuid, boolean) from public, anon;
revoke all on function public.admin_set_ban(uuid, boolean) from public, anon;
revoke all on function public.admin_resolve_report(uuid, public.report_status) from public, anon;
revoke all on function public.admin_dashboard_counts() from public, anon;
grant execute on function public.admin_set_hidden(public.report_target, uuid, boolean) to authenticated;
grant execute on function public.admin_set_ban(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.report_status) to authenticated;
grant execute on function public.admin_dashboard_counts() to authenticated;
