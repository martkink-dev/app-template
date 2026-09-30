# Checklist: start a new app

Copy this list into the first issue or PR of the new app and tick items off.

## 1. Repository

- [ ] On GitHub: **Use this template → Create a new repository**.
- [ ] Choose visibility. On GitHub Free, branch protection works only on
      **public** repositories. A private repository needs GitHub Pro, otherwise
      `main` is protected by discipline only.
- [ ] Clone the repository and run `npm install`.

## 2. Identity

- [ ] `package.json`: change `"name"`.
- [ ] `supabase/config.toml`: change `project_id` (must be unique per app on
      this computer).
- [ ] `src/app/layout.tsx`: change `metadata` title and description.
- [ ] `README.md`: replace the template title and description.
- [ ] `AGENTS.md`: describe what this app does in the **Project** section.

## 3. Local environment

- [ ] Docker Desktop is running (_Engine running_).
- [ ] `npx supabase start`
- [ ] Create `.env.local` from `.env.example` and fill it in
      (`npx supabase status -o env`), including `SUPABASE_SECRET_KEY`.
- [ ] `npx supabase db reset` and `npm run db:types`
- [ ] `npm run dev` works and the home page opens.
- [ ] Opening `/dashboard` redirects to `/login?next=/dashboard`.

## 4. Users

- [ ] Review `src/lib/users/config.ts` (invitation lifetime, time zone).
- [ ] `npm run users:invite-admin -- you@example.com`, open the link and set
      a password.
- [ ] `/admin/users` opens. Invite a test member, open the link in a private
      window, then deactivate and delete the test user.
- [ ] Read [`docs/modules/user-management.md`](../modules/user-management.md).

## 5. GitHub settings

- [ ] **Settings → General → Pull Requests:** only **Allow squash merging**
      enabled; **Automatically delete head branches** enabled.
- [ ] Open a first small PR so the **checks** workflow runs once
      (GitHub can only require a check it has seen).
- [ ] **Settings → Rules → Rulesets:** create `protect-main` for the default
      branch: restrict deletions, block force pushes, require a pull request
      (0 approvals when working alone), require status check `checks`.
- [ ] **Settings → Advanced Security:** enable Dependabot alerts and
      Dependabot security updates.

## 6. Cloud environments

- [ ] Follow the **First-time setup** section in
      [`deploy.md`](./deploy.md), including _User management: first admin_.

## 7. Before the first feature

- [ ] Review `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`.
- [ ] Go through [`security.md`](./security.md) once so you know what is
      expected.
