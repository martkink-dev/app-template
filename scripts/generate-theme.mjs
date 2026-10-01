/**
 * Generates the Material Design 3 colour scheme (light and dark) from one
 * brand colour and writes it to src/styles/md3-theme.css.
 *
 * Uses Google's @material/material-color-utilities, the same algorithm as
 * Material Theme Builder, so the result matches what Theme Builder shows
 * for the same seed colour and scheme variant.
 *
 * Usage:
 *   npm run theme:generate -- --seed "#6750A4"
 *   npm run theme:generate -- --seed "#0B6E4F" --variant vibrant --contrast 0.5
 *
 * Options:
 *   --seed      Brand colour as #RRGGBB (required).
 *   --variant   tonal-spot (default) | neutral | vibrant | expressive |
 *               fidelity | content | monochrome
 *   --contrast  0 (standard, default) | 0.5 (medium) | 1 (high)
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeTonalSpot,
  SchemeVibrant,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

const OUTPUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/styles/md3-theme.css",
);

const VARIANTS = {
  "tonal-spot": SchemeTonalSpot,
  neutral: SchemeNeutral,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  monochrome: SchemeMonochrome,
};

// MD3 colour roles written to the CSS file, in output order.
// The CSS variable name is --md-sys-color-<kebab-case role>.
const ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "surface",
  "onSurface",
  "onSurfaceVariant",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "outline",
  "outlineVariant",
  "scrim",
  "shadow",
];

function fail(message) {
  console.error(`Error: ${message}`);
  console.error('Usage: npm run theme:generate -- --seed "#6750A4"');
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    seed: { type: "string" },
    variant: { type: "string", default: "tonal-spot" },
    contrast: { type: "string", default: "0" },
  },
});

if (!values.seed || !/^#[0-9a-fA-F]{6}$/.test(values.seed)) {
  fail("--seed must be a colour in the form #RRGGBB.");
}
const Scheme = VARIANTS[values.variant];
if (!Scheme) {
  fail(`--variant must be one of: ${Object.keys(VARIANTS).join(", ")}.`);
}
const contrast = Number(values.contrast);
if (!Number.isFinite(contrast) || contrast < -1 || contrast > 1) {
  fail("--contrast must be a number between -1 and 1.");
}

const seed = values.seed.toUpperCase();
const sourceHct = Hct.fromInt(argbFromHex(seed));

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function block(selector, isDark) {
  const scheme = new Scheme(sourceHct, isDark, contrast);
  const lines = ROLES.map((role) => {
    const argb = MaterialDynamicColors[role].getArgb(scheme);
    return `  --md-sys-color-${kebab(role)}: ${hexFromArgb(argb)};`;
  });
  return `${selector} {\n${lines.join("\n")}\n}`;
}

const css = `/*
 * Material Design 3 colour scheme. GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   npm run theme:generate -- --seed "${seed}" --variant ${values.variant} --contrast ${values.contrast}
 *
 * src/app/globals.css maps these MD3 roles to the shadcn/ui tokens
 * (--primary, --background, ...) that the components use.
 */

/* Light scheme */
${block(":root", false)}

/* Dark scheme (class set by next-themes on <html>) */
${block(".dark", true)}
`;

writeFileSync(OUTPUT, css);
console.log(
  `Wrote ${OUTPUT}\n  seed ${seed}, variant ${values.variant}, contrast ${values.contrast}`,
);
