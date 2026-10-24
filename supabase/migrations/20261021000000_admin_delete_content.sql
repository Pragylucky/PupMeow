-- Admin: permanently remove reported content + audit trail for hide/delete

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
