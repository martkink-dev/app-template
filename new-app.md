# Checklist: start a new app

Copy this list into the first issue or PR of the new app and tick items off.
Details for every step: [`new-app-guide.md`](../new-app-guide.md).

## 1. Before you start (once per computer)

- [ ] Node.js, Git, Docker Desktop and VS Code are installed.
- [ ] GitHub CLI is installed and signed in: `gh auth status`
      (otherwise `gh auth login`).
- [ ] The template repository is marked as a template on GitHub
      (**Settings → General → Template repository**).

## 2. Create the app (script)

- [ ] Choose the app name in kebab-case, for example `invoice-tracker`.
- [ ] Choose visibility. On GitHub Free, branch protection works only on
      **public** repositories. A private repository needs GitHub Pro, otherwise
      `main` is protected by discipline only.
- [ ] Docker Desktop is running (_Engine running_).
- [ ] In the template folder: `git switch main` and `git pull`.
- [ ] Run:

  ```bash
  node scripts/new-app.mjs <app> --private --title "<App Title>" --description "<One sentence>"
  ```

  It creates the repository, clones it next to the template folder, sets the
  identity, starts local Supabase, opens the first pull request, sets the
  pull request settings and Dependabot, waits for CI and creates the
  `protect-main` ruleset. Add `--merge` to merge the first pull request when
  CI is green. Safe to run again if it stops halfway.

- [ ] The script ended without warnings. A ruleset warning on a private
      repository on GitHub Free is expected.
- [ ] Without `--merge`: the PR checks are green → **Squash and merge** →
      in the app folder `git switch main` and `git pull`.

Without the GitHub CLI, do the same by hand: guide phases 2–6.

## 3. Check the new app

- [ ] Open the app folder in VS Code (`code ..\<app>`) and accept the
      recommended extensions.
- [ ] `npm run dev` works and the home page shows the app title.
- [ ] Opening `/dashboard` redirects to `/login?next=/dashboard`.
- [ ] On GitHub: **Settings → Rules → Rulesets** shows `protect-main` as
      Active (public repositories or paid plans).

## 4. Describe the app (on a branch)

- [ ] `AGENTS.md`: replace the TODO in the **Project** section with who uses
      the app and the domain terms an AI assistant should know.
- [ ] `src/config/site.ts`: check `name`, `description` and `locale`.
- [ ] `README.md`: add anything a new developer on this app needs to know.

## 5. Branding

See [`ui-guidelines.md`](../ui-guidelines.md#5-branding-a-new-app).

- [ ] Choose the primary colour and paste theme values into
      `src/app/globals.css` (`:root` and `.dark`).
- [ ] Choose the font in `src/app/layout.tsx` (or keep Geist).
- [ ] Choose `--radius` (sharper or rounder corners).
- [ ] Replace `src/app/favicon.ico`.
- [ ] Replace the content of `src/app/(marketing)/page.tsx`.
- [ ] Check light and dark mode, and a 375 px wide screen.
- [ ] Check text contrast on `primary` buttons in both themes.

## 6. Cloud environments

- [ ] Follow the **First-time setup** section in
      [`deploy.md`](./deploy.md).

## 7. Before the first feature

- [ ] Review `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`.
- [ ] Go through [`security.md`](./security.md) once so you know what is
      expected.
- [ ] Read [`ui-guidelines.md`](../ui-guidelines.md) once.
