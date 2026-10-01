# Module: user management

Invitation-only user accounts with two roles, deactivation and deletion.
No email server is needed: the admin copies the invitation link and sends it
through any channel (email, chat, in person).

## Rules

- The username is the email address (stored in lowercase).
- Public sign-up is disabled. Accounts are created only from invitations.
- Roles: `admin` and `member` (`public.app_role`).
- Status: `active` or `inactive` (`public.account_status`).
- Password policy: at least 12 characters, lowercase and uppercase letters,
  a number and a symbol (`src/lib/validations/password.ts`). Supabase Auth
  enforces the same rules.
- An invitation link works once and expires after 72 hours
  (`INVITATION_TTL_HOURS` in `src/lib/users/config.ts`).
- Admins cannot change or delete their own account. This guarantees that at
  least one active admin always remains.

## How it works

**Invite.** `/admin/users` → _Create invitation_. The server creates a random
token, stores only its SHA-256 hash in `public.invitations` and shows the
link once: `https://<site>/invite/<token>`. A new invitation for the same
email cancels the previous open one.

**Accept.** `/invite/<token>` shows the email and a password form. The server
claims the invitation atomically, creates the Auth user with the secret key
(`email_confirm: true`, `app_metadata.role`), and signs the user in.
`public.handle_new_user()` creates the profile with the role.

**Cancel.** _Cancel invitation_ sets `revoked_at`; the link stops working.

**Reset a password.** `/admin/users` → _Create reset link_ on an active
user's row. Works like an invitation: one-time link
`https://<site>/reset-password/<token>`, valid for 24 hours
(`PASSWORD_RESET_TTL_HOURS`), only the hash is stored in
`public.password_resets`, a new link replaces the previous one. Admins cannot
create a link for themselves. If no admin can sign in:
`npm run users:reset-password -- you@example.com`. Resetting signs the user out on other devices.

**Account.** `/account` lets every user change their display name and their
password. Changing the password needs the current one and signs the user out
on other devices; so does resetting it with a link. Access tokens already
issued stay valid until they expire (1 hour by default).

**Deactivate.** Bans the user in Supabase Auth (no sign-in, no session
refresh) and sets `profiles.status = 'inactive'`. `getCurrentUser()` checks
the status on every request, so an access token issued before the ban cannot
be used either. _Activate_ reverses both.

**Delete.** Deletes the Auth user permanently; the profile is removed by
cascade. Prefer deactivation when the user owns data you want to keep.

## Files

| File                                                     | Purpose                                         |
| -------------------------------------------------------- | ----------------------------------------------- |
| `supabase/migrations/20261001090000_user_management.sql` | Roles, status, `is_admin()`, invitations, RLS   |
| `src/lib/auth/guards.ts`                                 | `getCurrentUser`, `requireUser`, `requireAdmin` |
| `src/lib/auth/actions.ts`                                | `signIn`, `signOut`                             |
| `src/lib/auth/safe-redirect.ts`                          | Validates the `next` parameter                  |
| `src/lib/users/config.ts`                                | TTL, ban duration, date display                 |
| `src/lib/users/tokens.ts`                                | Token generation and hashing                    |
| `src/lib/users/invitations.ts`                           | Looks up an open invitation by token            |
| `src/lib/validations/password.ts`                        | Password policy                                 |
| `src/lib/validations/users.ts`                           | Zod schemas for the module                      |
| `src/app/login/*`                                        | Sign-in page                                    |
| `src/app/invite/[token]/*`                               | Accept an invitation                            |
| `src/app/admin/users/*`                                  | Admin UI and Server Actions                     |
| `scripts/invite-admin.mjs`                               | Creates an admin invitation from the terminal   |
| `src/lib/users/password-resets.ts`                       | Looks up an open reset link by token            |
| `src/app/(auth)/reset-password/[token]/*`                | Set a new password from a reset link            |
| `scripts/reset-password.mjs`                             | Creates a reset link from the terminal          |

Required shadcn components:
`npx shadcn@latest add button input label card badge table`

## Where the secret key is used, and why

The rule is "use `admin.ts` only when there is no user context". This module
has three justified exceptions, each after the necessary check:

1. Accepting an invitation: the visitor has no account yet; the token is the
   authorisation.
2. Deactivating, activating and deleting users: the Supabase Auth admin API
   requires the secret key. Runs only after `requireAdmin()`.
3. Changing `role` or `status`: users cannot write these columns (column
   grants), so a user's own role can never be raised through the API. Runs
   only after `requireAdmin()`.

Creating and cancelling invitations use the admin's own session, so RLS is a
second line of defence there.

## Using roles in your app

In Server Components and Server Actions:

```ts
const user = await requireUser(); // any active user
const admin = await requireAdmin(); // admins only (404 for others)
```

In RLS policies:

```sql
using ((select public.is_admin()))
```

## When you add tables that reference users

Use `references auth.users (id) on delete cascade` (data belongs to the user)
or `on delete set null` (data belongs to the app). Without one of these,
deleting a user fails; the admin UI then suggests deactivating instead.

## First admin

Local:

```bash
npx supabase db reset
npm run users:invite-admin -- you@example.com
```

Open the printed link and set a password.

Staging or production: see "User management" in
[`docs/checklists/deploy.md`](../checklists/deploy.md).

## Not included (add when an app needs it)

- **More roles.** Add values to `public.app_role` in a new migration and to
  `APP_ROLES` in `src/lib/validations/users.ts`.
