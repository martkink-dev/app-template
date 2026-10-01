// Creates a one-time password reset link for an existing, active user and
// prints it. For when no admin can sign in (for example the only admin forgot
// their password). Runs with the secret key, so run it only on your own
// computer.
//
// Usage:
//   npm run users:reset-password -- you@example.com
//   node --env-file=<env file> scripts/reset-password.mjs you@example.com https://app.example.com
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the env file.
// Token format and TTL must match src/lib/users/tokens.ts and
// src/lib/users/config.ts.

import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const PASSWORD_RESET_TTL_HOURS = 24;

const [rawEmail, siteUrl = "http://localhost:3000"] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: reset-password.mjs <email> [site-url]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profile, error: lookupError } = await supabase
  .from("profiles")
  .select("id, status")
  .eq("email", email)
  .maybeSingle();
if (lookupError) throw lookupError;
if (!profile) {
  console.error(`No user with the email ${email}.`);
  process.exit(1);
}
if (profile.status !== "active") {
  console.error(`${email} is deactivated. Activate the user first.`);
  process.exit(1);
}

const now = new Date();

const { error: revokeError } = await supabase
  .from("password_resets")
  .update({ revoked_at: now.toISOString() })
  .eq("user_id", profile.id)
  .is("used_at", null)
  .is("revoked_at", null);
if (revokeError) throw revokeError;

const token = randomBytes(32).toString("base64url");
const expiresAt = new Date(
  now.getTime() + PASSWORD_RESET_TTL_HOURS * 3600 * 1000,
);

const { error: insertError } = await supabase.from("password_resets").insert({
  user_id: profile.id,
  token_hash: createHash("sha256").update(token).digest("hex"),
  expires_at: expiresAt.toISOString(),
});
if (insertError) throw insertError;

console.log(
  `Password reset link for ${email} (valid until ${expiresAt.toISOString()}):`,
);
console.log(`${siteUrl.replace(/\/$/, "")}/reset-password/${token}`);
