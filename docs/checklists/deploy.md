# Checklist: deploy

## First-time setup (once per app)

### Supabase

- [ ] Create two projects: `<app>-staging` and `<app>-prod`.
      Use the same region for both, close to your users
      (for Estonia: **Central EU (Frankfurt)**).
- [ ] Save both database passwords in a password manager.
- [ ] Check your plan limits: the Free plan allows only a small number of
      active projects and pauses projects after a period of inactivity.
      A real production app usually needs a paid plan.
- [ ] Note for each project: **Project ID** (ref), **Project URL**,
      **Publishable key**, **Secret key**.
- [ ] **Authentication → URL Configuration** in the **prod** project:
      Site URL = production domain; Redirect URLs = production domain only.
- [ ] **Authentication → URL Configuration** in the **staging** project:
      Redirect URLs = Vercel preview URLs
      (`https://*-<vercel-team>.vercel.app/**`).
- [ ] **Authentication settings in both projects** (these are not part of
      migrations; `supabase/config.toml` only affects local development):
  - [ ] **Sign In / Providers:** _Allow new users to sign up_ = **off**.
  - [ ] **Email provider:** _Confirm email_ may stay on; invited users are
        created as already confirmed.
  - [ ] **Password settings:** minimum length **12**; required characters
        **lowercase, uppercase letters, digits and symbols**.

### Vercel

- [ ] **Add New → Project**, import the GitHub repository
      (framework is detected as Next.js).
- [ ] **Environment Variables:**
  - **Production** → prod `NEXT_PUBLIC_SUPABASE_URL`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`
  - **Preview** → staging values of the same variables
  - Mark `SUPABASE_SECRET_KEY` as **Sensitive**; never prefix it with
    `NEXT_PUBLIC_`. The user management module needs it.
- [ ] **Settings → Functions → Region:** same region as Supabase
      (Frankfurt = `fra1`). The default region is in the USA, which makes
      every database call slow.
- [ ] Deploy and open the production URL.

### GitHub Actions (database migrations)

- [ ] **Settings → Secrets and variables → Actions → Variables:**
      `SUPABASE_STAGING_PROJECT_ID`, `SUPABASE_PRODUCTION_PROJECT_ID`.
- [ ] **Secrets:** `SUPABASE_ACCESS_TOKEN` (Supabase → Account → Access
      Tokens), `SUPABASE_STAGING_DB_PASSWORD`, `SUPABASE_PRODUCTION_DB_PASSWORD`.
- [ ] **Actions → Database migrations → Run workflow** once and confirm that
      both jobs are green.

### User management: first admin (staging, then prod)

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

## Every change

- [ ] CI **checks** and **integration** are green on the PR.
- [ ] If the PR contains a migration:
  - [ ] It is a **new** file; no merged migration was edited.
  - [ ] New tables have an RLS test in `supabase/tests/database/` and
        `npm run test:db` passes locally.
  - [ ] `npx supabase db reset` works locally.
  - [ ] `npm run db:types` was run and the types are committed.
  - [ ] It is **backward compatible**: the currently deployed code still works
        after the migration runs (add columns and tables first, remove old
        ones in a later PR).
- [ ] The Vercel preview deployment works.
- [ ] **Squash and merge.**
- [ ] The database workflow on `main` is green.
- [ ] The Vercel production deployment is **Ready**.
- [ ] Quick check in production: the app opens, sign-in works, the changed
      feature works.

## When something goes wrong

- [ ] **Code:** Vercel → Deployments → choose the last working deployment →
      **Instant Rollback**.
- [ ] **Database:** never fix production by hand in the dashboard. Write a new
      migration that fixes the problem and ship it through a PR.
- [ ] **No admin can sign in:** create a new admin invitation with
      `scripts/invite-admin.mjs` (see _First admin_ above).
- [ ] Know your backup options before you need them (they depend on the
      Supabase plan).
