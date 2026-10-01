-- RLS tests for public.profiles.
-- Pattern for every table: create test users, switch role, check access.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- Test users. The on_auth_user_created trigger creates their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@example.test', '{"display_name": "Alice"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@example.test', '{"display_name": "Bob"}');

select is(
  (select count(*)::int from public.profiles
   where id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b')),
  2,
  'New-user trigger creates a profile for each new user'
);

-- Anonymous visitors: no privileges at all.
set local role anon;

select throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'anon cannot read profiles'
);

-- Signed in as Alice.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);

select results_eq(
  'select id from public.profiles',
  $$ values ('a0000000-0000-0000-0000-00000000000a'::uuid) $$,
  'A user sees only their own profile'
);

select throws_ok(
  $$ delete from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'A user cannot delete profiles (no delete grant)'
);

-- RLS silently filters these rows, so check the results afterwards.
update public.profiles set display_name = 'Alice Updated'
  where id = 'a0000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Hacked'
  where id = 'b0000000-0000-0000-0000-00000000000b';

reset role;

select is(
  (select display_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'Alice Updated',
  'A user can update their own profile'
);

select is(
  (select display_name from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'),
  'Bob',
  'A user cannot update another user''s profile'
);

select * from finish();
rollback;
