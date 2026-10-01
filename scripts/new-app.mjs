#!/usr/bin/env node
/**
 * Creates a new app from this template on GitHub and sets it up locally.
 * Run it from the app-template repository folder:
 *
 *   node scripts/new-app.mjs <app-name> --private|--public
 *        [--description "..."] [--title "..."] [--locale et]
 *        [--owner <user-or-org>] [--merge]
 *
 * Covers phases 2–6 of docs/new-app-guide.md:
 *   2    create the repository from the template and clone it next to
 *        this folder
 *   3–4  identity and local environment (runs scripts/setup.mjs)
 *   5    first commit, push and pull request
 *   6    pull request settings, Dependabot, waits for CI, then creates the
 *        protect-main ruleset (.github/rulesets/protect-main.json)
 * With --merge it also squash-merges the first pull request when CI is green.
 * Cloud setup (phases 7–10) stays manual.
 *
 * Safe to run again with the same arguments: finished steps are skipped.
 * Nothing is created on GitHub until all checks at the start have passed.
 * Requires: GitHub CLI (gh) signed in, Git, Docker Desktop running.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

const TEMPLATE_NAME = "app-template";
const SETUP_BRANCH = "chore/project-setup";
const PR_TITLE = "chore: set up project identity";
const RULESET_NAME = "protect-main";
const RULESET_FILE = ".github/rulesets/protect-main.json";
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const PR_BODY = `## What and why

Created by \`scripts/new-app.mjs\` from the app template.

- Identity set by \`scripts/setup.mjs\`: \`package.json\`,
  \`supabase/config.toml\`, \`src/config/site.ts\`, \`README.md\`, \`AGENTS.md\`.
- The local environment was started and the database types regenerated.

Next: \`docs/new-app-guide.md\`, Phase 7 (Supabase cloud projects).`;

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    public: { type: "boolean", default: false },
    private: { type: "boolean", default: false },
    description: { type: "string" },
    title: { type: "string" },
    locale: { type: "string" },
    owner: { type: "string" },
    merge: { type: "boolean", default: false },
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
 * Runs an executable without a shell, so arguments (titles, descriptions)
 * are passed exactly as given and cannot be interpreted by a shell.
 */
function exec(file, args, { cwd, capture = false } = {}) {
  const result = spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) {
    return { ok: false, stdout: "", stderr: result.error.message };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const gh = (args, opts) => exec("gh", args, opts);
const git = (args, opts) => exec("git", args, opts);

/** npm is a .cmd file on Windows and needs a shell; only fixed commands. */
function npm(command, cwd) {
  return (
    spawnSync(`npm ${command}`, { cwd, shell: true, stdio: "inherit" })
      .status === 0
  );
}

function firstLine(text) {
  return text.trim().split(/\r?\n/)[0] ?? "";
}

async function ask(question) {
  if (!process.stdin.isTTY) return "";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  ? ${question}: `)).trim();
  rl.close();
  return answer;
}

/** Polls `check` every 5 seconds until it returns true or time runs out. */
async function waitFor(check, seconds) {
  for (let waited = 0; waited <= seconds; waited += 5) {
    if (check()) return true;
    await sleep(5000);
  }
  return false;
}

function printHelp() {
  console.log(`Usage (from the app-template folder):
  node scripts/new-app.mjs <app-name> --private|--public [options]

Options:
  --description <text>  One-sentence description (repository and app)
  --title <text>        App title (default: from the app name)
  --locale <code>       <html lang> value, for example et
  --owner <name>        GitHub user or organisation (default: template owner)
  --merge               Squash-merge the first pull request when CI is green
  -h, --help            Show this help`);
}

// ---------------------------------------------------------------------------
// Checks (nothing is created before these pass)
// ---------------------------------------------------------------------------

async function preflight() {
  log.step("Checks");

  if (
    !existsSync("package.json") ||
    JSON.parse(readFileSync("package.json", "utf8")).name !== TEMPLATE_NAME
  ) {
    fail("Run this from the app-template repository folder.");
  }

  const appName = positionals[0];
  if (!appName) fail("Pass the app name, for example: invoice-tracker");
  if (!NAME_PATTERN.test(appName)) {
    fail(`"${appName}" is not kebab-case (for example invoice-tracker).`);
  }
  if (appName === TEMPLATE_NAME) {
    fail(`Choose a name other than ${TEMPLATE_NAME}.`);
  }

  if (options.public && options.private) {
    fail("Choose either --public or --private, not both.");
  }
  let visibility = options.public
    ? "public"
    : options.private
      ? "private"
      : (await ask("Visibility (public/private)")).toLowerCase();
  if (visibility !== "public" && visibility !== "private") {
    fail("Pass --public or --private.");
  }

  if (!gh(["--version"], { capture: true }).ok) {
    fail(
      "GitHub CLI (gh) not found. Install it from https://cli.github.com " +
        "and run: gh auth login",
    );
  }
  if (!gh(["auth", "status"], { capture: true }).ok) {
    fail("GitHub CLI is not signed in. Run: gh auth login");
  }
  log.ok("GitHub CLI is signed in.");

  if (!git(["config", "user.email"], { capture: true }).stdout.trim()) {
    fail(
      "Git has no user. Run: git config --global user.name " +
        '"Your Name" and git config --global user.email you@example.com',
    );
  }

  if (!exec("docker", ["info"], { capture: true }).ok) {
    fail(
      "Docker is not running. Start Docker Desktop, wait for " +
        "'Engine running' and run this command again.",
    );
  }
  log.ok("Git and Docker are ready.");

  const view = gh(["repo", "view", "--json", "nameWithOwner,isTemplate"], {
    capture: true,
  });
  if (!view.ok)
    fail(`Could not read this repository on GitHub: ${firstLine(view.stderr)}`);
  const template = JSON.parse(view.stdout);
  if (!template.isTemplate) {
    fail(
      `${template.nameWithOwner} is not marked as a template. On GitHub: ` +
        "Settings → General → Template repository.",
    );
  }
  log.ok(`Template: ${template.nameWithOwner}`);

  const owner = options.owner ?? template.nameWithOwner.split("/")[0];
  const description =
    options.description ?? (await ask("One-sentence description of the app"));

  return {
    appName,
    visibility,
    description: description || undefined,
    template: template.nameWithOwner,
    repo: `${owner}/${appName}`,
    dir: resolve(process.cwd(), "..", appName),
  };
}

// ---------------------------------------------------------------------------
// Phase 2: repository
// ---------------------------------------------------------------------------

async function createRepository({
  repo,
  template,
  visibility,
  description,
  dir,
}) {
  log.step(`Repository ${repo}`);

  if (gh(["repo", "view", repo, "--json", "name"], { capture: true }).ok) {
    log.info("Already exists on GitHub, reusing it.");
  } else {
    const args = [
      "repo",
      "create",
      repo,
      "--template",
      template,
      `--${visibility}`,
    ];
    if (description) args.push("--description", description);
    const created = gh(args, { capture: true });
    if (!created.ok)
      fail(`gh repo create failed: ${firstLine(created.stderr)}`);
    log.ok(`Created ${visibility} repository.`);
  }

  // GitHub copies the template files in the background; cloning too early
  // gives an empty repository.
  const ready = await waitFor(
    () => gh(["api", `repos/${repo}/branches/main`], { capture: true }).ok,
    90,
  );
  if (!ready)
    fail(
      "GitHub has not finished copying the template. Run this command again in a minute.",
    );

  if (existsSync(dir)) {
    const origin = git(["remote", "get-url", "origin"], {
      cwd: dir,
      capture: true,
    });
    const matches = origin.stdout.toLowerCase().includes(repo.toLowerCase());
    if (!matches) fail(`${dir} already exists and is not a clone of ${repo}.`);
    log.info(`Using existing folder ${dir}.`);
  } else {
    if (!gh(["repo", "clone", repo, dir]).ok) fail("Cloning failed.");
    log.ok(`Cloned to ${dir}.`);
  }

  if (!existsSync(resolve(dir, "scripts/setup.mjs"))) {
    fail(
      "The template on GitHub has no scripts/setup.mjs. Merge it to the " +
        "template's main branch first.",
    );
  }
}

// ---------------------------------------------------------------------------
// Phases 3–4: identity and local environment
// ---------------------------------------------------------------------------

function runSetup({ appName, description, dir }) {
  log.step("Install and set up");
  if (!npm("ci", dir)) fail("npm ci failed.");

  const args = ["scripts/setup.mjs", appName];
  if (options.title) args.push("--title", options.title);
  if (description) args.push("--description", description);
  if (options.locale) args.push("--locale", options.locale);

  const result = spawnSync(process.execPath, args, {
    cwd: dir,
    stdio: "inherit",
    env: { ...process.env, NEW_APP_RUNNING: "1" },
  });
  if (result.status !== 0) {
    fail("Setup failed. Fix the cause shown above and run this command again.");
  }
}

// ---------------------------------------------------------------------------
// Phase 5: first pull request
// ---------------------------------------------------------------------------

function openPullRequest({ dir }) {
  log.step("First pull request");

  git(["add", "-A"], { cwd: dir });
  const hasChanges = !git(["diff", "--cached", "--quiet"], { cwd: dir }).ok;
  if (hasChanges) {
    if (!git(["commit", "-m", PR_TITLE], { cwd: dir, capture: true }).ok) {
      fail("git commit failed.");
    }
    log.ok(`Committed "${PR_TITLE}".`);
  } else {
    log.info("Nothing new to commit.");
  }

  const pushed = git(["push", "-u", "origin", SETUP_BRANCH], {
    cwd: dir,
    capture: true,
  });
  if (!pushed.ok) {
    fail(
      `git push failed: ${firstLine(pushed.stderr)}\n  If Git asks for ` +
        "credentials, run gh auth setup-git and try again.",
    );
  }
  log.ok(`Pushed ${SETUP_BRANCH}.`);

  const existing = gh(
    [
      "pr",
      "list",
      "--head",
      SETUP_BRANCH,
      "--state",
      "open",
      "--json",
      "url",
      "--jq",
      ".[0].url",
    ],
    { cwd: dir, capture: true },
  ).stdout.trim();
  if (existing) {
    log.info(`Pull request already open: ${existing}`);
    return existing;
  }

  const created = gh(
    [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      SETUP_BRANCH,
      "--title",
      PR_TITLE,
      "--body",
      PR_BODY,
    ],
    { cwd: dir, capture: true },
  );
  if (!created.ok) fail(`gh pr create failed: ${firstLine(created.stderr)}`);
  const url = created.stdout.trim().split(/\r?\n/).pop();
  log.ok(`Opened ${url}`);
  return url;
}

// ---------------------------------------------------------------------------
// Phase 6: repository settings, CI, ruleset
// ---------------------------------------------------------------------------

function configureRepository({ repo }) {
  log.step("Repository settings");

  const settings = gh(
    [
      "api",
      "-X",
      "PATCH",
      `repos/${repo}`,
      "-F",
      "allow_squash_merge=true",
      "-F",
      "allow_merge_commit=false",
      "-F",
      "allow_rebase_merge=false",
      "-F",
      "delete_branch_on_merge=true",
      "-f",
      "squash_merge_commit_title=PR_TITLE",
      "-f",
      "squash_merge_commit_message=BLANK",
    ],
    { capture: true },
  );
  if (settings.ok) {
    log.ok(
      "Squash merging only, PR title as commit message, head branches deleted.",
    );
  } else {
    log.warn(`Pull request settings not saved: ${firstLine(settings.stderr)}`);
  }

  for (const [path, label] of [
    ["vulnerability-alerts", "Dependabot alerts"],
    ["automated-security-fixes", "Dependabot security updates"],
  ]) {
    const result = gh(["api", "-X", "PUT", `repos/${repo}/${path}`], {
      capture: true,
    });
    if (result.ok) log.ok(`${label} on.`);
    else log.warn(`${label} not enabled: ${firstLine(result.stderr)}`);
  }
}

async function waitForChecks({ dir }, prUrl) {
  log.step("CI");
  log.info("Waiting for the checks to start...");

  const started = await waitFor(() => {
    const result = gh(["pr", "checks", prUrl], { cwd: dir, capture: true });
    return !/no checks reported/i.test(result.stdout + result.stderr);
  }, 120);
  if (!started) {
    log.warn(
      "No checks started within 2 minutes. Check the Actions tab on GitHub.",
    );
    return false;
  }

  log.info("Checks are running (the first run can take several minutes).");
  const passed = gh(["pr", "checks", prUrl, "--watch", "--interval", "15"], {
    cwd: dir,
  }).ok;
  if (passed) log.ok("All checks passed.");
  else log.warn("Some checks failed. Open the pull request to see why.");
  return passed;
}

function createRuleset({ repo, dir, visibility }) {
  log.step(`Ruleset ${RULESET_NAME}`);

  const list = gh(["api", `repos/${repo}/rulesets`, "--jq", ".[].name"], {
    capture: true,
  });
  if (list.ok && list.stdout.split(/\r?\n/).includes(RULESET_NAME)) {
    log.info("Already exists.");
    return;
  }

  const created = gh(
    [
      "api",
      "-X",
      "POST",
      `repos/${repo}/rulesets`,
      "--input",
      resolve(dir, RULESET_FILE),
    ],
    { capture: true },
  );
  if (created.ok) {
    log.ok(
      "main: no deletion, no force push, pull request and green 'checks' required.",
    );
    return;
  }
  log.warn(
    `Ruleset not created: ${firstLine(created.stderr) || firstLine(created.stdout)}`,
  );
  if (visibility === "private") {
    log.warn(
      "Private repositories on GitHub Free cannot enforce rulesets: main is " +
        "protected by discipline only (see docs/new-app-guide.md, Phase 2).",
    );
  }
}

function mergePullRequest({ dir }, prUrl, passed) {
  if (!options.merge) return false;
  log.step("Merge");
  if (!passed) {
    log.warn("Not merged because the checks did not pass.");
    return false;
  }
  if (
    !gh(["pr", "merge", prUrl, "--squash", "--delete-branch"], { cwd: dir }).ok
  ) {
    log.warn("Merge failed. Merge the pull request on GitHub.");
    return false;
  }
  git(["switch", "main"], { cwd: dir, capture: true });
  git(["pull"], { cwd: dir, capture: true });
  log.ok("Squash-merged; local main is up to date.");
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (options.help) {
    printHelp();
    return;
  }

  const ctx = await preflight();
  await createRepository(ctx);
  runSetup(ctx);
  configureRepository(ctx);
  const prUrl = openPullRequest(ctx);
  const passed = await waitForChecks(ctx, prUrl);
  createRuleset(ctx);
  const merged = mergePullRequest(ctx, prUrl, passed);

  log.step("Done");
  console.log(`
Repository: https://github.com/${ctx.repo}
Local folder: ${ctx.dir}

Next steps:
  1. ${merged ? "The first pull request is merged." : `Review and Squash and merge ${prUrl},\n     then in the app folder: git switch main, git pull`}
  2. Open the app folder in VS Code and run npm run dev.
  3. Replace the TODO in AGENTS.md (Project section) on a new branch.
  4. Continue with docs/new-app-guide.md, Phase 7 (Supabase cloud projects).`);
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error)),
);
