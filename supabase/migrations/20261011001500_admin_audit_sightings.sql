-- Admin audit trail, ban reason, lost-pet sighting notifications

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  details text,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

create policy "admin_audit: admins read" on public.admin_audit_log
  for select to authenticated using (public.is_admin());

drop function if exists public.admin_set_ban(uuid, boolean);

create or replace function public.admin_set_ban(p_user_id uuid, p_banned boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot ban yourself.' using errcode = '42501'; end if;
  update public.profiles set is_banned = p_banned where id = p_user_id and role <> 'admin';
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    case when p_banned then 'ban_user' else 'unban_user' end,
    'profile',
    p_user_id,
    case when p_banned then left(coalesce(trim(p_reason), ''), 500) else null end
  );
end; $$;

create or replace function public.report_lost_sighting(p_lost_id uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  row public.lost_found;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  select * into row from public.lost_found where id = p_lost_id;
  if row.id is null then raise exception 'Not found.' using errcode = 'P0002'; end if;
  if row.author_id = auth.uid() then return; end if;
  perform public.notify(
    row.author_id,
    'system',
    auth.uid(),
    'lost_found',
    row.id,
    left(trim(p_message), 200)
  );
end; $$;

revoke all on function public.admin_set_ban(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_ban(uuid, boolean, text) to authenticated;

revoke all on function public.report_lost_sighting(uuid, text) from public, anon;
grant execute on function public.report_lost_sighting(uuid, text) to authenticated;
