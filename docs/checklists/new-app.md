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
- [ ] `src/config/site.ts`: change `name`, `description` and `locale`.
- [ ] `README.md`: replace the template title and description.
- [ ] `AGENTS.md`: describe what this app does in the **Project** section.

## 3. Branding

See [`ui-guidelines.md`](../ui-guidelines.md#5-branding-a-new-app).

- [ ] Choose the brand colour (preview it in Material Theme Builder).
- [ ] Generate the MD3 scheme:
      `npm run theme:generate -- --seed "#RRGGBB"` and commit
      `src/styles/md3-theme.css`.
- [ ] Choose the font in `src/app/layout.tsx` (or keep Roboto Flex).
- [ ] Replace `src/app/favicon.ico`.
- [ ] Replace the content of `src/app/(marketing)/page.tsx`.
- [ ] Check light and dark mode, and a 375 px wide screen.
- [ ] Check text contrast on `primary` buttons in both themes.

## 4. Local environment

- [ ] Docker Desktop is running (_Engine running_).
- [ ] `npx supabase start`
- [ ] Create `.env.local` from `.env.example` and fill it in
      (`npx supabase status -o env`).
- [ ] `npx supabase db reset` and `npm run db:types`
- [ ] `npm run dev` works and the home page opens.
- [ ] Opening `/dashboard` redirects to `/login?next=/dashboard`.

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
      [`deploy.md`](./deploy.md).

## 7. Before the first feature

- [ ] Review `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`.
- [ ] Go through [`security.md`](./security.md) once so you know what is
      expected.
- [ ] Read [`ui-guidelines.md`](../ui-guidelines.md) once.
