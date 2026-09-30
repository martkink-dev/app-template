# app-template

A reusable starting point for web apps: Next.js + Supabase, with CI,
security defaults and a documented workflow.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase ·
Zod · ESLint · Prettier · Vercel · GitHub Actions

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [Git](https://git-scm.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [VS Code](https://code.visualstudio.com) with the recommended extensions
  (VS Code suggests them when you open the project)

## Start a new app from this template

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
   Copy `API_URL` to `NEXT_PUBLIC_SUPABASE_URL` and `PUBLISHABLE_KEY`
   (or `ANON_KEY`) to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

6. Build the database and start the app:

   ```bash
   npx supabase db reset
   npm run db:types
   npm run dev
   ```

7. Open the URL shown in the terminal. Supabase Studio runs at
   <http://127.0.0.1:54323>.

## Daily workflow

```bash
git switch main
git pull
git switch -c feat/short-description
# ...make changes, commit with Conventional Commits...
git push -u origin feat/short-description
```

Open a pull request on GitHub, wait for the **checks** to pass, then
**Squash and merge**. Finally run `git switch main` and `git pull`.

## Database changes

```bash
npx supabase migration new describe_the_change
# write SQL in the new file under supabase/migrations/
npx supabase db reset
npm run db:types
```

Never change the schema in the Supabase dashboard. Every table has Row
Level Security enabled. See `AGENTS.md` for the full rules.

## Scripts

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server                          |
| `npm run lint`         | Run ESLint                                    |
| `npm run format`       | Format all files                              |
| `npm run format:check` | Check formatting                              |
| `npm run typecheck`    | Type-check the project                        |
| `npm run build`        | Production build                              |
| `npm run db:types`     | Regenerate database types from local Supabase |

## Environments

| Environment | App                   | Database                 |
| ----------- | --------------------- | ------------------------ |
| Local       | `npm run dev`         | Supabase CLI (Docker)    |
| Preview     | Vercel PR preview     | Supabase staging project |
| Production  | Vercel, `main` branch | Supabase production      |

## Troubleshooting

- **`supabase start` fails / Docker errors:** open Docker Desktop and wait
  until it shows _Engine running_. On Windows, run `wsl --update` and restart.
- **`supabase status` shows only the Storage box:** use
  `npx supabase status -o env`.
- **App fails with an environment variable error:** `.env.local` is missing
  or incomplete. Compare it with `.env.example`.

## Checklists

- [Start a new app](docs/checklists/new-app.md)
- [Deploy](docs/checklists/deploy.md)
- [Security](docs/checklists/security.md)
- [User management module](docs/modules/user-management.md)

## Checklists

- [Start a new app](docs/checklists/new-app.md)
- [Deploy](docs/checklists/deploy.md)
- [Security](docs/checklists/security.md)

## For AI assistants

Project rules are in [`AGENTS.md`](./AGENTS.md). `CLAUDE.md` imports it.
