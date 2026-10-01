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
| `npm run test`                      | Unit and component tests (Vitest)             |
| `npm run test:watch`                | Vitest in watch mode                          |
| `npm run test:e2e`                  | E2E tests (Playwright, starts the dev server) |
| `npm run test:db`                   | Database tests (pgTAP, needs local Supabase)  |
| `npx supabase start`                | Start local Supabase (Docker must be running) |
| `npx supabase db reset`             | Rebuild local DB from migrations + `seed.sql` |
| `npm run db:types`                  | Regenerate `src/types/database.types.ts`      |
| `npx supabase migration new <name>` | Create a new migration file                   |

Before finishing any task, `npm run check` must pass
(format check, lint, typecheck, tests, build).
If the task changes the database, `npm run test:db` must also pass.

## Project structure

```
src/
  app/                  Routes, layouts, pages (App Router)
  components/ui/        shadcn/ui components (add with `npx shadcn@latest add`)
  components/layout/    App shell: Container, PageHeader, EmptyState, nav
  config/site.ts        App name, description, locale, navigation
  lib/supabase/         Supabase clients (see below)
  lib/validations/      Zod schemas
  lib/env.ts            Validated public environment variables
  lib/utils.ts          cn() helper for class names
  types/                Generated database types
  proxy.ts              Next.js proxy: session refresh + route protection
e2e/                    Playwright E2E tests
supabase/
  migrations/           SQL migrations (the only way to change the schema)
  tests/database/       pgTAP database tests (RLS policies)
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

## Testing

- Unit/component tests: `*.test.ts(x)` next to the code (Vitest + Testing Library).
- E2E tests: `e2e/*.spec.ts` (Playwright). Use for pages, auth flows and
  async Server Components, which Vitest cannot render.
- Database tests: `supabase/tests/database/*.test.sql` (pgTAP).
  Every migration that creates a table must add `<table>.test.sql` that
  checks its RLS policies (copy the pattern in `profiles.test.sql`).
- Add or update tests with every feature or bug fix.

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

## Authentication model

- Accounts are created ONLY from invitations (`/invite/<token>`).
  Never add a sign-up page, a `signUp()` call or a "Create account" link.
- Public sign-up is disabled in `supabase/config.toml` and must stay
  disabled in the hosted projects.
- Signed-out pages (`/login`, `/invite`) live in `src/app/(auth)/`.
- Admin-only pages live under `src/app/(app)/admin/`, call `requireAdmin()`
  and use `adminOnly: true` in `appNav`.

## Code conventions

- TypeScript strict; avoid `any`. Use generated `Database` types.
- Use the `@/` import alias.
- Prefer Server Components; add `"use client"` only when needed.
- Do not hand-edit `src/types/database.types.ts` or `src/components/ui/*`
  unless intentionally customising a shadcn component.
- Code, file names and comments in English.
- Keep solutions simple; add complexity only when it is needed.

## UI rules

Read `docs/ui-guidelines.md` before building UI.

- Use semantic colour classes only (`bg-primary`, `text-muted-foreground`).
  Never hard-code colours (`bg-blue-600`, `bg-[#333]`).
- Every page starts with `PageHeader`; empty lists use `EmptyState`.
- Add shadcn components with `npx shadcn@latest add <name>`.
- Signed-in pages go in `src/app/(app)/` and are added to `appNav`.
- Mobile first; check layouts at 375 px width.
- Theme colours come from `src/styles/md3-theme.css` (generated, Material
  Design 3). Change them only with `npm run theme:generate`, never by hand.
- `src/components/ui/button.tsx` is customised (MD3); do not overwrite it.

## Git workflow

- `main` is protected. Work on a branch: `feat/...`, `fix/...`, `chore/...`,
  `docs/...`, `ci/...`.
- Commits and PR titles use Conventional Commits, e.g. `feat(auth): add login page`.
- PRs are merged with squash merge after CI passes.
