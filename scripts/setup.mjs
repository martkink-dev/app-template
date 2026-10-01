#!/usr/bin/env node
/**
 * Sets up an app built from app-template.
 *
 * New app (scripts/new-app.mjs runs this for you; by hand, once, right
 * after cloning the new repository):
 *   node scripts/setup.mjs <app-name> [--title "Invoice Tracker"]
 *                          [--description "..."] [--locale en]
 *
 * Existing app (new developer or new computer):
 *   npm run setup            (or: node scripts/setup.mjs --reset)
 *
 * Flags are passed with `node scripts/setup.mjs ...` rather than
 * `npm run setup -- ...`, because Windows PowerShell can drop the `--`.
 *
 * What it does:
 *   1. Identity (only when <app-name> is given): switches to the
 *      chore/project-setup branch and updates package.json,
 *      package-lock.json, supabase/config.toml, src/config/site.ts,
 *      README.md and AGENTS.md.
 *   2. Local environment: starts local Supabase, creates and fills
 *      .env.local, rebuilds the local database (new app or --reset)
 *      and regenerates the database types.
 *
 * Every step is safe to run again. The script never commits, pushes or
 * touches cloud resources, and never prints secret values.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const TEMPLATE_NAME = "app-template";
const TEMPLATE_TITLE = "App Template";
const TEMPLATE_DESCRIPTION =
  "A starting point for web apps built with Next.js and Supabase.";
const TEMPLATE_AGENTS_LINE =
  "A web application built from the `app-template` framework.";
const SETUP_BRANCH = "chore/project-setup";
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// Template tools mention the template name on purpose.
const TEMPLATE_TOOLS = ["scripts/setup.mjs", "scripts/new-app.mjs"];

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: "string" },
    description: { type: "string" },
    locale: { type: "string" },
    reset: { type: "boolean", default: false },
    "skip-local": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = {
  step: (message) => console.log(`\n▶ ${message}`),
  ok: (message) => console.log(`  ✓ ${message}`),
  info: (message) => console.log(`  • ${message}`),
  warn: (message) => console.warn(`  ! ${message}`),
};

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

/**
 * Runs a fixed command string through the shell (needed for npx on Windows).
 * Never build the command from user input.
 */
function run(command, { capture = false, quiet = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : quiet ? "ignore" : "inherit",
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "" };
}

function read(path) {
  return readFileSync(path, "utf8");
}

/** Applies a transform to a file and writes it only if it changed. */
function update(path, transform) {
  if (!existsSync(path)) {
    log.warn(`${path} not found, skipped.`);
    return false;
  }
  const before = read(path);
  const after = transform(before);
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

async function ask(question, fallback) {
  if (!process.stdin.isTTY) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = fallback ? ` (${fallback})` : "";
  const answer = (await rl.question(`  ? ${question}${suffix}: `)).trim();
  rl.close();
  return answer || fallback;
}

function titleFromName(name) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Parses KEY=value lines (dotenv style). Quotes around values are removed. */
function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}

/** Replaces the value of `key: "..."` (first match) in a TS source file. */
function setTsString(source, key, value) {
  const pattern = new RegExp(`(\\b${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  return source.replace(pattern, (_, prefix) => prefix + JSON.stringify(value));
}

/**
 * Replaces a Markdown section (from its heading up to the next `## ` heading)
 * with new content. Returns the source unchanged if the heading is missing.
 */
function replaceSection(source, heading, content) {
  const start = source.indexOf(`\n${heading}\n`);
  if (start === -1) return source;
  const next = source.indexOf("\n## ", start + heading.length + 2);
  const end = next === -1 ? source.length : next;
  return `${source.slice(0, start)}\n${content}${source.slice(end)}`;
}

// ---------------------------------------------------------------------------
// Step 1: identity
// ---------------------------------------------------------------------------

function ensureSetupBranch() {
  const branch = run("git branch --show-current", { capture: true });
  if (!branch.ok) {
    log.warn("Not a git repository, branch not changed.");
    return;
  }
  const current = branch.stdout.trim();
  if (current !== "main" && current !== "master") {
    log.info(`Working on branch ${current}.`);
    return;
  }
  const exists = run(`git rev-parse --verify --quiet ${SETUP_BRANCH}`, {
    quiet: true,
  }).ok;
  const switched = run(`git switch ${exists ? "" : "-c "}${SETUP_BRANCH}`, {
    quiet: true,
  }).ok;
  if (!switched) fail(`Could not switch to branch ${SETUP_BRANCH}.`);
  log.ok(`Switched to branch ${SETUP_BRANCH}.`);
}

function gettingStartedSection(repoUrl, appName) {
  return [
    "## Getting started",
    "",
    "Install the prerequisites above, then:",
    "",
    "```bash",
    `git clone ${repoUrl}`,
    `cd ${appName}`,
    "npm install",
    "npm run setup",
    "npm run dev",
    "```",
    "",
    "`npm run setup` starts local Supabase (Docker Desktop must be running),",
    "creates `.env.local` with the local values and regenerates the database",
    "types. To rebuild the local database from the migrations and",
    "`seed.sql`, run `node scripts/setup.mjs --reset`.",
    "",
    "Open the URL shown in the terminal. Supabase Studio runs at",
    "<http://127.0.0.1:54323>.",
    "",
  ].join("\n");
}

async function setIdentity(appName) {
  log.step(`Identity: ${appName}`);
  ensureSetupBranch();

  const site = read("src/config/site.ts");
  const currentTitle = site.match(/\bname:\s*"([^"]*)"/)?.[1];
  const currentDescription = site.match(/\bdescription:\s*"([^"]*)"/)?.[1];
  const currentLocale = site.match(/\blocale:\s*"([^"]*)"/)?.[1] ?? "en";

  const title =
    options.title ??
    (await ask(
      "App title",
      currentTitle && currentTitle !== TEMPLATE_TITLE
        ? currentTitle
        : titleFromName(appName),
    ));
  const description =
    options.description ??
    (await ask(
      "One-sentence description",
      currentDescription && currentDescription !== TEMPLATE_DESCRIPTION
        ? currentDescription
        : `TODO: describe ${title}.`,
    ));
  const locale = options.locale ?? currentLocale;

  const changed = [];
  const track = (path, didChange) => didChange && changed.push(path);

  track(
    "package.json",
    update("package.json", (text) => {
      const pkg = JSON.parse(text);
      pkg.name = appName;
      return `${JSON.stringify(pkg, null, 2)}\n`;
    }),
  );

  track(
    "package-lock.json",
    update("package-lock.json", (text) => {
      const lock = JSON.parse(text);
      lock.name = appName;
      if (lock.packages?.[""]) lock.packages[""].name = appName;
      return `${JSON.stringify(lock, null, 2)}\n`;
    }),
  );

  track(
    "supabase/config.toml",
    update("supabase/config.toml", (text) =>
      text.replace(/^project_id = ".*"$/m, `project_id = "${appName}"`),
    ),
  );

  track(
    "src/config/site.ts",
    update("src/config/site.ts", (text) => {
      let next = setTsString(text, "name", title);
      next = setTsString(next, "description", description);
      return setTsString(next, "locale", locale);
    }),
  );

  const origin = run("git remote get-url origin", { capture: true });
  const repoUrl = origin.ok ? origin.stdout.trim() : "<repository-url>";

  track(
    "README.md",
    update("README.md", (text) => {
      let next = text;
      const stack = next.indexOf("\n## Stack\n");
      if (stack !== -1) {
        next = `# ${title}\n\n${description}\n${next.slice(stack)}`;
      } else {
        log.warn("README.md: '## Stack' not found, title not replaced.");
      }
      return replaceSection(
        next,
        "## Start a new app from this template",
        gettingStartedSection(repoUrl, appName),
      );
    }),
  );

  track(
    "AGENTS.md",
    update("AGENTS.md", (text) =>
      text.replace(
        TEMPLATE_AGENTS_LINE,
        `${description}\n\n<!-- TODO: who uses this app, and domain terms an AI assistant should know. -->`,
      ),
    ),
  );

  if (changed.length > 0) {
    run(`npx prettier --write ${changed.join(" ")}`, { quiet: true });
    for (const path of changed) log.ok(`Updated ${path}.`);
  } else {
    log.ok("Identity files already up to date.");
  }
}

// ---------------------------------------------------------------------------
// Step 2: local environment
// ---------------------------------------------------------------------------

function supabaseStatus() {
  const result = run("npx supabase status -o env", { capture: true });
  if (!result.ok) return null;
  const env = parseEnv(result.stdout);
  return env.API_URL ? env : null;
}

function writeEnvLocal(status) {
  const wanted = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  };

  if (!existsSync(".env.local")) {
    copyFileSync(".env.example", ".env.local");
    log.ok("Created .env.local from .env.example.");
  }

  const defaults = parseEnv(read(".env.example"));
  let content = read(".env.local");
  const current = parseEnv(content);

  for (const [key, value] of Object.entries(wanted)) {
    if (!value) {
      log.warn(`${key}: no value in supabase status, fill it in by hand.`);
      continue;
    }
    const existing = current[key];
    if (existing === value) continue;
    // A value that differs from .env.example was set on purpose: keep it.
    if (existing && existing !== defaults[key]) {
      log.warn(`${key} already has another value in .env.local, kept it.`);
      continue;
    }
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    content = pattern.test(content)
      ? content.replace(pattern, () => line)
      : `${content.trimEnd()}\n${line}\n`;
    log.ok(`Set ${key} in .env.local.`);
  }

  writeFileSync(".env.local", content);
}

function setupLocal({ reset }) {
  log.step("Local environment");

  if (!run("docker info", { quiet: true }).ok) {
    fail(
      "Docker is not running. Start Docker Desktop, wait for " +
        "'Engine running' and run this command again.",
    );
  }

  let status = supabaseStatus();
  if (status) {
    log.ok("Local Supabase is already running.");
  } else {
    log.info(
      "Starting local Supabase (the first run downloads Docker images " +
        "and can take several minutes)...",
    );
    if (!run("npx supabase start").ok) {
      fail(
        "supabase start failed. If a port is in use, another app's " +
          "Supabase is running: run `npx supabase stop` in that app's folder.",
      );
    }
    status = supabaseStatus();
    if (!status) fail("Could not read `npx supabase status -o env`.");
  }

  writeEnvLocal(status);

  if (reset) {
    log.info("Rebuilding the local database from migrations and seed.sql...");
    if (!run("npx supabase db reset").ok) fail("supabase db reset failed.");
    log.ok("Local database rebuilt.");
  } else {
    log.info("Local database kept (use --reset to rebuild it).");
  }

  if (!run("npm run db:types", { quiet: true }).ok) {
    fail("npm run db:types failed.");
  }
  log.ok("Regenerated src/types/database.types.ts.");
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** Lists tracked files outside docs/ that still mention the template name. */
function reportLeftovers() {
  const files = run("git ls-files", { capture: true });
  if (!files.ok) return;
  const hits = files.stdout
    .split(/\r?\n/)
    .filter((path) => path && !path.startsWith("docs/"))
    .filter((path) => !TEMPLATE_TOOLS.includes(path) && existsSync(path))
    .filter((path) => read(path).includes(TEMPLATE_NAME));
  if (hits.length === 0) {
    log.ok(`No '${TEMPLATE_NAME}' leftovers outside docs/.`);
    return;
  }
  log.warn(`Still mentions '${TEMPLATE_NAME}': ${hits.join(", ")}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/setup.mjs <app-name> [options]   Set up a new app
  node scripts/setup.mjs [--reset]              Local environment only

Options:
  --title <text>        App title (default: from the app name)
  --description <text>  One-sentence description
  --locale <code>       <html lang> value (default: current value)
  --reset               Rebuild the local database (always on for a new app)
  --skip-local          Only update identity files, skip Docker and Supabase
  -h, --help            Show this help`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (options.help) {
    printHelp();
    return;
  }
  if (!existsSync("package.json") || !existsSync("supabase/config.toml")) {
    fail("Run this from the repository root.");
  }

  const currentName = JSON.parse(read("package.json")).name;
  const appName = positionals[0];

  if (appName) {
    if (!NAME_PATTERN.test(appName)) {
      fail(`"${appName}" is not kebab-case (for example invoice-tracker).`);
    }
    if (appName === TEMPLATE_NAME) {
      fail(`Choose a name other than ${TEMPLATE_NAME}.`);
    }
    if (currentName !== TEMPLATE_NAME && currentName !== appName) {
      fail(
        `This repository is already named "${currentName}". ` +
          "Run without a name to set up the local environment.",
      );
    }
    await setIdentity(appName);
  } else if (currentName === TEMPLATE_NAME) {
    log.info(
      "This is the template itself. To start a new app, run: " +
        "node scripts/new-app.mjs <app-name> --private",
    );
  }

  if (options["skip-local"]) {
    log.info("Skipped local environment (--skip-local).");
  } else {
    setupLocal({ reset: Boolean(appName) || options.reset });
  }

  log.step("Done");
  if (appName) {
    reportLeftovers();
    // scripts/new-app.mjs commits, pushes and opens the PR itself.
    if (process.env.NEW_APP_RUNNING === "1") return;
    console.log(`
Next steps:
  1. Review the changes: git status, git diff
  2. Describe the app in AGENTS.md (Project section) and replace the
     content of src/app/(marketing)/page.tsx.
  3. npm run check
  4. git add -A && git commit -m "chore: set up project identity"
  5. git push -u origin ${SETUP_BRANCH} and open a pull request
     (docs/new-app-guide.md, Phase 5).`);
  } else {
    console.log("\nStart the app with: npm run dev");
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : error));
