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

| Command                             | Purpose                                             |
| ----------------------------------- | --------------------------------------------------- |
| `npm run dev`                       | Start the dev server                                |
| `npm run check`                     | Format check, lint, typecheck, tests, build         |
| `npm run lint`                      | ESLint                                              |
| `npm run format`                    | Format all files with Prettier                      |
| `npm run format:check`              | Check formatting (used in CI)                       |
| `npm run typecheck`                 | Generate Next.js route types and run `tsc`          |
| `npm run build`                     | Production build                                    |
| `npm run test`                      | Unit and component tests (Vitest)                   |
| `npm run test:watch`                | Vitest in watch mode                                |
| `npm run test:e2e`                  | E2E tests (Playwright, needs local Supabase)        |
| `npm run test:db`                   | Database tests (pgTAP, needs local Supabase)        |
| `npx supabase start`                | Start local Supabase (Docker must be running)       |
| `npx supabase db reset`             | Rebuild local DB from migrations + `seed.sql`       |
| `npm run db:types`                  | Regenerate `src/types/database.types.ts`            |
| `npx supabase migration new <name>` | Create a new migration file                         |
| `npm run users:invite-admin`        | Admin invitation link from the terminal             |
| `npm run users:reset-password`      | Password reset link from the terminal               |
| `npm run setup`                     | Set up identity (new app) and local environment     |
| `npm run new-app`                   | Create a new app from this template (template only) |

Before finishing any task, `npm run check` must pass
(format check, lint, typecheck, tests, build).
If the task changes the database, `npm run test:db` must also pass.
If the task changes pages or auth flows, `npm run test:e2e` must also pass.

## Project structure

```
src/
  app/(marketing)/      Public pages (header + footer)
  app/(app)/            Signed-in area (app shell); admin pages in admin/
  app/(auth)/           Signed-out pages: login, invite, reset-password
  components/ui/        shadcn/ui components (add with `npx shadcn@latest add`)
  components/layout/    App shell: Container, PageHeader, EmptyState, nav
  config/site.ts        App name, description, locale, navigation
  lib/auth/             Guards (requireUser, requireAdmin), sign-in actions
  lib/supabase/         Supabase clients (see below)
  lib/users/            User management: config, link tokens, lookups
  lib/validations/      Zod schemas
  lib/env.ts            Validated public environment variables
  lib/utils.ts          cn() helper for class names
  types/                Generated database types
  proxy.ts              Next.js proxy: session refresh + route protection
e2e/                    Playwright E2E tests; helpers in e2e/support/
scripts/                Terminal tools (admin invitation, password reset)
docs/                   Guides, checklists, module docs
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
   and commit the regenerated types together with the migration. CI
   type-checks against the committed file, so forgetting this fails the build.
   Create migrations with `npx supabase migration new`; a file without the
   timestamp prefix is silently ignored.
5. Reuse `public.set_updated_at()` for `updated_at` columns.

## Testing

- Unit/component tests: `*.test.ts(x)` next to the code (Vitest + Testing Library).
- E2E tests: `e2e/*.spec.ts` (Playwright). Use for pages, auth flows and
  async Server Components, which Vitest cannot render.
- Database tests: `supabase/tests/database/*.test.sql` (pgTAP).
  Every migration that creates a table must add `<table>.test.sql` that
  checks its RLS policies (copy the pattern in `profiles.test.sql`).
- `rls_enabled.test.sql` fails if any table in `public` has RLS disabled.
  Never weaken or delete this test.
- pgTAP tests insert into `auth.users` directly. Supabase Auth behaves
  differently (for example it writes `app_metadata` after the insert), so
  flows that depend on Auth need an E2E test as well.
- E2E tests create their own users with `e2e/support/users.ts` (secret key,
  local Supabase only) and delete them afterwards.
- Add or update tests with every feature or bug fix.

## Supabase clients: which one to use

| File                     | Where                                     | Key         | RLS      |
| ------------------------ | ----------------------------------------- | ----------- | -------- |
| `lib/supabase/client.ts` | Client Components (`"use client"`)        | publishable | applies  |
| `lib/supabase/server.ts` | Server Components, Server Actions, Routes | publishable | applies  |
| `lib/supabase/admin.ts`  | Trusted server code only (see below)      | **secret**  | bypassed |

- Default to `server.ts`. Use `admin.ts` only when there is no user context
  (webhooks, cron, a visitor opening an invitation or reset link), or after
  `requireAdmin()` when the Auth admin API or protected columns require it.
  Justify every use in a code comment.
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
- `public.handle_new_user()` creates every profile as `member`. Roles are set
  by trusted server code after the user is created. Never read roles from
  `app_metadata`: Supabase Auth writes it after the insert trigger has run.
- New tables referencing users need `on delete cascade` or `on delete set null`.
- Users change their own name and password on `/account`; changing a
  password requires the current one.

## Authentication model

- Accounts are created ONLY from invitations (`/invite/<token>`).
  Never add a sign-up page, a `signUp()` call or a "Create account" link.
- Public sign-up is disabled by `[auth] enable_signup = false` in
  `supabase/config.toml` and must stay disabled in the hosted projects.
  `[auth.email] enable_signup` must stay `true`: despite its name it switches
  the whole email provider, including password sign-in.
- The app sends no emails. Invitations and password resets are one-time
  links that an admin sends: only a SHA-256 hash of the token is stored, the
  link expires and is claimed atomically. Follow the same pattern for any
  new link type. Keep Supabase "Secure password change" off (it needs email).
- Signed-out pages (`/login`, `/invite`, `/reset-password`) live in
  `src/app/(auth)/`; their paths are in `PUBLIC_PATHS`.
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
- PRs are merged with squash merge after the required checks pass:
  `checks` and `integration`.

## Environments

- Local: Supabase CLI. Production: one Supabase project, also used by Vercel
  preview deployments. There is no staging database.
- Never run anything against the cloud project from a feature branch.
  Migrations reach production only through `db-push.yml` after a merge to
  `main`.

## Migration rules (no staging)

- Run `npx supabase db reset` after every migration change; it is the only
  test before production.
- Migrations must be backward compatible: add first, rename or drop in a
  later PR once no code uses the old name.
- New columns on existing tables are nullable or have a default. Add
  `not null` in a separate migration after the data is filled.
- Never edit a migration that has been merged; write a new one.
