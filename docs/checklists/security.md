# Checklist: security

Go through this list before the first production release and then regularly
(for example once a month).

## Database

- [ ] Every table in `public` has Row Level Security enabled. This query must
      return no rows:

  ```sql
  select tablename from pg_tables
  where schemaname = 'public' and rowsecurity = false;
  ```

- [ ] Every table has explicit grants (`revoke all`, then `grant` only what is
      needed) and a policy for each allowed operation.
- [ ] Policies use `(select auth.uid())`, not `true`, unless data is meant to
      be public.
- [ ] Functions use `set search_path = ''`; every `security definer` function
      has a comment explaining why.
- [ ] Storage buckets are private unless files are meant to be public, and
      `storage.objects` has policies.
- [ ] **Supabase dashboard → Advisors** (Security and Performance) shows no
      errors in staging or prod.

## Keys and secrets

- [ ] `SUPABASE_SECRET_KEY` appears only in `src/lib/supabase/admin.ts`,
      `scripts/invite-admin.mjs` and `.env.example` (search with
      Ctrl + Shift + F in VS Code).
- [ ] Every use of `createAdminClient()` has a comment explaining why, and
      user-triggered uses run only after `requireAdmin()` or an equivalent
      check.
- [ ] No variable containing a secret starts with `NEXT_PUBLIC_`.
- [ ] `.env.local` and any temporary env files are not in Git.
- [ ] Secrets are stored only in `.env.local`, Vercel and GitHub Secrets.
- [ ] If a key has leaked: rotate it in Supabase immediately and update Vercel
      and GitHub.

## Authentication

- [ ] Server code checks the user with `getClaims()`, never `getSession()`.
- [ ] Every protected page and Server Action checks the user itself
      (`requireUser()` / `requireAdmin()`); the proxy is not the only
      protection.
- [ ] The `next` redirect parameter is only accepted when it is a relative path
      starting with `/` (`safeRedirectPath`).
- [ ] Auth Redirect URLs contain only your own domains.
- [ ] **Public sign-up is off** in staging and prod
      (Authentication → Sign In / Providers → _Allow new users to sign up_).
- [ ] Password settings in staging and prod match
      `src/lib/validations/password.ts` (minimum 12 characters, lowercase,
      uppercase, digits and symbols).
- [ ] Optional (paid plans): leaked password protection is enabled.

## User management

- [ ] Users cannot update `profiles.role`, `profiles.status` or
      `profiles.email` through the API (column grants).
- [ ] Only the people who need it have the `admin` role. Review the list in
      `/admin/users`.
- [ ] People who have left are deactivated or deleted.
- [ ] Old open invitations are cancelled.

## Input and output

- [ ] All external input is validated with Zod on the server.
- [ ] User content is never rendered with `dangerouslySetInnerHTML`.
- [ ] Error messages shown to users do not reveal internal details.

## Repository and accounts

- [ ] `main` is protected and requires the `checks` status check.
- [ ] Dependabot alerts are enabled and open alerts are handled.
- [ ] Two-factor authentication is on for GitHub, Supabase and Vercel.
- [ ] Only people who need access have it (GitHub, Supabase, Vercel).
