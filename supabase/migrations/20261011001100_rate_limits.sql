-- Pupmeow · 0011 · per-user rate limits enforced in the database
-- posts 10/hour · comments 60/hour · lost & found 5/day · adoptions 5/day · match requests 20/day
-- (AI messages 30/day live in consume_ai_message.)

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_col text := tg_argv[0];
  max_count integer := tg_argv[1]::integer;
  win interval := tg_argv[2]::interval;
  label text := tg_argv[3];
  owner_id uuid;
  recent integer;
begin
  execute format('select ($1).%I', owner_col) into owner_id using new;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2', tg_table_schema, tg_table_name, owner_col)
    into recent using owner_id, win;
  if recent >= max_count then
    raise exception 'RATE_LIMIT: You can add up to % % per %. Please try again later.', max_count, label,
      case when win = interval '1 hour' then 'hour' else 'day' end;
  end if;
  return new;
end;
$$;

create trigger posts_rate_limit before insert on public.posts
  for each row execute function public.enforce_rate_limit('author_id', '10', '1 hour', 'posts');
create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.enforce_rate_limit('author_id', '60', '1 hour', 'comments');
create trigger lost_found_rate_limit before insert on public.lost_found
  for each row execute function public.enforce_rate_limit('author_id', '5', '1 day', 'lost & found reports');
create trigger adoptions_rate_limit before insert on public.adoptions
  for each row execute function public.enforce_rate_limit('author_id', '5', '1 day', 'adoption listings');
create trigger match_requests_rate_limit before insert on public.match_requests
  for each row execute function public.enforce_rate_limit('from_owner_id', '20', '1 day', 'match requests');
