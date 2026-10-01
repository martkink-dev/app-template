# Guide: create a new app from the template

This guide walks through every step from "I have an idea" to "the app runs
locally, in preview and in production". It explains **how** and **why**.
The short tick list for the same process is
[`checklists/new-app.md`](./checklists/new-app.md); copy that into the first
issue of the new app and use this guide when a step needs explaining.

Expected time: 60–90 minutes the first time, about 30 minutes once routine.

---

## Overview

| Phase | What happens                            | Result                                  |
| ----- | --------------------------------------- | --------------------------------------- |
| 0     | Prerequisites (once per computer)       | Tools and accounts ready                |
| 1     | Choose the app name                     | One name used everywhere                |
| 2     | Create the repository from the template | New GitHub repo, cloned locally         |
| 3     | Give the app its identity               | No `app-template` leftovers             |
| 4     | Start the local environment             | App + local Supabase running            |
| 5     | First pull request                      | CI has run once, identity is on `main`  |
| 6     | Protect the repository                  | `main` protected, Dependabot on         |
| 7     | Create the Supabase cloud project       | Production database                     |
| 8     | Connect GitHub Actions to Supabase      | Migrations deploy automatically         |
| 9     | Deploy to Vercel                        | Preview and production URLs             |
| 10    | Configure Supabase Auth URLs            | Sign-in emails point to the right place |
| 11    | Verify the environments                 | Everything works end to end             |
| 12    | Prepare for the first feature           | Ready to build                          |

Phases 2–6 are done by one command, see [Fast path](#fast-path-phases-26-with-one-command).

### Environments

| Environment | App                      | Database                      |
| ----------- | ------------------------ | ----------------------------- |
| Local       | `npm run dev`            | Supabase CLI (Docker)         |
| Preview     | Vercel deployment per PR | **Production** (`<app>-prod`) |
| Production  | Vercel, `main` branch    | Production (`<app>-prod`)     |

There is no staging database. The apps are personal and for learning, so a
second cloud project per app costs more (Free plan project limit, a second set
of secrets and Auth settings) than it saves. What this means in practice:

- **Local is the only place where migrations are tested before production.**
  `npx supabase db reset` replays every migration from scratch; never skip it.
- **A preview uses real data.** Anything you create or delete on a preview
  URL happens in production.
- **A preview of a PR that contains a migration does not work reliably**,
  because the migration only reaches the database after the merge. Test such
  PRs locally; the preview is for PRs that do not change the schema.
- **Migrations must be backward compatible** (see Phase 12), because older
  previews and the running production code keep using the same database
  while a new migration is applied.

To add a staging database later (for example when other people start using
an app), create a second Supabase project, point the Vercel **Preview**
variables at it and add a staging job to `db-push.yml` that runs before the
production job.

Order matters in phases 7–10: the databases must exist and have the schema
before the app is deployed, and the Auth URLs can only be set once Vercel has
given you the URLs.

---

## Fast path: phases 2–6 with one command

Once the prerequisites (Phase 0) are in place and the name is chosen
(Phase 1), run in the **template** folder:

```bash
git switch main
git pull
node scripts/new-app.mjs <app> --private --title "<App Title>" --description "<One sentence about the app>"
```

Use `--public` instead of `--private` if the code can be public (see 2.1
for what this means for branch protection). Other options: `--locale et`,
`--owner <org>` (default: the template's owner) and `--merge`, which
squash-merges the first pull request when CI is green. Without `--merge`
you review and merge it yourself. `node scripts/new-app.mjs --help` lists
them all.

The script first checks that the GitHub CLI is signed in, Git has a user,
Docker is running and the template is marked as a template on GitHub.
Nothing is created before these checks pass. Then:

| Phase | What the script does                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2     | Creates `<user>/<app>` from the template and clones it next to the template folder (`..\<app>`).                                 |
| 3–4   | Runs `npm ci` and `scripts/setup.mjs`: identity, local Supabase, `.env.local`, database, types.                                  |
| 5     | Commits `chore: set up project identity`, pushes `chore/project-setup` and opens the pull request.                               |
| 6     | Sets the pull request settings (6.1), turns on Dependabot (6.3), waits for CI and then creates the `protect-main` ruleset (6.2). |

The ruleset comes from `.github/rulesets/protect-main.json`, so the rules are
version-controlled and the same in every app. It is created after CI has run
once because GitHub only requires checks it has seen.

The script is safe to run again with the same arguments: an existing
repository, folder, commit, pull request or ruleset is reused. If it stops,
fix the cause it prints and run it again.

Afterwards, continue with the hand-written parts: merge the pull request if
you did not use `--merge`, replace the TODO in `AGENTS.md` and go on with
Phase 7. Phases 2–6 below explain what the script did, and how to do each
step by hand.

> On Windows PowerShell, pass options with `node scripts/... --option`
> rather than `npm run ... -- --option`: PowerShell can drop the `--`, and
> the options then never reach the script.

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

For the fast path: the **GitHub CLI** (`gh`), signed in once with
`gh auth login`. Check: `gh auth status`. Without it, follow phases 2–6 by
hand.

---

## Phase 1 — Choose the app name

Pick one short name in **kebab-case**, for example `invoice-tracker`.
It is used in all of these places, and keeping them identical saves confusion
later:

| Where                                 | Value                  |
| ------------------------------------- | ---------------------- |
| GitHub repository                     | `invoice-tracker`      |
| `package.json` → `name`               | `invoice-tracker`      |
| `supabase/config.toml` → `project_id` | `invoice-tracker`      |
| Supabase project                      | `invoice-tracker-prod` |
| Vercel project                        | `invoice-tracker`      |

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

`scripts/new-app.mjs` runs the setup script for you. By hand, the setup
script does this phase and most of Phase 4 in one run. It works on
a branch, which becomes the first pull request (Phase 5) and makes CI run for
the first time.

Make sure Docker Desktop shows _Engine running_, then run in the repository
root:

```bash
node scripts/setup.mjs <app> --title "<App Title>" --description "<One sentence about the app>"
```

Without `--title` and `--description` the script asks for them; the default
title comes from the app name (`invoice-tracker` → `Invoice Tracker`).
Other options: `--locale et` sets the `<html lang>` value, `--skip-local`
changes only the files and skips Docker and Supabase.
`node scripts/setup.mjs --help` lists them all.

The script:

1. Switches to the branch `chore/project-setup` (creates it if needed).
2. Sets the identity in these files:

   | File                   | Change                                                                                |
   | ---------------------- | ------------------------------------------------------------------------------------- |
   | `package.json`         | `name`                                                                                |
   | `package-lock.json`    | `name` (no extra `npm install` needed)                                                |
   | `supabase/config.toml` | `project_id`                                                                          |
   | `src/config/site.ts`   | `name`, `description`, `locale` (used by the page titles, header and `<html lang>`)   |
   | `README.md`            | Title and description; "Start a new app from this template" becomes "Getting started" |
   | `AGENTS.md`            | The template sentence in **Project** becomes the description plus a TODO              |

3. Continues with Phase 4 (local Supabase, `.env.local`, database, types).
4. Lists tracked files outside `docs/` that still mention `app-template`.

Every step is safe to run again, so if the script stops (for example because
Docker was not running), fix the cause and run the same command again. The
script never commits, pushes or touches the cloud projects, and never prints
key values.

`project_id` matters because Docker containers and volumes are named after
it. If two apps on the same computer share it, they overwrite each other's
local database.

After the script, do these by hand:

- [ ] **`AGENTS.md`** — replace the TODO in the **Project** section with two
      or three sentences on who uses the app and any domain terms an AI
      assistant should know.
- [ ] **`README.md`** — read it through once; add anything a new developer
      on this app needs to know.
- [ ] If the script reported leftovers, fix them. Hits in `docs/` that refer
      to the framework itself are fine.

---

## Phase 4 — Start the local environment

The setup script has already done 4.1–4.3. This section explains what it did,
and how to do the same by hand when needed.

A new developer on an existing app runs the same script without a name:
`npm run setup` (or `node scripts/setup.mjs --reset` to also rebuild the
local database).

### 4.1 Start local Supabase

The script runs `npx supabase start` unless local Supabase is already running.
The first run downloads the Docker images and can take several minutes.

> Only one local Supabase can use the default ports (54321–54324) at a time.
> If another app's Supabase is running, stop it first: run
> `npx supabase stop` in that app's folder.

### 4.2 Create `.env.local`

The script copies `.env.example` to `.env.local` if it does not exist, reads
`npx supabase status -o env` and fills in:

| `.env.local` variable                  | Value from `status -o env`                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `API_URL`                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` (or `ANON_KEY`)                                             |
| `SUPABASE_SECRET_KEY`                  | `SECRET_KEY` (or `SERVICE_ROLE_KEY`) — only needed if the app uses `admin.ts` |

It only writes a variable that is empty or still has the `.env.example`
value. A value you changed on purpose is kept, and the script says so.

By hand:

```bash
cp .env.example .env.local          # macOS / Linux / Git Bash
Copy-Item .env.example .env.local   # Windows PowerShell
npx supabase status -o env
```

and copy the values using the table above.

`.env.local` is git-ignored. Never commit it.

### 4.3 Build the database and generate types

For a new app the script always runs:

```bash
npx supabase db reset
npm run db:types
```

Without an app name it only runs `db reset` when `--reset` is given, so a
developer's local data is not wiped by accident.

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

`scripts/new-app.mjs` commits, pushes and opens this pull request; with
`--merge` it also merges it. By hand:

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

`scripts/new-app.mjs` does 6.1–6.3 through the GitHub API. Check them once
in the settings; by hand:

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

The same rules are stored in `.github/rulesets/protect-main.json`. Instead of
clicking, you can import that file: **New ruleset → Import a ruleset**.

Save. From now on nothing reaches `main` without a PR and green CI.

### 6.3 Security features

**Settings → Advanced Security** (on some accounts: **Code security**):

- [ ] Dependabot alerts: on
- [ ] Dependabot security updates: on

---

## Phase 7 — Create the Supabase cloud project

One project. It serves both production and the Vercel previews (see
[Environments](#environments)).

### 7.1 Create the project

In the Supabase dashboard, **New project**:

| Setting           | Value                              |
| ----------------- | ---------------------------------- |
| Name              | `<app>-prod`                       |
| Database password | Generate, save in password manager |
| Region            | Central EU (Frankfurt)             |

The `-prod` suffix keeps the name unambiguous if a staging project is ever
added.

> Plan limits: the Free plan allows only a small number of active projects
> and pauses a project after a week without activity. Unpause it in the
> dashboard when needed. The Free plan has no point-in-time recovery; see
> Phase 12 for backups before risky migrations.

### 7.2 Collect the values

Write down (in the password manager, next to the DB password):

| Value            | Where in the dashboard                           |
| ---------------- | ------------------------------------------------ |
| Project ID (ref) | Project Settings → General                       |
| Project URL      | `https://<project-ref>.supabase.co`              |
| Publishable key  | Project Settings → API Keys (`sb_publishable_…`) |
| Secret key       | Project Settings → API Keys (`sb_secret_…`)      |

Do **not** create tables or policies in the dashboard. The schema arrives via
GitHub Actions in Phase 8.

> Dashboard **settings** (Auth URLs, email, SMTP) are configuration, not
> schema, and are set in the dashboard. The "migrations only" rule applies to
> tables, columns, policies, functions, triggers and storage policies.

---

## Phase 8 — Connect GitHub Actions to Supabase

The **Database migrations** workflow (`.github/workflows/db-push.yml`) runs
`supabase db push` against the production project whenever migrations change
on `main`.

### 8.1 Create a Supabase access token

Supabase dashboard → your avatar → **Account → Access Tokens → Generate new
token**. Name it `github-actions-<app>`. Copy it once; it is not shown again.

### 8.2 Add variables and secrets on GitHub

Repository → **Settings → Secrets and variables → Actions**.

**Variables** tab (not secret, visible in logs):

| Name                             | Value                 |
| -------------------------------- | --------------------- |
| `SUPABASE_PRODUCTION_PROJECT_ID` | production Project ID |

**Secrets** tab:

| Name                              | Value                  |
| --------------------------------- | ---------------------- |
| `SUPABASE_ACCESS_TOKEN`           | token from 8.1         |
| `SUPABASE_PRODUCTION_DB_PASSWORD` | production DB password |

### 8.3 Apply the existing migrations

**Actions → Database migrations → Run workflow**, branch **main**.

- [ ] **Push to production** is green.

Check in the Supabase project (Table Editor, read only) that the `profiles`
table exists.

If the workflow is started from any branch other than `main`, the job is
skipped. Production only ever receives migrations from `main`.

---

## Phase 9 — Deploy to Vercel

### 9.1 Import the project

Vercel → **Add New → Project** → import `<user>/<app>`. The framework is
detected as Next.js; leave the build settings at their defaults.

### 9.2 Environment variables

Before clicking **Deploy**, open **Environment Variables**. Add each variable
once and tick the environments it applies to; Production and Preview get the
**same** values:

| Variable                                           | Value                      | Environments                    |
| -------------------------------------------------- | -------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                         | prod Project URL           | Production, Preview             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`             | prod publishable           | Production, Preview             |
| `SUPABASE_SECRET_KEY` (only if `admin.ts` is used) | prod secret, **Sensitive** | Production (Preview: see below) |

Development stays empty: local development uses `.env.local`.

`SUPABASE_SECRET_KEY` bypasses Row Level Security. Tick **Preview** for it only
when a preview actually needs a feature that uses `admin.ts`: preview code has
not been merged yet, and with this key it has full access to production data.

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

### 10.1 URL configuration (`<app>-prod`)

**Authentication → URL Configuration**:

- Site URL: `https://<app>.vercel.app` (or your custom domain)
- Redirect URLs:
  - `https://<app>.vercel.app/**` — production
  - `https://*-<team-slug>.vercel.app/**` — previews

The second entry matches all preview deployments of your Vercel team and
nothing else. Previews need it because they use the production project.

### 10.2 Email

**Authentication → Sign In / Providers → Email**:

- [ ] **Confirm email**: on.

**Custom SMTP** (Authentication → Emails → SMTP Settings): Supabase's
built-in email sender is meant for testing and is heavily rate-limited. Set
up a real SMTP provider before real users sign up. For a personal app where
you are the only user, the built-in sender is enough.

---

## Phase 11 — Verify the environments

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
- [ ] Sign-in on the preview URL works and the confirmation email links
      back to the **preview** URL, not to production.

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
npx supabase db reset   # replays ALL migrations: the only test before production
npm run db:types

# Before pushing:
npm run lint && npm run format:check && npm run typecheck && npm run build

git add -A
git commit -m "feat: short description"
git push -u origin feat/short-description
```

Open a PR → checks green → preview works (only for PRs without a migration)
→ **Squash and merge** → the migration workflow updates production → Vercel
deploys production. Details: [`checklists/deploy.md`](./checklists/deploy.md).

### Migrations without staging

The production database is the first cloud database a migration reaches, so
write migrations that cannot fail on existing data and do not break the code
that is already running:

- **Add, then remove.** Add new columns and tables first. Rename or drop old
  ones in a later PR, after no code uses them.
- **New columns on existing tables** are nullable or have a default. A
  `not null` constraint without a default works locally on an empty table but
  fails in production when the table has rows. Fill the data first, then add
  the constraint in a separate migration.
- **Before a risky migration** (dropping a column or table, transforming
  data), take a backup of the production data:

  ```bash
  npx supabase link --project-ref <production-project-id>
  npx supabase db dump --linked --data-only -f backup.sql
  ```

  Keep `backup.sql` outside the repository; it contains real data.

---

## Troubleshooting

| Symptom                                                 | Likely cause and fix                                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `new-app.mjs` or `npm run setup` stops halfway          | Fix the cause it prints (usually Docker not running) and run the same command again. Every step is safe to repeat.                     |
| `supabase start` fails with Docker errors               | Docker Desktop is not running. Wait for _Engine running_. On Windows run `wsl --update` and restart.                                   |
| `supabase start` reports a port in use                  | Another app's local Supabase is running. Run `npx supabase stop` in that app's folder.                                                 |
| Local database of another app disappeared               | Both apps have the same `project_id`. Give each app a unique one (Phase 3).                                                            |
| App crashes with an environment variable error          | `.env.local` is missing or incomplete (locally) or the variable is missing for that environment (Vercel). Compare with `.env.example`. |
| Vercel build passes but the app uses the wrong database | A variable is not ticked for that environment, or not redeployed after changing a `NEXT_PUBLIC_` value.                                |
| Preview of a PR shows database errors                   | The PR contains a migration that is not in production yet. Expected: test it locally; it works after the merge.                        |
| Sign-in email links point to `localhost`                | Site URL / Redirect URLs not set in that Supabase project (Phase 10).                                                                  |
| Sign-in loop locally                                    | Mixing `localhost` and `127.0.0.1`. Use the host from `site_url`.                                                                      |
| `db push` fails: authentication                         | Wrong DB password secret or expired access token.                                                                                      |
| `db push` fails: migration history mismatch             | Someone changed the cloud schema in the dashboard, or a merged migration was edited. Fix with a new migration; never edit merged ones. |
| Cannot select `checks` in the ruleset                   | CI has not run yet in this repository. Finish Phase 5 first.                                                                           |
| `new-app.mjs`: ruleset not created on a private repo    | Private repositories on GitHub Free cannot enforce rulesets. Make the repository public or upgrade, or protect `main` by discipline.   |
| `new-app.mjs`: `git push` asks for credentials          | Run `gh auth setup-git` once, then run the script again.                                                                               |
