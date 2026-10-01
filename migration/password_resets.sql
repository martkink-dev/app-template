-- Password resets without email: an admin creates a one-time link and sends
-- it to the user through any channel, in the same way as invitations.
--
-- Only a SHA-256 hash of the token is stored. Status is derived:
--   used_at set         -> used
--   revoked_at set      -> revoked
--   expires_at <= now() -> expired
--   otherwise           -> open
create table public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint password_resets_expires_after_created check (expires_at > created_at),
  constraint password_resets_single_outcome check (used_at is null or revoked_at is null)
);

-- At most one open (not used, not revoked) reset link per user.
create unique index password_resets_one_open_per_user
  on public.password_resets (user_id)
  where used_at is null and revoked_at is null;

create index password_resets_created_by_idx on public.password_resets (created_by);

alter table public.password_resets enable row level security;

-- Admins work with reset links through their own session (RLS applies).
-- token_hash is never readable through the API; used_at is set only by
-- trusted server code when a link is used.
revoke all on public.password_resets from anon, authenticated;
grant select (id, user_id, expires_at, created_by, used_at, revoked_at, created_at)
  on public.password_resets to authenticated;
grant insert (user_id, token_hash, expires_at, created_by)
  on public.password_resets to authenticated;
grant update (revoked_at) on public.password_resets to authenticated;

create policy "Admins can view password resets"
  on public.password_resets for select
  to authenticated
  using ((select public.is_admin()));

-- Admins cannot create a reset link for themselves: a signed-in admin changes
-- their own password while signed in.
create policy "Admins can create password resets for others"
  on public.password_resets for insert
  to authenticated
  with check (
    (select public.is_admin())
    and created_by = (select auth.uid())
    and user_id <> (select auth.uid())
  );

create policy "Admins can revoke open password resets"
  on public.password_resets for update
  to authenticated
  using ((select public.is_admin()) and used_at is null)
  with check ((select public.is_admin()));
