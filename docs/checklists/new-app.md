# Checklist: start a new app

Copy this list into the first issue or PR of the new app and tick items off.

## 1. Repository

- [ ] On GitHub: **Use this template → Create a new repository**.
- [ ] Choose visibility. On GitHub Free, branch protection works only on
      **public** repositories. A private repository needs GitHub Pro, otherwise
      `main` is protected by discipline only.
- [ ] Clone the repository and run `npm install`.

## 2. Identity and local environment (script)

- [ ] Docker Desktop is running (_Engine running_).
- [ ] Run the setup script with the app name (kebab-case):

  ```bash
  npm run setup -- <app> --title "<App Title>" --description "<One sentence>"
  ```

  It switches to the `chore/project-setup` branch, updates `package.json`,
  `package-lock.json`, `supabase/config.toml` (`project_id`),
  `src/config/site.ts`, `README.md` and `AGENTS.md`, starts local Supabase,
  creates `.env.local`, rebuilds the local database and regenerates the
  types. It is safe to run again if it stops halfway.

- [ ] The script reports no `app-template` leftovers outside `docs/`.
- [ ] Check `locale` in `src/config/site.ts` (pass `--locale et` to set it).
- [ ] `AGENTS.md`: replace the TODO in the **Project** section with who uses
      the app and the domain terms an AI assistant should know.
- [ ] `npm run dev` works and the home page opens.
- [ ] Opening `/dashboard` redirects to `/login?next=/dashboard`.

## 3. Branding

See [`ui-guidelines.md`](../ui-guidelines.md#5-branding-a-new-app).

- [ ] Choose the primary colour and paste theme values into
      `src/app/globals.css` (`:root` and `.dark`).
- [ ] Choose the font in `src/app/layout.tsx` (or keep Geist).
- [ ] Choose `--radius` (sharper or rounder corners).
- [ ] Replace `src/app/favicon.ico`.
- [ ] Replace the content of `src/app/(marketing)/page.tsx`.
- [ ] Check light and dark mode, and a 375 px wide screen.
- [ ] Check text contrast on `primary` buttons in both themes.

## 4. First pull request

- [ ] `npm run check` passes.
- [ ] Commit `chore: set up project identity`, push `chore/project-setup`
      and open a pull request.
- [ ] The **checks** workflow is green. **Squash and merge.**

## 5. GitHub settings

- [ ] **Settings → General → Pull Requests:** only **Allow squash merging**
      enabled; **Automatically delete head branches** enabled.
- [ ] **Settings → Rules → Rulesets:** create `protect-main` for the default
      branch: restrict deletions, block force pushes, require a pull request
      (0 approvals when working alone), require status check `checks`
      (GitHub can only require a check that has run once, see section 4).
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
