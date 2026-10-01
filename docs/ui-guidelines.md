# UI guidelines

How the user interface is built in apps made from this template.
Short version: **tokens → components → layouts**. Change the bottom layer,
not the top.

The visual language is **Material Design 3 (MD3)**: its colour system,
shapes and font, applied to shadcn/ui components. It is MD3 in look, not a
pixel-perfect MD3 implementation (there is no ripple effect, for example).

## 1. Design tokens

All colours, the corner radius and fonts are CSS variables, in two layers:

| File                       | Contains                                               | Edit                               |
| -------------------------- | ------------------------------------------------------ | ---------------------------------- |
| `src/styles/md3-theme.css` | MD3 colour scheme (`--md-sys-color-*`), light and dark | Only with `npm run theme:generate` |
| `src/app/globals.css`      | Maps MD3 roles to shadcn/ui tokens, radius, fonts      | Rarely                             |

Colours are named by **role**, not by look:

| Token                      | MD3 role                                         | Use for                                    |
| -------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `background`/`foreground`  | `surface`/`on-surface`                           | Page background and main text              |
| `primary`                  | `primary`                                        | The main action on a screen (one per view) |
| `secondary`                | `secondary-container`                            | Tonal buttons, badges, selected items      |
| `muted`/`muted-foreground` | `surface-container-highest`/`on-surface-variant` | Subtle backgrounds, secondary text         |
| `accent`                   | `secondary-container`                            | Hover and selected states                  |
| `destructive`              | `error`                                          | Delete, errors                             |
| `border`/`input`/`ring`    | `outline-variant`/`outline`/`primary`            | Borders, form fields, focus outline        |
| `card`/`popover`           | `surface-container-low`/`surface-container`      | Surfaces above the page                    |
| `sidebar-*`                | `surface-container` and others                   | The app sidebar                            |

Extra MD3 roles are available as Tailwind colours when the shadcn tokens are
not enough: `tertiary`, `tertiary-container`, `primary-container`,
`error-container` (each with a `-foreground`), `surface-container-lowest` …
`surface-container-highest`, `outline`, `outline-variant`, `inverse-surface`,
`inverse-foreground`, `inverse-primary`. Example:
`bg-tertiary-container text-tertiary-container-foreground`.

**Surfaces instead of shadows.** MD3 separates layers mostly by tone: a
panel on the page uses a `surface-container-*` colour, not a shadow. The
higher the container, the more emphasis.

Dark mode is handled by `next-themes` (default: follow the operating
system). It switches the `.dark` block in `md3-theme.css`.

## 2. Rules

- **Never hard-code colours.** Use `bg-primary`, `text-muted-foreground`,
  `border-border`. Not `bg-blue-600`, `text-zinc-500` or `bg-[#383838]`.
  Hard-coded colours break dark mode and rebranding.
- **Spacing:** use the Tailwind scale and keep to a few steps:
  `gap-2` (inside a control), `gap-4` (between related items),
  `gap-6`/`gap-8` (between sections). Avoid arbitrary values like `mt-[13px]`.
- **Typography:** page title `text-2xl font-semibold tracking-tight`
  (use `PageHeader`); body text default size; secondary text
  `text-sm text-muted-foreground`. One font family per app (Roboto Flex by
  default).
- **Mobile first:** write the mobile layout first, add `sm:`, `md:`, `lg:`
  for larger screens. Check every page at 375 px width.
- **One primary (filled) button per view.** See _Buttons_ below.
- **Accessibility:** every icon-only button has `aria-label`; decorative icons
  have `aria-hidden`; form fields have a `<Label>`; keep the visible focus ring.
- **Copy:** sentence case, plain verbs. A button says what it does
  ("Save changes", not "Submit"). Empty states tell the user what to do next.

## 3. Components

- **Base components** live in `src/components/ui/` and come from shadcn/ui.
  Add new ones with `npx shadcn@latest add <name>`. Do not edit them unless
  you intentionally customise the look for every use.
- **Customised base components** (do not overwrite them with
  `shadcn add`): `button.tsx` (MD3 buttons).
- **Layout components** live in `src/components/layout/`:
  `Container`, `PageHeader`, `EmptyState`, `SiteHeader`, `AppNav`.
- **Feature components** live next to the feature
  (e.g. `src/components/projects/project-list.tsx`).
- Links that look like buttons: `<Link className={buttonVariants()} />`.
- Notifications: `toast("Saved")` from `sonner`.

### Buttons (MD3)

All buttons are pill-shaped and 40 px high by default. Pick the variant by
emphasis, highest first:

| Variant       | MD3 type    | Use for                                             |
| ------------- | ----------- | --------------------------------------------------- |
| `default`     | Filled      | The main action of the view (only one)              |
| `secondary`   | Tonal       | Important actions that are not the main one         |
| `elevated`    | Elevated    | A button that must stand out from a busy background |
| `outline`     | Outlined    | Medium emphasis, often next to a filled button      |
| `ghost`       | Text        | Low emphasis (Cancel, Learn more)                   |
| `destructive` | Error tonal | Delete and other irreversible actions               |
| `link`        | —           | A link inside text                                  |

`ghost` with an icon size (`icon`, `icon-sm`, …) gives the MD3 standard icon
button (neutral colour). Sizes: `xs` 24 px, `sm` 32 px, `default` 40 px,
`lg` 48 px.

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

1. Choose the brand colour. Material Theme Builder
   (material-foundation.github.io/material-theme-builder) shows the full
   light and dark scheme for a colour before you commit to it.
2. Generate the scheme:

   ```bash
   npm run theme:generate -- --seed "#RRGGBB"
   ```

   Optional: `--variant` (`tonal-spot` default, `neutral`, `vibrant`,
   `expressive`, `fidelity`, `content`, `monochrome`) and `--contrast`
   (`0` default, `0.5` medium, `1` high). The command used is written at the
   top of `src/styles/md3-theme.css`, so it can be repeated later.

3. Optionally change the font in `src/app/layout.tsx` (keep the variable
   names `--font-app-sans` and `--font-app-mono`).
4. Change name, description and locale in `src/config/site.ts`.
5. Replace `src/app/favicon.ico` (and add `src/app/icon.png` if wanted).
6. Check both themes in the browser. MD3 schemes are built to meet contrast
   requirements, but check text on `primary` and on `muted` anyway
   (WCAG AA, e.g. with the browser DevTools contrast checker).
