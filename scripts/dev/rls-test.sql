\set ON_ERROR_STOP 0
\set QUIET 1
-- users
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','a@x.in','{"full_name":"Asha"}'),
 ('22222222-2222-2222-2222-222222222222','b@x.in','{"full_name":"Bilal"}'),
 ('33333333-3333-3333-3333-333333333333','c@x.in','{"full_name":"Chitra"}');
select 'T01 profiles auto-created', count(*) = 3 from public.profiles;
update public.profiles set username='asha' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set username='bilal' where id='22222222-2222-2222-2222-222222222222';
update public.profile_private set home_area='Dwarka' where id='22222222-2222-2222-2222-222222222222';

-- act as Asha
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
\echo T02 expect permission denied (role escalation):
update public.profiles set role='admin' where id=auth.uid();
insert into public.pets (owner_id,name,species,gender,birthday) values (auth.uid(),'Bruno','dog','male','2022-01-01');
insert into public.posts (author_id,caption) values (auth.uid(),'Monsoon walk with #DogsOfDelhi @bilal');
select 'T03 hashtags+mentions', hashtags = '{dogsofdelhi}' and mentions = '{bilal}' from public.posts;
\echo T04 expect permission denied (forging like_count):
update public.posts set like_count = 999;
insert into public.lost_found (author_id,type,pet_name,species,description,photo_urls,last_seen_area,last_seen_date,contact_value)
 values (auth.uid(),'lost','Bruno','dog','Brown lab with red collar','{x.webp}','Dwarka',now(),'9876543210');
\echo T05 expect permission denied (select contact_value directly):
select contact_value from public.lost_found;
\echo T06 expect rejected: posting as someone else
insert into public.posts (author_id,caption) values ('22222222-2222-2222-2222-222222222222','spoof');

-- anonymous
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select 'T07 anon sees lost post', count(*) = 1 from public.lost_found;
\echo T08 expect error: anon cannot get contact
select * from public.get_lost_found_contact((select id from public.lost_found limit 1));
\echo T09 expect permission denied: anon cannot read posts
select count(*) from public.posts;

-- Bilal
reset role; set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'T10 member gets contact', contact_value = '9876543210' from public.get_lost_found_contact((select id from public.lost_found limit 1));
insert into public.likes (post_id,user_id) select id, auth.uid() from public.posts;
select 'T11 like count synced', like_count = 1 from public.posts;
select 'T12 notifications for bilal (lost nearby)', count(*) >= 1 from public.notifications;
select 'T12b cannot see Asha notifications', count(*) = 0 from public.notifications where user_id <> auth.uid();
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111');
select 'T13 blocked content hidden', count(*) = 0 from public.posts;
select 'T13b blocked lost hidden', count(*) = 0 from public.lost_found;
delete from public.blocks where blocker_id = auth.uid();

-- Asha: notifications & AI budget
reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'T14 like notification', count(*) = 1 from public.notifications where type='like';
select 'T15 ai budget', public.consume_ai_message('chat') = 29;
-- rate limit: 10 posts/hour (1 already)
do $$ begin for i in 1..9 loop insert into public.posts (author_id,caption) values (auth.uid(),'p'||i); end loop; end $$;
\echo T16 expect RATE_LIMIT:
insert into public.posts (author_id,caption) values (auth.uid(),'eleventh');
-- matchmaking: Bruno born 2022 -> OK for breeding
insert into public.pet_match_profiles (pet_id,owner_id,looking_for,health_confirmed,about,photo_urls,area)
 select id, auth.uid(), 'both', true, 'Friendly lab, loves fetch', '{x.webp}', 'Dwarka' from public.pets;
select 'T17 match profile created', count(*) = 1 from public.pet_match_profiles;

-- Chitra with a puppy tries breeding
reset role; set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
insert into public.pets (owner_id,name,species,gender,birthday) values (auth.uid(),'Pepper','dog','female', current_date - 200);
\echo T18 expect BREEDING_AGE error:
insert into public.match_requests (from_pet_id,to_pet_id,from_owner_id,to_owner_id,purpose)
 select (select id from public.pets where name='Pepper'), (select id from public.pets where name='Bruno'), auth.uid(), auth.uid(), 'breeding';
insert into public.match_requests (from_pet_id,to_pet_id,from_owner_id,to_owner_id,purpose,message)
 select (select id from public.pets where name='Pepper'), (select id from public.pets where name='Bruno'), auth.uid(), auth.uid(), 'playdate','Park playdate?';
select 'T19 to_owner fixed by trigger', to_owner_id = '11111111-1111-1111-1111-111111111111' from public.match_requests;
\echo T20 expect error: requester cannot accept own request (0 rows)
update public.match_requests set status='accepted';
\echo T21 expect error: contact before accept
select * from public.get_match_contact((select id from public.match_requests limit 1));
select 'T22 Chitra cannot read health records of others', count(*) = 0 from public.pet_health_records;

reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
update public.match_requests set status='accepted';
select 'T23 accepted', status = 'accepted' from public.match_requests;
-- banned user cannot insert
reset role;
update public.profiles set is_banned = true where id = '33333333-3333-3333-3333-333333333333';
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
\echo T24 expect RLS violation (banned):
insert into public.pets (owner_id,name,species) values (auth.uid(),'Nope','cat');
\echo T25 expect Admins only:
select public.admin_dashboard_counts();
reset role;
select 'T26 match accepted notification', count(*) = 1 from public.notifications where type='match_accepted';
