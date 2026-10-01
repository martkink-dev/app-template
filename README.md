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
- [GitHub CLI](https://cli.github.com), signed in with `gh auth login`
  (only for creating new apps)

## Start a new app from this template

In this folder, with Docker Desktop running:

```bash
git switch main
git pull
node scripts/new-app.mjs <new-app> --private --description "One sentence about the app"
```

The script creates the GitHub repository from this template, clones it next
to this folder, gives it its own identity, starts local Supabase, opens the
first pull request and sets up branch protection. Use `--public` for a public
repository and `--merge` to merge the first pull request when CI is green.

The full guide, including how to do each step by hand and the Supabase cloud
and Vercel setup, is in [`docs/new-app-guide.md`](docs/new-app-guide.md).

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

| Command                | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `npm run setup`        | Set up the local environment (Supabase, `.env.local`, types) |
| `npm run new-app`      | Create a new app from this template (template only)          |
| `npm run dev`          | Start the dev server                                         |
| `npm run lint`         | Run ESLint                                                   |
| `npm run format`       | Format all files                                             |
| `npm run format:check` | Check formatting                                             |
| `npm run typecheck`    | Type-check the project                                       |
| `npm run build`        | Production build                                             |
| `npm run db:types`     | Regenerate database types from local Supabase                |

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
  or incomplete. Run `npm run setup` or compare it with `.env.example`.

More cases are listed in [`docs/new-app-guide.md`](docs/new-app-guide.md#troubleshooting).

## Guides and checklists

- [Guide: create a new app from the template](docs/new-app-guide.md)
- [Checklist: start a new app](docs/checklists/new-app.md)
- [Checklist: deploy](docs/checklists/deploy.md)
- [Checklist: security](docs/checklists/security.md)

## For AI assistants

Project rules are in [`AGENTS.md`](./AGENTS.md). `CLAUDE.md` imports it.
