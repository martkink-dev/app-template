# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Copilot, etc.)
working in this repository. Read this file fully before making changes.

## Project

A web application built from the `app-template` framework.

Stack (do not change without an explicit decision from the owner):

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth, Storage (via `@supabase/ssr`)
- Zod for validation
- ESLint + Prettier
- Vercel for hosting, GitHub Actions for CI

## Commands

| Command                             | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `npm run dev`                       | Start the dev server                          |
| `npm run lint`                      | ESLint                                        |
| `npm run format`                    | Format all files with Prettier                |
| `npm run format:check`              | Check formatting (used in CI)                 |
| `npm run typecheck`                 | Generate Next.js route types and run `tsc`    |
| `npm run build`                     | Production build                              |
| `npx supabase start`                | Start local Supabase (Docker must be running) |
| `npx supabase db reset`             | Rebuild local DB from migrations + `seed.sql` |
| `npm run db:types`                  | Regenerate `src/types/database.types.ts`      |
| `npx supabase migration new <name>` | Create a new migration file                   |

Before finishing any task, all of these must pass:
`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`.

## Project structure

```
src/
  app/                  Routes, layouts, pages (App Router)
  components/ui/        shadcn/ui components (add with `npx shadcn@latest add`)
  lib/supabase/         Supabase clients (see below)
  lib/validations/      Zod schemas
  lib/env.ts            Validated public environment variables
  types/                Generated database types
  proxy.ts              Next.js proxy: session refresh + route protection
supabase/
  migrations/           SQL migrations (the only way to change the schema)
  seed.sql              Local development seed data
```

## Database rules (strict)

1. **Schema changes only via migrations** in `supabase/migrations/`.
   Never suggest changing tables, policies or functions in the Supabase dashboard.
   Never edit a migration that has already been merged to `main`; create a new one.
2. **Row Level Security on every table.** Every migration that creates a table must:
   - `enable row level security`
   - `revoke all ... from anon, authenticated`, then `grant` only what is needed
   - add explicit policies, using `(select auth.uid())` rather than `auth.uid()`
3. Functions use `set search_path = ''` and fully qualified names (`public.x`).
   Use `security definer` only when required, and explain why in a comment.
4. After adding a migration, run `npx supabase db reset` and `npm run db:types`,
   and commit the regenerated types together with the migration.
5. Reuse `public.set_updated_at()` for `updated_at` columns.

## Supabase clients: which one to use

| File                     | Where                                     | Key         | RLS      |
| ------------------------ | ----------------------------------------- | ----------- | -------- |
| `lib/supabase/client.ts` | Client Components (`"use client"`)        | publishable | applies  |
| `lib/supabase/server.ts` | Server Components, Server Actions, Routes | publishable | applies  |
| `lib/supabase/admin.ts`  | Trusted server code only (webhooks, cron) | **secret**  | bypassed |

- Default to `server.ts`. Use `admin.ts` only when there is no user context,
  and justify it in a code comment.
- Create a new server client per request; never store it in a module variable.
- To check auth on the server, use `supabase.auth.getClaims()`.
  Never trust `getSession()` in server code.
- Protected routes are handled in `lib/supabase/proxy.ts` (`PUBLIC_PATHS`).
  Pages and Server Actions must still check the user themselves; the proxy
  is not the only line of defence.

## Security rules

- The secret key (`SUPABASE_SECRET_KEY`, formerly `service_role`) must never
  reach client code. Never prefix it with `NEXT_PUBLIC_`.
- Files that must stay on the server start with `import "server-only";`.
- Validate all external input (forms, Server Actions, route params, webhooks)
  with Zod on the server, even if it is also validated on the client.
- Never commit secrets. Local values live in `.env.local` (git-ignored).
  When adding a variable, also add it (without a value) to `.env.example`.

## User management

- Roles and invitations: see `docs/modules/user-management.md`.
- Protect pages and Server Actions with `requireUser()` or `requireAdmin()`
  from `src/lib/auth/guards.ts`. In RLS use `(select public.is_admin())`.
- Never let users write `profiles.role`, `status` or `email`.
- New tables referencing users need `on delete cascade` or `on delete set null`.

## Code conventions

- TypeScript strict; avoid `any`. Use generated `Database` types.
- Use the `@/` import alias.
- Prefer Server Components; add `"use client"` only when needed.
- Do not hand-edit `src/types/database.types.ts` or `src/components/ui/*`
  unless intentionally customising a shadcn component.
- Code, file names and comments in English.
- Keep solutions simple; add complexity only when it is needed.

## Git workflow

- `main` is protected. Work on a branch: `feat/...`, `fix/...`, `chore/...`,
  `docs/...`, `ci/...`.
- Commits and PR titles use Conventional Commits, e.g. `feat(auth): add login page`.
- PRs are merged with squash merge after CI passes.
