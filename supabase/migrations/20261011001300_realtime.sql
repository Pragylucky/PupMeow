-- Pupmeow · 0013 · realtime for the notifications bell (RLS still applies to subscribers)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
