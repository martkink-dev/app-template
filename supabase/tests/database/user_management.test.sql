-- RLS and privilege tests for the user management module
-- (supabase/migrations/*_user_management.sql).
--
-- These tests protect the rules the app relies on:
--   - users cannot change their own role, status or email through the API;
--   - admins see all profiles, members only their own;
--   - only active admins can read, create and revoke invitations;
--   - token hashes are never readable through the API.
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- ---------------------------------------------------------------------------
-- Test users. The on_auth_user_created trigger creates the profiles, always
-- as 'member'. The admin role is then set the way trusted server code does
-- it (accepting an invitation): an update with full privileges.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin@example.test', '{"role": "admin"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'member@example.test', '{}'),
  ('c0000000-0000-0000-0000-00000000000c', 'other@example.test', '{}');

select is(
  (select role::text from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'member',
  'New-user trigger ignores a role in app metadata'
);

select is(
  (select role::text from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'),
  'member',
  'New-user trigger creates members'
);

update public.profiles set role = 'admin'
  where id = 'a0000000-0000-0000-0000-00000000000a';

select is(
  (select email from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'),
  'member@example.test',
  'New-user trigger copies the email'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitors
-- ---------------------------------------------------------------------------
set local role anon;

select throws_ok(
  'select public.is_admin()',
  '42501',
  null,
  'anon cannot call is_admin()'
);

select throws_ok(
  'select * from public.invitations',
  '42501',
  null,
  'anon cannot read invitations'
);

-- ---------------------------------------------------------------------------
-- Signed in as a member
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-00000000000b", "role": "authenticated"}',
  true
);

select is(public.is_admin(), false, 'is_admin() is false for a member');

select results_eq(
  'select id from public.profiles',
  $$ values ('b0000000-0000-0000-0000-00000000000b'::uuid) $$,
  'A member sees only their own profile'
);

select throws_ok(
  $$ update public.profiles set role = 'admin'
     where id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'A member cannot make themselves admin'
);

select throws_ok(
  $$ update public.profiles set status = 'active'
     where id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'A member cannot change their own status'
);

select throws_ok(
  $$ update public.profiles set email = 'new@example.test'
     where id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'A member cannot change their own email'
);

select is_empty(
  'select id from public.invitations',
  'A member sees no invitations'
);

select throws_ok(
  $$ insert into public.invitations (email, role, token_hash, expires_at, invited_by)
     values ('x@example.test', 'admin', 'member-hash', now() + interval '1 day',
             'b0000000-0000-0000-0000-00000000000b') $$,
  '42501',
  null,
  'A member cannot create invitations'
);

-- ---------------------------------------------------------------------------
-- Signed in as an admin
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);

select is(public.is_admin(), true, 'is_admin() is true for an active admin');

select is(
  (select count(*)::int from public.profiles where id in (
    'a0000000-0000-0000-0000-00000000000a',
    'b0000000-0000-0000-0000-00000000000b',
    'c0000000-0000-0000-0000-00000000000c')),
  3,
  'An admin sees all profiles'
);

-- Role changes go through trusted server code (secret key) after
-- requireAdmin(), never through the admin's own session.
select throws_ok(
  $$ update public.profiles set role = 'admin'
     where id = 'b0000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'An admin cannot change roles through the API either'
);

select lives_ok(
  $$ insert into public.invitations (email, role, token_hash, expires_at, invited_by)
     values ('new@example.test', 'member', 'hash-1', now() + interval '72 hours',
             'a0000000-0000-0000-0000-00000000000a') $$,
  'An admin can create an invitation'
);

select throws_ok(
  $$ insert into public.invitations (email, role, token_hash, expires_at, invited_by)
     values ('fake@example.test', 'member', 'hash-2', now() + interval '72 hours',
             'c0000000-0000-0000-0000-00000000000c') $$,
  '42501',
  null,
  'An admin cannot create an invitation in someone else''s name'
);

select throws_ok(
  $$ insert into public.invitations (email, role, token_hash, expires_at, invited_by)
     values ('new@example.test', 'member', 'hash-3', now() + interval '72 hours',
             'a0000000-0000-0000-0000-00000000000a') $$,
  '23505',
  null,
  'Only one open invitation per email'
);

select results_eq(
  'select email from public.invitations',
  $$ values ('new@example.test') $$,
  'An admin can read invitations'
);

select throws_ok(
  'select token_hash from public.invitations',
  '42501',
  null,
  'Nobody can read token hashes through the API'
);

select throws_ok(
  $$ update public.invitations set accepted_at = now()
     where email = 'new@example.test' $$,
  '42501',
  null,
  'An admin cannot mark an invitation accepted'
);

select throws_ok(
  $$ delete from public.invitations where email = 'new@example.test' $$,
  '42501',
  null,
  'Invitations cannot be deleted through the API'
);

-- ---------------------------------------------------------------------------
-- Revoking: a member's attempt is silently filtered by RLS; an admin's works.
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-00000000000b", "role": "authenticated"}',
  true
);
update public.invitations set revoked_at = now() where email = 'new@example.test';

reset role;
select is(
  (select revoked_at from public.invitations where email = 'new@example.test'),
  null,
  'A member cannot revoke an invitation'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);
update public.invitations set revoked_at = now() where email = 'new@example.test';

reset role;
select isnt(
  (select revoked_at from public.invitations where email = 'new@example.test'),
  null,
  'An admin can revoke an invitation'
);

-- ---------------------------------------------------------------------------
-- A deactivated admin loses admin rights immediately, even with a valid JWT.
-- ---------------------------------------------------------------------------
update public.profiles set status = 'inactive'
  where id = 'a0000000-0000-0000-0000-00000000000a';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);

select is(public.is_admin(), false, 'is_admin() is false for a deactivated admin');

select is_empty(
  'select id from public.invitations',
  'A deactivated admin sees no invitations'
);

select * from finish();
rollback;
