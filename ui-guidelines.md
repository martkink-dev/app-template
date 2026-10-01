# UI guidelines

How the user interface is built in apps made from this template.
Short version: **tokens → components → layouts**. Change the bottom layer,
not the top.

## 1. Design tokens (`src/app/globals.css`)

All colours, the corner radius and fonts are CSS variables. Colours are named
by **role**, not by look:

| Token                      | Use for                                    |
| -------------------------- | ------------------------------------------ |
| `background`/`foreground`  | Page background and main text              |
| `primary`                  | The main action on a screen (one per view) |
| `secondary`                | Less important actions                     |
| `muted`/`muted-foreground` | Subtle backgrounds, secondary text         |
| `accent`                   | Hover and selected states                  |
| `destructive`              | Delete, errors                             |
| `border`/`input`/`ring`    | Borders, form fields, focus outline        |
| `card`/`popover`           | Surfaces above the page                    |
| `sidebar-*`                | The app sidebar                            |

Light values are in `:root`, dark values in `.dark`. Dark mode is handled by
`next-themes` (default: follow the operating system).

## 2. Rules

- **Never hard-code colours.** Use `bg-primary`, `text-muted-foreground`,
  `border-border`. Not `bg-blue-600`, `text-zinc-500` or `bg-[#383838]`.
  Hard-coded colours break dark mode and rebranding.
- **Spacing:** use the Tailwind scale and keep to a few steps:
  `gap-2` (inside a control), `gap-4` (between related items),
  `gap-6`/`gap-8` (between sections). Avoid arbitrary values like `mt-[13px]`.
- **Typography:** page title `text-2xl font-semibold tracking-tight`
  (use `PageHeader`); body text default size; secondary text
  `text-sm text-muted-foreground`. One font family per app.
- **Mobile first:** write the mobile layout first, add `sm:`, `md:`, `lg:`
  for larger screens. Check every page at 375 px width.
- **One primary button per view.** Other actions use `outline`, `ghost`
  or `secondary` variants.
- **Accessibility:** every icon-only button has `aria-label`; decorative icons
  have `aria-hidden`; form fields have a `<Label>`; keep the visible focus ring.
- **Copy:** sentence case, plain verbs. A button says what it does
  ("Save changes", not "Submit"). Empty states tell the user what to do next.

## 3. Components

- **Base components** live in `src/components/ui/` and come from shadcn/ui.
  Add new ones with `npx shadcn@latest add <name>`. Do not edit them unless
  you intentionally customise the look for every use.
- **Layout components** live in `src/components/layout/`:
  `Container`, `PageHeader`, `EmptyState`, `SiteHeader`, `AppNav`.
- **Feature components** live next to the feature
  (e.g. `src/components/projects/project-list.tsx`).
- Links that look like buttons: `<Link className={buttonVariants()} />`.
- Notifications: `toast("Saved")` from `sonner`.

## 4. Layouts and routes

| Route group           | Purpose                           | Layout                   |
| --------------------- | --------------------------------- | ------------------------ |
| `src/app/(marketing)` | Public pages (home, pricing, ...) | Header + footer          |
| `src/app/(app)`       | Signed-in area                    | Sidebar / mobile top bar |
| `src/app/(auth)`      | Sign in, sign up (when added)     | Centred card             |

Route groups (folders in brackets) do not appear in the URL.
New signed-in pages go in `src/app/(app)/<name>/page.tsx` and are added to
`appNav` in `src/config/site.ts`. Every page starts with `PageHeader`.

## 5. Branding a new app

1. Pick a theme in a theme editor (ui.shadcn.com/themes or tweakcn.com).
   Usually one brand colour for `--primary`; keep the rest neutral.
2. Paste the `:root` and `.dark` values into `src/app/globals.css`.
3. Optionally change the font in `src/app/layout.tsx`.
4. Change name, description and locale in `src/config/site.ts`.
5. Replace `src/app/favicon.ico` (and add `src/app/icon.png` if wanted).
6. Check contrast in both themes: text must stay readable on `primary`
   and on `muted` (WCAG AA, e.g. with the browser DevTools contrast checker).
