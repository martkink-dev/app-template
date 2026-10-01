## Phase 3 — Give the app its identity

The setup script does this phase and most of Phase 4 in one run. It works on
a branch, which becomes the first pull request (Phase 5) and makes CI run for
the first time.

Make sure Docker Desktop shows _Engine running_, then run in the repository
root:

```bash
npm run setup -- <app> --title "<App Title>" --description "<One sentence about the app>"
```

Without `--title` and `--description` the script asks for them; the default
title comes from the app name (`invoice-tracker` → `Invoice Tracker`).
Other options: `--locale et` sets the `<html lang>` value, `--skip-local`
changes only the files and skips Docker and Supabase. `npm run setup -- --help`
lists them all.

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
`npm run setup` (add `-- --reset` to rebuild the local database).

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
