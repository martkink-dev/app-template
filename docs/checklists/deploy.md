# Checklist: deploy

There is no staging database. One Supabase project (`<app>-prod`) serves
both production and the Vercel preview deployments; migrations are tested
locally before they reach it. Background:
[`new-app-guide.md`](../new-app-guide.md#environments).

## First-time setup (once per app)

### Supabase

- [ ] Create one project: `<app>-prod`. Choose a region close to your users
      (for Estonia: **Central EU (Frankfurt)**).
- [ ] Save the database password in a password manager.
- [ ] Check your plan limits: the Free plan allows only a small number of
      active projects and pauses projects after a period of inactivity.
      A real production app usually needs a paid plan.
- [ ] Note: **Project ID** (ref), **Project URL**, **Publishable key**,
      **Secret key**.
- [ ] **Authentication → URL Configuration:**
  - Site URL = production domain.
  - Redirect URLs = production domain (`https://<app>.vercel.app/**`) **and**
    Vercel preview URLs (`https://*-<vercel-team>.vercel.app/**`). Previews
    need the second entry because they use this project.
- [ ] **Authentication settings** (these are not part of migrations;
      `supabase/config.toml` only affects local development):
  - [ ] **Sign In / Providers:** _Allow new users to sign up_ = **off**.
  - [ ] **Email provider:** _Confirm email_ may stay on; invited users are
        created as already confirmed.
  - [ ] **Password settings:** minimum length **12**; required characters
        **lowercase, uppercase letters, digits and symbols**.
  - [ ] **Email provider:** _Secure password change_ = **off**. When on, it
        requires a code sent by email, and the app sends no emails.

### Vercel

- [ ] **Add New → Project**, import the GitHub repository
      (framework is detected as Next.js).
- [ ] **Environment Variables** (add each once and tick the environments):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` →
    **Production** and **Preview**, same prod values.
  - `SUPABASE_SECRET_KEY` → **Production**. Mark it **Sensitive**; never
    prefix it with `NEXT_PUBLIC_`. The user management module needs it.
  - Tick **Preview** for `SUPABASE_SECRET_KEY` only if you want to test user
    management on previews. The key bypasses Row Level Security, so unmerged
    preview code then has full access to production data.
- [ ] **Settings → Functions → Region:** same region as Supabase
      (Frankfurt = `fra1`). The default region is in the USA, which makes
      every database call slow.
- [ ] Deploy and open the production URL.

### GitHub Actions (database migrations)

- [ ] **Settings → Secrets and variables → Actions → Variables:**
      `SUPABASE_PRODUCTION_PROJECT_ID`.
- [ ] **Secrets:** `SUPABASE_ACCESS_TOKEN` (Supabase → Account → Access
      Tokens), `SUPABASE_PRODUCTION_DB_PASSWORD`.
- [ ] **Actions → Database migrations → Run workflow** once and confirm that
      **Push to production** is green.

### User management: first admin

Run after the migrations have reached the project.

- [ ] Create a temporary file `.env.bootstrap.local` with the project's
      `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- [ ] Create the invitation:

  ```bash
  node --env-file=.env.bootstrap.local scripts/invite-admin.mjs you@example.com https://<your-domain>
  ```

- [ ] **Delete `.env.bootstrap.local`.**
- [ ] Open the printed link, set a password and check that `/admin/users`
      opens.

The same admin account works on preview deployments, because they use the
same database.

## Every change

- [ ] CI **checks** and **integration** are green on the PR.
- [ ] If the PR contains a migration:
  - [ ] It is a **new** file; no merged migration was edited.
  - [ ] New tables have an RLS test in `supabase/tests/database/` and
        `npm run test:db` passes locally.
  - [ ] `npx supabase db reset` works locally. There is no staging: this is
        the only test before production.
  - [ ] `npm run db:types` was run and the types are committed.
  - [ ] It is **backward compatible**: the currently deployed code still works
        after the migration runs (add columns and tables first, remove old
        ones in a later PR).
  - [ ] New columns on existing tables are nullable or have a default;
        `not null` is added in a separate migration after the data is filled.
  - [ ] If it drops or transforms data: a backup was taken before merging
        (`npx supabase db dump --linked --data-only -f backup.sql`, kept
        outside the repository).
- [ ] The Vercel preview deployment works. **Skip this for PRs with a
      migration:** the preview uses the production database, which gets the
      migration only after the merge. Remember that anything you do on a
      preview changes production data.
- [ ] **Squash and merge.**
- [ ] The database workflow on `main` is green.
- [ ] The Vercel production deployment is **Ready**.
- [ ] Quick check in production: the app opens, sign-in works, the changed
      feature works.

## When something goes wrong

- [ ] **Code:** Vercel → Deployments → choose the last working deployment →
      **Instant Rollback**. Rollback does not undo migrations; this is why
      they must be backward compatible.
- [ ] **Database:** never fix production by hand in the dashboard. Write a new
      migration that fixes the problem and ship it through a PR.
- [ ] **No admin can sign in:** if the admin forgot the password, create a
      reset link with `scripts/reset-password.mjs` (same env file steps as
      _First admin_). If no admin account exists, create a new admin
      invitation with `scripts/invite-admin.mjs`.
- [ ] Know your backup options before you need them (they depend on the
      Supabase plan; the Free plan has no point-in-time recovery).
