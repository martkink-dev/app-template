# Guide: create a new app from the template

This guide walks through every step from "I have an idea" to "the app runs
locally, in preview and in production". It explains **how** and **why**.
The short tick list for the same process is
[`checklists/new-app.md`](./checklists/new-app.md); copy that into the first
issue of the new app and use this guide when a step needs explaining.

Expected time: 60–90 minutes the first time, about 30 minutes once routine.

---

## Overview

| Phase | What happens                               | Result                                   |
| ----- | ------------------------------------------ | ---------------------------------------- |
| 0     | Prerequisites (once per computer)          | Tools and accounts ready                 |
| 1     | Choose the app name                        | One name used everywhere                 |
| 2     | Create the repository from the template    | New GitHub repo, cloned locally          |
| 3     | Give the app its identity                  | No `app-template` leftovers              |
| 4     | Start the local environment                | App + local Supabase running             |
| 5     | First pull request                         | CI has run once, identity is on `main`   |
| 6     | Protect the repository                     | `main` protected, Dependabot on          |
| 7     | Create Supabase cloud projects             | Staging and production databases         |
| 8     | Connect GitHub Actions to Supabase         | Migrations deploy automatically          |
| 9     | Deploy to Vercel                           | Preview and production URLs              |
| 10    | Configure Supabase Auth URLs               | Sign-in emails point to the right place  |
| 11    | Verify all three environments              | Everything works end to end              |
| 12    | Prepare for the first feature              | Ready to build                           |

Order matters in phases 7–10: the databases must exist and have the schema
before the app is deployed, and the Auth URLs can only be set once Vercel has
given you the URLs.

---

## Phase 0 — Prerequisites (once per computer)

Install:

- **Node.js** (LTS). Check: `node -v`
- **Git**. Check: `git --version`
- **Docker Desktop**. Check: Docker Desktop shows _Engine running_.
  On Windows, Docker needs WSL 2 (`wsl --update` if it complains).
- **VS Code**.

You do **not** need to install the Supabase CLI globally. It is a dev
dependency of the project and runs with `npx supabase ...`, so every app uses
the CLI version pinned in its own `package-lock.json`.

Accounts (all with two-factor authentication on):

- GitHub
- Supabase
- Vercel (sign in with GitHub so it can see your repositories)

Optional: the GitHub CLI (`gh`) for creating repos and PRs from the terminal.

---

## Phase 1 — Choose the app name

Pick one short name in **kebab-case**, for example `invoice-tracker`.
It is used in all of these places, and keeping them identical saves confusion
later:

| Where                            | Value                    |
| -------------------------------- | ------------------------ |
| GitHub repository                | `invoice-tracker`        |
| `package.json` → `name`          | `invoice-tracker`        |
| `supabase/config.toml` → `project_id` | `invoice-tracker`   |
| Supabase staging project         | `invoice-tracker-staging`|
| Supabase production project      | `invoice-tracker-prod`   |
| Vercel project                   | `invoice-tracker`        |

In the rest of this guide `<app>` means this name and `<user>` means your
GitHub user or organisation.

---

## Phase 2 — Create the repository from the template

### 2.1 Create the repository on GitHub

1. Open `https://github.com/<user>/app-template`.
2. Click **Use this template → Create a new repository**.
3. Owner: `<user>`. Repository name: `<app>`.
4. Leave **Include all branches** unchecked (only `main` is needed).
5. Choose visibility:
   - **Public**: branch protection works on GitHub Free.
   - **Private**: branch protection rules are only enforced with GitHub Pro
     (or a paid organisation plan). On GitHub Free a private repo can still
     be used, but `main` is then protected by discipline only.
6. Click **Create repository**.

Alternative with the GitHub CLI:

```bash
gh repo create <app> --template <user>/app-template --private --clone
```

> Note: a repository created from a template has **no shared history** with
> the template. Later improvements to the template do not flow into existing
> apps automatically; port them by hand when they matter.

### 2.2 Clone and install

```bash
git clone https://github.com/<user>/<app>.git
cd <app>
npm install
code .
```

When VS Code opens, accept **Install recommended extensions**.

---

## Phase 3 — Give the app its identity

Do this on a branch. It becomes the first pull request (Phase 5), which also
makes CI run for the first time.

```bash
git switch -c chore/project-setup
```

Change these files:

1. **`package.json`** — set `"name": "<app>"`.
   Then run `npm install` once more so `package-lock.json` picks up the new
   name. Commit both files.

2. **`supabase/config.toml`** — set `project_id = "<app>"`.
   Docker containers and volumes are named after this id. If two apps on the
   same computer share it, they overwrite each other's local database.

3. **`src/app/layout.tsx`** — update `metadata.title` and
   `metadata.description`.

4. **`README.md`**
   - Replace the `app-template` title and description with the app's own.
   - Rename "Start a new app from this template" to "Getting started" and
     remove step 1 (Use this template) and step 3 (identity); keep the local
     setup steps, they are what a new developer on this app needs.

5. **`AGENTS.md`** — in the **Project** section, replace "A web application
   built from the `app-template` framework" with two or three sentences on
   what this app does, who uses it and any domain terms an AI assistant
   should know.

Quick check that nothing was missed (VS Code: **Ctrl + Shift + F**, search
for `app-template`). Remaining hits in `docs/` that refer to the framework
itself are fine.

---

## Phase 4 — Start the local environment

### 4.1 Start local Supabase

Make sure Docker Desktop shows _Engine running_, then:

```bash
npx supabase start
```

The first run downloads the Docker images and can take several minutes.
When it finishes, local Supabase is running.

> Only one local Supabase can use the default ports (54321–54324) at a time.
> If another app's Supabase is running, stop it first: run
> `npx supabase stop` in that app's folder.

### 4.2 Create `.env.local`

```bash
cp .env.example .env.local          # macOS / Linux / Git Bash
Copy-Item .env.example .env.local   # Windows PowerShell
```

Print the local values:

```bash
npx supabase status -o env
```

Fill in `.env.local`:

| `.env.local` variable                   | Value from `status -o env`          |
| --------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | `API_URL`                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | `PUBLISHABLE_KEY` (or `ANON_KEY`)   |
| `SUPABASE_SECRET_KEY`                   | `SECRET_KEY` (or `SERVICE_ROLE_KEY`) — only needed if the app uses `admin.ts` |

`.env.local` is git-ignored. Never commit it.

### 4.3 Build the database and generate types

```bash
npx supabase db reset
npm run db:types
```

`db reset` rebuilds the local database from `supabase/migrations/` and then
runs `supabase/seed.sql`. `db:types` regenerates
`src/types/database.types.ts` from that schema. If the types file changed,
commit it with the rest of this branch.

### 4.4 Run the app

```bash
npm run dev
```

Verify:

- [ ] The home page opens at the URL printed in the terminal.
- [ ] Opening `/dashboard` redirects to `/login?next=/dashboard`.
- [ ] Supabase Studio opens at <http://127.0.0.1:54323> and the `profiles`
      table exists.
- [ ] Sign-in works with a test user. If there is no sign-up page yet,
      create one in Studio → **Authentication → Add user**. Check that a row
      appeared in `profiles` (created by the `on_auth_user_created` trigger).
      Emails sent locally (for example magic links) appear in the local inbox;
      `npx supabase status` shows its URL.

> Tip: open the app on the same host as `site_url` in
> `supabase/config.toml` (`127.0.0.1`, not `localhost`). Auth cookies and
> redirects are tied to the host name, and mixing the two causes confusing
> sign-in loops.

### 4.5 Run the same checks as CI

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
```

If `format:check` fails, run `npm run format` and commit the result.

---

## Phase 5 — First pull request

```bash
git add -A
git commit -m "chore: set up project identity"
git push -u origin chore/project-setup
```

On GitHub, open a pull request with the title
`chore: set up project identity` and fill in the PR template.

- The **CI → checks** job runs and must turn green.
- The **Database migrations** workflow does not run (it only runs on `main`
  when migrations change, and it skips itself until the Supabase variables
  are set in Phase 8).

When the checks are green: **Squash and merge**. Then locally:

```bash
git switch main
git pull
```

This PR matters for Phase 6: GitHub can only require a status check that has
run at least once in the repository.

---

## Phase 6 — Protect the repository

### 6.1 Pull request settings

**Settings → General → Pull Requests**:

- [ ] **Allow squash merging**: on. Default commit message: _Pull request title_.
- [ ] **Allow merge commits**: off.
- [ ] **Allow rebase merging**: off.
- [ ] **Automatically delete head branches**: on.

Squash merging with the PR title as the commit message keeps `main` as one
Conventional Commit per PR.

### 6.2 Ruleset for `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**:

- Name: `protect-main`
- Enforcement status: **Active**
- Target branches: **Include default branch**
- Rules:
  - [ ] Restrict deletions
  - [ ] Block force pushes
  - [ ] Require a pull request before merging — required approvals: **0**
        when you work alone (otherwise you could never merge your own PRs)
  - [ ] Require status checks to pass — add **`checks`**

Save. From now on nothing reaches `main` without a PR and green CI.

### 6.3 Security features

**Settings → Advanced Security** (on some accounts: **Code security**):

- [ ] Dependabot alerts: on
- [ ] Dependabot security updates: on

---

## Phase 7 — Create the Supabase cloud projects

Two projects: one for previews (staging) and one for production. They never
share data.

### 7.1 Create the projects

In the Supabase dashboard, **New project**, twice:

| Setting           | Staging                 | Production           |
| ----------------- | ----------------------- | -------------------- |
| Name              | `<app>-staging`         | `<app>-prod`         |
| Database password | Generate, save in password manager | Generate, save in password manager |
| Region            | Central EU (Frankfurt)  | Central EU (Frankfurt) |

Use the same region for both, close to your users.

> Plan limits: the Free plan allows only a small number of active projects
> and pauses inactive ones. A real production app usually needs a paid plan.

### 7.2 Collect the values

For **each** project, write down (in the password manager, next to the DB
password):

| Value             | Where in the dashboard                         |
| ----------------- | ---------------------------------------------- |
| Project ID (ref)  | Project Settings → General                     |
| Project URL       | `https://<project-ref>.supabase.co`            |
| Publishable key   | Project Settings → API Keys (`sb_publishable_…`) |
| Secret key        | Project Settings → API Keys (`sb_secret_…`)    |

Do **not** create tables or policies in the dashboard. The schema arrives via
GitHub Actions in Phase 8.

> Dashboard **settings** (Auth URLs, email, SMTP) are configuration, not
> schema, and are set in the dashboard. The "migrations only" rule applies to
> tables, columns, policies, functions, triggers and storage policies.

---

## Phase 8 — Connect GitHub Actions to Supabase

The **Database migrations** workflow (`.github/workflows/db-push.yml`) runs
`supabase db push` against staging and then production whenever migrations
change on `main`.

### 8.1 Create a Supabase access token

Supabase dashboard → your avatar → **Account → Access Tokens → Generate new
token**. Name it `github-actions-<app>`. Copy it once; it is not shown again.

### 8.2 Add variables and secrets on GitHub

Repository → **Settings → Secrets and variables → Actions**.

**Variables** tab (not secret, visible in logs):

| Name                              | Value                    |
| --------------------------------- | ------------------------ |
| `SUPABASE_STAGING_PROJECT_ID`     | staging Project ID       |
| `SUPABASE_PRODUCTION_PROJECT_ID`  | production Project ID    |

**Secrets** tab:

| Name                              | Value                    |
| --------------------------------- | ------------------------ |
| `SUPABASE_ACCESS_TOKEN`           | token from 8.1           |
| `SUPABASE_STAGING_DB_PASSWORD`    | staging DB password      |
| `SUPABASE_PRODUCTION_DB_PASSWORD` | production DB password   |

### 8.3 Apply the existing migrations

**Actions → Database migrations → Run workflow**, branch **main**.

- [ ] **Push to staging** is green.
- [ ] **Push to production** is green.

Check in each Supabase project (Table Editor, read only) that the `profiles`
table exists.

If the workflow is started from any branch other than `main`, only staging is
updated. Production only ever receives migrations from `main`.

---

## Phase 9 — Deploy to Vercel

### 9.1 Import the project

Vercel → **Add New → Project** → import `<user>/<app>`. The framework is
detected as Next.js; leave the build settings at their defaults.

### 9.2 Environment variables

Before clicking **Deploy**, open **Environment Variables** and add each
variable **per environment**:

| Variable                               | Production         | Preview            | Development |
| -------------------------------------- | ------------------ | ------------------ | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | prod Project URL   | staging Project URL | —          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable   | staging publishable | —          |
| `SUPABASE_SECRET_KEY` (only if `admin.ts` is used) | prod secret, **Sensitive** | staging secret, **Sensitive** | — |

Development stays empty: local development uses `.env.local`.

`NEXT_PUBLIC_` values are baked into the build. After changing one, redeploy.

### 9.3 Region

Deploy, then **Settings → Functions → Function Region**: choose
**Frankfurt (`fra1`)** (the same region as Supabase) and redeploy. The default
region is in the USA, which adds latency to every database call.

### 9.4 Note the URLs

- Production URL: `https://<app>.vercel.app` (or similar; shown on the
  project page).
- Team slug: the last part of preview URLs, e.g.
  `https://<app>-git-<branch>-<team-slug>.vercel.app`. You need it in Phase 10.

---

## Phase 10 — Configure Supabase Auth URLs

Without this, sign-in and confirmation emails send users to the wrong place
(often `localhost`).

### 10.1 Production project (`<app>-prod`)

**Authentication → URL Configuration**:

- Site URL: `https://<app>.vercel.app` (or your custom domain)
- Redirect URLs: `https://<app>.vercel.app/**` — production domains only

**Authentication → Sign In / Providers → Email**:

- [ ] **Confirm email**: on.

**Custom SMTP** (Authentication → Emails → SMTP Settings): Supabase's
built-in email sender is meant for testing and is heavily rate-limited. Set
up a real SMTP provider before real users sign up.

### 10.2 Staging project (`<app>-staging`)

**Authentication → URL Configuration**:

- Site URL: the production-like Vercel URL or any preview URL
- Redirect URLs: `https://*-<team-slug>.vercel.app/**`

This wildcard matches all preview deployments of your Vercel team and nothing
else.

---

## Phase 11 — Verify all three environments

### Production

- [ ] Vercel production deployment is **Ready**.
- [ ] The production URL opens.
- [ ] `/dashboard` redirects to `/login`.
- [ ] Sign up / sign in works; the confirmation email links back to the
      production domain; a `profiles` row is created.
- [ ] Delete the test user afterwards if you do not want it in production.

### Preview

Make a trivial change on a branch (for example a README fix), push it and
open a PR.

- [ ] CI **checks** are green.
- [ ] Vercel posts a preview URL on the PR.
- [ ] Sign-in on the preview URL works and the user appears in the
      **staging** project, not in production.

Close or merge the PR afterwards.

> Vercel protects preview deployments with Vercel Authentication by default.
> That is fine: you are logged in to Vercel. Leave it on.

### Local

Already verified in Phase 4.

---

## Phase 12 — Prepare for the first feature

- [ ] Review `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`: which routes are
      reachable without signing in?
- [ ] Read [`checklists/security.md`](./checklists/security.md) once.
- [ ] Remove or replace placeholder pages and content you will not use.
- [ ] Add shadcn/ui components only when needed:
      `npx shadcn@latest add button`.
- [ ] Optional: add a custom domain in Vercel (**Settings → Domains**), then
      update the production Site URL and Redirect URLs in Supabase.

### The workflow for every feature from now on

```bash
git switch main && git pull
git switch -c feat/short-description

# If the database changes:
npx supabase migration new describe_the_change
#   write SQL in the new file (RLS, revoke/grant, policies)
npx supabase db reset
npm run db:types

# Before pushing:
npm run lint && npm run format:check && npm run typecheck && npm run build

git add -A
git commit -m "feat: short description"
git push -u origin feat/short-description
```

Open a PR → checks green → preview works → **Squash and merge** →
the migration workflow updates staging and production → Vercel deploys
production. Details: [`checklists/deploy.md`](./checklists/deploy.md).

---

## Troubleshooting

| Symptom | Likely cause and fix |
| ------- | -------------------- |
| `supabase start` fails with Docker errors | Docker Desktop is not running. Wait for _Engine running_. On Windows run `wsl --update` and restart. |
| `supabase start` reports a port in use | Another app's local Supabase is running. Run `npx supabase stop` in that app's folder. |
| Local database of another app disappeared | Both apps have the same `project_id`. Give each app a unique one (Phase 3). |
| App crashes with an environment variable error | `.env.local` is missing or incomplete (locally) or the variable is missing for that environment (Vercel). Compare with `.env.example`. |
| Vercel build passes but the app uses the wrong database | Production and Preview variables swapped, or not redeployed after changing a `NEXT_PUBLIC_` value. |
| Sign-in email links point to `localhost` | Site URL / Redirect URLs not set in that Supabase project (Phase 10). |
| Sign-in loop locally | Mixing `localhost` and `127.0.0.1`. Use the host from `site_url`. |
| `db push` fails: authentication | Wrong DB password secret or expired access token. |
| `db push` fails: migration history mismatch | Someone changed the cloud schema in the dashboard, or a merged migration was edited. Fix with a new migration; never edit merged ones. |
| Cannot select `checks` in the ruleset | CI has not run yet in this repository. Finish Phase 5 first. |
