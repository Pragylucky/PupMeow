-- Reliable chat delete (RLS on ai_messages can block CASCADE from the client).

create or replace function public.delete_ai_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.ai_conversations c
    where c.id = p_conversation_id and c.user_id = auth.uid()
  ) then
    raise exception 'Chat not found.' using errcode = 'P0002';
  end if;
  delete from public.ai_messages where conversation_id = p_conversation_id;
  delete from public.ai_conversations where id = p_conversation_id and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_ai_conversation(uuid) from public, anon;
grant execute on function public.delete_ai_conversation(uuid) to authenticated;
