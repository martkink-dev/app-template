-- RLS and privilege tests for public.password_resets.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'member@example.test'),
  ('c0000000-0000-0000-0000-00000000000c', 'other@example.test');

-- Roles are set by trusted server code, never by the trigger.
update public.profiles set role = 'admin'
  where id = 'a0000000-0000-0000-0000-00000000000a';

-- Anonymous visitors
set local role anon;

select throws_ok(
  'select * from public.password_resets',
  '42501',
  null,
  'anon cannot read password resets'
);

-- Signed in as a member
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-00000000000b", "role": "authenticated"}',
  true
);

select is_empty(
  'select id from public.password_resets',
  'A member sees no password resets'
);

select throws_ok(
  $$ insert into public.password_resets (user_id, token_hash, expires_at, created_by)
     values ('c0000000-0000-0000-0000-00000000000c', 'member-hash',
             now() + interval '1 day', 'b0000000-0000-0000-0000-00000000000b') $$,
  '42501',
  null,
  'A member cannot create password resets'
);

-- Signed in as an admin
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);

select lives_ok(
  $$ insert into public.password_resets (user_id, token_hash, expires_at, created_by)
     values ('b0000000-0000-0000-0000-00000000000b', 'hash-1',
             now() + interval '24 hours', 'a0000000-0000-0000-0000-00000000000a') $$,
  'An admin can create a reset link for another user'
);

select throws_ok(
  $$ insert into public.password_resets (user_id, token_hash, expires_at, created_by)
     values ('a0000000-0000-0000-0000-00000000000a', 'hash-2',
             now() + interval '24 hours', 'a0000000-0000-0000-0000-00000000000a') $$,
  '42501',
  null,
  'An admin cannot create a reset link for themselves'
);

select throws_ok(
  $$ insert into public.password_resets (user_id, token_hash, expires_at, created_by)
     values ('c0000000-0000-0000-0000-00000000000c', 'hash-3',
             now() + interval '24 hours', 'c0000000-0000-0000-0000-00000000000c') $$,
  '42501',
  null,
  'An admin cannot create a reset link in someone else''s name'
);

select throws_ok(
  $$ insert into public.password_resets (user_id, token_hash, expires_at, created_by)
     values ('b0000000-0000-0000-0000-00000000000b', 'hash-4',
             now() + interval '24 hours', 'a0000000-0000-0000-0000-00000000000a') $$,
  '23505',
  null,
  'Only one open reset link per user'
);

select results_eq(
  'select user_id from public.password_resets',
  $$ values ('b0000000-0000-0000-0000-00000000000b'::uuid) $$,
  'An admin can read password resets'
);

select throws_ok(
  'select token_hash from public.password_resets',
  '42501',
  null,
  'Nobody can read reset token hashes through the API'
);

select throws_ok(
  $$ update public.password_resets set used_at = now()
     where user_id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'An admin cannot mark a reset link used'
);

select throws_ok(
  $$ delete from public.password_resets
     where user_id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'Password resets cannot be deleted through the API'
);

-- Revoking: a member's attempt is silently filtered by RLS; an admin's works.
select set_config(
  'request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-00000000000b", "role": "authenticated"}',
  true
);
update public.password_resets set revoked_at = now()
  where user_id = 'b0000000-0000-0000-0000-00000000000b';

reset role;
select is(
  (select revoked_at from public.password_resets
   where user_id = 'b0000000-0000-0000-0000-00000000000b'),
  null,
  'A member cannot revoke a reset link'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);
update public.password_resets set revoked_at = now()
  where user_id = 'b0000000-0000-0000-0000-00000000000b';

reset role;
select isnt(
  (select revoked_at from public.password_resets
   where user_id = 'b0000000-0000-0000-0000-00000000000b'),
  null,
  'An admin can revoke a reset link'
);

-- A deactivated admin loses access immediately.
update public.profiles set status = 'inactive'
  where id = 'a0000000-0000-0000-0000-00000000000a';
set local role authenticated;
select is_empty(
  'select id from public.password_resets',
  'A deactivated admin sees no password resets'
);

-- Deleting a user removes their reset links.
reset role;
delete from auth.users where id = 'b0000000-0000-0000-0000-00000000000b';
select is_empty(
  $$ select id from public.password_resets
     where user_id = 'b0000000-0000-0000-0000-00000000000b' $$,
  'Deleting a user deletes their reset links'
);

select * from finish();
rollback;
