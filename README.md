# app-template

A reusable starting point for web apps: Next.js + Supabase, with
invitation-only user management, CI, tests, security defaults and a
documented workflow.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase ·
Zod · ESLint · Prettier · Vitest · Playwright · pgTAP · Vercel ·
GitHub Actions

## What's included

- **App shell:** public pages, a signed-in area with sidebar navigation and
  centred sign-in pages (`src/app/(marketing)`, `(app)`, `(auth)`).
- **Invitation-only accounts:** no public sign-up. Admins create one-time
  invitation links and send them themselves; no email server is needed.
- **Roles and access:** `admin` and `member`, deactivation and deletion,
  enforced in the database with Row Level Security.
- **Passwords:** a password policy, admin-created reset links and an account
  page where users change their name and password.
- **Tests and CI:** unit tests, database (RLS) tests and E2E tests run on
  every pull request.

Details: [`docs/modules/user-management.md`](docs/modules/user-management.md).

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [Git](https://git-scm.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [VS Code](https://code.visualstudio.com) with the recommended extensions
  (VS Code suggests them when you open the project)

## Start a new app from this template

The quick version is below. The full step-by-step guide, including GitHub,
Supabase cloud and Vercel setup, is in
[`docs/new-app-guide.md`](docs/new-app-guide.md).

1. On GitHub, open this repository and click **Use this template → Create a new repository**.
2. Clone the new repository and install dependencies:

   ```bash
   git clone https://github.com/<user>/<new-app>.git
   cd <new-app>
   npm install
   ```

3. Give the app its own identity:
   - `package.json`: change `"name"`.
   - `supabase/config.toml`: change `project_id` to the app name.
     Each local project needs a unique id, otherwise Docker containers from
     different apps collide.
   - `src/config/site.ts`: change the app name, description and locale.

4. Start local Supabase (Docker Desktop must be running):

   ```bash
   npx supabase start
   ```

5. Create `.env.local` from the example and fill in the local values:

   ```bash
   cp .env.example .env.local
   npx supabase status -o env
   ```

   On Windows PowerShell use `Copy-Item .env.example .env.local`.
   Copy `API_URL` to `NEXT_PUBLIC_SUPABASE_URL`, `PUBLISHABLE_KEY`
   (or `ANON_KEY`) to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SECRET_KEY` (or `SERVICE_ROLE_KEY`) to `SUPABASE_SECRET_KEY`.

6. Build the database and start the app:

   ```bash
   npx supabase db reset
   npm run db:types
   npm run dev
   ```

7. Create the first admin. There is no sign-up page, so the first account
   comes from an invitation created in the terminal:

   ```bash
   npm run users:invite-admin -- you@example.com http://127.0.0.1:3000
   ```

   Open the printed link and set a password. Use `127.0.0.1`, not
   `localhost`, as in `site_url` in `supabase/config.toml`.
   Supabase Studio runs at <http://127.0.0.1:54323>.

## Daily workflow

```bash
git switch main
git pull
git switch -c feat/short-description
# ...make changes, commit with Conventional Commits...
npm run check
git push -u origin feat/short-description
```

Open a pull request on GitHub, wait for the **checks** and **integration**
jobs to pass, then **Squash and merge**. Finally run `git switch main` and
`git pull`.

## Database changes

```bash
npx supabase migration new describe_the_change
# write SQL in the new file under supabase/migrations/
# add or update tests in supabase/tests/database/
npx supabase db reset
npm run db:types
npm run test:db
```

Commit the regenerated `src/types/database.types.ts` with the migration;
CI type-checks against the committed file. Never change the schema in the
Supabase dashboard. Every table has Row Level Security enabled. See
`AGENTS.md` for the full rules.

## Scripts

| Command                        | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `npm run dev`                  | Start the dev server                                      |
| `npm run check`                | Format check, lint, typecheck, unit tests and build       |
| `npm run lint`                 | Run ESLint                                                |
| `npm run format`               | Format all files                                          |
| `npm run format:check`         | Check formatting                                          |
| `npm run typecheck`            | Type-check the project                                    |
| `npm run build`                | Production build                                          |
| `npm run test`                 | Unit and component tests (Vitest)                         |
| `npm run test:db`              | Database tests (pgTAP, needs local Supabase)              |
| `npm run test:e2e`             | E2E tests (Playwright, needs local Supabase)              |
| `npm run db:types`             | Regenerate database types from local Supabase             |
| `npm run users:invite-admin`   | Create an admin invitation link (`-- <email> [site-url]`) |
| `npm run users:reset-password` | Create a password reset link (`-- <email> [site-url]`)    |
| `npm run theme:generate`       | Generate the MD3 colour theme (`-- --seed "#RRGGBB"`)     |

## Environments

| Environment | App                   | Database                 |
| ----------- | --------------------- | ------------------------ |
| Local       | `npm run dev`         | Supabase CLI (Docker)    |
| Preview     | Vercel PR preview     | Supabase staging project |
| Production  | Vercel, `main` branch | Supabase production      |

## Troubleshooting

- **`supabase start` fails / Docker errors:** open Docker Desktop and wait
  until it shows _Engine running_. On Windows, run `wsl --update` and restart.
- **`supabase start` reports a port in use:** another app's local Supabase
  is running. Run `npx supabase stop` in that app's folder.
- **`supabase status` shows only the Storage box:** use
  `npx supabase status -o env`.
- **App fails with an environment variable error:** `.env.local` is missing
  or incomplete. Compare it with `.env.example`.
- **Nobody can sign in locally:** in `supabase/config.toml`,
  `[auth.email] enable_signup` must be `true` (it switches the whole email
  provider). Sign-up is blocked by `[auth] enable_signup = false`. Restart
  Supabase after changing the file.
- **Forgot the only admin's password:**
  `npm run users:reset-password -- you@example.com http://127.0.0.1:3000`.

More cases are listed in [`docs/new-app-guide.md`](docs/new-app-guide.md#troubleshooting).

## Guides and checklists

- [Guide: create a new app from the template](docs/new-app-guide.md)
- [Module: user management](docs/modules/user-management.md)
- [UI guidelines](docs/ui-guidelines.md)
- [Checklist: start a new app](docs/checklists/new-app.md)
- [Checklist: deploy](docs/checklists/deploy.md)
- [Checklist: security](docs/checklists/security.md)

## For AI assistants

Project rules are in [`AGENTS.md`](./AGENTS.md). `CLAUDE.md` imports it.
