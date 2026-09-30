-- User management: roles, account status and invitations.
-- Users are created only through invitations (public sign-ups are disabled
-- in supabase/config.toml and in the hosted Auth settings).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'member');
create type public.account_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- Profiles: email (the username), role and status
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column email text,
  add column role public.app_role not null default 'member',
  add column status public.account_status not null default 'active';

update public.profiles as p
set email = u.email
from auth.users as u
where u.id = p.id;

alter table public.profiles alter column email set not null;

create unique index profiles_email_key on public.profiles (email);

-- Users may still edit their own profile, but only these columns.
-- role, status and email can only be changed by trusted server code
-- (secret key) after an admin check.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: is the current user an active admin?
-- ---------------------------------------------------------------------------
-- security definer: the function reads public.profiles from inside RLS
-- policies on public.profiles. Running as the owner avoids infinite policy
-- recursion. It only returns a boolean about the calling user.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- New users: copy email and role into the profile
-- ---------------------------------------------------------------------------
-- security definer (unchanged from the original function): runs as a trigger
-- on auth.users, where the calling role cannot write to public.profiles.
-- The role comes from raw_app_meta_data, which only the secret key can set.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    case
      when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role
      else 'member'::public.app_role
    end
  );
  return new;
end;
$$;

-- Keep profiles.email in sync if the email changes in auth.users.
-- security definer: same reason as handle_new_user.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
-- Only a SHA-256 hash of the token is stored. The plain token exists only in
-- the invitation link, which the admin copies and sends manually.
-- Status is derived:
--   accepted_at set          -> accepted
--   revoked_at set           -> revoked
--   expires_at <= now()      -> expired
--   otherwise                -> pending
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_role not null default 'member',
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_email_lowercase check (email = lower(email)),
  constraint invitations_expires_after_created check (expires_at > created_at),
  constraint invitations_single_outcome check (accepted_at is null or revoked_at is null)
);

-- At most one open (not accepted, not revoked) invitation per email.
create unique index invitations_one_open_per_email
  on public.invitations (email)
  where accepted_at is null and revoked_at is null;

create index invitations_invited_by_idx on public.invitations (invited_by);

alter table public.invitations enable row level security;

-- Admins work with invitations through their own session (RLS applies).
-- token_hash is never readable through the API; accepted_at is set only by
-- trusted server code when an invitation is accepted.
revoke all on public.invitations from anon, authenticated;
grant select (id, email, role, expires_at, invited_by, accepted_at, revoked_at, created_at)
  on public.invitations to authenticated;
grant insert (email, role, token_hash, expires_at, invited_by)
  on public.invitations to authenticated;
grant update (revoked_at) on public.invitations to authenticated;

create policy "Admins can view invitations"
  on public.invitations for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can create invitations"
  on public.invitations for insert
  to authenticated
  with check (
    (select public.is_admin())
    and invited_by = (select auth.uid())
  );

create policy "Admins can revoke open invitations"
  on public.invitations for update
  to authenticated
  using ((select public.is_admin()) and accepted_at is null)
  with check ((select public.is_admin()));
