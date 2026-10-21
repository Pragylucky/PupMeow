-- If audit insert fails, still apply hide/unhide (moderation must not break).

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
