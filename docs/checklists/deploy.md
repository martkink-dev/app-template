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

### Vercel

- [ ] **Add New → Project**, import the GitHub repository
      (framework is detected as Next.js).
- [ ] **Environment Variables:**
  - **Production** → prod `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - **Preview** → staging values of the same variables
  - `SUPABASE_SECRET_KEY` only if the app uses `admin.ts`; mark it
    **Sensitive**, never `NEXT_PUBLIC_`.
- [ ] **Settings → Functions → Region:** same region as Supabase
      (Frankfurt = `fra1`). The default region is in the USA, which makes
      every database call slow.
- [ ] Deploy and open the production URL.

### GitHub Actions (database migrations)

- [ ] **Settings → Secrets and variables → Actions:** add the secrets used by
      the database workflow (Supabase access token, project IDs and database
      passwords for staging and prod).
- [ ] Merge a PR and confirm the database workflow runs green.

## Every change

- [ ] CI **checks** are green on the PR.
- [ ] If the PR contains a migration:
  - [ ] It is a **new** file; no merged migration was edited.
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
- [ ] Know your backup options before you need them (they depend on the
      Supabase plan).
