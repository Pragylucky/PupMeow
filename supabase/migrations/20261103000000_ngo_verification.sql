-- Pupmeow · admin-verified NGOs. Anyone can tick "I'm an NGO"; only admins can mark one verified.

alter table public.profiles add column ngo_verified boolean not null default false;
alter table public.adoptions add column ngo_verified boolean not null default false;

-- Listings read this flag; it is never writable by members (no insert / update grant).
grant select (ngo_verified) on public.adoptions to anon, authenticated;

-- A listing is verified only while it is an NGO listing by a verified account.
create or replace function public.adoptions_sync_ngo_verified()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.ngo_verified := new.is_ngo and coalesce((select p.ngo_verified from public.profiles p where p.id = new.author_id), false);
  return new;
end; $$;
create trigger adoptions_sync_ngo_verified
  before insert or update of author_id, is_ngo on public.adoptions
  for each row execute function public.adoptions_sync_ngo_verified();

-- Admin: verify or un-verify an NGO account by @username, and update its listings.
create or replace function public.admin_set_ngo_verified(p_username text, p_verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  select id into v_id from public.profiles where lower(username) = lower(trim(both '@' from trim(p_username)));
  if v_id is null then raise exception 'No member with that username.' using errcode = 'P0002'; end if;
  update public.profiles set ngo_verified = p_verified where id = v_id;
  update public.adoptions set ngo_verified = (is_ngo and p_verified) where author_id = v_id;
  begin
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (auth.uid(), case when p_verified then 'verify_ngo' else 'unverify_ngo' end, 'profile', v_id, null);
  exception when others then null;
  end;
end; $$;
revoke all on function public.admin_set_ngo_verified(text, boolean) from public, anon;
grant execute on function public.admin_set_ngo_verified(text, boolean) to authenticated;
