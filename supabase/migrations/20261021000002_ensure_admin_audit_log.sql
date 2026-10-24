-- Run this in Supabase SQL Editor if Hide/Unhide/Delete shows:
--   relation "public.admin_audit_log" does not exist

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists "admin_audit: admins read" on public.admin_audit_log;
create policy "admin_audit: admins read" on public.admin_audit_log
  for select to authenticated using (public.is_admin());

-- Hide/unhide (audit optional if table ever missing again)
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
  begin
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      case
        when p_target_type = 'profile' and p_hidden then 'hide_profile'
        when p_target_type = 'profile' and not p_hidden then 'restore_profile'
        when p_hidden then 'hide_content'
        else 'restore_content'
      end,
      p_target_type::text,
      p_target_id,
      null
    );
  exception when others then
    null;
  end;
end; $$;

create or replace function public.admin_delete_target(
  p_target_type public.report_target,
  p_target_id uuid,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  if p_target_type = 'profile' then
    raise exception 'Use ban for user profiles.' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Please add a short reason for removal (audit log).';
  end if;

  case p_target_type
    when 'post' then delete from public.posts where id = p_target_id;
    when 'comment' then delete from public.comments where id = p_target_id;
    when 'lost_found' then delete from public.lost_found where id = p_target_id;
    when 'adoption' then delete from public.adoptions where id = p_target_id;
    when 'match_profile' then delete from public.pet_match_profiles where id = p_target_id;
    else raise exception 'Unsupported target.';
  end case;

  update public.reports
    set status = 'resolved',
        resolved_by = auth.uid(),
        resolved_at = now()
    where target_type = p_target_type and target_id = p_target_id and status = 'open';

  begin
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'delete_content', p_target_type::text, p_target_id, left(trim(p_reason), 500));
  exception when others then
    null;
  end;
end; $$;

revoke all on function public.admin_delete_target(public.report_target, uuid, text) from public, anon;
grant execute on function public.admin_delete_target(public.report_target, uuid, text) to authenticated;
