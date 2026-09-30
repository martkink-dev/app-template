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

- [ ] `SUPABASE_SECRET_KEY` appears only in `src/lib/supabase/admin.ts` and
      `.env.example` (search with Ctrl + Shift + F in VS Code).
- [ ] No variable containing a secret starts with `NEXT_PUBLIC_`.
- [ ] `.env.local` is not in Git.
- [ ] Secrets are stored only in `.env.local`, Vercel and GitHub Secrets.
- [ ] If a key has leaked: rotate it in Supabase immediately and update Vercel
      and GitHub.

## Authentication

- [ ] Server code checks the user with `getClaims()`, never `getSession()`.
- [ ] Every protected page and Server Action checks the user itself; the proxy
      is not the only protection.
- [ ] The `next` redirect parameter is only accepted when it is a relative path
      starting with `/` (prevents redirects to other sites).
- [ ] Auth Redirect URLs contain only your own domains.
- [ ] Email confirmation is enabled in prod.

## Input and output

- [ ] All external input is validated with Zod on the server.
- [ ] User content is never rendered with `dangerouslySetInnerHTML`.
- [ ] Error messages shown to users do not reveal internal details.

## Repository and accounts

- [ ] `main` is protected and requires the `checks` status check.
- [ ] Dependabot alerts are enabled and open alerts are handled.
- [ ] Two-factor authentication is on for GitHub, Supabase and Vercel.
- [ ] Only people who need access have it (GitHub, Supabase, Vercel).
